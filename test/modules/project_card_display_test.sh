#!/bin/bash
# 项目卡片显示功能测试
# 测试项目卡片显示相关的API数据，包括：
# - displayTitle 字段（优先使用 customTitle，否则使用 name）
# - metadata.tags 字段（标签数据）
# - 搜索和过滤功能返回的数据结构

# 加载通用库
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../common/lib.sh"

# 测试名称
TEST_MODULE="项目卡片显示功能测试"

# 测试函数：验证项目卡片数据结构（包含displayTitle和tags）
test_project_card_data_structure() {
    ensure_api_key || return 1
    local response=$(http_get "/api/v1/projects?page=1&pageSize=5" true)
    assert_status "$response" "200" "获取项目列表应返回200"
    
    local items_count=$(echo "$response" | jq -r '.data.items | length')
    if [ "$items_count" -gt 0 ]; then
        local first_item=$(echo "$response" | jq -r '.data.items[0]')
        
        # 验证displayTitle字段存在且不为空
        assert_field_exists "$first_item" "displayTitle" "项目应包含displayTitle字段"
        local display_title=$(echo "$first_item" | jq -r '.displayTitle // empty')
        if [ -z "$display_title" ]; then
            print_error "displayTitle字段不应为空"
            return 1
        fi
        
        # 验证metadata字段存在
        assert_field_exists "$first_item" "metadata" "项目应包含metadata字段"
        
        # 验证metadata.tags字段存在（可能为空数组）
        local metadata=$(echo "$first_item" | jq -r '.metadata')
        if [ "$metadata" != "null" ]; then
            assert_field_exists "$first_item" "metadata.tags" "元数据应包含tags字段"
            
            # 验证tags是数组
            local tags=$(echo "$first_item" | jq -r '.metadata.tags')
            if [ "$tags" != "null" ] && [ "$tags" != "[]" ]; then
                local tags_type=$(echo "$tags" | jq -r 'type')
                if [ "$tags_type" != "array" ]; then
                    print_error "metadata.tags应为数组类型，实际为: $tags_type"
                    return 1
                fi
            fi
        fi
        
        print_success "项目卡片数据结构验证通过"
    else
        print_info "当前没有项目数据，跳过数据结构验证"
    fi
}

# 测试函数：验证displayTitle优先级（优先使用customTitle）
test_display_title_priority() {
    ensure_api_key || return 1
    
    local test_project_id="test-card-display-$(date +%s)"
    local original_name="原始项目名称-$(date +%s)"
    local custom_title="自定义显示标题-$(date +%s)"
    
    # 创建测试项目
    local create_data=$(cat <<EOF
{
  "project_id": "$test_project_id",
  "project_name": "$original_name",
  "queue_id": "test-queue-$(date +%s)",
  "queue_name": "测试队列",
  "tasks": []
}
EOF
)
    
    local create_response=$(http_post "/api/v1/submit" "$create_data" true)
    local create_code=$(echo "$create_response" | sed 's/^.*|//')
    
    if [ "$create_code" != "200" ]; then
        skip_test "验证displayTitle优先级" "无法创建测试项目"
        return 0
    fi
    
    # 等待一下确保数据已创建
    sleep 1
    
    # 测试1：没有customTitle时，displayTitle应该等于name
    local response1=$(http_get "/api/v1/projects?page=1&pageSize=100" true)
    local project1=$(echo "$response1" | jq -r ".data.items[] | select(.project_id == \"$test_project_id\")")
    
    if [ -n "$project1" ]; then
        local display_title1=$(echo "$project1" | jq -r '.displayTitle')
        local name1=$(echo "$project1" | jq -r '.name')
        
        if [ "$display_title1" != "$name1" ]; then
            print_error "没有customTitle时，displayTitle($display_title1)应等于name($name1)"
            return 1
        fi
    fi
    
    # 测试2：有customTitle时，displayTitle应该等于customTitle
    local metadata_data=$(cat <<EOF
{
  "customTitle": "$custom_title"
}
EOF
)
    
    http_put "/api/v1/projects/$test_project_id/metadata" "$metadata_data" true >/dev/null 2>&1
    
    # 等待一下确保数据已更新
    sleep 1
    
    local response2=$(http_get "/api/v1/projects?page=1&pageSize=100" true)
    local project2=$(echo "$response2" | jq -r ".data.items[] | select(.project_id == \"$test_project_id\")")
    
    if [ -n "$project2" ]; then
        local display_title2=$(echo "$project2" | jq -r '.displayTitle')
        
        if [ "$display_title2" != "$custom_title" ]; then
            print_error "有customTitle时，displayTitle($display_title2)应等于customTitle($custom_title)"
            return 1
        fi
    fi
    
    # 清理：删除测试数据
    http_delete "/api/v1/projects/$test_project_id/metadata" true >/dev/null 2>&1
    
    print_success "displayTitle优先级验证通过"
}

