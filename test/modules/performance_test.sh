#!/bin/bash
# 性能测试：测试查询性能优化
# 测试索引使用、查询性能、大量数据下的性能

# 加载通用库
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../common/lib.sh"

# 测试名称
TEST_MODULE="性能测试"

# 性能测试辅助函数：测量请求时间
measure_request_time() {
    local url="$1"
    local require_auth="${2:-false}"
    
    local start_time=$(date +%s%N)
    local response=$(http_get "$url" "$require_auth")
    local end_time=$(date +%s%N)
    
    local duration=$(( (end_time - start_time) / 1000000 ))  # 转换为毫秒
    
    echo "$duration|$response"
}

# 测试函数：测试项目列表查询性能（无过滤）
test_projects_list_performance() {
    ensure_api_key || return 1
    
    print_info "测试项目列表查询性能（无过滤条件）..."
    
    local times=()
    local iterations=5
    
    for i in $(seq 1 $iterations); do
        local result=$(measure_request_time "/api/v1/projects?page=1&pageSize=20" true)
        local duration=$(echo "$result" | cut -d'|' -f1)
        local response=$(echo "$result" | cut -d'|' -f2-)
        
        local status_code=$(echo "$response" | sed 's/^.*|//')
        if [ "$status_code" != "200" ]; then
            print_error "请求失败，状态码: $status_code"
            return 1
        fi
        
        times+=($duration)
        print_info "  第 $i 次请求耗时: ${duration}ms"
    done
    
    # 计算平均时间
    local sum=0
    for time in "${times[@]}"; do
        sum=$((sum + time))
    done
    local avg=$((sum / iterations))
    
    print_info "平均响应时间: ${avg}ms"
    
    # 性能阈值：平均响应时间应小于500ms
    if [ $avg -gt 500 ]; then
        print_warning "平均响应时间(${avg}ms)超过500ms，可能需要优化"
    else
        print_success "项目列表查询性能测试通过（平均${avg}ms）"
    fi
}

# 测试函数：测试搜索查询性能
test_search_performance() {
    ensure_api_key || return 1
    
    print_info "测试搜索查询性能..."
    
    # 先获取一些项目名称用于搜索
    local response=$(http_get "/api/v1/projects?page=1&pageSize=5" true)
    local status_code=$(echo "$response" | sed 's/^.*|//')
    
    if [ "$status_code" != "200" ]; then
        skip_test "搜索查询性能" "无法获取测试数据"
        return 0
    fi
    
    # 获取第一个项目的名称作为搜索关键词
    local first_name=$(echo "$response" | jq -r '.data.items[0].name // empty' 2>/dev/null)
    
    if [ -z "$first_name" ] || [ "$first_name" = "null" ]; then
        skip_test "搜索查询性能" "没有可用的测试数据"
        return 0
    fi
    
    # 使用项目名称的前几个字符作为搜索关键词
    local search_keyword=$(echo "$first_name" | cut -c1-3)
    
    if [ -z "$search_keyword" ]; then
        skip_test "搜索查询性能" "无法生成搜索关键词"
        return 0
    fi
    
    local times=()
    local iterations=5
    
    for i in $(seq 1 $iterations); do
        local result=$(measure_request_time "/api/v1/projects?search=$search_keyword&page=1&pageSize=20" true)
        local duration=$(echo "$result" | cut -d'|' -f1)
        local response=$(echo "$result" | cut -d'|' -f2-)
        
        local status_code=$(echo "$response" | sed 's/^.*|//')
        if [ "$status_code" != "200" ]; then
            print_error "搜索请求失败，状态码: $status_code"
            return 1
        fi
        
        times+=($duration)
        print_info "  第 $i 次搜索请求耗时: ${duration}ms"
    done
    
    # 计算平均时间
    local sum=0
    for time in "${times[@]}"; do
        sum=$((sum + time))
    done
    local avg=$((sum / iterations))
    
    print_info "平均响应时间: ${avg}ms"
    
    # 性能阈值：搜索查询平均响应时间应小于800ms
    if [ $avg -gt 800 ]; then
        print_warning "搜索查询平均响应时间(${avg}ms)超过800ms，可能需要优化"
    else
        print_success "搜索查询性能测试通过（平均${avg}ms）"
    fi
}

