# TaskEcho API 测试框架

基于 Bash 和 curl 的 API 测试框架，用于测试 TaskEcho 的 REST API。

## 目录结构

```
test/
├── config/              # 配置文件目录
│   └── base.conf        # 基础配置文件
├── common/              # 通用库目录
│   ├── config.sh        # 配置加载模块
│   ├── colors.sh        # 颜色输出模块
│   ├── http.sh          # HTTP请求模块
│   ├── auth.sh          # API Key 认证模块
│   ├── lib.sh           # 通用库主入口
│   └── validate.sh      # 验证工具模块
├── modules/             # 测试模块目录
│   └── ...              # 各模块测试文件
├── reports/             # 测试报告目录（自动创建）
├── .api_key             # API Key 存储文件（可选，自动创建）
├── example_test.sh      # 测试示例
├── test_framework.sh    # 框架功能验证脚本
├── run_all_tests.sh     # 运行所有测试的主脚本
└── README.md            # 本文档
```

## 快速开始

### 1. 配置测试环境

编辑 `config/base.conf` 或通过环境变量配置：

```bash
# 方式1: 编辑配置文件
vim test/config/base.conf

# 方式2: 使用环境变量
export TEST_BASE_URL="http://localhost:3003"
export TEST_API_KEY="your-api-key-here"
```

### 2. 设置 API Key

TaskEcho 使用 API Key 认证（通过 `X-API-Key` header）。提交接口需要 API Key，查询接口不需要。

```bash
# 方式1: 环境变量（推荐）
export TEST_API_KEY="your-api-key-here"

# 方式2: 配置文件
echo "your-api-key-here" > test/.api_key

# 方式3: 编辑配置文件
vim test/config/base.conf
# 设置 TEST_API_KEY="your-api-key-here"
```

### 3. 运行所有测试

```bash
cd test
chmod +x run_all_tests.sh
./run_all_tests.sh
```

### 4. 运行单个测试模块

```bash
cd test
chmod +x example_test.sh
./example_test.sh
```

## 配置说明

### 基础配置 (config/base.conf)

- `BASE_URL`: API基础URL，默认 `http://localhost:3003`（测试端口）
- `TEST_API_KEY`: API Key（可选，查询接口不需要，提交接口需要）
- `VERBOSE`: 是否显示详细输出，默认 `true`
- `COLOR_OUTPUT`: 是否启用颜色输出，默认 `true`
- `API_KEY_FILE`: API Key 存储文件路径，默认 `test/.api_key`
- `REPORT_DIR`: 测试报告目录，默认 `test/reports`

### 环境变量覆盖

所有配置项都可以通过环境变量覆盖：

```bash
export TEST_BASE_URL="http://localhost:3003"
export TEST_API_KEY="your-api-key"
export TEST_VERBOSE="true"
./run_all_tests.sh
```

## 通用库说明

### config.sh
加载配置文件，支持环境变量覆盖。

### colors.sh
提供美观的测试输出格式，包括：
- `print_success`: 成功消息（绿色✓）
- `print_error`: 错误消息（红色✗）
- `print_warning`: 警告消息（黄色⚠）
- `print_info`: 信息消息（蓝色ℹ）
- `print_header`: 标题横幅
- `print_section`: 章节标题
- `print_test`: 测试项
- `print_result`: 测试结果（PASS/FAIL/SKIP）

### http.sh
提供HTTP请求功能：
- `http_get(url, require_auth, extra_headers)`: GET请求
  - `require_auth`: `true`/`false`，是否包含 API Key（默认 `false`）
- `http_post(url, data, require_auth, extra_headers)`: POST请求
  - `require_auth`: `true`/`false`，是否包含 API Key（默认 `true`）