# 测试函数：验证标签数据返回
test_tags_data_return() {
    ensure_api_key || return 1
    
    local test_project_id="test-card-tags-$(date +%s)"
    local test_tags=("tag1" "tag2" "tag3")
    
    # 创建测试项目
    local create_data=$(cat <<EOF
{
  "project_id": "$test_project_id",
  "project_name": "标签测试项目-$(date +%s)",
  "queue_id": "test-queue-$(date +%s)",
  "queue_name": "测试队列",
  "tasks": []
}
EOF
)
    
    local create_response=$(http_post "/api/v1/submit" "$create_data" true)
    local create_code=$(echo "$create_response" | sed 's/^.*|//')
    
    if [ "$create_code" != "200" ]; then
        skip_test "验证标签数据返回" "无法创建测试项目"
        return 0
    fi
    
    # 设置标签
    local metadata_data=$(cat <<EOF
{
  "tags": ["tag1", "tag2", "tag3"]
}
EOF
)
    
    http_put "/api/v1/projects/$test_project_id/metadata" "$metadata_data" true >/dev/null 2>&1
    
    # 等待一下确保数据已更新
    sleep 1
    
    # 获取项目列表，验证标签数据
    local response=$(http_get "/api/v1/projects?page=1&pageSize=100" true)
    local project=$(echo "$response" | jq -r ".data.items[] | select(.project_id == \"$test_project_id\")")
    
    if [ -n "$project" ]; then
        # 验证metadata.tags字段存在
        assert_field_exists "$project" "metadata.tags" "项目应包含metadata.tags字段"
        
        # 验证标签数据
        local tags=$(echo "$project" | jq -r '.metadata.tags | length')
        if [ "$tags" != "3" ]; then
            print_error "标签数量应为3，实际为$tags"
            return 1
        fi
        
        # 验证标签内容
        local tag1=$(echo "$project" | jq -r '.metadata.tags[0]')
        if [ "$tag1" != "tag1" ]; then
            print_error "第一个标签应为tag1，实际为$tag1"
            return 1
        fi
    fi
    
    # 清理：删除测试数据
    http_delete "/api/v1/projects/$test_project_id/metadata" true >/dev/null 2>&1
    
    print_success "标签数据返回验证通过"
}

