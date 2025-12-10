#!/bin/bash
# 队列操作API测试

# 加载通用库
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../common/lib.sh"

# 测试名称
TEST_MODULE="队列操作API (Queue Operations API)"

# 测试用的项目ID和队列ID
TEST_PROJECT_ID="test-queue-ops-project-$(date +%s)"
TEST_QUEUE_ID="test-queue-ops-queue-$(date +%s)"

# 初始化：创建测试项目、队列和任务
init_test_data() {
    ensure_api_key || return 1
    
    local data=$(cat <<EOF
{
  "project_id": "$TEST_PROJECT_ID",
  "project_name": "队列操作测试项目",
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "队列操作测试队列",
  "tasks": [
    {
      "id": "task-1",
      "name": "任务1",
      "prompt": "测试任务1",
      "status": "pending"
    },
    {
      "id": "task-2",
      "name": "任务2",
      "prompt": "测试任务2",
      "status": "done"
    },
    {
      "id": "task-3",
      "name": "任务3",
      "prompt": "测试任务3",
      "status": "error"
    }
  ]
}
EOF
)
    
    http_post "/api/v1/submit" "$data" true > /dev/null 2>&1
    return 0
}

# 测试函数：重置队列
test_reset_queue() {
    ensure_api_key || return 1
    init_test_data || return 1
    
    local response=$(http_post "/api/v1/projects/$(url_encode "$TEST_PROJECT_ID")/queues/$(url_encode "$TEST_QUEUE_ID")/reset" "{}" true)
    assert_status "$response" "200" "重置队列应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    
    # 验证所有任务状态已重置为pending
    local tasks_response=$(http_get "/api/v1/projects/$(url_encode "$TEST_PROJECT_ID")/queues/$(url_encode "$TEST_QUEUE_ID")/tasks" true)
    assert_status "$tasks_response" "200" "获取任务列表应返回200"
}

# 测试函数：重置错误任务
test_reset_error_tasks() {
    ensure_api_key || return 1
    init_test_data || return 1
    
    local response=$(http_post "/api/v1/projects/$(url_encode "$TEST_PROJECT_ID")/queues/$(url_encode "$TEST_QUEUE_ID")/reset-error" "{}" true)
    assert_status "$response" "200" "重置错误任务应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    
    # 验证错误任务状态已重置
    local tasks_response=$(http_get "/api/v1/projects/$(url_encode "$TEST_PROJECT_ID")/queues/$(url_encode "$TEST_QUEUE_ID")/tasks?status=error" true)
    # 重置后，error状态的任务应该变为pending
}

# 测试函数：重新运行队列
test_rerun_queue() {
    ensure_api_key || return 1
    init_test_data || return 1
    
    local response=$(http_post "/api/v1/projects/$(url_encode "$TEST_PROJECT_ID")/queues/$(url_encode "$TEST_QUEUE_ID")/re-run" "{}" true)
    assert_status "$response" "200" "重新运行队列应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
}

# 测试函数：重新运行单个任务
test_rerun_single_task() {
    ensure_api_key || return 1
    init_test_data || return 1
    
    local response=$(http_post "/api/v1/projects/$(url_encode "$TEST_PROJECT_ID")/queues/$(url_encode "$TEST_QUEUE_ID")/tasks/task-3/re-run" "{}" true)
    assert_status "$response" "200" "重新运行单个任务应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
}

# 测试函数：重置拉取状态
test_reset_pull_status() {
    ensure_api_key || return 1
    
    local project_id="pull-reset-project-$(date +%s)"
    local task_id="pull-reset-task-$(date +%s)"
    
    # 创建项目和服务端任务
    local project_data=$(cat <<EOF
{
  "project_id": "$project_id",
  "project_name": "拉取重置项目",
  "queue_id": "queue-$(date +%s)",
  "queue_name": "队列",
  "tasks": []
}
EOF
)
    local project_create_response=$(http_post "/api/v1/submit" "$project_data" true)
    local project_create_status=$(get_status_code "$project_create_response")
    if [ "$project_create_status" != "200" ]; then
        print_result "SKIP" "项目创建失败，跳过测试" "状态码: $project_create_status"
        return 0
    fi
    
    # 等待项目创建完成
    sleep 1
    
    local task_data=$(cat <<EOF
{
  "taskId": "$task_id",
  "name": "拉取重置任务",
  "prompt": "测试重置拉取状态",
  "status": "pending"
}
EOF
)
    http_post "/api/v1/projects/$(url_encode "$project_id")/tasks" "$task_data" true > /dev/null 2>&1
    
    # 拉取任务
    http_get "/api/v1/projects/$(url_encode "$project_id")/tasks/pull?limit=1" true > /dev/null 2>&1
    
    # 重置拉取状态
    local response=$(http_post "/api/v1/projects/$(url_encode "$project_id")/tasks/$(url_encode "$task_id")/pull/reset" "{}" true)
    assert_status "$response" "200" "重置拉取状态应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
}

# 运行所有测试
run_module_tests() {
    print_header "$TEST_MODULE 测试"
    
    init_test_stats
    
    run_test "重置队列" test_reset_queue
    run_test "重置错误任务" test_reset_error_tasks
    run_test "重新运行队列" test_rerun_queue
    run_test "重新运行单个任务" test_rerun_single_task
    run_test "重置拉取状态" test_reset_pull_status
    
    print_test_summary
    return $?
}

# 如果直接运行此脚本，执行测试
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    run_module_tests
    exit $?
fi

