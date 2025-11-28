#!/bin/bash
# 项目详情页相关接口测试
# GET /api/v1/projects/:projectId - 获取项目详情
# GET /api/v1/projects/:projectId/queues - 获取任务队列列表

# 加载通用库
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../common/lib.sh"

# 测试名称
TEST_MODULE="项目详情页接口测试"

# 获取一个有效的项目ID（用于测试）
get_test_project_id() {
    local response=$(http_get "/api/v1/projects?page=1&pageSize=1" true)
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
    echo "$project_id"
}

# 测试函数：获取项目详情（有效项目ID）
test_get_project_detail() {
    local project_id=$(get_test_project_id)
    
    if [ -z "$project_id" ]; then
        skip_test "获取项目详情" "没有可用的项目数据"
        return 0
    fi
    
    local response=$(http_get "/api/v1/projects/$project_id" true)
    assert_status "$response" "200" "获取项目详情应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    assert_field_exists "$response" "data" "响应应包含data字段"
    
    # 验证项目数据结构
    assert_field_exists "$response" "data.id" "项目应包含id字段"
    assert_field_exists "$response" "data.project_id" "项目应包含project_id字段"
    assert_field_exists "$response" "data.name" "项目应包含name字段"
    assert_field_exists "$response" "data.displayTitle" "项目应包含displayTitle字段"
    assert_field_exists "$response" "data.metadata" "项目应包含metadata字段"
    assert_field_exists "$response" "data.queue_count" "项目应包含queue_count字段"
    assert_field_exists "$response" "data.task_count" "项目应包含task_count字段"
    assert_field_exists "$response" "data.task_stats" "项目应包含task_stats字段"
    
    # 验证task_stats结构
    assert_field_exists "$response" "data.task_stats.total" "task_stats应包含total字段"
    assert_field_exists "$response" "data.task_stats.pending" "task_stats应包含pending字段"
    assert_field_exists "$response" "data.task_stats.done" "task_stats应包含done字段"
    assert_field_exists "$response" "data.task_stats.error" "task_stats应包含error字段"
    
    # 验证displayTitle：如果没有metadata或customTitle为空，应该等于name
    local display_title=$(echo "$response" | jq -r '.data.displayTitle // empty')
    local name=$(echo "$response" | jq -r '.data.name // empty')
    
    if [ -z "$display_title" ]; then
        print_error "displayTitle不应为空"
        return 1
    fi
    
    # displayTitle应该至少等于name（如果没有customTitle）
    if [ "$display_title" != "$name" ]; then
        # 如果有customTitle，displayTitle可能不等于name，这是正常的
        local metadata_custom_title=$(echo "$response" | jq -r '.data.metadata.customTitle // empty')
        if [ "$metadata_custom_title" = "null" ] || [ -z "$metadata_custom_title" ]; then
            # 如果没有customTitle，displayTitle应该等于name
            print_error "没有customTitle时，displayTitle($display_title)应等于name($name)"
            return 1
        fi
    fi
}

# 测试函数：获取项目详情（不存在的项目ID）
test_get_project_detail_not_found() {
    local response=$(http_get "/api/v1/projects/non-existent-project-12345" true)
    assert_status "$response" "404" "不存在的项目应返回404"
    assert_json_field "$response" "success" "false" "响应success应为false"
    assert_field_exists "$response" "error.code" "响应应包含error.code字段"
    assert_json_field "$response" "error.code" "RESOURCE_NOT_FOUND" "错误码应为RESOURCE_NOT_FOUND"
}

# 测试函数：获取任务队列列表（有效项目ID）
test_get_project_queues() {
    local project_id=$(get_test_project_id)
    
    if [ -z "$project_id" ]; then
        skip_test "获取任务队列列表" "没有可用的项目数据"
        return 0
    fi
    
    local response=$(http_get "/api/v1/projects/$project_id/queues" true)
    assert_status "$response" "200" "获取任务队列列表应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    assert_field_exists "$response" "data.items" "响应应包含data.items字段"
    
    # 验证队列数据结构（如果有队列）
    local items_count=$(echo "$response" | jq -r '.data.items | length')
    if [ "$items_count" -gt 0 ]; then
        local first_item=$(echo "$response" | jq -r '.data.items[0]')
        
        # 验证必填字段
        assert_field_exists "$first_item" "id" "队列应包含id字段"
        assert_field_exists "$first_item" "queue_id" "队列应包含queue_id字段"
        assert_field_exists "$first_item" "name" "队列应包含name字段"
        assert_field_exists "$first_item" "task_count" "队列应包含task_count字段"
        assert_field_exists "$first_item" "task_stats" "队列应包含task_stats字段"
        
        # 验证task_stats结构
        assert_field_exists "$first_item" "task_stats.total" "task_stats应包含total字段"
        assert_field_exists "$first_item" "task_stats.pending" "task_stats应包含pending字段"
        assert_field_exists "$first_item" "task_stats.done" "task_stats应包含done字段"
        assert_field_exists "$first_item" "task_stats.error" "task_stats应包含error字段"
    fi
}

