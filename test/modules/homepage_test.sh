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
    ensure_api_key || return 1
    local response=$(http_get "/api/v1/projects" true)
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
    ensure_api_key || return 1
    local response=$(http_get "/api/v1/projects?page=1&pageSize=10" true)
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
    ensure_api_key || return 1
    local response=$(http_get "/api/v1/projects?page=0" true)
    assert_status "$response" "400" "无效页码应返回400"
    assert_json_field "$response" "success" "false" "响应success应为false"
    assert_field_exists "$response" "error.code" "响应应包含error.code字段"
}

# 测试函数：获取项目列表（无效pageSize）
test_get_projects_invalid_page_size() {
    ensure_api_key || return 1
    local response=$(http_get "/api/v1/projects?pageSize=0" true)
    assert_status "$response" "400" "无效pageSize应返回400"
    assert_json_field "$response" "success" "false" "响应success应为false"
}

# 测试函数：验证项目列表数据结构
test_projects_data_structure() {
    ensure_api_key || return 1
    local response=$(http_get "/api/v1/projects?page=1&pageSize=1" true)
    assert_status "$response" "200" "获取项目列表应返回200"
    
    # 如果有项目数据，验证数据结构
    local items_count=$(echo "$response" | jq -r '.data.items | length')
    if [ "$items_count" -gt 0 ]; then
        local first_item=$(echo "$response" | jq -r '.data.items[0]')
        
        # 验证必填字段
        assert_field_exists "$first_item" "id" "项目应包含id字段"
        assert_field_exists "$first_item" "project_id" "项目应包含project_id字段"
        assert_field_exists "$first_item" "name" "项目应包含name字段"
        assert_field_exists "$first_item" "displayTitle" "项目应包含displayTitle字段"
        assert_field_exists "$first_item" "metadata" "项目应包含metadata字段"
        assert_field_exists "$first_item" "queue_count" "项目应包含queue_count字段"
        assert_field_exists "$first_item" "task_count" "项目应包含task_count字段"
        assert_field_exists "$first_item" "task_stats" "项目应包含task_stats字段"
        
        # 验证task_stats结构
        assert_field_exists "$first_item" "task_stats.total" "task_stats应包含total字段"
        assert_field_exists "$first_item" "task_stats.pending" "task_stats应包含pending字段"
        assert_field_exists "$first_item" "task_stats.done" "task_stats应包含done字段"
        assert_field_exists "$first_item" "task_stats.error" "task_stats应包含error字段"
        
        # 验证displayTitle字段：应该存在且不为空
        local display_title=$(echo "$first_item" | jq -r '.displayTitle // empty')
        if [ -z "$display_title" ]; then
            print_error "displayTitle字段不应为空"
            return 1
        fi
        
        # 验证metadata字段：应该存在（可能为null或对象）
        local metadata=$(echo "$first_item" | jq -r '.metadata')
        if [ "$metadata" = "null" ]; then
            print_info "项目没有元数据，metadata为null（正常情况）"
        else
            # 如果有元数据，验证结构
            assert_field_exists "$first_item" "metadata.customTitle" "元数据应包含customTitle字段"
            assert_field_exists "$first_item" "metadata.notes" "元数据应包含notes字段"
            assert_field_exists "$first_item" "metadata.tags" "元数据应包含tags字段"
        fi
    else
        print_info "当前没有项目数据，跳过数据结构验证"
    fi
}

