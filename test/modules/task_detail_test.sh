#!/bin/bash
# 任务详情页相关接口测试
# GET /api/v1/projects/:projectId/queues/:queueId/tasks/:taskId - 获取任务详情

# 加载通用库
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../common/lib.sh"

# 测试名称
TEST_MODULE="任务详情页接口测试"

# 获取一个有效的项目ID、队列ID和任务ID（用于测试）
get_test_project_queue_task() {
    local response=$(http_get "/api/v1/projects?page=1&pageSize=1" false)
    # 分离响应体和状态码
    local body=$(echo "$response" | sed 's/|.*$//')
    local http_code=$(echo "$response" | sed 's/^.*|//')
    
    # 检查HTTP状态码
    if [ "$http_code" != "200" ]; then
        echo ""
        return 1
    fi
    
    # 检查响应是否为有效JSON
    if ! echo "$body" | jq . >/dev/null 2>&1; then
        echo ""
        return 1
    fi
    
    # 提取项目ID
    local project_id=$(echo "$body" | jq -r '.data.items[0].project_id // empty')
    
    if [ -z "$project_id" ]; then
        echo ""
        return 1
    fi
    
    # 获取该项目的队列列表
    local queues_response=$(http_get "/api/v1/projects/$project_id/queues" false)
    local queues_body=$(echo "$queues_response" | sed 's/|.*$//')
    local queues_http_code=$(echo "$queues_response" | sed 's/^.*|//')
    
    if [ "$queues_http_code" != "200" ]; then
        echo ""
        return 1
    fi
    
    # 提取队列ID
    local queue_id=$(echo "$queues_body" | jq -r '.data.items[0].queue_id // empty')
    
    if [ -z "$queue_id" ]; then
        echo ""
        return 1
    fi
    
    # 获取该队列的任务列表
    local tasks_response=$(http_get "/api/v1/projects/$project_id/queues/$queue_id/tasks?pageSize=1" false)
    local tasks_body=$(echo "$tasks_response" | sed 's/|.*$//')
    local tasks_http_code=$(echo "$tasks_response" | sed 's/^.*|//')
    
    if [ "$tasks_http_code" != "200" ]; then
        echo ""
        return 1
    fi
    
    # 提取任务ID
    local task_id=$(echo "$tasks_body" | jq -r '.data.items[0].id // empty')
    
    if [ -z "$task_id" ]; then
        echo ""
        return 1
    fi
    
    echo "$project_id|$queue_id|$task_id"
}

# 测试函数：获取任务详情（有效项目ID、队列ID和任务ID）
test_get_task_detail() {
    local project_queue_task=$(get_test_project_queue_task)
    
    if [ -z "$project_queue_task" ]; then
        skip_test "获取任务详情" "没有可用的项目、队列和任务数据"
        return 0
    fi
    
    local project_id=$(echo "$project_queue_task" | cut -d'|' -f1)
    local queue_id=$(echo "$project_queue_task" | cut -d'|' -f2)
    local task_id=$(echo "$project_queue_task" | cut -d'|' -f3)
    
    local response=$(http_get "/api/v1/projects/$project_id/queues/$queue_id/tasks/$task_id" false)
    assert_status "$response" "200" "获取任务详情应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    assert_field_exists "$response" "data" "响应应包含data字段"
    
    # 验证任务基本数据结构
    assert_field_exists "$response" "data.id" "任务应包含id字段"
    assert_field_exists "$response" "data.name" "任务应包含name字段"
    assert_field_exists "$response" "data.status" "任务应包含status字段"
    assert_field_exists "$response" "data.created_at" "任务应包含created_at字段"
    assert_field_exists "$response" "data.updated_at" "任务应包含updated_at字段"
    
    # 验证messages字段存在（详情查询应包含messages）
    assert_field_exists "$response" "data.messages" "任务详情应包含messages字段"
    
    # 验证logs字段存在（详情查询应包含logs）
    assert_field_exists "$response" "data.logs" "任务详情应包含logs字段"
    
    # 验证messages是数组
    local messages_type=$(echo "$response" | jq -r 'type(.data.messages)')
    if [ "$messages_type" != "array" ]; then
        print_error "messages字段应为数组类型，实际为$messages_type"
        return 1
    fi
    
    # 验证logs是数组
    local logs_type=$(echo "$response" | jq -r 'type(.data.logs)')
    if [ "$logs_type" != "array" ]; then
        print_error "logs字段应为数组类型，实际为$logs_type"
        return 1
    fi
}

