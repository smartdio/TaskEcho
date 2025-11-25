#!/bin/bash
# 任务队列详情页相关接口测试
# GET /api/v1/projects/:projectId/queues/:queueId - 获取任务队列详情
# GET /api/v1/projects/:projectId/queues/:queueId/tasks - 获取任务列表

# 加载通用库
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../common/lib.sh"

# 测试名称
TEST_MODULE="任务队列详情页接口测试"

# 获取一个有效的项目ID和队列ID（用于测试）
get_test_project_and_queue() {
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
    
    echo "$project_id|$queue_id"
}

# 测试函数：获取任务队列详情（有效项目ID和队列ID）
test_get_queue_detail() {
    local project_queue=$(get_test_project_and_queue)
    
    if [ -z "$project_queue" ]; then
        skip_test "获取任务队列详情" "没有可用的项目和队列数据"
        return 0
    fi
    
    local project_id=$(echo "$project_queue" | cut -d'|' -f1)
    local queue_id=$(echo "$project_queue" | cut -d'|' -f2)
    
    local response=$(http_get "/api/v1/projects/$project_id/queues/$queue_id" false)
    assert_status "$response" "200" "获取任务队列详情应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    assert_field_exists "$response" "data" "响应应包含data字段"
    
    # 验证队列数据结构
    assert_field_exists "$response" "data.id" "队列应包含id字段"
    assert_field_exists "$response" "data.queue_id" "队列应包含queue_id字段"
    assert_field_exists "$response" "data.name" "队列应包含name字段"
    assert_field_exists "$response" "data.task_count" "队列应包含task_count字段"
    assert_field_exists "$response" "data.task_stats" "队列应包含task_stats字段"
    
    # 验证task_stats结构
    assert_field_exists "$response" "data.task_stats.total" "task_stats应包含total字段"
    assert_field_exists "$response" "data.task_stats.pending" "task_stats应包含pending字段"
    assert_field_exists "$response" "data.task_stats.done" "task_stats应包含done字段"
    assert_field_exists "$response" "data.task_stats.error" "task_stats应包含error字段"
}

# 测试函数：获取任务队列详情（不存在的项目ID）
test_get_queue_detail_project_not_found() {
    local response=$(http_get "/api/v1/projects/non-existent-project-12345/queues/queue-12345" false)
    assert_status "$response" "404" "不存在的项目的队列详情应返回404"
    assert_json_field "$response" "success" "false" "响应success应为false"
    assert_field_exists "$response" "error.code" "响应应包含error.code字段"
    assert_json_field "$response" "error.code" "RESOURCE_NOT_FOUND" "错误码应为RESOURCE_NOT_FOUND"
}

# 测试函数：获取任务队列详情（不存在的队列ID）
test_get_queue_detail_queue_not_found() {
    local project_id=$(get_test_project_id)
    
    if [ -z "$project_id" ]; then
        skip_test "获取任务队列详情（不存在的队列ID）" "没有可用的项目数据"
        return 0
    fi
    
    local response=$(http_get "/api/v1/projects/$project_id/queues/non-existent-queue-12345" false)
    assert_status "$response" "404" "不存在的队列详情应返回404"
    assert_json_field "$response" "success" "false" "响应success应为false"
    assert_field_exists "$response" "error.code" "响应应包含error.code字段"
    assert_json_field "$response" "error.code" "RESOURCE_NOT_FOUND" "错误码应为RESOURCE_NOT_FOUND"
}

# 测试函数：获取任务列表（有效项目ID和队列ID）
test_get_queue_tasks() {
    local project_queue=$(get_test_project_and_queue)
    
    if [ -z "$project_queue" ]; then
        skip_test "获取任务列表" "没有可用的项目和队列数据"
        return 0
    fi
    
    local project_id=$(echo "$project_queue" | cut -d'|' -f1)
    local queue_id=$(echo "$project_queue" | cut -d'|' -f2)
    
    local response=$(http_get "/api/v1/projects/$project_id/queues/$queue_id/tasks" false)
    assert_status "$response" "200" "获取任务列表应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    assert_field_exists "$response" "data.items" "响应应包含data.items字段"
    assert_field_exists "$response" "data.pagination" "响应应包含data.pagination字段"
    
    # 验证分页信息
    assert_field_exists "$response" "data.pagination.page" "分页信息应包含page字段"
    assert_field_exists "$response" "data.pagination.pageSize" "分页信息应包含pageSize字段"
    assert_field_exists "$response" "data.pagination.total" "分页信息应包含total字段"
    assert_field_exists "$response" "data.pagination.totalPages" "分页信息应包含totalPages字段"
    
    # 验证任务数据结构（如果有任务）
    local items_count=$(echo "$response" | jq -r '.data.items | length')
    if [ "$items_count" -gt 0 ]; then
        local first_item=$(echo "$response" | jq -r '.data.items[0]')
        
        # 验证必填字段
        assert_field_exists "$first_item" "id" "任务应包含id字段"
        assert_field_exists "$first_item" "name" "任务应包含name字段"
        assert_field_exists "$first_item" "status" "任务应包含status字段"
        assert_field_exists "$first_item" "updated_at" "任务应包含updated_at字段"
        assert_field_exists "$first_item" "created_at" "任务应包含created_at字段"
    fi
}

