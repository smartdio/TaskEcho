#!/bin/bash
# API Key 管理接口测试

# 加载通用库
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../common/lib.sh"

# 测试名称
TEST_MODULE="API Key 管理接口"

# 存储测试过程中创建的 API Key ID
CREATED_API_KEY_ID=""
CREATED_API_KEY_VALUE="sk-test-key-123456789"

# 测试函数：获取 API Key 列表
test_get_api_keys() {
    local response=$(http_get "/api/v1/api-keys" false)
    assert_status "$response" "200" "获取 API Key 列表"
    assert_field_exists "$response" "success" "响应应包含success字段"
    assert_field_exists "$response" "data" "响应应包含data字段"
    assert_field_exists "$response" "data.items" "响应应包含items数组"
    assert_field_exists "$response" "data.pagination" "响应应包含pagination对象"
}

# 测试函数：创建 API Key
test_create_api_key() {
    local data=$(cat <<EOF
{
  "name": "测试 API Key",
  "key": "$CREATED_API_KEY_VALUE",
  "project_id": null
}
EOF
)
    
    local response=$(http_post "/api/v1/api-keys" "$data" false)
    assert_status "$response" "201" "创建 API Key"
    assert_json_field "$response" "success" "true" "响应success应为true"
    assert_field_exists "$response" "data.id" "响应应包含id字段"
    
    # 提取创建的 API Key ID
    if command -v jq &> /dev/null; then
        CREATED_API_KEY_ID=$(echo "$response" | jq -r '.data.id // empty')
    fi
}

# 测试函数：创建带项目ID的 API Key
test_create_api_key_with_project() {
    # 先创建一个测试项目（如果不存在）
    local project_data=$(cat <<EOF
{
  "project_id": "test-project-api-key",
  "project_name": "API Key 测试项目",
  "queue_id": "test-queue",
  "queue_name": "测试队列",
  "tasks": []
}
EOF
)
    
    # 尝试创建项目（可能需要 API Key，这里先跳过）
    # http_post "/api/v1/submit" "$project_data" true > /dev/null 2>&1
    
    local data=$(cat <<EOF
{
  "name": "项目专属 API Key",
  "key": "sk-project-key-987654321",
  "project_id": "test-project-api-key"
}
EOF
)
    
    local response=$(http_post "/api/v1/api-keys" "$data" false)
    # 如果项目不存在，应该返回400错误
    # 如果项目存在，应该返回201
    local status=$(echo "$response" | grep -o '"status":[0-9]*' | cut -d':' -f2)
    if [ "$status" = "201" ] || [ "$status" = "400" ]; then
        print_success "创建带项目ID的 API Key (状态码: $status)"
        record_test_result "PASS"
    else
        print_error "创建带项目ID的 API Key 失败 (状态码: $status)"
        record_test_result "FAIL"
    fi
}

# 测试函数：获取单个 API Key 详情
test_get_api_key_by_id() {
    if [ -z "$CREATED_API_KEY_ID" ]; then
        print_warning "跳过测试：未创建 API Key"
        record_test_result "SKIP"
        return
    fi
    
    local response=$(http_get "/api/v1/api-keys/$CREATED_API_KEY_ID" false)
    assert_status "$response" "200" "获取单个 API Key 详情"
    assert_json_field "$response" "success" "true" "响应success应为true"
    assert_json_field "$response" "data.id" "$CREATED_API_KEY_ID" "API Key ID应匹配"
    assert_field_exists "$response" "data.name" "响应应包含name字段"
    assert_field_exists "$response" "data.key" "响应应包含key字段（隐藏）"
}

