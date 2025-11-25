#!/bin/bash
# HTTP请求模块
# 提供通用的HTTP请求函数，支持认证

# 加载依赖
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"
source "$SCRIPT_DIR/colors.sh"

# 检查curl是否可用
if ! command -v curl &> /dev/null; then
    print_error "curl 未安装，请先安装 curl"
    exit 1
fi

# 获取 API Key（从认证模块）
# 返回 API Key 值，如果不存在则返回空字符串
get_api_key_value() {
    # 加载认证模块以获取 API Key
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    source "$SCRIPT_DIR/auth.sh" 2>/dev/null || true
    
    get_api_key 2>/dev/null || echo ""
}

# 执行HTTP请求
# 参数: method url [data] [headers]
http_request() {
    local method="$1"
    local url="$2"
    local data="${3:-}"
    local extra_headers="${4:-}"
    
    # 构建完整URL
    if [[ "$url" =~ ^https?:// ]]; then
        local full_url="$url"
    else
        local full_url="${BASE_URL}${url}"
    fi
    
    # 检查是否需要添加 API Key（通过 extra_headers 中的特殊标记）
    local require_auth=false
    if [[ "$extra_headers" == *"__REQUIRE_AUTH__"* ]]; then
        require_auth=true
        extra_headers="${extra_headers//__REQUIRE_AUTH__/}"
    fi
    
    # 创建临时文件存储请求体（如果需要）
    local temp_file=""
    if [ -n "$data" ]; then
        temp_file=$(mktemp)
        echo "$data" > "$temp_file"
    fi
    
    # 构建curl参数数组
    local curl_args=(
        "-s"
        "-w" "\n%{http_code}"
        "-X" "$method"
    )
    
    # 添加Content-Type头
    if [ -n "$data" ]; then
        curl_args+=("-H" "Content-Type: application/json")
    fi
    
    # 添加 API Key 认证头（如果需要认证）
    if [ "$require_auth" = "true" ]; then
        local api_key=$(get_api_key_value)
        if [ -n "$api_key" ]; then
            curl_args+=("-H" "X-API-Key: $api_key")
        fi
    fi
    
    # 添加额外头部（如果提供）
    # extra_headers 格式: "-H 'Header: Value' -H 'Header2: Value2'"
    if [ -n "$extra_headers" ]; then
        # 将extra_headers按空格分割并添加到curl_args
        # 注意：这里假设extra_headers已经是正确格式的curl参数
        eval "curl_args+=($extra_headers)"
    fi
    
    # 添加请求体
    if [ -n "$data" ] && [ -n "$temp_file" ]; then
        curl_args+=("-d" "@$temp_file")
    fi
    
    # 添加URL
    curl_args+=("$full_url")
    
    # 执行请求并分离响应体和状态码
    local response=$(curl "${curl_args[@]}")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    # 清理临时文件
    [ -n "$temp_file" ] && [ -f "$temp_file" ] && rm -f "$temp_file"
    
    # 返回响应（格式：body|http_code）
    echo "$body|$http_code"
}

# GET请求（支持可选认证）
# 参数: url [require_auth] [extra_headers]
# require_auth: true/false，是否需要在请求中包含 API Key（默认 false，查询接口不需要认证）
http_get() {
    local url="$1"
    local require_auth="${2:-false}"
    local extra_headers="${3:-}"
    
    # 如果需要认证，添加特殊标记
    if [ "$require_auth" = "true" ]; then
        if [ -n "$extra_headers" ]; then
            extra_headers="__REQUIRE_AUTH__ $extra_headers"
        else
            extra_headers="__REQUIRE_AUTH__"
        fi
    fi
    
    http_request "GET" "$url" "" "$extra_headers"
}

# POST请求（默认需要认证）
# 参数: url data [require_auth] [extra_headers]
# require_auth: true/false，是否需要在请求中包含 API Key（默认 true，提交接口需要认证）
http_post() {
    local url="$1"
    local data="$2"
    local require_auth="${3:-true}"
    local extra_headers="${4:-}"
    
    # 如果需要认证，添加特殊标记
    if [ "$require_auth" = "true" ]; then
        if [ -n "$extra_headers" ]; then
            extra_headers="__REQUIRE_AUTH__ $extra_headers"
        else
            extra_headers="__REQUIRE_AUTH__"
        fi
    fi
    
    http_request "POST" "$url" "$data" "$extra_headers"
}

# PUT请求（默认需要认证）
http_put() {
    local url="$1"
    local data="$2"
    local require_auth="${3:-true}"
    local extra_headers="${4:-}"
    
    if [ "$require_auth" = "true" ]; then
        if [ -n "$extra_headers" ]; then
            extra_headers="__REQUIRE_AUTH__ $extra_headers"
        else
            extra_headers="__REQUIRE_AUTH__"
        fi
    fi
    
    http_request "PUT" "$url" "$data" "$extra_headers"
}

# PATCH请求（默认需要认证）
http_patch() {
    local url="$1"
    local data="$2"
    local require_auth="${3:-true}"
    local extra_headers="${4:-}"
    
    if [ "$require_auth" = "true" ]; then
        if [ -n "$extra_headers" ]; then
            extra_headers="__REQUIRE_AUTH__ $extra_headers"
        else
            extra_headers="__REQUIRE_AUTH__"
        fi
    fi
    
    http_request "PATCH" "$url" "$data" "$extra_headers"
}

# DELETE请求（默认需要认证）
http_delete() {
    local url="$1"
    local require_auth="${2:-true}"
    local extra_headers="${3:-}"
    
    if [ "$require_auth" = "true" ]; then
        if [ -n "$extra_headers" ]; then
            extra_headers="__REQUIRE_AUTH__ $extra_headers"
        else
            extra_headers="__REQUIRE_AUTH__"
        fi
    fi
    
    http_request "DELETE" "$url" "" "$extra_headers"
}

# 解析HTTP响应
# 返回: body http_code
parse_response() {
    local response="$1"
    echo "$response" | awk -F'|' '{print $1, $2}'
}

# 提取HTTP状态码
get_status_code() {
    local response="$1"
    echo "$response" | awk -F'|' '{print $2}'
}

# 提取响应体
get_response_body() {
    local response="$1"
    echo "$response" | awk -F'|' '{print $1}'
}

# 验证HTTP状态码
assert_status() {
    local response="$1"
    local expected_status="$2"
    local message="${3:-HTTP状态码验证}"
    
    local status_code=$(get_status_code "$response")
    
    if [ "$status_code" = "$expected_status" ]; then
        print_result "PASS" "$message" "状态码: $status_code"
        return 0
    else
        local body=$(get_response_body "$response")
        print_result "FAIL" "$message" "期望: $expected_status, 实际: $status_code"
        [ "$VERBOSE" = "true" ] && echo -e "    ${GRAY}响应: $body${NC}"
        return 1
    fi
}

# 验证响应体包含字段
assert_field_exists() {
    local response="$1"
    local field="$2"
    local message="${3:-字段存在性验证}"
    
    local body=$(get_response_body "$response")
    
    # 优先使用 jq 检查嵌套字段
    if command -v jq &> /dev/null; then
        local field_value=$(echo "$body" | jq -r ".$field // empty" 2>/dev/null)
        if [ -n "$field_value" ] && [ "$field_value" != "null" ]; then
            print_result "PASS" "$message" "字段 '$field' 存在"
            return 0
        else
            print_result "FAIL" "$message" "字段 '$field' 不存在"
            [ "$VERBOSE" = "true" ] && echo -e "    ${GRAY}响应: $body${NC}"
            return 1
        fi
    else
        # 回退到简单的字符串搜索（仅适用于顶层字段）
        if echo "$body" | grep -q "\"$field\""; then
            print_result "PASS" "$message" "字段 '$field' 存在"
            return 0
        else
            print_result "FAIL" "$message" "字段 '$field' 不存在（建议安装jq以支持嵌套字段检查）"
            [ "$VERBOSE" = "true" ] && echo -e "    ${GRAY}响应: $body${NC}"
            return 1
        fi
    fi
}

# 验证JSON响应字段值
assert_json_field() {
    local response="$1"
    local field="$2"
    local expected_value="$3"
    local message="${4:-JSON字段值验证}"
    
    local body=$(get_response_body "$response")
    
    if command -v jq &> /dev/null; then
        local actual_value=$(echo "$body" | jq -r ".$field" 2>/dev/null)
        
        if [ "$actual_value" = "$expected_value" ]; then
            print_result "PASS" "$message" "$field = $expected_value"
            return 0
        else
            print_result "FAIL" "$message" "期望: $field = $expected_value, 实际: $field = $actual_value"
            [ "$VERBOSE" = "true" ] && echo -e "    ${GRAY}响应: $body${NC}"
            return 1
        fi
    else
        print_warning "jq 未安装，跳过JSON字段验证"
        return 0
    fi
}