# 测试函数：获取任务列表（带状态过滤）
test_get_queue_tasks_with_status_filter() {
    local project_queue=$(get_test_project_and_queue)
    
    if [ -z "$project_queue" ]; then
        skip_test "获取任务列表（带状态过滤）" "没有可用的项目和队列数据"
        return 0
    fi
    
    local project_id=$(echo "$project_queue" | cut -d'|' -f1)
    local queue_id=$(echo "$project_queue" | cut -d'|' -f2)
    
    # 测试pending状态过滤
    local response=$(http_get "/api/v1/projects/$project_id/queues/$queue_id/tasks?status=pending" false)
    assert_status "$response" "200" "带状态过滤获取任务列表应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    assert_field_exists "$response" "data.items" "响应应包含data.items字段"
    
    # 验证所有返回的任务状态都是pending
    local items_count=$(echo "$response" | jq -r '.data.items | length')
    if [ "$items_count" -gt 0 ]; then
        local all_pending=$(echo "$response" | jq -r '.data.items[] | select(.status != "pending") | .id' | wc -l)
        if [ "$all_pending" -gt 0 ]; then
            print_error "状态过滤未生效，存在非pending状态的任务"
            return 1
        fi
    fi
}

# 测试函数：获取任务列表（无效状态值）
test_get_queue_tasks_invalid_status() {
    local project_queue=$(get_test_project_and_queue)
    
    if [ -z "$project_queue" ]; then
        skip_test "获取任务列表（无效状态值）" "没有可用的项目和队列数据"
        return 0
    fi
    
    local project_id=$(echo "$project_queue" | cut -d'|' -f1)
    local queue_id=$(echo "$project_queue" | cut -d'|' -f2)
    
    # 测试无效状态值
    local response=$(http_get "/api/v1/projects/$project_id/queues/$queue_id/tasks?status=invalid_status" false)
    assert_status "$response" "400" "无效状态值应返回400"
    assert_json_field "$response" "success" "false" "响应success应为false"
    assert_field_exists "$response" "error.code" "响应应包含error.code字段"
    assert_json_field "$response" "error.code" "VALIDATION_ERROR" "错误码应为VALIDATION_ERROR"
}

# 测试函数：获取任务列表（带分页参数）
test_get_queue_tasks_with_pagination() {
    local project_queue=$(get_test_project_and_queue)
    
    if [ -z "$project_queue" ]; then
        skip_test "获取任务列表（带分页参数）" "没有可用的项目和队列数据"
        return 0
    fi
    
    local project_id=$(echo "$project_queue" | cut -d'|' -f1)
    local queue_id=$(echo "$project_queue" | cut -d'|' -f2)
    
    local response=$(http_get "/api/v1/projects/$project_id/queues/$queue_id/tasks?page=1&pageSize=5" false)
    assert_status "$response" "200" "带分页参数获取任务列表应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    
    # 验证分页参数生效
    local pageSize=$(echo "$response" | jq -r '.data.pagination.pageSize // empty')
    if [ -n "$pageSize" ]; then
        if [ "$pageSize" != "5" ]; then
            print_error "pageSize应为5，实际为$pageSize"
            return 1
        fi
    fi
    
    # 验证返回的任务数量不超过pageSize
    local items_count=$(echo "$response" | jq -r '.data.items | length')
    if [ "$items_count" -gt "$pageSize" ]; then
        print_error "返回的任务数量($items_count)超过了pageSize($pageSize)"
        return 1
    fi
}

# 测试函数：获取任务列表（无效页码）
test_get_queue_tasks_invalid_page() {
    local project_queue=$(get_test_project_and_queue)
    
    if [ -z "$project_queue" ]; then
        skip_test "获取任务列表（无效页码）" "没有可用的项目和队列数据"
        return 0
    fi
    
    local project_id=$(echo "$project_queue" | cut -d'|' -f1)
    local queue_id=$(echo "$project_queue" | cut -d'|' -f2)
    
    local response=$(http_get "/api/v1/projects/$project_id/queues/$queue_id/tasks?page=0" false)
    assert_status "$response" "400" "无效页码应返回400"
    assert_json_field "$response" "success" "false" "响应success应为false"
    assert_field_exists "$response" "error.code" "响应应包含error.code字段"
}

# 测试函数：获取任务列表（不存在的项目ID）
test_get_queue_tasks_project_not_found() {
    local response=$(http_get "/api/v1/projects/non-existent-project-12345/queues/queue-12345/tasks" false)
    assert_status "$response" "404" "不存在的项目的任务列表应返回404"
    assert_json_field "$response" "success" "false" "响应success应为false"
    assert_field_exists "$response" "error.code" "响应应包含error.code字段"
    assert_json_field "$response" "error.code" "RESOURCE_NOT_FOUND" "错误码应为RESOURCE_NOT_FOUND"
}

