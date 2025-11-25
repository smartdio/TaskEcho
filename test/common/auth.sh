#!/bin/bash
# API Key 认证模块
# TaskEcho 使用 API Key 认证，通过 X-API-Key header 传递

# 加载依赖
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"
source "$SCRIPT_DIR/colors.sh"

# 获取 API Key
# 优先级：环境变量 > 配置文件 > API Key 文件
get_api_key() {
    # 1. 检查环境变量
    if [ -n "$TEST_API_KEY" ]; then
        echo "$TEST_API_KEY"
        return 0
    fi
    
    # 2. 检查 API Key 文件
    if [ -f "$API_KEY_FILE" ]; then
        local api_key=$(cat "$API_KEY_FILE" | tr -d '\n\r ')
        if [ -n "$api_key" ]; then
            echo "$api_key"
            return 0
        fi
    fi
    
    # 3. 未找到 API Key
    echo ""
    return 1
}

# 设置 API Key
set_api_key() {
    local api_key="$1"
    
    if [ -z "$api_key" ]; then
        print_error "API Key 不能为空"
        return 1
    fi
    
    # 保存到文件
    echo "$api_key" > "$API_KEY_FILE"
    print_success "API Key 已保存到: $API_KEY_FILE"
    return 0
}

# 验证 API Key 是否存在
ensure_api_key() {
    local api_key=$(get_api_key)
    
    if [ -z "$api_key" ]; then
        print_error "未找到 API Key"
        print_info "请通过以下方式之一设置 API Key:"
        print_info "  1. 环境变量: export TEST_API_KEY='your-api-key'"
        print_info "  2. 配置文件: 编辑 test/config/base.conf"
        print_info "  3. API Key 文件: echo 'your-api-key' > test/.api_key"
        return 1
    fi
    
    return 0
}

# 清除 API Key（删除文件）
clear_api_key() {
    if [ -f "$API_KEY_FILE" ]; then
        rm "$API_KEY_FILE"
        print_success "API Key 文件已删除"
    else
        print_info "API Key 文件不存在"
    fi
}