# 测试函数：获取任务队列列表（带搜索参数）
test_get_project_queues_with_search() {
    local project_id=$(get_test_project_id)
    
    if [ -z "$project_id" ]; then
        skip_test "获取任务队列列表（带搜索）" "没有可用的项目数据"
        return 0
    fi
    
    # 先获取所有队列，然后使用第一个队列的名称进行搜索
    local all_queues_response=$(http_get "/api/v1/projects/$project_id/queues" true)
    local first_queue_name=$(echo "$all_queues_response" | jq -r '.data.items[0].name // empty')
    
    if [ -z "$first_queue_name" ]; then
        skip_test "获取任务队列列表（带搜索）" "没有可用的队列数据"
        return 0
    fi
    
    # 使用队列名称的一部分进行搜索
    local search_keyword=$(echo "$first_queue_name" | cut -c1-3)
    local encoded_keyword=$(printf '%s' "$search_keyword" | jq -sRr @uri)
    local response=$(http_get "/api/v1/projects/$project_id/queues?search=$encoded_keyword" true)
    
    assert_status "$response" "200" "带搜索参数获取队列列表应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    assert_field_exists "$response" "data.items" "响应应包含data.items字段"
}

# 测试函数：获取任务队列列表（不存在的项目ID）
test_get_project_queues_not_found() {
    local response=$(http_get "/api/v1/projects/non-existent-project-12345/queues" true)
    assert_status "$response" "404" "不存在的项目的队列列表应返回404"
    assert_json_field "$response" "success" "false" "响应success应为false"
    assert_field_exists "$response" "error.code" "响应应包含error.code字段"
    assert_json_field "$response" "error.code" "RESOURCE_NOT_FOUND" "错误码应为RESOURCE_NOT_FOUND"
}

# 测试函数：验证队列列表排序（按last_task_at倒序）
test_queues_sorting() {
    local project_id=$(get_test_project_id)
    
    if [ -z "$project_id" ]; then
        skip_test "验证队列列表排序" "没有可用的项目数据"
        return 0
    fi
    
    local response=$(http_get "/api/v1/projects/$project_id/queues" true)
    assert_status "$response" "200" "获取队列列表应返回200"
    
    local items_count=$(echo "$response" | jq -r '.data.items | length')
    if [ "$items_count" -gt 1 ]; then
        # 验证排序：第一个队列的last_task_at应该大于等于第二个队列
        local first_time=$(echo "$response" | jq -r '.data.items[0].last_task_at // empty')
        local second_time=$(echo "$response" | jq -r '.data.items[1].last_task_at // empty')
        
        if [ -n "$first_time" ] && [ -n "$second_time" ]; then
            # 如果两个时间都不为空，验证排序
            local first_timestamp=$(date -d "$first_time" +%s 2>/dev/null || echo "0")
            local second_timestamp=$(date -d "$second_time" +%s 2>/dev/null || echo "0")
            
            if [ "$first_timestamp" -lt "$second_timestamp" ]; then
                print_warning "队列列表可能未按last_task_at倒序排列"
            fi
        fi
    fi
}

# 测试函数：验证项目详情和队列列表的数据一致性
test_data_consistency() {
    local project_id=$(get_test_project_id)
    
    if [ -z "$project_id" ]; then
        skip_test "验证数据一致性" "没有可用的项目数据"
        return 0
    fi
    
    # 获取项目详情
    local project_response=$(http_get "/api/v1/projects/$project_id" false)
    local project_queue_count=$(echo "$project_response" | jq -r '.data.queue_count // 0')
    
    # 获取队列列表
    local queues_response=$(http_get "/api/v1/projects/$project_id/queues" false)
    local queues_count=$(echo "$queues_response" | jq -r '.data.items | length')
    
    # 验证队列数量一致
    if [ "$project_queue_count" != "$queues_count" ]; then
        print_error "项目详情中的queue_count($project_queue_count)与队列列表数量($queues_count)不一致"
        return 1
    fi
}

# 运行所有测试
run_module_tests() {
    print_header "$TEST_MODULE"
    
    init_test_stats
    
    # 项目详情接口测试
    print_section "项目详情接口 (GET /api/v1/projects/:projectId)"
    run_test "获取项目详情（有效项目ID）" test_get_project_detail
    run_test "获取项目详情（不存在的项目ID）" test_get_project_detail_not_found
    
    # 任务队列列表接口测试
    print_section "任务队列列表接口 (GET /api/v1/projects/:projectId/queues)"
    run_test "获取任务队列列表（有效项目ID）" test_get_project_queues
    run_test "获取任务队列列表（带搜索参数）" test_get_project_queues_with_search
    run_test "获取任务队列列表（不存在的项目ID）" test_get_project_queues_not_found
    run_test "验证队列列表排序" test_queues_sorting
    
    # 数据一致性测试
    print_section "数据一致性测试"
    run_test "验证项目详情和队列列表的数据一致性" test_data_consistency
    
    # displayTitle和metadata测试
    print_section "displayTitle和metadata测试"
    run_test "验证displayTitle和metadata字段存在" test_get_project_detail
    
    print_test_summary
    return $?
}

# 如果直接运行此脚本，执行测试
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    run_module_tests
    exit $?
fi
