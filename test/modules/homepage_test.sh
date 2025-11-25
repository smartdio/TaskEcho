#!/bin/bash
# 首页相关接口测试
# GET /api/v1/projects - 项目列表
# GET /api/v1/stats - 全局统计

# 加载通用库
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../common/lib.sh"

# 测试名称
TEST_MODULE="首页接口测试"

# 测试函数：获取项目列表（默认参数）
test_get_projects_default() {
    local response=$(http_get "/api/v1/projects" false)
    assert_status "$response" "200" "获取项目列表应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    assert_field_exists "$response" "data.items" "响应应包含data.items字段"
    assert_field_exists "$response" "data.pagination" "响应应包含data.pagination字段"
    
    # 验证分页信息
    assert_field_exists "$response" "data.pagination.page" "分页信息应包含page字段"
    assert_field_exists "$response" "data.pagination.pageSize" "分页信息应包含pageSize字段"
    assert_field_exists "$response" "data.pagination.total" "分页信息应包含total字段"
    assert_field_exists "$response" "data.pagination.totalPages" "分页信息应包含totalPages字段"
}

# 测试函数：获取项目列表（指定页码和每页数量）
test_get_projects_with_pagination() {
    local response=$(http_get "/api/v1/projects?page=1&pageSize=10" false)
    assert_status "$response" "200" "获取项目列表应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    assert_field_exists "$response" "data.items" "响应应包含data.items字段"
    
    # 验证分页参数生效
    local pageSize=$(echo "$response" | jq -r '.data.pagination.pageSize // empty')
    if [ -n "$pageSize" ]; then
        if [ "$pageSize" != "10" ]; then
            print_error "pageSize应为10，实际为$pageSize"
            return 1
        fi
    fi
}

# 测试函数：获取项目列表（无效页码）
test_get_projects_invalid_page() {
    local response=$(http_get "/api/v1/projects?page=0" false)
    assert_status "$response" "400" "无效页码应返回400"
    assert_json_field "$response" "success" "false" "响应success应为false"
    assert_field_exists "$response" "error.code" "响应应包含error.code字段"
}

# 测试函数：获取项目列表（无效pageSize）
test_get_projects_invalid_page_size() {
    local response=$(http_get "/api/v1/projects?pageSize=0" false)
    assert_status "$response" "400" "无效pageSize应返回400"
    assert_json_field "$response" "success" "false" "响应success应为false"
}

# 测试函数：验证项目列表数据结构
test_projects_data_structure() {
    local response=$(http_get "/api/v1/projects?page=1&pageSize=1" false)
    assert_status "$response" "200" "获取项目列表应返回200"
    
    # 如果有项目数据，验证数据结构
    local items_count=$(echo "$response" | jq -r '.data.items | length')
    if [ "$items_count" -gt 0 ]; then
        local first_item=$(echo "$response" | jq -r '.data.items[0]')
        
        # 验证必填字段
        assert_field_exists "$first_item" "id" "项目应包含id字段"
        assert_field_exists "$first_item" "project_id" "项目应包含project_id字段"
        assert_field_exists "$first_item" "name" "项目应包含name字段"
        assert_field_exists "$first_item" "queue_count" "项目应包含queue_count字段"
        assert_field_exists "$first_item" "task_count" "项目应包含task_count字段"
        assert_field_exists "$first_item" "task_stats" "项目应包含task_stats字段"
        
        # 验证task_stats结构
        assert_field_exists "$first_item" "task_stats.total" "task_stats应包含total字段"
        assert_field_exists "$first_item" "task_stats.pending" "task_stats应包含pending字段"
        assert_field_exists "$first_item" "task_stats.done" "task_stats应包含done字段"
        assert_field_exists "$first_item" "task_stats.error" "task_stats应包含error字段"
    else
        print_info "当前没有项目数据，跳过数据结构验证"
    fi
}