- `http_put(url, data, require_auth, extra_headers)`: PUT请求
- `http_patch(url, data, require_auth, extra_headers)`: PATCH请求
- `http_delete(url, require_auth, extra_headers)`: DELETE请求
- `assert_status`: 验证HTTP状态码
- `assert_field_exists`: 验证响应字段存在
- `assert_json_field`: 验证JSON字段值

### auth.sh
处理 API Key 认证相关功能：
- `get_api_key`: 获取 API Key（从环境变量、配置文件或文件）
- `set_api_key(api_key)`: 设置并保存 API Key
- `ensure_api_key`: 确保 API Key 已配置（用于需要认证的测试）
- `clear_api_key`: 清除 API Key 文件

### lib.sh
通用库主入口，提供：
- 测试统计功能
- `run_test`: 运行测试并记录结果
- `skip_test`: 跳过测试
- `print_test_summary`: 打印测试统计
- `check_test_environment`: 环境预检

## 编写测试模块

### 基本结构

```bash
#!/bin/bash
# 模块名称测试

# 加载通用库
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common/lib.sh"

# 测试名称
TEST_MODULE="模块名称"

# 测试函数：查询接口（不需要认证）
test_get_projects() {
    local response=$(http_get "/api/v1/projects" false)
    assert_status "$response" "200" "获取项目列表"
}

# 测试函数：提交接口（需要 API Key）
test_submit_data() {
    ensure_api_key || return 1
    
    local data='{"project_id":"test-001","project_name":"测试项目",...}'
    local response=$(http_post "/api/v1/submit" "$data" true)
    assert_status "$response" "200" "提交数据"
}

# 运行所有测试
run_module_tests() {
    print_header "$TEST_MODULE 测试"
    
    init_test_stats
    
    run_test "查询项目列表" test_get_projects
    run_test "提交数据" test_submit_data
    
    print_test_summary
    return $?
}

# 如果直接运行此脚本，执行测试
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    run_module_tests
    exit $?
fi
```

### 测试函数示例

```bash
# 查询接口测试（不需要认证）
test_get_projects() {
    local response=$(http_get "/api/v1/projects" false)
    assert_status "$response" "200" "获取项目列表"
    assert_field_exists "$response" "success" "响应应包含success字段"
    assert_field_exists "$response" "data" "响应应包含data字段"
}

# 提交接口测试（需要 API Key）
test_submit_task() {
    ensure_api_key || return 1
    
    local data='{
        "project_id": "test-project-001",
        "project_name": "测试项目",
        "queue_id": "test-queue-001",
        "queue_name": "测试队列",
        "tasks": [{
            "task_id": "test-task-001",
            "title": "测试任务",
            "status": "pending",
            "tags": ["test"],
            "messages": [{
                "role": "user",
                "content": "测试消息"
            }]
        }]
    }'
    
    local response=$(http_post "/api/v1/submit" "$data" true)
    assert_status "$response" "200" "提交任务"
    assert_json_field "$response" "success" "true" "响应success应为true"
}

# 增量更新接口测试（需要 API Key）
test_add_message() {
    ensure_api_key || return 1
    
    local data='{
        "role": "assistant",
        "content": "这是AI回复"
    }'
    
    local response=$(http_post "/api/v1/tasks/project-001/queue-001/task-001/message" "$data" true)
    assert_status "$response" "200" "追加消息"
}
```

## TaskEcho API 特点

### 认证方式
- **查询接口**：不需要认证（`GET /api/v1/projects`、`GET /api/v1/stats` 等）
- **提交接口**：需要 API Key（`POST /api/v1/submit`、`POST /api/v1/tasks/.../message` 等）
- **认证方式**：通过 `X-API-Key` header 传递 API Key