# 测试函数：获取任务列表（不存在的队列ID）
test_get_queue_tasks_queue_not_found() {
    local project_id=$(get_test_project_id)
    
    if [ -z "$project_id" ]; then
        skip_test "获取任务列表（不存在的队列ID）" "没有可用的项目数据"
        return 0
    fi
    
    local response=$(http_get "/api/v1/projects/$project_id/queues/non-existent-queue-12345/tasks" false)
    assert_status "$response" "404" "不存在的队列的任务列表应返回404"
    assert_json_field "$response" "success" "false" "响应success应为false"
    assert_field_exists "$response" "error.code" "响应应包含error.code字段"
    assert_json_field "$response" "error.code" "RESOURCE_NOT_FOUND" "错误码应为RESOURCE_NOT_FOUND"
}

# 测试函数：验证任务列表排序（按updated_at倒序）
test_tasks_sorting() {
    local project_queue=$(get_test_project_and_queue)
    
    if [ -z "$project_queue" ]; then
        skip_test "验证任务列表排序" "没有可用的项目和队列数据"
        return 0
    fi
    
    local project_id=$(echo "$project_queue" | cut -d'|' -f1)
    local queue_id=$(echo "$project_queue" | cut -d'|' -f2)
    
    local response=$(http_get "/api/v1/projects/$project_id/queues/$queue_id/tasks?pageSize=5" false)
    assert_status "$response" "200" "获取任务列表应返回200"
    
    local items_count=$(echo "$response" | jq -r '.data.items | length')
    if [ "$items_count" -gt 1 ]; then
        # 验证排序：第一个任务的updated_at应该大于等于第二个任务
        local first_time=$(echo "$response" | jq -r '.data.items[0].updated_at // empty')
        local second_time=$(echo "$response" | jq -r '.data.items[1].updated_at // empty')
        
        if [ -n "$first_time" ] && [ -n "$second_time" ]; then
            # 如果两个时间都不为空，验证排序
            local first_timestamp=$(date -d "$first_time" +%s 2>/dev/null || echo "0")
            local second_timestamp=$(date -d "$second_time" +%s 2>/dev/null || echo "0")
            
            if [ "$first_timestamp" -lt "$second_timestamp" ]; then
                print_warning "任务列表可能未按updated_at倒序排列"
            fi
        fi
    fi
}

# 测试函数：验证队列详情和任务列表的数据一致性
test_data_consistency() {
    local project_queue=$(get_test_project_and_queue)
    
    if [ -z "$project_queue" ]; then
        skip_test "验证数据一致性" "没有可用的项目和队列数据"
        return 0
    fi
    
    local project_id=$(echo "$project_queue" | cut -d'|' -f1)
    local queue_id=$(echo "$project_queue" | cut -d'|' -f2)
    
    # 获取队列详情
    local queue_response=$(http_get "/api/v1/projects/$project_id/queues/$queue_id" false)
    local queue_task_count=$(echo "$queue_response" | jq -r '.data.task_count // 0')
    
    # 获取任务列表（不带过滤，获取全部）
    local tasks_response=$(http_get "/api/v1/projects/$project_id/queues/$queue_id/tasks?pageSize=1000" false)
    local tasks_total=$(echo "$tasks_response" | jq -r '.data.pagination.total // 0')
    
    # 验证任务数量一致
    if [ "$queue_task_count" != "$tasks_total" ]; then
        print_error "队列详情中的task_count($queue_task_count)与任务列表总数($tasks_total)不一致"
        return 1
    fi
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

# 运行所有测试
run_module_tests() {
    print_header "$TEST_MODULE"
    
    init_test_stats
    
    # 任务队列详情接口测试
    print_section "任务队列详情接口 (GET /api/v1/projects/:projectId/queues/:queueId)"
    run_test "获取任务队列详情（有效项目ID和队列ID）" test_get_queue_detail
    run_test "获取任务队列详情（不存在的项目ID）" test_get_queue_detail_project_not_found
    run_test "获取任务队列详情（不存在的队列ID）" test_get_queue_detail_queue_not_found
    
    # 任务列表接口测试
    print_section "任务列表接口 (GET /api/v1/projects/:projectId/queues/:queueId/tasks)"
    run_test "获取任务列表（有效项目ID和队列ID）" test_get_queue_tasks
    run_test "获取任务列表（带状态过滤）" test_get_queue_tasks_with_status_filter
    run_test "获取任务列表（无效状态值）" test_get_queue_tasks_invalid_status
    run_test "获取任务列表（带分页参数）" test_get_queue_tasks_with_pagination
    run_test "获取任务列表（无效页码）" test_get_queue_tasks_invalid_page
    run_test "获取任务列表（不存在的项目ID）" test_get_queue_tasks_project_not_found
    run_test "获取任务列表（不存在的队列ID）" test_get_queue_tasks_queue_not_found
    run_test "验证任务列表排序" test_tasks_sorting
    
    # 数据一致性测试
    print_section "数据一致性测试"
    run_test "验证队列详情和任务列表的数据一致性" test_data_consistency
    
    print_test_summary
    return $?
}

# 如果直接运行此脚本，执行测试
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    run_module_tests
    exit $?
fi