# 测试函数：验证messages数据结构
test_messages_structure() {
    local project_queue_task=$(get_test_project_queue_task)
    
    if [ -z "$project_queue_task" ]; then
        skip_test "验证messages数据结构" "没有可用的项目、队列和任务数据"
        return 0
    fi
    
    local project_id=$(echo "$project_queue_task" | cut -d'|' -f1)
    local queue_id=$(echo "$project_queue_task" | cut -d'|' -f2)
    local task_id=$(echo "$project_queue_task" | cut -d'|' -f3)
    
    local response=$(http_get "/api/v1/projects/$project_id/queues/$queue_id/tasks/$task_id" false)
    assert_status "$response" "200" "获取任务详情应返回200"
    
    # 检查是否有messages
    local messages_count=$(echo "$response" | jq -r '.data.messages | length')
    if [ "$messages_count" -gt 0 ]; then
        # 验证第一条消息的结构
        assert_field_exists "$response" "data.messages[0].role" "消息应包含role字段"
        assert_field_exists "$response" "data.messages[0].content" "消息应包含content字段"
        assert_field_exists "$response" "data.messages[0].created_at" "消息应包含created_at字段"
        
        # 验证role字段的值（应为user或assistant，小写）
        local role=$(echo "$response" | jq -r '.data.messages[0].role // empty')
        if [ -n "$role" ]; then
            if [ "$role" != "user" ] && [ "$role" != "assistant" ]; then
                print_error "消息role应为user或assistant（小写），实际为$role"
                return 1
            fi
        fi
        
        # 验证messages按created_at正序排列
        if [ "$messages_count" -gt 1 ]; then
            local first_time=$(echo "$response" | jq -r '.data.messages[0].created_at // empty')
            local second_time=$(echo "$response" | jq -r '.data.messages[1].created_at // empty')
            
            if [ -n "$first_time" ] && [ -n "$second_time" ]; then
                local first_timestamp=$(date -d "$first_time" +%s 2>/dev/null || echo "0")
                local second_timestamp=$(date -d "$second_time" +%s 2>/dev/null || echo "0")
                
                if [ "$first_timestamp" -gt "$second_timestamp" ]; then
                    print_error "messages未按created_at正序排列"
                    return 1
                fi
            fi
        fi
    fi
}

# 测试函数：验证logs数据结构
test_logs_structure() {
    local project_queue_task=$(get_test_project_queue_task)
    
    if [ -z "$project_queue_task" ]; then
        skip_test "验证logs数据结构" "没有可用的项目、队列和任务数据"
        return 0
    fi
    
    local project_id=$(echo "$project_queue_task" | cut -d'|' -f1)
    local queue_id=$(echo "$project_queue_task" | cut -d'|' -f2)
    local task_id=$(echo "$project_queue_task" | cut -d'|' -f3)
    
    local response=$(http_get "/api/v1/projects/$project_id/queues/$queue_id/tasks/$task_id" false)
    assert_status "$response" "200" "获取任务详情应返回200"
    
    # 检查是否有logs
    local logs_count=$(echo "$response" | jq -r '.data.logs | length')
    if [ "$logs_count" -gt 0 ]; then
        # 验证第一条日志的结构
        assert_field_exists "$response" "data.logs[0].content" "日志应包含content字段"
        assert_field_exists "$response" "data.logs[0].created_at" "日志应包含created_at字段"
        
        # 验证logs按created_at倒序排列（最新的在上方）
        if [ "$logs_count" -gt 1 ]; then
            local first_time=$(echo "$response" | jq -r '.data.logs[0].created_at // empty')
            local second_time=$(echo "$response" | jq -r '.data.logs[1].created_at // empty')
            
            if [ -n "$first_time" ] && [ -n "$second_time" ]; then
                local first_timestamp=$(date -d "$first_time" +%s 2>/dev/null || echo "0")
                local second_timestamp=$(date -d "$second_time" +%s 2>/dev/null || echo "0")
                
                if [ "$first_timestamp" -lt "$second_timestamp" ]; then
                    print_error "logs未按created_at倒序排列（最新的应在上方）"
                    return 1
                fi
            fi
        fi
    fi
}

# 测试函数：获取任务详情（不存在的项目ID）
test_get_task_detail_project_not_found() {
    local response=$(http_get "/api/v1/projects/non-existent-project-12345/queues/queue-12345/tasks/task-12345" false)
    assert_status "$response" "404" "不存在的项目的任务详情应返回404"
    assert_json_field "$response" "success" "false" "响应success应为false"
    assert_field_exists "$response" "error.code" "响应应包含error.code字段"
    assert_json_field "$response" "error.code" "RESOURCE_NOT_FOUND" "错误码应为RESOURCE_NOT_FOUND"
}

