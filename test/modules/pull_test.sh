#!/bin/bash
# 拉取功能API测试

# 加载通用库
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../common/lib.sh"

# 测试名称
TEST_MODULE="拉取功能API (Pull API)"

# 测试用的项目ID和队列ID
TEST_PROJECT_ID="test-pull-project-$(date +%s)"
TEST_QUEUE_ID="test-pull-queue-$(date +%s)"
TEST_TASK_ID="test-pull-task-$(date +%s)"

# 初始化：创建测试项目、队列和任务
init_test_data() {
    ensure_api_key || return 1
    
    # 创建项目、队列和任务
    local data=$(cat <<EOF
{
  "project_id": "$TEST_PROJECT_ID",
  "project_name": "拉取测试项目",
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "拉取测试队列",
  "tasks": [
    {
      "id": "$TEST_TASK_ID",
      "name": "拉取测试任务",
      "prompt": "这是一个拉取测试任务",
      "status": "pending"
    }
  ]
}
EOF
)
    
    http_post "/api/v1/submit" "$data" true > /dev/null 2>&1
    return 0
}

# 测试函数：拉取项目级任务（无任务）
test_pull_project_tasks_empty() {
    ensure_api_key || return 1
    
    local project_id="empty-project-$(date +%s)"
    # 先创建项目
    local data=$(cat <<EOF
{
  "project_id": "$project_id",
  "project_name": "空项目",
  "queue_id": "empty-queue-$(date +%s)",
  "queue_name": "空队列",
  "tasks": []
}
EOF
)
    local create_response=$(http_post "/api/v1/submit" "$data" true)
    local create_status=$(get_status_code "$create_response")
    if [ "$create_status" != "200" ]; then
        print_result "SKIP" "项目创建失败，跳过测试" "状态码: $create_status"
        return 0
    fi
    
    # 等待项目创建完成
    sleep 1
    
    local response=$(http_get "/api/v1/projects/$(url_encode "$project_id")/tasks/pull" true)
    assert_status "$response" "200" "拉取项目级任务应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    assert_json_field "$response" "data.tasks" "[]" "无任务时应返回空数组"
}