# 测试函数：测试标签过滤查询性能
test_tags_filter_performance() {
    ensure_api_key || return 1
    
    print_info "测试标签过滤查询性能..."
    
    # 先获取一些项目的标签用于过滤
    local response=$(http_get "/api/v1/projects?page=1&pageSize=10" true)
    local status_code=$(echo "$response" | sed 's/^.*|//')
    
    if [ "$status_code" != "200" ]; then
        skip_test "标签过滤查询性能" "无法获取测试数据"
        return 0
    fi
    
    # 查找一个有标签的项目
    local project_with_tags=$(echo "$response" | jq -r '.data.items[] | select(.metadata != null and .metadata.tags != null and (.metadata.tags | length) > 0) | .metadata.tags[0]' 2>/dev/null | head -1)
    
    if [ -z "$project_with_tags" ] || [ "$project_with_tags" = "null" ]; then
        skip_test "标签过滤查询性能" "没有带标签的项目可用于测试"
        return 0
    fi
    
    local times=()
    local iterations=5
    
    for i in $(seq 1 $iterations); do
        local result=$(measure_request_time "/api/v1/projects?tags=$project_with_tags&page=1&pageSize=20" true)
        local duration=$(echo "$result" | cut -d'|' -f1)
        local response=$(echo "$result" | cut -d'|' -f2-)
        
        local status_code=$(echo "$response" | sed 's/^.*|//')
        if [ "$status_code" != "200" ]; then
            print_error "标签过滤请求失败，状态码: $status_code"
            return 1
        fi
        
        times+=($duration)
        print_info "  第 $i 次标签过滤请求耗时: ${duration}ms"
    done
    
    # 计算平均时间
    local sum=0
    for time in "${times[@]}"; do
        sum=$((sum + time))
    done
    local avg=$((sum / iterations))
    
    print_info "平均响应时间: ${avg}ms"
    
    # 性能阈值：标签过滤查询平均响应时间应小于800ms
    if [ $avg -gt 800 ]; then
        print_warning "标签过滤查询平均响应时间(${avg}ms)超过800ms，可能需要优化"
    else
        print_success "标签过滤查询性能测试通过（平均${avg}ms）"
    fi
}

# 测试函数：测试组合查询性能（搜索+标签过滤）
test_combined_query_performance() {
    ensure_api_key || return 1
    
    print_info "测试组合查询性能（搜索+标签过滤）..."
    
    # 先获取一些项目数据
    local response=$(http_get "/api/v1/projects?page=1&pageSize=10" true)
    local status_code=$(echo "$response" | sed 's/^.*|//')
    
    if [ "$status_code" != "200" ]; then
        skip_test "组合查询性能" "无法获取测试数据"
        return 0
    fi
    
    # 查找一个有标签的项目
    local project_data=$(echo "$response" | jq -r '.data.items[] | select(.metadata != null and .metadata.tags != null and (.metadata.tags | length) > 0)' 2>/dev/null | head -1)
    
    if [ -z "$project_data" ] || [ "$project_data" = "null" ]; then
        skip_test "组合查询性能" "没有带标签的项目可用于测试"
        return 0
    fi
    
    local project_name=$(echo "$project_data" | jq -r '.name // empty' 2>/dev/null)
    local project_tag=$(echo "$project_data" | jq -r '.metadata.tags[0] // empty' 2>/dev/null)
    
    if [ -z "$project_name" ] || [ -z "$project_tag" ]; then
        skip_test "组合查询性能" "无法获取测试数据"
        return 0
    fi
    
    # 使用项目名称的前几个字符作为搜索关键词
    local search_keyword=$(echo "$project_name" | cut -c1-3)
    
    local times=()
    local iterations=5
    
    for i in $(seq 1 $iterations); do
        local result=$(measure_request_time "/api/v1/projects?search=$search_keyword&tags=$project_tag&page=1&pageSize=20" true)
        local duration=$(echo "$result" | cut -d'|' -f1)
        local response=$(echo "$result" | cut -d'|' -f2-)
        
        local status_code=$(echo "$response" | sed 's/^.*|//')
        if [ "$status_code" != "200" ]; then
            print_error "组合查询请求失败，状态码: $status_code"
            return 1
        fi
        
        times+=($duration)
        print_info "  第 $i 次组合查询请求耗时: ${duration}ms"
    done
    
    # 计算平均时间
    local sum=0
    for time in "${times[@]}"; do
        sum=$((sum + time))
    done
    local avg=$((sum / iterations))
    
    print_info "平均响应时间: ${avg}ms"
    
    # 性能阈值：组合查询平均响应时间应小于1000ms
    if [ $avg -gt 1000 ]; then
        print_warning "组合查询平均响应时间(${avg}ms)超过1000ms，可能需要优化"
    else
        print_success "组合查询性能测试通过（平均${avg}ms）"
    fi
}