# 测试函数：验证displayTitle字段逻辑（优先使用customTitle，否则使用name）
test_display_title_logic() {
    ensure_api_key || return 1
    
    local test_project_id="test-display-title-$(date +%s)"
    
    # 创建测试项目
    local create_data=$(cat <<EOF
{
  "project_id": "$test_project_id",
  "project_name": "原始项目名称",
  "queue_id": "test-queue-$(date +%s)",
  "queue_name": "测试队列",
  "tasks": []
}
EOF
)
    
    local create_response=$(http_post "/api/v1/submit" "$create_data" true)
    local create_code=$(echo "$create_response" | sed 's/^.*|//')
    
    if [ "$create_code" != "200" ]; then
        skip_test "验证displayTitle逻辑" "无法创建测试项目"
        return 0
    fi
    
    # 测试1：没有元数据时，displayTitle应该等于name
    local response1=$(http_get "/api/v1/projects?page=1&pageSize=100" true)
    local project1=$(echo "$response1" | jq -r ".data.items[] | select(.project_id == \"$test_project_id\")")
    
    if [ -n "$project1" ]; then
        local display_title1=$(echo "$project1" | jq -r '.displayTitle')
        local name1=$(echo "$project1" | jq -r '.name')
        
        if [ "$display_title1" != "$name1" ]; then
            print_error "没有元数据时，displayTitle($display_title1)应等于name($name1)"
            return 1
        fi
    fi
    
    # 测试2：有customTitle时，displayTitle应该等于customTitle
    local metadata_data='{
        "customTitle": "自定义标题"
    }'
    
    http_put "/api/v1/projects/$test_project_id/metadata" "$metadata_data" true >/dev/null 2>&1
    
    # 等待一下确保数据已更新
    sleep 1
    
    local response2=$(http_get "/api/v1/projects?page=1&pageSize=100" true)
    local project2=$(echo "$response2" | jq -r ".data.items[] | select(.project_id == \"$test_project_id\")")
    
    if [ -n "$project2" ]; then
        local display_title2=$(echo "$project2" | jq -r '.displayTitle')
        
        if [ "$display_title2" != "自定义标题" ]; then
            print_error "有customTitle时，displayTitle($display_title2)应等于customTitle(自定义标题)"
            return 1
        fi
    fi
    
    # 清理：删除测试数据
    http_delete "/api/v1/projects/$test_project_id/metadata" true >/dev/null 2>&1
    
    print_success "displayTitle逻辑验证通过"
}

