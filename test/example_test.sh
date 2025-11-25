#!/bin/bash
# TaskEcho 测试框架使用示例
# 演示如何编写新的测试模块

# 加载通用库
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common/lib.sh"

# 测试名称
TEST_MODULE="TaskEcho 示例测试模块"

# 示例测试函数：查询项目列表（不需要认证）
test_get_projects() {
    # GET请求示例 - 查询接口不需要认证
    local response=$(http_get "/api/v1/projects" false)
    assert_status "$response" "200" "获取项目列表"
    
    local body=$(get_response_body "$response")
    assert_field_exists "$response" "success" "响应应包含success字段"
    assert_field_exists "$response" "data" "响应应包含data字段"
}

# 示例测试函数：提交数据（需要 API Key 认证）
test_submit_data() {
    # 确保 API Key 已配置
    ensure_api_key || return 1
    
    # POST请求示例 - 提交接口需要认证
    local data='{
        "project_id": "test-project-001",
        "project_name": "测试项目",
        "queue_id": "test-queue-001",
        "queue_name": "测试队列",
        "tasks": [
            {
                "task_id": "test-task-001",
                "title": "测试任务",
                "status": "pending",
                "tags": ["test", "example"],
                "messages": [
                    {
                        "role": "user",
                        "content": "这是测试消息"
                    }
                ]
            }
        ]
    }'
    
    local response=$(http_post "/api/v1/submit" "$data" true)
    assert_status "$response" "200" "提交数据"
    
    local body=$(get_response_body "$response")
    assert_field_exists "$response" "success" "响应应包含success字段"
}

# 示例测试函数：获取全局统计（不需要认证）
test_get_stats() {
    local response=$(http_get "/api/v1/stats" false)
    assert_status "$response" "200" "获取全局统计"
    
    local body=$(get_response_body "$response")
    assert_field_exists "$response" "success" "响应应包含success字段"
    assert_field_exists "$response" "data" "响应应包含data字段"
}

# 运行所有测试
run_example_tests() {
    print_header "$TEST_MODULE 测试"
    
    init_test_stats
    
    run_test "查询项目列表" test_get_projects
    run_test "获取全局统计" test_get_stats
    run_test "提交数据（需要API Key）" test_submit_data
    
    print_test_summary
    return $?
}

# 如果直接运行此脚本，执行测试
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    run_example_tests
    exit $?
fi