# 测试函数：测试大量数据下的查询性能
test_large_dataset_performance() {
    ensure_api_key || return 1
    
    print_info "测试大量数据下的查询性能..."
    
    # 获取项目总数
    local response=$(http_get "/api/v1/projects?page=1&pageSize=1" true)
    local status_code=$(echo "$response" | sed 's/^.*|//')
    
    if [ "$status_code" != "200" ]; then
        skip_test "大量数据查询性能" "无法获取测试数据"
        return 0
    fi
    
    local total=$(echo "$response" | jq -r '.data.pagination.total // 0' 2>/dev/null)
    
    if [ "$total" -lt 10 ]; then
        skip_test "大量数据查询性能" "数据量不足（当前只有${total}个项目），跳过测试"
        return 0
    fi
    
    print_info "当前数据库中有 ${total} 个项目"
    
    # 测试不同分页大小的性能
    local page_sizes=(10 20 50)
    
    for page_size in "${page_sizes[@]}"; do
        print_info "测试分页大小: ${page_size}"
        
        local times=()
        local iterations=3
        
        for i in $(seq 1 $iterations); do
            local result=$(measure_request_time "/api/v1/projects?page=1&pageSize=$page_size" true)
            local duration=$(echo "$result" | cut -d'|' -f1)
            local response=$(echo "$result" | cut -d'|' -f2-)
            
            local status_code=$(echo "$response" | sed 's/^.*|//')
            if [ "$status_code" != "200" ]; then
                print_error "请求失败，状态码: $status_code"
                return 1
            fi
            
            times+=($duration)
        done
        
        # 计算平均时间
        local sum=0
        for time in "${times[@]}"; do
            sum=$((sum + time))
        done
        local avg=$((sum / iterations))
        
        print_info "  分页大小 ${page_size} 平均响应时间: ${avg}ms"
    done
    
    print_success "大量数据查询性能测试通过"
}

# 测试函数：测试N+1查询问题是否已解决
test_n_plus_one_query() {
    ensure_api_key || return 1
    
    print_info "测试N+1查询问题是否已解决..."
    
    # 获取项目列表
    local response=$(http_get "/api/v1/projects?page=1&pageSize=10" true)
    local status_code=$(echo "$response" | sed 's/^.*|//')
    
    if [ "$status_code" != "200" ]; then
        skip_test "N+1查询测试" "无法获取测试数据"
        return 0
    fi
    
    local items_count=$(echo "$response" | jq -r '.data.items | length' 2>/dev/null)
    
    if [ "$items_count" -eq 0 ]; then
        skip_test "N+1查询测试" "没有项目数据"
        return 0
    fi
    
    # 测量获取10个项目的响应时间
    local result=$(measure_request_time "/api/v1/projects?page=1&pageSize=10" true)
    local duration=$(echo "$result" | cut -d'|' -f1)
    local response_data=$(echo "$result" | cut -d'|' -f2-)
    
    print_info "获取10个项目的响应时间: ${duration}ms"
    
    # 验证每个项目都有统计信息（queue_count, task_count等）
    local all_have_stats=true
    for i in $(seq 0 $((items_count - 1))); do
        local queue_count=$(echo "$response_data" | jq -r ".data.items[$i].queue_count // empty" 2>/dev/null)
        local task_count=$(echo "$response_data" | jq -r ".data.items[$i].task_count // empty" 2>/dev/null)
        
        if [ -z "$queue_count" ] || [ -z "$task_count" ]; then
            all_have_stats=false
            break
        fi
    done
    
    if [ "$all_have_stats" = "false" ]; then
        print_error "部分项目缺少统计信息，可能存在N+1查询问题"
        return 1
    fi
    
    # 如果响应时间合理（小于500ms），说明N+1查询问题已解决
    if [ $duration -lt 500 ]; then
        print_success "N+1查询问题已解决（响应时间${duration}ms）"
    else
        print_warning "响应时间较长(${duration}ms)，可能存在性能问题"
    fi
}

# 运行所有测试
run_module_tests() {
    print_header "$TEST_MODULE"
    
    init_test_stats
    
    print_section "查询性能测试"
    run_test "项目列表查询性能（无过滤）" test_projects_list_performance
    run_test "搜索查询性能" test_search_performance
    run_test "标签过滤查询性能" test_tags_filter_performance
    run_test "组合查询性能（搜索+标签过滤）" test_combined_query_performance
    
    print_section "大量数据性能测试"
    run_test "大量数据下的查询性能" test_large_dataset_performance
    
    print_section "N+1查询问题测试"
    run_test "N+1查询问题是否已解决" test_n_plus_one_query
    
    print_test_summary
    return $?
}

# 如果直接运行此脚本，执行测试
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    run_module_tests
    exit $?
fi