# 测试函数：更新 API Key
test_update_api_key() {
    if [ -z "$CREATED_API_KEY_ID" ]; then
        print_warning "跳过测试：未创建 API Key"
        record_test_result "SKIP"
        return
    fi
    
    local data=$(cat <<EOF
{
  "name": "更新后的 API Key 名称",
  "is_active": false
}
EOF
)
    
    local response=$(http_put "/api/v1/api-keys/$CREATED_API_KEY_ID" "$data" false)
    assert_status "$response" "200" "更新 API Key"
    assert_json_field "$response" "success" "true" "响应success应为true"
    assert_json_field "$response" "data.name" "更新后的 API Key 名称" "名称应已更新"
    assert_json_field "$response" "data.is_active" "false" "is_active应已更新"
}

# 测试函数：删除 API Key
test_delete_api_key() {
    if [ -z "$CREATED_API_KEY_ID" ]; then
        print_warning "跳过测试：未创建 API Key"
        record_test_result "SKIP"
        return
    fi
    
    local response=$(http_delete "/api/v1/api-keys/$CREATED_API_KEY_ID" false)
    assert_status "$response" "200" "删除 API Key"
    assert_json_field "$response" "success" "true" "响应success应为true"
    
    # 验证删除后无法再获取
    local get_response=$(http_get "/api/v1/api-keys/$CREATED_API_KEY_ID" false)
    local status=$(echo "$get_response" | grep -o '"status":[0-9]*' | cut -d':' -f2)
    if [ "$status" = "404" ]; then
        print_success "API Key 已成功删除"
        record_test_result "PASS"
    else
        print_error "API Key 删除后仍可访问 (状态码: $status)"
        record_test_result "FAIL"
    fi
}

# 测试函数：验证创建重复的 API Key
test_create_duplicate_api_key() {
    local data=$(cat <<EOF
{
  "name": "重复的 API Key",
  "key": "$CREATED_API_KEY_VALUE"
}
EOF
)
    
    local response=$(http_post "/api/v1/api-keys" "$data" false)
    local status=$(echo "$response" | grep -o '"status":[0-9]*' | cut -d':' -f2)
    
    if [ "$status" = "400" ]; then
        print_success "正确拒绝重复的 API Key (状态码: 400)"
        record_test_result "PASS"
    else
        print_error "未正确拒绝重复的 API Key (状态码: $status)"
        record_test_result "FAIL"
    fi
}

# 测试函数：验证参数验证
test_validation_errors() {
    # 测试缺少必填字段
    local data1='{"name": ""}'
    local response1=$(http_post "/api/v1/api-keys" "$data1" false)
    local status1=$(echo "$response1" | grep -o '"status":[0-9]*' | cut -d':' -f2)
    
    if [ "$status1" = "400" ]; then
        print_success "正确验证缺少必填字段 (状态码: 400)"
        record_test_result "PASS"
    else
        print_error "未正确验证缺少必填字段 (状态码: $status1)"
        record_test_result "FAIL"
    fi
    
    # 测试无效的 API Key ID
    local response2=$(http_get "/api/v1/api-keys/invalid-id" false)
    local status2=$(echo "$response2" | grep -o '"status":[0-9]*' | cut -d':' -f2)
    
    if [ "$status2" = "400" ] || [ "$status2" = "404" ]; then
        print_success "正确验证无效的 API Key ID (状态码: $status2)"
        record_test_result "PASS"
    else
        print_error "未正确验证无效的 API Key ID (状态码: $status2)"
        record_test_result "FAIL"
    fi
}

# 运行所有测试
run_module_tests() {
    print_header "$TEST_MODULE 测试"
    
    init_test_stats
    
    run_test "获取 API Key 列表" test_get_api_keys
    run_test "创建 API Key" test_create_api_key
    run_test "创建带项目ID的 API Key" test_create_api_key_with_project
    run_test "获取单个 API Key 详情" test_get_api_key_by_id
    run_test "更新 API Key" test_update_api_key
    run_test "验证创建重复的 API Key" test_create_duplicate_api_key
    run_test "验证参数验证" test_validation_errors
    run_test "删除 API Key" test_delete_api_key
    
    print_test_summary
    return $?
}

# 如果直接运行此脚本，执行测试
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    run_module_tests
    exit $?
fi
