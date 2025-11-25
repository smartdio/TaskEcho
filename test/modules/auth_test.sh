#!/bin/bash
# 认证模块测试
# 测试登录、注册等认证相关API

# 加载通用库
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$TEST_ROOT/common/lib.sh"

# 测试名称
TEST_MODULE="认证模块"

# 测试：健康检查
test_health_check() {
    local response=$(http_get "/health")
    assert_status "$response" "200" "健康检查"
}

# 测试：登录成功
test_login_success() {
    # 先登出确保干净状态
    logout
    
    # 执行登录
    if login "$TEST_USERNAME" "$TEST_PASSWORD"; then
        # 验证token文件存在
        if [ -f "$TOKEN_FILE" ]; then
            print_result "PASS" "Token文件已创建"
            return 0
        else
            print_result "FAIL" "Token文件未创建"
            return 1
        fi
    else
        return 1
    fi
}

# 测试：登录失败（错误密码）
test_login_failure() {
    local response=$(http_post "/api/v1/auth/login/" '{"username":"'$TEST_USERNAME'","password":"wrongpassword"}')
    assert_status "$response" "401" "错误密码登录应返回401"
}

# 测试：登录失败（不存在的用户）
test_login_nonexistent_user() {
    local response=$(http_post "/api/v1/auth/login/" '{"username":"nonexistent","password":"password"}')
    assert_status "$response" "401" "不存在用户登录应返回401"
}

# 测试：使用token访问受保护端点
test_protected_endpoint() {
    # 确保已登录
    ensure_logged_in || return 1
    
    # 尝试访问需要认证的端点（例如获取当前用户信息）
    local response=$(http_get "/api/v1/users/me")
    assert_status "$response" "200" "使用token访问受保护端点"
    
    # 验证响应包含用户信息
    local body=$(get_response_body "$response")
    assert_field_exists "$response" "username" "响应应包含username字段"
    assert_field_exists "$response" "id" "响应应包含id字段"
}

# 测试：无token访问受保护端点
test_protected_endpoint_without_token() {
    # 临时删除token
    local temp_token_file="${TOKEN_FILE}.backup"
    if [ -f "$TOKEN_FILE" ]; then
        mv "$TOKEN_FILE" "$temp_token_file"
    fi
    
    # 尝试访问受保护端点
    local response=$(http_get "/api/v1/users/me")
    assert_status "$response" "401" "无token访问应返回401"
    
    # 恢复token
    if [ -f "$temp_token_file" ]; then
        mv "$temp_token_file" "$TOKEN_FILE"
    fi
}

# 运行所有测试
run_auth_tests() {
    print_header "$TEST_MODULE 测试"
    
    init_test_stats
    
    run_test "健康检查" test_health_check
    run_test "登录成功" test_login_success
    run_test "登录失败（错误密码）" test_login_failure
    run_test "登录失败（不存在用户）" test_login_nonexistent_user
    run_test "使用token访问受保护端点" test_protected_endpoint
    run_test "无token访问受保护端点" test_protected_endpoint_without_token
    
    print_test_summary
    return $?
}

# 如果直接运行此脚本，执行测试
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    # 确保已登录
    ensure_logged_in || exit 1
    
    run_auth_tests
    exit $?
fi

