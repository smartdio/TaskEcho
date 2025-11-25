#!/bin/bash
# 增量更新接口测试
# POST /api/v1/tasks/:projectId/:queueId/:taskId/message
# POST /api/v1/tasks/:projectId/:queueId/:taskId/log
# PATCH /api/v1/tasks/:projectId/:queueId/:taskId/status

# 加载通用库
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../common/lib.sh"

# 测试名称
TEST_MODULE="增量更新接口"

# 测试用的项目ID、队列ID和任务ID（使用时间戳确保唯一性）
TEST_PROJECT_ID="test-incr-project-$(date +%s)"
TEST_QUEUE_ID="test-incr-queue-$(date +%s)"
TEST_TASK_ID="test-incr-task-$(date +%s)"

# 准备测试数据：先创建一个任务
setup_test_task() {
    ensure_api_key || return 1
    
    local data=$(cat <<EOF
{
  "project_id": "$TEST_PROJECT_ID",
  "project_name": "增量更新测试项目",
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "增量更新测试队列",
  "tasks": [
    {
      "id": "$TEST_TASK_ID",
      "name": "增量更新测试任务",
      "prompt": "这是一个用于测试增量更新的任务",
      "status": "pending"
    }
  ]
}
EOF
)
    
    local response=$(http_post "/api/v1/submit" "$data" true)
    local status_code=$(get_status_code "$response")
    
    if [ "$status_code" != "200" ]; then
        print_error "无法创建测试任务，状态码: $status_code"
        local body=$(get_response_body "$response")
        echo -e "    ${GRAY}响应: $body${NC}"
        return 1
    fi
    
    return 0
}

# 测试函数：追加消息 - 缺少 API Key（应该返回 401）
test_add_message_without_api_key() {
    local data='{"role": "user", "content": "测试消息"}'
    local url="/api/v1/tasks/$TEST_PROJECT_ID/$TEST_QUEUE_ID/$TEST_TASK_ID/message"
    local response=$(http_post "$url" "$data" false)
    assert_status "$response" "401" "缺少 API Key 应返回401"
    assert_json_field "$response" "success" "false" "响应success应为false"
    assert_json_field "$response" "error.code" "INVALID_API_KEY" "错误码应为INVALID_API_KEY"
}

# 测试函数：追加消息 - 任务不存在（应该返回 404）
test_add_message_task_not_found() {
    ensure_api_key || return 1
    
    local data='{"role": "user", "content": "测试消息"}'
    local url="/api/v1/tasks/nonexistent-project/nonexistent-queue/nonexistent-task/message"
    local response=$(http_post "$url" "$data" true)
    assert_status "$response" "404" "任务不存在应返回404"
    assert_json_field "$response" "success" "false" "响应success应为false"
    assert_json_field "$response" "error.code" "RESOURCE_NOT_FOUND" "错误码应为RESOURCE_NOT_FOUND"
}

# 测试函数：追加消息 - 缺少必填字段（应该返回 400）
test_add_message_missing_fields() {
    ensure_api_key || return 1
    setup_test_task || return 1
    
    # 缺少 role
    local data1='{"content": "测试消息"}'
    local url="/api/v1/tasks/$TEST_PROJECT_ID/$TEST_QUEUE_ID/$TEST_TASK_ID/message"
    local response1=$(http_post "$url" "$data1" true)
    assert_status "$response1" "400" "缺少role应返回400"
    
    # 缺少 content
    local data2='{"role": "user"}'
    local response2=$(http_post "$url" "$data2" true)
    assert_status "$response2" "400" "缺少content应返回400"
}

# 测试函数：追加消息 - 无效的role（应该返回 400）
test_add_message_invalid_role() {
    ensure_api_key || return 1
    setup_test_task || return 1
    
    local data='{"role": "invalid_role", "content": "测试消息"}'
    local url="/api/v1/tasks/$TEST_PROJECT_ID/$TEST_QUEUE_ID/$TEST_TASK_ID/message"
    local response=$(http_post "$url" "$data" true)
    assert_status "$response" "400" "无效role应返回400"
    assert_json_field "$response" "success" "false" "响应success应为false"
}

# 测试函数：追加消息 - 基本功能
test_add_message_basic() {
    ensure_api_key || return 1
    setup_test_task || return 1
    
    local data='{"role": "user", "content": "这是用户消息"}'
    local url="/api/v1/tasks/$TEST_PROJECT_ID/$TEST_QUEUE_ID/$TEST_TASK_ID/message"
    local response=$(http_post "$url" "$data" true)
    assert_status "$response" "200" "追加消息应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    assert_field_exists "$response" "data.message_id" "响应应包含message_id"
    assert_field_exists "$response" "data.role" "响应应包含role"
    assert_field_exists "$response" "data.content" "响应应包含content"
    assert_field_exists "$response" "data.created_at" "响应应包含created_at"
    assert_json_field "$response" "data.role" "USER" "role应为USER"
    assert_json_field "$response" "data.content" "这是用户消息" "content应匹配"
}

