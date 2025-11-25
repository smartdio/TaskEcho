#!/bin/bash
# 实时更新机制测试
# 测试API端点是否支持实时更新（响应时间、数据格式等）

# 加载通用库
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../common/lib.sh"

# 测试名称
TEST_MODULE="实时更新机制测试"

# 测试函数：验证项目列表接口响应时间合理
test_projects_response_time() {
    local start_time=$(date +%s%N)
    local response=$(http_get "/api/v1/projects" false)
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 )) # 转换为毫秒
    
    assert_status "$response" "200" "获取项目列表应返回200"
    
    # 响应时间应该在合理范围内（小于1秒）
    if [ "$duration" -gt 1000 ]; then
        print_warning "项目列表接口响应时间较长: ${duration}ms（建议小于1000ms）"
    else
        print_success "项目列表接口响应时间正常: ${duration}ms"
    fi
}

# 测试函数：验证统计接口响应时间合理
test_stats_response_time() {
    local start_time=$(date +%s%N)
    local response=$(http_get "/api/v1/stats" false)
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 )) # 转换为毫秒
    
    assert_status "$response" "200" "获取全局统计应返回200"
    
    # 响应时间应该在合理范围内（小于1秒）
    if [ "$duration" -gt 1000 ]; then
        print_warning "统计接口响应时间较长: ${duration}ms（建议小于1000ms）"
    else
        print_success "统计接口响应时间正常: ${duration}ms"
    fi
}

# 测试函数：验证项目详情接口响应时间合理
test_project_detail_response_time() {
    # 先获取一个项目ID
    local projects_response=$(http_get "/api/v1/projects?page=1&pageSize=1" false)
    local project_id=$(echo "$projects_response" | jq -r '.data.items[0].project_id // empty')
    
    if [ -z "$project_id" ]; then
        skip_test "没有项目数据，跳过项目详情响应时间测试"
        return 0
    fi
    
    local start_time=$(date +%s%N)
    local response=$(http_get "/api/v1/projects/$project_id" false)
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 )) # 转换为毫秒
    
    assert_status "$response" "200" "获取项目详情应返回200"
    
    # 响应时间应该在合理范围内（小于1秒）
    if [ "$duration" -gt 1000 ]; then
        print_warning "项目详情接口响应时间较长: ${duration}ms（建议小于1000ms）"
    else
        print_success "项目详情接口响应时间正常: ${duration}ms"
    fi
}

# 测试函数：验证任务详情接口响应时间合理（需要更频繁轮询）
test_task_detail_response_time() {
    # 先获取一个任务
    local projects_response=$(http_get "/api/v1/projects?page=1&pageSize=1" false)
    local project_id=$(echo "$projects_response" | jq -r '.data.items[0].project_id // empty')
    
    if [ -z "$project_id" ]; then
        skip_test "没有项目数据，跳过任务详情响应时间测试"
        return 0
    fi
    
    local queues_response=$(http_get "/api/v1/projects/$project_id/queues" false)
    local queue_id=$(echo "$queues_response" | jq -r '.data.items[0].queue_id // empty')
    
    if [ -z "$queue_id" ]; then
        skip_test "没有队列数据，跳过任务详情响应时间测试"
        return 0
    fi
    
    local tasks_response=$(http_get "/api/v1/projects/$project_id/queues/$queue_id/tasks?page=1&pageSize=1" false)
    local task_id=$(echo "$tasks_response" | jq -r '.data.items[0].task_id // empty')
    
    if [ -z "$task_id" ]; then
        skip_test "没有任务数据，跳过任务详情响应时间测试"
        return 0
    fi
    
    local start_time=$(date +%s%N)
    local response=$(http_get "/api/v1/projects/$project_id/queues/$queue_id/tasks/$task_id" false)
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 )) # 转换为毫秒
    
    assert_status "$response" "200" "获取任务详情应返回200"
    
    # 任务详情接口响应时间应该在合理范围内（小于2秒，因为包含更多数据）
    if [ "$duration" -gt 2000 ]; then
        print_warning "任务详情接口响应时间较长: ${duration}ms（建议小于2000ms）"
    else
        print_success "任务详情接口响应时间正常: ${duration}ms"
    fi
}

# 测试函数：验证接口支持并发请求（模拟轮询场景）
test_concurrent_requests() {
    print_info "测试并发请求（模拟轮询场景）..."
    
    # 同时发起多个请求
    local response1=$(http_get "/api/v1/projects" false) &
    local response2=$(http_get "/api/v1/stats" false) &
    local response3=$(http_get "/api/v1/projects" false) &
    
    wait
    
    # 验证所有请求都成功
    assert_status "$response1" "200" "并发请求1应返回200"
    assert_status "$response2" "200" "并发请求2应返回200"
    assert_status "$response3" "200" "并发请求3应返回200"
    
    print_success "并发请求测试通过"
}

# 测试函数：验证数据更新后接口能返回最新数据
test_data_consistency() {
    ensure_api_key || return 1
    
    # 提交测试数据
    local test_project_id="test_realtime_$(date +%s)"
    local test_queue_id="test_queue_$(date +%s)"
    local test_task_id="test_task_$(date +%s)"
    
    local submit_data=$(cat <<EOF
{
  "project_id": "$test_project_id",
  "project_name": "实时更新测试项目",
  "queue_id": "$test_queue_id",
  "queue_name": "测试队列",
  "tasks": [{
    "id": "$test_task_id",
    "name": "测试任务",
    "status": "pending",
    "tags": ["test"],
    "messages": [],
    "logs": []
  }]
}
EOF
)
    
    local submit_response=$(http_post "/api/v1/submit" "$submit_data" true)
    assert_status "$submit_response" "200" "提交测试数据应返回200"
    
    # 等待一小段时间确保数据已写入
    sleep 1
    
    # 验证数据已更新
    local projects_response=$(http_get "/api/v1/projects" false)
    local project_exists=$(echo "$projects_response" | jq -r ".data.items[] | select(.project_id == \"$test_project_id\") | .project_id // empty")
    
    if [ -n "$project_exists" ]; then
        print_success "数据更新后能立即查询到最新数据"
    else
        print_error "数据更新后无法查询到最新数据"
        return 1
    fi
    
    # 清理测试数据（可选）
    print_info "测试数据已创建: project_id=$test_project_id"
}

# 运行所有测试
run_module_tests() {
    print_header "$TEST_MODULE"
    
    init_test_stats
    
    run_test "项目列表接口响应时间" test_projects_response_time
    run_test "统计接口响应时间" test_stats_response_time
    run_test "项目详情接口响应时间" test_project_detail_response_time
    run_test "任务详情接口响应时间" test_task_detail_response_time
    run_test "并发请求测试" test_concurrent_requests
    run_test "数据一致性测试" test_data_consistency
    
    print_test_summary
    return $?
}

# 如果直接运行此脚本，执行测试
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    run_module_tests
    exit $?
fi
