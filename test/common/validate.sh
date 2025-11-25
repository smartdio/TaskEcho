#!/bin/bash
# 验证工具模块
# 提供各种验证函数

# 加载依赖
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/colors.sh"

# 验证JSON格式
validate_json() {
    local json_string="$1"
    
    if command -v jq &> /dev/null; then
        if echo "$json_string" | jq . > /dev/null 2>&1; then
            return 0
        else
            return 1
        fi
    else
        # 简单的JSON格式检查（不完整，但可以检查基本格式）
        if echo "$json_string" | grep -qE '^[\[\{].*[\]\}]$'; then
            return 0
        else
            return 1
        fi
    fi
}

# 验证URL格式
validate_url() {
    local url="$1"
    
    if [[ "$url" =~ ^https?:// ]]; then
        return 0
    else
        return 1
    fi
}

# 验证必需的工具是否安装
validate_dependencies() {
    local missing_tools=()
    
    if ! command -v curl &> /dev/null; then
        missing_tools+=("curl")
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        print_error "缺少必需的工具: ${missing_tools[*]}"
        print_info "请先安装缺少的工具"
        return 1
    fi
    
    # jq是可选的，但建议安装
    if ! command -v jq &> /dev/null; then
        print_warning "建议安装 jq 以获得更好的JSON处理能力"
        print_info "安装方法: brew install jq (macOS) 或 apt-get install jq (Linux)"
    fi
    
    return 0
}

