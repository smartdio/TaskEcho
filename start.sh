#!/bin/bash

# TaskEcho 启动脚本
# 支持开发/生产模式、端口设置、守护进程模式、构建选项和停止服务功能

# 默认参数值
MODE="dev"
PORT=8000
DAEMON=false
BUILD=false
STOP=false

# 解析命令行参数
while [[ $# -gt 0 ]]; do
  case $1 in
    -mode|--mode|-m)
      MODE="$2"
      shift 2
      ;;
    -port|--port|-p)
      PORT="$2"
      shift 2
      ;;
    -daemon|--daemon|-d)
      DAEMON=true
      shift
      ;;
    -build|--build|-b)
      BUILD=true
      shift
      ;;
    -stop|--stop)
      STOP=true
      shift
      ;;
    -h|--help)
      echo "TaskEcho 启动脚本使用说明"
      echo ""
      echo "参数说明:"
      echo "  -mode, -m <dev|prod>    执行模式 (默认: dev)"
      echo "  -port, -p <端口号>       应用监听端口 (默认: 8000)"
      echo "  -daemon, -d              守护进程模式 (后台运行)"
      echo "  -build, -b               执行构建 (生产模式)"
      echo "  -stop                    停止服务 (根据端口)"
      echo "  -h, --help               显示帮助信息"
      echo ""
      echo "使用示例:"
      echo "  ./start.sh -m dev                    # 开发模式，默认端口 8000"
      echo "  ./start.sh -m dev -p 8080            # 开发模式，端口 8080"
      echo "  ./start.sh -m prod -p 8080 -d -b     # 生产模式，端口 8080，守护进程，执行构建"
      echo "  ./start.sh -stop                     # 停止默认端口 8000 上的服务"
      echo "  ./start.sh -p 8080 -stop             # 停止端口 8080 上的服务"
      exit 0
      ;;
    *)
      echo "错误: 未知参数 '$1'"
      echo "使用 -h 或 --help 查看帮助信息"
      exit 1
      ;;
  esac
done

# 验证模式参数
if [[ "$MODE" != "dev" && "$MODE" != "prod" ]]; then
  echo "错误: 模式必须是 'dev' 或 'prod'"
  exit 1
fi

# 验证端口参数
if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [[ "$PORT" -lt 1 ]] || [[ "$PORT" -gt 65535 ]]; then
  echo "错误: 端口必须是 1-65535 之间的数字"
  exit 1
fi

# 停止服务功能
if [ "$STOP" = true ]; then
  echo "正在停止端口 $PORT 上的服务..."
  
  # 检查端口是否被占用（优先使用 fuser）
  PORT_IN_USE=false
  if command -v fuser &> /dev/null; then
    if fuser $PORT/tcp >/dev/null 2>&1; then
      PORT_IN_USE=true
    fi
  elif command -v lsof &> /dev/null; then
    if lsof -ti:$PORT >/dev/null 2>&1; then
      PORT_IN_USE=true
    fi
  fi
  
  if [ "$PORT_IN_USE" != true ]; then
    echo "端口 $PORT 上没有运行的服务"
    exit 0
  fi
  
  # 停止进程（优先使用 fuser -k，可以一步完成查找和终止）
  if command -v fuser &> /dev/null; then
    echo "使用 fuser 停止端口 $PORT 上的进程..."
    fuser -k $PORT/tcp 2>/dev/null
    RESULT=$?
  elif command -v lsof &> /dev/null; then
    echo "使用 lsof 停止端口 $PORT 上的进程..."
    PID=$(lsof -ti:$PORT 2>/dev/null)
    if [ -n "$PID" ]; then
      echo "找到进程 PID: $PID"
      kill -9 $PID 2>/dev/null
      RESULT=$?
    else
      RESULT=1
    fi
  else
    echo "错误: 未找到 fuser 或 lsof 命令，无法停止服务"
    exit 1
  fi
  
  # 等待进程结束
  sleep 1
  
  # 验证是否已停止（优先使用 fuser）
  STILL_RUNNING=false
  if command -v fuser &> /dev/null; then
    if fuser $PORT/tcp >/dev/null 2>&1; then
      STILL_RUNNING=true
    fi
  elif command -v lsof &> /dev/null; then
    if lsof -ti:$PORT >/dev/null 2>&1; then
      STILL_RUNNING=true
    fi
  fi
  
  if [ "$STILL_RUNNING" = true ]; then
    echo "警告: 服务可能未完全停止，请手动检查"
    exit 1
  else
    echo "服务已成功停止"
    
    # 清理 Next.js 开发模式锁文件（如果存在）
    LOCK_FILE=".next/dev/lock"
    if [ -f "$LOCK_FILE" ]; then
      echo "清理 Next.js 锁文件..."
      rm -f "$LOCK_FILE"
    fi
    
    exit 0
  fi