# 测试函数：获取全局统计
test_get_stats() {
    local response=$(http_get "/api/v1/stats" false)
    assert_status "$response" "200" "获取全局统计应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    assert_field_exists "$response" "data" "响应应包含data字段"
    
    # 验证统计字段
    assert_field_exists "$response" "data.project_count" "统计应包含project_count字段"
    assert_field_exists "$response" "data.queue_count" "统计应包含queue_count字段"
    assert_field_exists "$response" "data.task_count" "统计应包含task_count字段"
    assert_field_exists "$response" "data.task_stats" "统计应包含task_stats字段"
    
    # 验证task_stats结构
    assert_field_exists "$response" "data.task_stats.total" "task_stats应包含total字段"
    assert_field_exists "$response" "data.task_stats.pending" "task_stats应包含pending字段"
    assert_field_exists "$response" "data.task_stats.done" "task_stats应包含done字段"
    assert_field_exists "$response" "data.task_stats.error" "task_stats应包含error字段"
}

# 测试函数：验证统计数据的数值类型
test_stats_numeric_values() {
    local response=$(http_get "/api/v1/stats" false)
    assert_status "$response" "200" "获取全局统计应返回200"
    
    # 验证数值字段都是数字
    local project_count=$(echo "$response" | jq -r '.data.project_count // empty')
    local queue_count=$(echo "$response" | jq -r '.data.queue_count // empty')
    local task_count=$(echo "$response" | jq -r '.data.task_count // empty')
    
    if [ -n "$project_count" ]; then
        if ! [[ "$project_count" =~ ^[0-9]+$ ]]; then
            print_error "project_count应为数字，实际为: $project_count"
            return 1
        fi
    fi
    
    if [ -n "$queue_count" ]; then
        if ! [[ "$queue_count" =~ ^[0-9]+$ ]]; then
            print_error "queue_count应为数字，实际为: $queue_count"
            return 1
        fi
    fi
    
    if [ -n "$task_count" ]; then
        if ! [[ "$task_count" =~ ^[0-9]+$ ]]; then
            print_error "task_count应为数字，实际为: $task_count"
            return 1
        fi
    fi
}

# 测试函数：验证项目列表排序（按last_task_at倒序）
test_projects_sorting() {
    local response=$(http_get "/api/v1/projects?page=1&pageSize=5" false)
    assert_status "$response" "200" "获取项目列表应返回200"
    
    local items_count=$(echo "$response" | jq -r '.data.items | length')
    if [ "$items_count" -gt 1 ]; then
        # 验证排序：第一个项目的last_task_at应该大于等于第二个项目
        local first_time=$(echo "$response" | jq -r '.data.items[0].last_task_at // empty')
        local second_time=$(echo "$response" | jq -r '.data.items[1].last_task_at // empty')
        
        if [ -n "$first_time" ] && [ -n "$second_time" ]; then
            # 如果两个时间都不为空，验证排序
            local first_timestamp=$(date -d "$first_time" +%s 2>/dev/null || echo "0")
            local second_timestamp=$(date -d "$second_time" +%s 2>/dev/null || echo "0")
            
            if [ "$first_timestamp" -lt "$second_timestamp" ]; then
                print_warning "项目列表可能未按last_task_at倒序排列"
            fi
        fi
    fi
}

# 运行所有测试
run_module_tests() {
    print_header "$TEST_MODULE"
    
    init_test_stats
    
    # 项目列表接口测试
    print_section "项目列表接口 (GET /api/v1/projects)"
    run_test "获取项目列表（默认参数）" test_get_projects_default
    run_test "获取项目列表（指定分页参数）" test_get_projects_with_pagination
    run_test "获取项目列表（无效页码）" test_get_projects_invalid_page
    run_test "获取项目列表（无效pageSize）" test_get_projects_invalid_page_size
    run_test "验证项目列表数据结构" test_projects_data_structure
    run_test "验证项目列表排序" test_projects_sorting
    
    # 全局统计接口测试
    print_section "全局统计接口 (GET /api/v1/stats)"
    run_test "获取全局统计" test_get_stats
    run_test "验证统计数据数值类型" test_stats_numeric_values
    
    print_test_summary
    return $?
}

# 如果直接运行此脚本，执行测试
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    run_module_tests
    exit $?
fi