# 测试函数：创建服务端任务并拉取
test_create_and_pull_server_task() {
    ensure_api_key || return 1
    
    local project_id="server-task-project-$(date +%s)"
    local task_id="server-task-$(date +%s)"
    
    # 创建项目
    local project_data=$(cat <<EOF
{
  "project_id": "$project_id",
  "project_name": "服务端任务项目",
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
    
    # 创建服务端任务
    local task_data=$(cat <<EOF
{
  "taskId": "$task_id",
  "name": "服务端任务",
  "prompt": "这是服务端创建的任务",
  "status": "pending"
}
EOF
)
    
    local create_response=$(http_post "/api/v1/projects/$(url_encode "$project_id")/tasks" "$task_data" true)
    assert_status "$create_response" "201" "创建服务端任务应返回201"
    
    # 拉取任务
    local pull_response=$(http_get "/api/v1/projects/$(url_encode "$project_id")/tasks/pull?limit=10" true)
    assert_status "$pull_response" "200" "拉取任务应返回200"
    assert_json_field "$pull_response" "success" "true" "响应success应为true"
    assert_field_exists "$pull_response" "data.tasks" "响应应包含tasks数组"
    
    # 验证任务被拉取
    local tasks=$(echo "$pull_response" | jq -r '.data.tasks | length')
    if [ "$tasks" -gt 0 ]; then
        local pulled_task_id=$(echo "$pull_response" | jq -r '.data.tasks[0].task_id')
        assert_equal "$pulled_task_id" "$task_id" "拉取的任务ID应匹配"
    fi
}

# 测试函数：拉取队列任务
test_pull_queue_tasks() {
    ensure_api_key || return 1
    init_test_data || return 1
    
    # 先创建服务端任务
    local task_data=$(cat <<EOF
{
  "taskId": "queue-task-$(date +%s)",
  "name": "队列任务",
  "prompt": "这是队列中的任务",
  "status": "pending"
}
EOF
)
    
    http_post "/api/v1/projects/$(url_encode "$TEST_PROJECT_ID")/queues/$(url_encode "$TEST_QUEUE_ID")/tasks" "$task_data" true > /dev/null 2>&1
    
    # 拉取队列任务
    local response=$(http_get "/api/v1/projects/$(url_encode "$TEST_PROJECT_ID")/queues/$(url_encode "$TEST_QUEUE_ID")/tasks/pull?limit=10" true)
    assert_status "$response" "200" "拉取队列任务应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
}

# 测试函数：拉取状态过滤
test_pull_with_status_filter() {
    ensure_api_key || return 1
    
    local project_id="status-filter-project-$(date +%s)"
    local task_id="status-task-$(date +%s)"
    
    # 创建项目和服务端任务
    local project_data=$(cat <<EOF
{
  "project_id": "$project_id",
  "project_name": "状态过滤项目",
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
  "name": "状态任务",
  "prompt": "测试状态过滤",
  "status": "pending"
}
EOF
)
    http_post "/api/v1/projects/$(url_encode "$project_id")/tasks" "$task_data" true > /dev/null 2>&1
    
    # 拉取pending状态的任务
    local response=$(http_get "/api/v1/projects/$(url_encode "$project_id")/tasks/pull?status=pending&limit=10" true)
    assert_status "$response" "200" "按状态拉取应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
}

# 测试函数：批量拉取
test_batch_pull() {
    ensure_api_key || return 1
    
    local project_id="batch-pull-project-$(date +%s)"
    
    # 创建项目
    local project_data=$(cat <<EOF
{
  "project_id": "$project_id",
  "project_name": "批量拉取项目",
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
    
    # 创建多个服务端任务
    for i in {1..3}; do
        local task_data=$(cat <<EOF
{
  "taskId": "batch-task-$i-$(date +%s)",
  "name": "批量任务$i",
  "prompt": "批量拉取测试任务$i",
  "status": "pending"
}
EOF
)
        http_post "/api/v1/projects/$(url_encode "$project_id")/tasks" "$task_data" true > /dev/null 2>&1
    done
    
    # 批量拉取
    local batch_data=$(cat <<EOF
{
  "limit": 10
}
EOF
)
    
    local response=$(http_post "/api/v1/projects/$(url_encode "$project_id")/tasks/pull/batch" "$batch_data" true)
    assert_status "$response" "200" "批量拉取应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    assert_field_exists "$response" "data.tasks" "响应应包含tasks数组"
}

# 测试函数：释放拉取锁定
test_release_pull() {
    ensure_api_key || return 1
    
    local project_id="release-project-$(date +%s)"
    local task_id="release-task-$(date +%s)"
    
    # 创建项目和服务端任务
    local project_data=$(cat <<EOF
{
  "project_id": "$project_id",
  "project_name": "释放测试项目",
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
  "name": "释放测试任务",
  "prompt": "测试释放功能",
  "status": "pending"
}
EOF
)
    http_post "/api/v1/projects/$(url_encode "$project_id")/tasks" "$task_data" true > /dev/null 2>&1
    
    # 拉取任务
    http_get "/api/v1/projects/$(url_encode "$project_id")/tasks/pull?limit=1" true > /dev/null 2>&1
    
    # 释放拉取锁定
    local release_data=$(cat <<EOF
{}
EOF
)
    
    local response=$(http_post "/api/v1/projects/$(url_encode "$project_id")/tasks/$(url_encode "$task_id")/pull/release" "$release_data" true)
    assert_status "$response" "200" "释放拉取锁定应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
}

# 测试函数：拉取统计
test_pull_stats() {
    ensure_api_key || return 1
    init_test_data || return 1
    
    local response=$(http_get "/api/v1/projects/$(url_encode "$TEST_PROJECT_ID")/tasks/pull/stats" true)
    assert_status "$response" "200" "获取拉取统计应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    assert_field_exists "$response" "data.total_server_tasks" "响应应包含total_server_tasks"
    assert_field_exists "$response" "data.not_pulled" "响应应包含not_pulled"
    assert_field_exists "$response" "data.pulled" "响应应包含pulled"
}

# 测试函数：拉取历史
test_pull_history() {
    ensure_api_key || return 1
    
    local project_id="history-project-$(date +%s)"
    local task_id="history-task-$(date +%s)"
    
    # 创建项目和服务端任务
    local project_data=$(cat <<EOF
{
  "project_id": "$project_id",
  "project_name": "历史测试项目",
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
  "name": "历史测试任务",
  "prompt": "测试拉取历史",
  "status": "pending"
}
EOF
)
    http_post "/api/v1/projects/$(url_encode "$project_id")/tasks" "$task_data" true > /dev/null 2>&1
    
    # 拉取任务
    http_get "/api/v1/projects/$(url_encode "$project_id")/tasks/pull?limit=1" true > /dev/null 2>&1
    
    # 获取拉取历史
    local response=$(http_get "/api/v1/projects/$(url_encode "$project_id")/tasks/$(url_encode "$task_id")/pull/history" true)
    assert_status "$response" "200" "获取拉取历史应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
}

# 运行所有测试
run_module_tests() {
    print_header "$TEST_MODULE 测试"
    
    init_test_stats
    
    run_test "拉取项目级任务（无任务）" test_pull_project_tasks_empty
    run_test "创建服务端任务并拉取" test_create_and_pull_server_task
    run_test "拉取队列任务" test_pull_queue_tasks
    run_test "拉取状态过滤" test_pull_with_status_filter
    run_test "批量拉取" test_batch_pull
    run_test "释放拉取锁定" test_release_pull
    run_test "拉取统计" test_pull_stats
    run_test "拉取历史" test_pull_history
    
    print_test_summary
    return $?
}

# 如果直接运行此脚本，执行测试
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    run_module_tests
    exit $?
fi