# 测试函数：验证搜索功能返回的数据包含displayTitle和tags
test_search_returns_display_title_and_tags() {
    ensure_api_key || return 1
    
    local test_project_id="test-search-display-$(date +%s)"
    local test_project_name="搜索显示测试-$(date +%s)"
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
        skip_test "验证搜索返回displayTitle和tags" "无法创建测试项目"
        return 0
    fi
    
    # 设置自定义标题和标签
    local metadata_data=$(cat <<EOF
{
  "customTitle": "$custom_title",
  "tags": ["search-tag-1", "search-tag-2"]
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
    local project=$(echo "$response" | jq -r ".data.items[] | select(.project_id == \"$test_project_id\")")
    
    if [ -n "$project" ]; then
        # 验证displayTitle字段
        assert_field_exists "$project" "displayTitle" "搜索结果应包含displayTitle字段"
        local display_title=$(echo "$project" | jq -r '.displayTitle')
        if [ "$display_title" != "$custom_title" ]; then
            print_error "搜索结果中displayTitle应为$custom_title，实际为$display_title"
            return 1
        fi
        
        # 验证metadata.tags字段
        assert_field_exists "$project" "metadata.tags" "搜索结果应包含metadata.tags字段"
        local tags_count=$(echo "$project" | jq -r '.metadata.tags | length')
        if [ "$tags_count" != "2" ]; then
            print_error "搜索结果中标签数量应为2，实际为$tags_count"
            return 1
        fi
    else
        print_error "搜索结果中应包含测试项目 $test_project_id"
        return 1
    fi
    
    # 清理：删除测试数据
    http_delete "/api/v1/projects/$test_project_id/metadata" true >/dev/null 2>&1
    
    print_success "搜索返回displayTitle和tags验证通过"
}

# 测试函数：验证标签过滤返回的数据包含displayTitle和tags
test_filter_returns_display_title_and_tags() {
    ensure_api_key || return 1
    
    local test_project_id="test-filter-display-$(date +%s)"
    local test_project_name="过滤显示测试-$(date +%s)"
    local custom_title="自定义过滤标题-$(date +%s)"
    
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
        skip_test "验证标签过滤返回displayTitle和tags" "无法创建测试项目"
        return 0
    fi
    
    # 设置自定义标题和标签
    local metadata_data=$(cat <<EOF
{
  "customTitle": "$custom_title",
  "tags": ["filter-tag-1", "filter-tag-2"]
}
EOF
)
    
    http_put "/api/v1/projects/$test_project_id/metadata" "$metadata_data" true >/dev/null 2>&1
    
    # 等待一下确保数据已更新
    sleep 1
    
    # 测试标签过滤
    local response=$(http_get "/api/v1/projects?tags=filter-tag-1&page=1&pageSize=100" true)
    assert_status "$response" "200" "标签过滤应返回200"
    
    # 验证过滤结果中包含测试项目
    local project=$(echo "$response" | jq -r ".data.items[] | select(.project_id == \"$test_project_id\")")
    
    if [ -n "$project" ]; then
        # 验证displayTitle字段
        assert_field_exists "$project" "displayTitle" "过滤结果应包含displayTitle字段"
        local display_title=$(echo "$project" | jq -r '.displayTitle')
        if [ "$display_title" != "$custom_title" ]; then
            print_error "过滤结果中displayTitle应为$custom_title，实际为$display_title"
            return 1
        fi
        
        # 验证metadata.tags字段
        assert_field_exists "$project" "metadata.tags" "过滤结果应包含metadata.tags字段"
        local tags_count=$(echo "$project" | jq -r '.metadata.tags | length')
        if [ "$tags_count" != "2" ]; then
            print_error "过滤结果中标签数量应为2，实际为$tags_count"
            return 1
        fi
    else
        print_error "标签过滤结果中应包含测试项目 $test_project_id"
        return 1
    fi
    
    # 清理：删除测试数据
    http_delete "/api/v1/projects/$test_project_id/metadata" true >/dev/null 2>&1
    
    print_success "标签过滤返回displayTitle和tags验证通过"
}

# 运行所有测试
run_module_tests() {
    print_header "$TEST_MODULE"
    
    init_test_stats
    
    print_section "项目卡片数据结构验证"
    run_test "验证项目卡片数据结构" test_project_card_data_structure
    run_test "验证displayTitle优先级" test_display_title_priority
    run_test "验证标签数据返回" test_tags_data_return
    
    print_section "搜索和过滤功能数据验证"
    run_test "验证搜索返回displayTitle和tags" test_search_returns_display_title_and_tags
    run_test "验证标签过滤返回displayTitle和tags" test_filter_returns_display_title_and_tags
    
    print_test_summary
    return $?
}

# 如果直接运行此脚本，执行测试
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    run_module_tests
    exit $?
fi
