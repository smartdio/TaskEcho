#!/bin/bash
# 任务管理API测试

# 加载通用库
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../common/lib.sh"

# 测试名称
TEST_MODULE="任务管理API (Task Management API)"

# 测试用的项目ID和队列ID
TEST_PROJECT_ID="test-task-mgmt-project-$(date +%s)"
TEST_QUEUE_ID="test-task-mgmt-queue-$(date +%s)"
TEST_TASK_ID="test-task-mgmt-task-$(date +%s)"

# 初始化：创建测试项目、队列
init_test_data() {
    ensure_api_key || return 1
    
    local data=$(cat <<EOF
{
  "project_id": "$TEST_PROJECT_ID",
  "project_name": "任务管理测试项目",
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "任务管理测试队列",
  "tasks": [
    {
      "id": "init-task-$(date +%s)",
      "name": "初始化任务",
      "prompt": "用于初始化项目",
      "status": "pending"
    }
  ]
}
EOF
)
    
    local create_response=$(http_post "/api/v1/submit" "$data" true)
    local create_status=$(get_status_code "$create_response")
    local create_body=$(get_response_body "$create_response")
    if [ "$create_status" != "200" ]; then
        print_error "项目创建失败，状态码: $create_status"
        [ "$VERBOSE" = "true" ] && echo -e "    ${GRAY}响应: $create_body${NC}"
        return 1
    fi
    
    # 等待项目创建完成
    sleep 1
    return 0
}

# 测试函数：创建项目级任务
test_create_project_task() {
    ensure_api_key || return 1
    init_test_data || return 1
    
    local task_data=$(cat <<EOF
{
  "taskId": "$TEST_TASK_ID",
  "name": "项目级任务",
  "prompt": "这是一个项目级任务",
  "status": "pending",
  "priority": 5
}
EOF
)
    
    local response=$(http_post "/api/v1/projects/$(url_encode "$TEST_PROJECT_ID")/tasks" "$task_data" true)
    assert_status "$response" "201" "创建项目级任务应返回201"
    assert_json_field "$response" "success" "true" "响应success应为true"
    assert_field_exists "$response" "data.task_id" "响应应包含task_id"
}

# 测试函数：创建队列任务
test_create_queue_task() {
    ensure_api_key || return 1
    init_test_data || return 1
    
    local task_data=$(cat <<EOF
{
  "taskId": "queue-task-$(date +%s)",
  "name": "队列任务",
  "prompt": "这是一个队列任务",
  "status": "pending"
}
EOF
)
    
    local response=$(http_post "/api/v1/projects/$(url_encode "$TEST_PROJECT_ID")/queues/$(url_encode "$TEST_QUEUE_ID")/tasks" "$task_data" true)
    assert_status "$response" "201" "创建队列任务应返回201"
    assert_json_field "$response" "success" "true" "响应success应为true"
}

# 测试函数：获取项目级任务列表
test_get_project_tasks() {
    ensure_api_key || return 1
    init_test_data || return 1
    
    # 先创建任务
    local task_data=$(cat <<EOF
{
  "taskId": "list-task-$(date +%s)",
  "name": "列表任务",
  "prompt": "测试列表",
  "status": "pending"
}
EOF
)
    http_post "/api/v1/projects/$(url_encode "$TEST_PROJECT_ID")/tasks" "$task_data" true > /dev/null 2>&1
    
    local response=$(http_get "/api/v1/projects/$(url_encode "$TEST_PROJECT_ID")/tasks?pageSize=10" true)
    assert_status "$response" "200" "获取项目级任务列表应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    assert_field_exists "$response" "data.items" "响应应包含items数组"
}

# 测试函数：获取项目级任务详情
test_get_project_task_detail() {
    ensure_api_key || return 1
    init_test_data || return 1
    
    # 先创建任务
    local task_id="detail-task-$(date +%s)"
    local task_data=$(cat <<EOF
{
  "taskId": "$task_id",
  "name": "详情任务",
  "prompt": "测试详情",
  "status": "pending"
}
EOF
)
    http_post "/api/v1/projects/$(url_encode "$TEST_PROJECT_ID")/tasks" "$task_data" true > /dev/null 2>&1
    
    local response=$(http_get "/api/v1/projects/$(url_encode "$TEST_PROJECT_ID")/tasks/$(url_encode "$task_id")" true)
    assert_status "$response" "200" "获取任务详情应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    assert_field_exists "$response" "data.task_id" "响应应包含task_id"
    assert_json_field "$response" "data.task_id" "$task_id" "任务ID应匹配"
}

# 测试函数：更新项目级任务
test_update_project_task() {
    ensure_api_key || return 1
    init_test_data || return 1
    
    # 先创建任务
    local task_id="update-task-$(date +%s)"
    local create_data=$(cat <<EOF
{
  "taskId": "$task_id",
  "name": "原始任务",
  "prompt": "原始提示",
  "status": "pending"
}
EOF
)
    http_post "/api/v1/projects/$(url_encode "$TEST_PROJECT_ID")/tasks" "$create_data" true > /dev/null 2>&1
    
    # 更新任务
    local update_data=$(cat <<EOF
{
  "name": "更新后的任务",
  "prompt": "更新后的提示",
  "status": "done"
}
EOF
)
    
    local response=$(http_put "/api/v1/projects/$(url_encode "$TEST_PROJECT_ID")/tasks/$(url_encode "$task_id")" "$update_data" true)
    assert_status "$response" "200" "更新任务应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
}