# 测试函数：追加消息 - 追加多条消息
test_add_message_multiple() {
    ensure_api_key || return 1
    setup_test_task || return 1
    
    local url="/api/v1/tasks/$TEST_PROJECT_ID/$TEST_QUEUE_ID/$TEST_TASK_ID/message"
    
    # 第一条消息
    local data1='{"role": "user", "content": "第一条用户消息"}'
    local response1=$(http_post "$url" "$data1" true)
    assert_status "$response1" "200" "追加第一条消息应返回200"
    
    # 第二条消息
    local data2='{"role": "assistant", "content": "第一条AI回复"}'
    local response2=$(http_post "$url" "$data2" true)
    assert_status "$response2" "200" "追加第二条消息应返回200"
    assert_json_field "$response2" "data.role" "ASSISTANT" "第二条消息role应为ASSISTANT"
}

# 测试函数：追加消息后查询任务详情，验证消息是否正确返回
test_add_message_and_query_task_detail() {
    ensure_api_key || return 1
    setup_test_task || return 1
    
    local url="/api/v1/tasks/$TEST_PROJECT_ID/$TEST_QUEUE_ID/$TEST_TASK_ID/message"
    
    # 追加用户消息
    local data1='{"role": "user", "content": "测试查询消息"}'
    local response1=$(http_post "$url" "$data1" true)
    assert_status "$response1" "200" "追加用户消息应返回200"
    
    # 追加助手消息
    local data2='{"role": "assistant", "content": "测试查询回复"}'
    local response2=$(http_post "$url" "$data2" true)
    assert_status "$response2" "200" "追加助手消息应返回200"
    
    # 等待一小段时间，确保数据已保存
    sleep 0.5
    
    # 查询任务详情（需要认证）
    local detail_url="/api/v1/projects/$TEST_PROJECT_ID/queues/$TEST_QUEUE_ID/tasks/$TEST_TASK_ID"
    local detail_response=$(http_get "$detail_url" true)
    assert_status "$detail_response" "200" "查询任务详情应返回200"
    assert_json_field "$detail_response" "success" "true" "响应success应为true"
    
    # 验证messages字段存在
    assert_field_exists "$detail_response" "data.messages" "任务详情应包含messages字段"
    
    # 验证messages是数组
    local messages_type=$(echo "$detail_response" | jq -r 'type(.data.messages)')
    if [ "$messages_type" != "array" ]; then
        print_error "messages字段应为数组类型，实际为$messages_type"
        return 1
    fi
    
    # 验证消息数量（应该至少有2条）
    local messages_count=$(echo "$detail_response" | jq -r '.data.messages | length')
    if [ "$messages_count" -lt 2 ]; then
        print_error "消息数量不正确: 期望至少2条，实际为$messages_count"
        [ "$VERBOSE" = "true" ] && echo "$detail_response" | jq '.data.messages' 2>/dev/null
        return 1
    fi
    
    # 验证最后一条消息是助手消息
    local last_message_role=$(echo "$detail_response" | jq -r '.data.messages[-1].role // empty')
    local last_message_content=$(echo "$detail_response" | jq -r '.data.messages[-1].content // empty')
    
    if [ "$last_message_role" != "assistant" ]; then
        print_error "最后一条消息角色不正确: 期望assistant，实际为$last_message_role"
        return 1
    fi
    
    if [ "$last_message_content" != "测试查询回复" ]; then
        print_error "最后一条消息内容不正确: 期望'测试查询回复'，实际为'$last_message_content'"
        return 1
    fi
    
    # 验证消息结构
    assert_field_exists "$detail_response" "data.messages[0].role" "消息应包含role字段"
    assert_field_exists "$detail_response" "data.messages[0].content" "消息应包含content字段"
    assert_field_exists "$detail_response" "data.messages[0].created_at" "消息应包含created_at字段"
    
    print_success "追加消息后查询任务详情测试通过: 找到 $messages_count 条消息"
}

# 测试函数：追加日志 - 缺少 API Key（应该返回 401）
test_add_log_without_api_key() {
    local data='{"content": "测试日志"}'
    local url="/api/v1/tasks/$TEST_PROJECT_ID/$TEST_QUEUE_ID/$TEST_TASK_ID/log"
    local response=$(http_post "$url" "$data" false)
    assert_status "$response" "401" "缺少 API Key 应返回401"
}

# 测试函数：追加日志 - 任务不存在（应该返回 404）
test_add_log_task_not_found() {
    ensure_api_key || return 1
    
    local data='{"content": "测试日志"}'
    local url="/api/v1/tasks/nonexistent-project/nonexistent-queue/nonexistent-task/log"
    local response=$(http_post "$url" "$data" true)
    assert_status "$response" "404" "任务不存在应返回404"
}