### 响应格式
所有 API 响应遵循统一格式：
```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

错误响应：
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 核心接口
- `POST /api/v1/submit`: 提交项目、队列和任务（幂等操作）
- `GET /api/v1/projects`: 获取项目列表
- `GET /api/v1/projects/:projectId`: 获取项目详情
- `GET /api/v1/projects/:projectId/queues`: 获取队列列表
- `GET /api/v1/projects/:projectId/queues/:queueId/tasks`: 获取任务列表
- `GET /api/v1/projects/:projectId/queues/:queueId/tasks/:taskId`: 获取任务详情
- `GET /api/v1/stats`: 获取全局统计
- `POST /api/v1/tasks/:projectId/:queueId/:taskId/message`: 追加消息（需要 API Key）
- `POST /api/v1/tasks/:projectId/:queueId/:taskId/log`: 追加日志（需要 API Key）
- `PATCH /api/v1/tasks/:projectId/:queueId/:taskId/status`: 更新状态（需要 API Key）

## 依赖要求

### 必需工具
- `bash`: Shell解释器
- `curl`: HTTP客户端

### 可选工具（推荐）
- `jq`: JSON处理工具，用于更好的JSON解析和验证

### 安装依赖

**macOS:**
```bash
brew install curl jq
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install curl jq
```

**Linux (CentOS/RHEL):**
```bash
sudo yum install curl jq
```

## 测试输出示例

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TaskEcho API 测试套件
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▶ 检查依赖
✓ curl 已安装
⚠ 建议安装 jq 以获得更好的JSON处理能力

▶ 测试配置
  API地址: http://localhost:3003
  API Key: abc123def4...
  报告目录: test/reports

▶ 环境预检
  检查API服务状态... ✓ 正常
  检查 API Key 配置... ✓ 已配置

▶ 执行测试

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  项目查询模块 测试
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[测试] 获取项目列表
  ✓ PASS 获取项目列表 状态码: 200
[测试] 获取全局统计
  ✓ PASS 获取全局统计 状态码: 200

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  测试统计
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  总测试数: 2
  通过: 2
  失败: 0
  跳过: 0

✓ 所有测试通过！
```

## 注意事项

1. **API Key 管理**: 
   - API Key 可以通过环境变量、配置文件或文件方式设置
   - 查询接口不需要 API Key，提交接口需要
   - 如果未配置 API Key，提交接口测试会失败

2. **API 路径格式**: 
   - TaskEcho 使用 RESTful API，路径格式：`/api/v1/resource` 或 `/api/v1/resource/:id`
   - 动态路由参数使用路径参数，如 `/api/v1/projects/:projectId/queues/:queueId`

3. **响应格式**: 
   - 所有响应都包含 `success` 字段（`true`/`false`）
   - 成功响应包含 `data` 字段
   - 错误响应包含 `error` 字段

4. **颜色输出**: 如果输出到文件或非终端，颜色会自动禁用。

5. **详细输出**: 设置 `VERBOSE=false` 可以禁用详细输出。

## 扩展测试

要添加新的测试模块：

1. 在 `test/modules/` 目录创建新的测试文件（如 `submit_test.sh`）
2. 按照现有测试模块的结构编写测试函数
3. 在 `run_all_tests.sh` 的 `TEST_MODULES` 数组中添加新模块

## 故障排除

### API 服务不可用
- 检查 Next.js 服务是否运行：`npm run dev`
- 检查 `BASE_URL` 配置是否正确（默认 `http://localhost:3003`）
- 检查端口是否被占用

### API Key 未配置
- 查询接口不需要 API Key，可以正常测试
- 提交接口需要 API Key，请设置 `TEST_API_KEY` 环境变量或配置文件
- 检查 API Key 是否正确（在设置页面查看）

### 测试失败
- 启用详细输出：`export TEST_VERBOSE=true`
- 检查 API 服务日志
- 验证 API 端点路径是否正确
- 检查请求数据格式是否符合 API 规范

### 响应格式错误
- 确保 API 服务正常运行
- 检查响应是否符合 TaskEcho 标准格式（`{success, data, message}`）
- 使用 `jq` 工具格式化查看 JSON 响应

## 许可证

与主项目相同。