# 测试函数：获取全局统计
test_get_stats() {
    ensure_api_key || return 1
    local response=$(http_get "/api/v1/stats" true)
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
    ensure_api_key || return 1
    local response=$(http_get "/api/v1/stats" true)
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
    ensure_api_key || return 1
    local response=$(http_get "/api/v1/projects?page=1&pageSize=5" true)
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

# 测试函数：搜索功能（按项目名称）
test_search_by_name() {
    ensure_api_key || return 1
    
    local test_project_id="test-search-name-$(date +%s)"
    local test_project_name="搜索测试项目-$(date +%s)"
    
    # 创建测试项目
    local create_data=$(cat <<EOF
{
  "project_id": "$test_project_id",
  "project_name": "$test_project_name",
  "queue_id": "test-queue-$(date +%s)",
  "queue_name": "测试队列",
  "tasks": []
}
EOF
)
    
    local create_response=$(http_post "/api/v1/submit" "$create_data" true)
    local create_code=$(echo "$create_response" | sed 's/^.*|//')
    
    if [ "$create_code" != "200" ]; then
        skip_test "搜索功能（按项目名称）" "无法创建测试项目"
        return 0
    fi
    
    # 等待一下确保数据已创建
    sleep 1
    
    # 测试搜索：使用项目名称的一部分
    local search_keyword=$(echo "$test_project_name" | cut -d'-' -f1)
    local response=$(http_get "/api/v1/projects?search=$search_keyword&page=1&pageSize=100" true)
    assert_status "$response" "200" "搜索项目应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    
    # 验证搜索结果中包含测试项目
    local found=$(echo "$response" | jq -r ".data.items[] | select(.project_id == \"$test_project_id\") | .project_id")
    if [ -z "$found" ]; then
        print_error "搜索结果中应包含测试项目 $test_project_id"
        return 1
    fi
    
    print_success "搜索功能（按项目名称）测试通过"
}

# 测试函数：搜索功能（按自定义标题）
test_search_by_custom_title() {
    ensure_api_key || return 1
    
    local test_project_id="test-search-title-$(date +%s)"
    local test_project_name="原始项目名称-$(date +%s)"
    local custom_title="自定义搜索标题-$(date +%s)"
    
    # 创建测试项目
    local create_data=$(cat <<EOF
{
  "project_id": "$test_project_id",
  "project_name": "$test_project_name",
  "queue_id": "test-queue-$(date +%s)",
  "queue_name": "测试队列",
  "tasks": []
}
EOF
)
    
    local create_response=$(http_post "/api/v1/submit" "$create_data" true)
    local create_code=$(echo "$create_response" | sed 's/^.*|//')
    
    if [ "$create_code" != "200" ]; then
        skip_test "搜索功能（按自定义标题）" "无法创建测试项目"
        return 0
    fi
    
    # 设置自定义标题
    local metadata_data=$(cat <<EOF
{
  "customTitle": "$custom_title"
}
EOF
)
    
    http_put "/api/v1/projects/$test_project_id/metadata" "$metadata_data" true >/dev/null 2>&1
    
    # 等待一下确保数据已更新
    sleep 1
    
    # 测试搜索：使用自定义标题的一部分
    local search_keyword=$(echo "$custom_title" | cut -d'-' -f1)
    local response=$(http_get "/api/v1/projects?search=$search_keyword&page=1&pageSize=100" true)
    assert_status "$response" "200" "搜索项目应返回200"
    
    # 验证搜索结果中包含测试项目
    local found=$(echo "$response" | jq -r ".data.items[] | select(.project_id == \"$test_project_id\") | .project_id")
    if [ -z "$found" ]; then
        print_error "搜索结果中应包含测试项目 $test_project_id"
        return 1
    fi
    
    # 清理：删除测试数据
    http_delete "/api/v1/projects/$test_project_id/metadata" true >/dev/null 2>&1
    
    print_success "搜索功能（按自定义标题）测试通过"
}

# 测试函数：标签过滤功能
test_filter_by_tags() {
    ensure_api_key || return 1
    
    local test_project_id="test-filter-tags-$(date +%s)"
    local test_tags="test-tag-1,test-tag-2"
    
    # 创建测试项目
    local create_data=$(cat <<EOF
{
  "project_id": "$test_project_id",
  "project_name": "标签过滤测试项目-$(date +%s)",
  "queue_id": "test-queue-$(date +%s)",
  "queue_name": "测试队列",
  "tasks": []
}
EOF
)
    
    local create_response=$(http_post "/api/v1/submit" "$create_data" true)
    local create_code=$(echo "$create_response" | sed 's/^.*|//')
    
    if [ "$create_code" != "200" ]; then
        skip_test "标签过滤功能" "无法创建测试项目"
        return 0
    fi
    
    # 设置标签
    local metadata_data=$(cat <<EOF
{
  "tags": ["test-tag-1", "test-tag-2", "test-tag-3"]
}
EOF
)
    
    http_put "/api/v1/projects/$test_project_id/metadata" "$metadata_data" true >/dev/null 2>&1
    
    # 等待一下确保数据已更新
    sleep 1
    
    # 测试标签过滤：单个标签
    local response1=$(http_get "/api/v1/projects?tags=test-tag-1&page=1&pageSize=100" true)
    assert_status "$response1" "200" "标签过滤应返回200"
    
    local found1=$(echo "$response1" | jq -r ".data.items[] | select(.project_id == \"$test_project_id\") | .project_id")
    if [ -z "$found1" ]; then
        print_error "标签过滤结果中应包含测试项目 $test_project_id"
        return 1
    fi
    
    # 测试标签过滤：多个标签（AND逻辑）
    local response2=$(http_get "/api/v1/projects?tags=test-tag-1,test-tag-2&page=1&pageSize=100" true)
    assert_status "$response2" "200" "多标签过滤应返回200"
    
    local found2=$(echo "$response2" | jq -r ".data.items[] | select(.project_id == \"$test_project_id\") | .project_id")
    if [ -z "$found2" ]; then
        print_error "多标签过滤结果中应包含测试项目 $test_project_id"
        return 1
    fi
    
    # 测试标签过滤：不存在的标签
    local response3=$(http_get "/api/v1/projects?tags=nonexistent-tag&page=1&pageSize=100" true)
    assert_status "$response3" "200" "标签过滤应返回200"
    
    local found3=$(echo "$response3" | jq -r ".data.items[] | select(.project_id == \"$test_project_id\") | .project_id")
    if [ -n "$found3" ]; then
        print_error "不存在的标签过滤结果中不应包含测试项目 $test_project_id"
        return 1
    fi
    
    # 清理：删除测试数据
    http_delete "/api/v1/projects/$test_project_id/metadata" true >/dev/null 2>&1
    
    print_success "标签过滤功能测试通过"
}

# 测试函数：组合查询（搜索+标签过滤）
test_combined_search_and_filter() {
    ensure_api_key || return 1
    
    local test_project_id="test-combined-$(date +%s)"
    local test_project_name="组合查询测试-$(date +%s)"
    
    # 创建测试项目
    local create_data=$(cat <<EOF
{
  "project_id": "$test_project_id",
  "project_name": "$test_project_name",
  "queue_id": "test-queue-$(date +%s)",
  "queue_name": "测试队列",
  "tasks": []
}
EOF
)
    
    local create_response=$(http_post "/api/v1/submit" "$create_data" true)
    local create_code=$(echo "$create_response" | sed 's/^.*|//')
    
    if [ "$create_code" != "200" ]; then
        skip_test "组合查询（搜索+标签过滤）" "无法创建测试项目"
        return 0
    fi
    
    # 设置标签
    local metadata_data=$(cat <<EOF
{
  "tags": ["combined-tag-1", "combined-tag-2"]
}
EOF
)
    
    http_put "/api/v1/projects/$test_project_id/metadata" "$metadata_data" true >/dev/null 2>&1
    
    # 等待一下确保数据已更新
    sleep 1
    
    # 测试组合查询：搜索项目名称 + 标签过滤
    local search_keyword=$(echo "$test_project_name" | cut -d'-' -f1)
    local response=$(http_get "/api/v1/projects?search=$search_keyword&tags=combined-tag-1&page=1&pageSize=100" true)
    assert_status "$response" "200" "组合查询应返回200"
    
    # 验证搜索结果中包含测试项目
    local found=$(echo "$response" | jq -r ".data.items[] | select(.project_id == \"$test_project_id\") | .project_id")
    if [ -z "$found" ]; then
        print_error "组合查询结果中应包含测试项目 $test_project_id"
        return 1
    fi
    
    # 测试组合查询：搜索项目名称 + 不匹配的标签
    local response2=$(http_get "/api/v1/projects?search=$search_keyword&tags=nonexistent-tag&page=1&pageSize=100" true)
    assert_status "$response2" "200" "组合查询应返回200"
    
    local found2=$(echo "$response2" | jq -r ".data.items[] | select(.project_id == \"$test_project_id\") | .project_id")
    if [ -n "$found2" ]; then
        print_error "组合查询（不匹配标签）结果中不应包含测试项目 $test_project_id"
        return 1
    fi
    
    # 清理：删除测试数据
    http_delete "/api/v1/projects/$test_project_id/metadata" true >/dev/null 2>&1
    
    print_success "组合查询（搜索+标签过滤）测试通过"
}

# 测试函数：验证搜索和过滤的分页功能
test_search_filter_pagination() {
    ensure_api_key || return 1
    local response=$(http_get "/api/v1/projects?search=test&page=1&pageSize=5" true)
    assert_status "$response" "200" "搜索分页应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    assert_field_exists "$response" "data.pagination" "响应应包含pagination字段"
    
    # 验证分页信息
    local page=$(echo "$response" | jq -r '.data.pagination.page // empty')
    local pageSize=$(echo "$response" | jq -r '.data.pagination.pageSize // empty')
    local total=$(echo "$response" | jq -r '.data.pagination.total // empty')
    
    if [ -n "$page" ] && [ "$page" != "1" ]; then
        print_error "分页page应为1，实际为$page"
        return 1
    fi
    
    if [ -n "$pageSize" ] && [ "$pageSize" != "5" ]; then
        print_error "分页pageSize应为5，实际为$pageSize"
        return 1
    fi
    
    print_success "搜索和过滤分页功能测试通过"
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
    run_test "验证displayTitle字段逻辑" test_display_title_logic
    run_test "验证项目列表排序" test_projects_sorting
    
    # 搜索和过滤功能测试
    print_section "搜索和过滤功能 (GET /api/v1/projects?search=...&tags=...)"
    run_test "搜索功能（按项目名称）" test_search_by_name
    run_test "搜索功能（按自定义标题）" test_search_by_custom_title
    run_test "标签过滤功能" test_filter_by_tags
    run_test "组合查询（搜索+标签过滤）" test_combined_search_and_filter
    run_test "验证搜索和过滤的分页功能" test_search_filter_pagination
    
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