# 测试函数：追加日志 - 缺少必填字段（应该返回 400）
test_add_log_missing_content() {
    ensure_api_key || return 1
    setup_test_task || return 1
    
    local data='{}'
    local url="/api/v1/tasks/$TEST_PROJECT_ID/$TEST_QUEUE_ID/$TEST_TASK_ID/log"
    local response=$(http_post "$url" "$data" true)
    assert_status "$response" "400" "缺少content应返回400"
}

# 测试函数：追加日志 - 基本功能
test_add_log_basic() {
    ensure_api_key || return 1
    setup_test_task || return 1
    
    local data='{"content": "开始执行任务..."}'
    local url="/api/v1/tasks/$TEST_PROJECT_ID/$TEST_QUEUE_ID/$TEST_TASK_ID/log"
    local response=$(http_post "$url" "$data" true)
    assert_status "$response" "200" "追加日志应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    assert_field_exists "$response" "data.log_id" "响应应包含log_id"
    assert_field_exists "$response" "data.content" "响应应包含content"
    assert_field_exists "$response" "data.created_at" "响应应包含created_at"
    assert_json_field "$response" "data.content" "开始执行任务..." "content应匹配"
}

# 测试函数：追加日志 - 追加多条日志
test_add_log_multiple() {
    ensure_api_key || return 1
    setup_test_task || return 1
    
    local url="/api/v1/tasks/$TEST_PROJECT_ID/$TEST_QUEUE_ID/$TEST_TASK_ID/log"
    
    # 第一条日志
    local data1='{"content": "日志1: 初始化"}'
    local response1=$(http_post "$url" "$data1" true)
    assert_status "$response1" "200" "追加第一条日志应返回200"
    
    # 第二条日志
    local data2='{"content": "日志2: 执行中"}'
    local response2=$(http_post "$url" "$data2" true)
    assert_status "$response2" "200" "追加第二条日志应返回200"
}

# 测试函数：更新状态 - 缺少 API Key（应该返回 401）
test_update_status_without_api_key() {
    local data='{"status": "done"}'
    local url="/api/v1/tasks/$TEST_PROJECT_ID/$TEST_QUEUE_ID/$TEST_TASK_ID/status"
    local response=$(http_patch "$url" "$data" false)
    assert_status "$response" "401" "缺少 API Key 应返回401"
}

# 测试函数：更新状态 - 任务不存在（应该返回 404）
test_update_status_task_not_found() {
    ensure_api_key || return 1
    
    local data='{"status": "done"}'
    local url="/api/v1/tasks/nonexistent-project/nonexistent-queue/nonexistent-task/status"
    local response=$(http_patch "$url" "$data" true)
    assert_status "$response" "404" "任务不存在应返回404"
}

# 测试函数：更新状态 - 缺少必填字段（应该返回 400）
test_update_status_missing_status() {
    ensure_api_key || return 1
    setup_test_task || return 1
    
    local data='{}'
    local url="/api/v1/tasks/$TEST_PROJECT_ID/$TEST_QUEUE_ID/$TEST_TASK_ID/status"
    local response=$(http_patch "$url" "$data" true)
    assert_status "$response" "400" "缺少status应返回400"
}

# 测试函数：更新状态 - 无效的状态值（应该返回 400）
test_update_status_invalid_status() {
    ensure_api_key || return 1
    setup_test_task || return 1
    
    local data='{"status": "invalid_status"}'
    local url="/api/v1/tasks/$TEST_PROJECT_ID/$TEST_QUEUE_ID/$TEST_TASK_ID/status"
    local response=$(http_patch "$url" "$data" true)
    assert_status "$response" "400" "无效status应返回400"
    assert_json_field "$response" "success" "false" "响应success应为false"
}

# 测试函数：更新状态 - 基本功能
test_update_status_basic() {
    ensure_api_key || return 1
    setup_test_task || return 1
    
    local data='{"status": "done"}'
    local url="/api/v1/tasks/$TEST_PROJECT_ID/$TEST_QUEUE_ID/$TEST_TASK_ID/status"
    local response=$(http_patch "$url" "$data" true)
    assert_status "$response" "200" "更新状态应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    assert_field_exists "$response" "data.task_id" "响应应包含task_id"
    assert_field_exists "$response" "data.status" "响应应包含status"
    assert_field_exists "$response" "data.previous_status" "响应应包含previous_status"
    assert_field_exists "$response" "data.updated_at" "响应应包含updated_at"
    assert_json_field "$response" "data.status" "DONE" "status应为DONE"
    assert_json_field "$response" "data.previous_status" "PENDING" "previous_status应为PENDING"
}