# 测试函数：删除项目级任务（软删除）
test_delete_project_task() {
    ensure_api_key || return 1
    init_test_data || return 1
    
    # 先创建任务
    local task_id="delete-task-$(date +%s)"
    local create_data=$(cat <<EOF
{
  "taskId": "$task_id",
  "name": "删除任务",
  "prompt": "测试删除",
  "status": "pending"
}
EOF
)
    http_post "/api/v1/projects/$(url_encode "$TEST_PROJECT_ID")/tasks" "$create_data" true > /dev/null 2>&1
    
    # 删除任务
    local response=$(http_delete "/api/v1/projects/$(url_encode "$TEST_PROJECT_ID")/tasks/$(url_encode "$task_id")" true)
    assert_status "$response" "200" "删除任务应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    
    # 验证任务已被删除（查询应返回404或空）
    local get_response=$(http_get "/api/v1/projects/$(url_encode "$TEST_PROJECT_ID")/tasks/$(url_encode "$task_id")" true)
    # 软删除后，任务可能返回404或返回deleted_at字段
    assert_status "$get_response" "404" "删除后的任务应返回404"
}

# 测试函数：更新队列任务
test_update_queue_task() {
    ensure_api_key || return 1
    init_test_data || return 1
    
    # 先创建队列任务
    local task_id="queue-update-task-$(date +%s)"
    local create_data=$(cat <<EOF
{
  "taskId": "$task_id",
  "name": "队列原始任务",
  "prompt": "原始提示",
  "status": "pending"
}
EOF
)
    http_post "/api/v1/projects/$(url_encode "$TEST_PROJECT_ID")/queues/$(url_encode "$TEST_QUEUE_ID")/tasks" "$create_data" true > /dev/null 2>&1
    
    # 更新任务
    local update_data=$(cat <<EOF
{
  "name": "队列更新后的任务",
  "status": "done"
}
EOF
)
    
    local response=$(http_put "/api/v1/projects/$(url_encode "$TEST_PROJECT_ID")/queues/$(url_encode "$TEST_QUEUE_ID")/tasks/$(url_encode "$task_id")" "$update_data" true)
    assert_status "$response" "200" "更新队列任务应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
}

# 测试函数：移动任务
test_move_task() {
    ensure_api_key || return 1
    init_test_data || return 1
    
  # 创建另一个队列
  local target_queue_id="target-queue-$(date +%s)"
  local queue_data=$(cat <<EOF
{
  "project_id": "$TEST_PROJECT_ID",
  "project_name": "任务管理测试项目",
  "queue_id": "$target_queue_id",
  "queue_name": "目标队列",
  "tasks": [
    {
      "id": "target-init-task-$(date +%s)",
      "name": "目标队列初始化任务",
      "prompt": "用于初始化目标队列",
      "status": "pending"
    }
  ]
}
EOF
)
  local queue_create_response=$(http_post "/api/v1/submit" "$queue_data" true)
  local queue_create_status=$(get_status_code "$queue_create_response")
  if [ "$queue_create_status" != "200" ]; then
    print_result "SKIP" "目标队列创建失败，跳过测试" "状态码: $queue_create_status"
    return 0
  fi
  
  # 等待队列创建完成
  sleep 1
    
    # 先创建项目级任务
    local task_id="move-task-$(date +%s)"
    local create_data=$(cat <<EOF
{
  "taskId": "$task_id",
  "name": "移动任务",
  "prompt": "测试移动",
  "status": "pending"
}
EOF
)
    http_post "/api/v1/projects/$(url_encode "$TEST_PROJECT_ID")/tasks" "$create_data" true > /dev/null 2>&1
    
    # 移动到队列
    local move_data=$(cat <<EOF
{
  "queue_id": "$target_queue_id"
}
EOF
)
    
    local response=$(http_post "/api/v1/projects/$(url_encode "$TEST_PROJECT_ID")/tasks/$(url_encode "$task_id")/move" "$move_data" true)
    assert_status "$response" "200" "移动任务应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
}

# 运行所有测试
run_module_tests() {
    print_header "$TEST_MODULE 测试"
    
    init_test_stats
    
    run_test "创建项目级任务" test_create_project_task
    run_test "创建队列任务" test_create_queue_task
    run_test "获取项目级任务列表" test_get_project_tasks
    run_test "获取项目级任务详情" test_get_project_task_detail
    run_test "更新项目级任务" test_update_project_task
    run_test "删除项目级任务" test_delete_project_task
    run_test "更新队列任务" test_update_queue_task
    run_test "移动任务" test_move_task
    
    print_test_summary
    return $?
}

# 如果直接运行此脚本，执行测试
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    run_module_tests
    exit $?
fi