fi

# 检查 Node.js 和 npm 是否安装
if ! command -v node &> /dev/null; then
  echo "错误: 未找到 Node.js，请先安装 Node.js"
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo "错误: 未找到 npm，请先安装 npm"
  exit 1
fi

# 检查端口是否被占用（优先使用 fuser）
PORT_IN_USE=false
if command -v fuser &> /dev/null; then
  if fuser $PORT/tcp >/dev/null 2>&1; then
    PORT_IN_USE=true
  fi
elif command -v lsof &> /dev/null; then
  if lsof -ti:$PORT >/dev/null 2>&1; then
    PORT_IN_USE=true
  fi
fi

if [ "$PORT_IN_USE" = true ]; then
  echo "警告: 端口 $PORT 已被占用"
  echo "使用 './start.sh -stop' 停止现有服务，或使用其他端口"
  exit 1
fi

# 检查并清理 Next.js 开发模式锁文件（仅在开发模式）
# 注意：端口占用检查已在前面完成，这里只处理残留锁文件
if [ "$MODE" = "dev" ]; then
  LOCK_FILE=".next/dev/lock"
  
  # 如果锁文件存在，说明可能是之前异常退出留下的残留文件
  # 由于端口检查已通过，可以安全清理
  if [ -f "$LOCK_FILE" ]; then
    echo "检测到残留的 Next.js 锁文件，正在清理..."
    rm -f "$LOCK_FILE"
    if [ $? -eq 0 ]; then
      echo "锁文件已清理"
    else
      echo "警告: 无法清理锁文件，请手动删除 $LOCK_FILE"
      echo "如果问题持续，请尝试: rm -f $LOCK_FILE"
    fi
  fi
fi

# 设置端口环境变量（Next.js 会自动读取 PORT 环境变量）
export PORT=$PORT

# 构建日志文件路径
LOG_FILE="logs/startup.log"
mkdir -p logs

# 执行构建（如果需要）
if [ "$BUILD" = true ]; then
  echo "正在执行构建..."
  if [ "$DAEMON" = true ]; then
    npm run build >> "$LOG_FILE" 2>&1
    if [ $? -ne 0 ]; then
      echo "错误: 构建失败，请查看日志文件 $LOG_FILE"
      exit 1
    fi
    echo "构建完成"
  else
    npm run build
    if [ $? -ne 0 ]; then
      echo "错误: 构建失败"
      exit 1
    fi
  fi
fi

# 根据模式执行相应命令
if [ "$MODE" = "dev" ]; then
  echo "启动开发模式，端口: $PORT"
  
  if [ "$DAEMON" = true ]; then
    echo "守护进程模式: 后台运行，日志输出到 $LOG_FILE"
    # Next.js dev 模式需要使用 -p 参数指定端口
    # 使用 npx 直接调用 next 命令以确保端口参数正确传递
    nohup npx next dev -p $PORT > "$LOG_FILE" 2>&1 &
    PID=$!
    echo "进程已启动，PID: $PID"
    echo "日志文件: $LOG_FILE"
    echo "使用 'tail -f $LOG_FILE' 查看日志"
    echo "使用 './start.sh -stop' 停止服务"
  else
    # Next.js dev 模式需要使用 -p 参数指定端口
    npx next dev -p $PORT
  fi
else
  # 生产模式
  echo "启动生产模式，端口: $PORT"
  
  # 生产模式需要先构建
  if [ "$BUILD" != true ]; then
    echo "警告: 生产模式建议先执行构建"
    echo "使用 './start.sh -m prod -p $PORT -b' 执行构建并启动"
  fi
  
  if [ "$DAEMON" = true ]; then
    echo "守护进程模式: 后台运行，日志输出到 $LOG_FILE"
    # Next.js start 模式会自动读取 PORT 环境变量
    nohup npm start > "$LOG_FILE" 2>&1 &
    PID=$!
    echo "进程已启动，PID: $PID"
    echo "日志文件: $LOG_FILE"
    echo "使用 'tail -f $LOG_FILE' 查看日志"
    echo "使用 './start.sh -stop' 停止服务"
  else
    # Next.js start 模式会自动读取 PORT 环境变量
    npm start
  fi
fi