# 测试函数：更新状态 - 状态转换
test_update_status_transitions() {
    ensure_api_key || return 1
    setup_test_task || return 1
    
    local url="/api/v1/tasks/$TEST_PROJECT_ID/$TEST_QUEUE_ID/$TEST_TASK_ID/status"
    
    # pending -> done
    local data1='{"status": "done"}'
    local response1=$(http_patch "$url" "$data1" true)
    assert_status "$response1" "200" "pending->done应返回200"
    assert_json_field "$response1" "data.status" "DONE" "状态应为DONE"
    
    # done -> error
    local data2='{"status": "error"}'
    local response2=$(http_patch "$url" "$data2" true)
    assert_status "$response2" "200" "done->error应返回200"
    assert_json_field "$response2" "data.status" "ERROR" "状态应为ERROR"
    assert_json_field "$response2" "data.previous_status" "DONE" "previous_status应为DONE"
    
    # error -> pending
    local data3='{"status": "pending"}'
    local response3=$(http_patch "$url" "$data3" true)
    assert_status "$response3" "200" "error->pending应返回200"
    assert_json_field "$response3" "data.status" "PENDING" "状态应为PENDING"
}

# 测试函数：完整流程 - 创建任务、追加消息、追加日志、更新状态
test_incremental_update_workflow() {
    ensure_api_key || return 1
    
    # 创建新任务
    local timestamp=$(date +%s)
    TEST_PROJECT_ID="test-workflow-project-$timestamp"
    TEST_QUEUE_ID="test-workflow-queue-$timestamp"
    TEST_TASK_ID="test-workflow-task-$timestamp"
    
    setup_test_task || return 1
    
    # 追加用户消息
    local message_url="/api/v1/tasks/$TEST_PROJECT_ID/$TEST_QUEUE_ID/$TEST_TASK_ID/message"
    local message_data='{"role": "user", "content": "请帮我实现登录功能"}'
    local message_response=$(http_post "$message_url" "$message_data" true)
    assert_status "$message_response" "200" "追加用户消息应返回200"
    
    # 追加AI回复
    local ai_message_data='{"role": "assistant", "content": "好的，我来帮你实现登录功能..."}'
    local ai_message_response=$(http_post "$message_url" "$ai_message_data" true)
    assert_status "$ai_message_response" "200" "追加AI回复应返回200"
    
    # 追加执行日志
    local log_url="/api/v1/tasks/$TEST_PROJECT_ID/$TEST_QUEUE_ID/$TEST_TASK_ID/log"
    local log_data='{"content": "开始执行任务，正在初始化..."}'
    local log_response=$(http_post "$log_url" "$log_data" true)
    assert_status "$log_response" "200" "追加日志应返回200"
    
    # 更新状态为done
    local status_url="/api/v1/tasks/$TEST_PROJECT_ID/$TEST_QUEUE_ID/$TEST_TASK_ID/status"
    local status_data='{"status": "done"}'
    local status_response=$(http_patch "$status_url" "$status_data" true)
    assert_status "$status_response" "200" "更新状态应返回200"
    assert_json_field "$status_response" "data.status" "DONE" "最终状态应为DONE"
}

# 运行所有测试
run_module_tests() {
    print_header "$TEST_MODULE 测试"
    
    init_test_stats
    
    # 追加消息接口测试
    print_section "追加消息接口 (POST /api/v1/tasks/.../message)"
    run_test "缺少 API Key" test_add_message_without_api_key
    run_test "任务不存在" test_add_message_task_not_found
    run_test "缺少必填字段" test_add_message_missing_fields
    run_test "无效的role" test_add_message_invalid_role
    run_test "基本功能" test_add_message_basic
    run_test "追加多条消息" test_add_message_multiple
    run_test "追加消息后查询任务详情" test_add_message_and_query_task_detail
    
    # 追加日志接口测试
    print_section "追加日志接口 (POST /api/v1/tasks/.../log)"
    run_test "缺少 API Key" test_add_log_without_api_key
    run_test "任务不存在" test_add_log_task_not_found
    run_test "缺少必填字段" test_add_log_missing_content
    run_test "基本功能" test_add_log_basic
    run_test "追加多条日志" test_add_log_multiple
    
    # 更新状态接口测试
    print_section "更新状态接口 (PATCH /api/v1/tasks/.../status)"
    run_test "缺少 API Key" test_update_status_without_api_key
    run_test "任务不存在" test_update_status_task_not_found
    run_test "缺少必填字段" test_update_status_missing_status
    run_test "无效的状态值" test_update_status_invalid_status
    run_test "基本功能" test_update_status_basic
    run_test "状态转换" test_update_status_transitions
    
    # 完整流程测试
    print_section "完整流程测试"
    run_test "完整工作流" test_incremental_update_workflow
    
    print_test_summary
    return $?
}

# 如果直接运行此脚本，执行测试
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    run_module_tests
    exit $?
fi