# 测试函数：获取任务详情（不存在的队列ID）
test_get_task_detail_queue_not_found() {
    local project_id=$(get_test_project_id)
    
    if [ -z "$project_id" ]; then
        skip_test "获取任务详情（不存在的队列ID）" "没有可用的项目数据"
        return 0
    fi
    
    local response=$(http_get "/api/v1/projects/$project_id/queues/non-existent-queue-12345/tasks/task-12345" false)
    assert_status "$response" "404" "不存在的队列的任务详情应返回404"
    assert_json_field "$response" "success" "false" "响应success应为false"
    assert_field_exists "$response" "error.code" "响应应包含error.code字段"
    assert_json_field "$response" "error.code" "RESOURCE_NOT_FOUND" "错误码应为RESOURCE_NOT_FOUND"
}

# 测试函数：获取任务详情（不存在的任务ID）
test_get_task_detail_task_not_found() {
    local project_queue=$(get_test_project_and_queue)
    
    if [ -z "$project_queue" ]; then
        skip_test "获取任务详情（不存在的任务ID）" "没有可用的项目和队列数据"
        return 0
    fi
    
    local project_id=$(echo "$project_queue" | cut -d'|' -f1)
    local queue_id=$(echo "$project_queue" | cut -d'|' -f2)
    
    local response=$(http_get "/api/v1/projects/$project_id/queues/$queue_id/tasks/non-existent-task-12345" false)
    assert_status "$response" "404" "不存在的任务详情应返回404"
    assert_json_field "$response" "success" "false" "响应success应为false"
    assert_field_exists "$response" "error.code" "响应应包含error.code字段"
    assert_json_field "$response" "error.code" "RESOURCE_NOT_FOUND" "错误码应为RESOURCE_NOT_FOUND"
}

# 辅助函数：获取测试项目ID
get_test_project_id() {
    local response=$(http_get "/api/v1/projects?page=1&pageSize=1" false)
    local body=$(echo "$response" | sed 's/|.*$//')
    local http_code=$(echo "$response" | sed 's/^.*|//')
    
    if [ "$http_code" != "200" ]; then
        echo ""
        return 1
    fi
    
    if ! echo "$body" | jq . >/dev/null 2>&1; then
        echo ""
        return 1
    fi
    
    local project_id=$(echo "$body" | jq -r '.data.items[0].project_id // empty')
    echo "$project_id"
}

# 辅助函数：获取测试项目和队列ID
get_test_project_and_queue() {
    local response=$(http_get "/api/v1/projects?page=1&pageSize=1" false)
    local body=$(echo "$response" | sed 's/|.*$//')
    local http_code=$(echo "$response" | sed 's/^.*|//')
    
    if [ "$http_code" != "200" ]; then
        echo ""
        return 1
    fi
    
    if ! echo "$body" | jq . >/dev/null 2>&1; then
        echo ""
        return 1
    fi
    
    local project_id=$(echo "$body" | jq -r '.data.items[0].project_id // empty')
    
    if [ -z "$project_id" ]; then
        echo ""
        return 1
    fi
    
    local queues_response=$(http_get "/api/v1/projects/$project_id/queues" false)
    local queues_body=$(echo "$queues_response" | sed 's/|.*$//')
    local queues_http_code=$(echo "$queues_response" | sed 's/^.*|//')
    
    if [ "$queues_http_code" != "200" ]; then
        echo ""
        return 1
    fi
    
    local queue_id=$(echo "$queues_body" | jq -r '.data.items[0].queue_id // empty')
    
    if [ -z "$queue_id" ]; then
        echo ""
        return 1
    fi
    
    echo "$project_id|$queue_id"
}

# 运行所有测试
run_module_tests() {
    print_header "$TEST_MODULE"
    
    init_test_stats
    
    # 任务详情接口测试
    print_section "任务详情接口 (GET /api/v1/projects/:projectId/queues/:queueId/tasks/:taskId)"
    run_test "获取任务详情（有效项目ID、队列ID和任务ID）" test_get_task_detail
    run_test "验证messages数据结构" test_messages_structure
    run_test "验证logs数据结构" test_logs_structure
    run_test "获取任务详情（不存在的项目ID）" test_get_task_detail_project_not_found
    run_test "获取任务详情（不存在的队列ID）" test_get_task_detail_queue_not_found
    run_test "获取任务详情（不存在的任务ID）" test_get_task_detail_task_not_found
    
    print_test_summary
    return $?
}

# 如果直接运行此脚本，执行测试
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    run_module_tests
    exit $?
fi
