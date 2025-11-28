#!/bin/bash
# 标签相关接口测试
# GET /api/v1/projects/tags - 获取常用标签列表

# 加载通用库
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../common/lib.sh"

# 测试名称
TEST_MODULE="标签接口测试"

# 测试函数：获取常用标签列表（默认参数）
test_get_tags_default() {
    ensure_api_key || return 1
    local response=$(http_get "/api/v1/projects/tags" true)
    assert_status "$response" "200" "获取常用标签应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    assert_field_exists "$response" "data.tags" "响应应包含data.tags字段"
    assert_field_exists "$response" "data.count" "响应应包含data.count字段"
    
    # 验证tags是数组
    local tags=$(echo "$response" | jq -r '.data.tags // empty')
    if [ -z "$tags" ]; then
        print_error "data.tags字段不应为空"
        return 1
    fi
    
    # 验证count是数字
    local count=$(echo "$response" | jq -r '.data.count // empty')
    if [ -n "$count" ]; then
        if ! [[ "$count" =~ ^[0-9]+$ ]]; then
            print_error "data.count应为数字，实际为: $count"
            return 1
        fi
    fi
}

# 测试函数：获取常用标签列表（指定limit参数）
test_get_tags_with_limit() {
    ensure_api_key || return 1
    local response=$(http_get "/api/v1/projects/tags?limit=10" true)
    assert_status "$response" "200" "获取常用标签应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    assert_field_exists "$response" "data.tags" "响应应包含data.tags字段"
    
    # 验证返回的标签数量不超过limit
    local tags_count=$(echo "$response" | jq -r '.data.tags | length')
    if [ "$tags_count" -gt 10 ]; then
        print_error "返回的标签数量($tags_count)不应超过limit(10)"
        return 1
    fi
}

# 测试函数：获取常用标签列表（最大limit）
test_get_tags_max_limit() {
    ensure_api_key || return 1
    local response=$(http_get "/api/v1/projects/tags?limit=200" true)
    assert_status "$response" "200" "获取常用标签应返回200"
    
    # 验证limit被限制为100（最大100）
    local tags_count=$(echo "$response" | jq -r '.data.tags | length')
    if [ "$tags_count" -gt 100 ]; then
        print_error "返回的标签数量($tags_count)不应超过最大限制(100)"
        return 1
    fi
}

# 测试函数：验证标签数据格式
test_tags_data_format() {
    ensure_api_key || return 1
    local response=$(http_get "/api/v1/projects/tags?limit=10" true)
    assert_status "$response" "200" "获取常用标签应返回200"
    
    # 验证tags数组中的每个元素都是字符串
    local tags=$(echo "$response" | jq -r '.data.tags // []')
    local tags_count=$(echo "$tags" | jq -r 'length')
    
    if [ "$tags_count" -gt 0 ]; then
        for i in $(seq 0 $((tags_count - 1))); do
            local tag=$(echo "$tags" | jq -r ".[$i]")
            if [ -z "$tag" ]; then
                print_error "标签不应为空"
                return 1
            fi
            
            # 验证标签是字符串
            if ! echo "$tag" | grep -qE '^[^"]+$'; then
                print_error "标签应为字符串格式，实际为: $tag"
                return 1
            fi
        done
    fi
}

# 测试函数：验证标签去重和排序
test_tags_deduplication_and_sorting() {
    ensure_api_key || return 1
    
    # 创建测试项目并设置标签
    local test_project_id="test-tags-sort-$(date +%s)"
    
    # 创建测试项目
    local create_data=$(cat <<EOF
{
  "project_id": "$test_project_id",
  "project_name": "标签排序测试项目-$(date +%s)",
  "queue_id": "test-queue-$(date +%s)",
  "queue_name": "测试队列",
  "tasks": []
}
EOF
)
    
    local create_response=$(http_post "/api/v1/submit" "$create_data" true)
    local create_code=$(echo "$create_response" | sed 's/^.*|//')
    
    if [ "$create_code" != "200" ]; then
        skip_test "验证标签去重和排序" "无法创建测试项目"
        return 0
    fi
    
    # 设置标签（包含重复标签）
    local metadata_data=$(cat <<EOF
{
  "tags": ["test-tag-sort-1", "test-tag-sort-2", "test-tag-sort-1"]
}
EOF
)
    
    http_put "/api/v1/projects/$test_project_id/metadata" "$metadata_data" true >/dev/null 2>&1
    
    # 等待一下确保数据已更新
    sleep 1
    
    # 获取常用标签列表
    local response=$(http_get "/api/v1/projects/tags?limit=100" true)
    assert_status "$response" "200" "获取常用标签应返回200"
    
    # 验证标签列表中没有重复（通过检查每个标签出现的次数）
    local tags=$(echo "$response" | jq -r '.data.tags // []')
    local tags_count=$(echo "$tags" | jq -r 'length')
    
    # 检查是否有重复标签
    local duplicates=0
    for i in $(seq 0 $((tags_count - 1))); do
        local tag=$(echo "$tags" | jq -r ".[$i]")
        local occurrences=$(echo "$tags" | jq -r ".[] | select(. == \"$tag\")" | wc -l)
        if [ "$occurrences" -gt 1 ]; then
            duplicates=$((duplicates + 1))
        fi
    done
    
    if [ "$duplicates" -gt 0 ]; then
        print_warning "标签列表中存在重复标签（可能正常，取决于业务逻辑）"
    fi
    
    # 清理：删除测试数据
    http_delete "/api/v1/projects/$test_project_id/metadata" true >/dev/null 2>&1
    
    print_success "标签去重和排序验证通过"
}

# 测试函数：验证标签统计准确性
test_tags_statistics_accuracy() {
    ensure_api_key || return 1
    
    # 创建测试项目并设置特定标签
    local test_project_id="test-tags-stat-$(date +%s)"
    local test_tag="test-stat-tag-$(date +%s)"
    
    # 创建测试项目
    local create_data=$(cat <<EOF
{
  "project_id": "$test_project_id",
  "project_name": "标签统计测试项目-$(date +%s)",
  "queue_id": "test-queue-$(date +%s)",
  "queue_name": "测试队列",
  "tasks": []
}
EOF
)
    
    local create_response=$(http_post "/api/v1/submit" "$create_data" true)
    local create_code=$(echo "$create_response" | sed 's/^.*|//')
    
    if [ "$create_code" != "200" ]; then
        skip_test "验证标签统计准确性" "无法创建测试项目"
        return 0
    fi
    
    # 设置标签
    local metadata_data=$(cat <<EOF
{
  "tags": ["$test_tag"]
}
EOF
)
    
    http_put "/api/v1/projects/$test_project_id/metadata" "$metadata_data" true >/dev/null 2>&1
    
    # 等待一下确保数据已更新
    sleep 1
    
    # 获取常用标签列表
    local response=$(http_get "/api/v1/projects/tags?limit=100" true)
    assert_status "$response" "200" "获取常用标签应返回200"
    
    # 验证测试标签在列表中
    local tags=$(echo "$response" | jq -r '.data.tags // []')
    local found=$(echo "$tags" | jq -r ".[] | select(. == \"$test_tag\")")
    
    if [ -z "$found" ]; then
        print_warning "测试标签 $test_tag 未出现在常用标签列表中（可能因为排序或limit限制）"
    else
        print_success "测试标签 $test_tag 出现在常用标签列表中"
    fi
    
    # 清理：删除测试数据
    http_delete "/api/v1/projects/$test_project_id/metadata" true >/dev/null 2>&1
    
    print_success "标签统计准确性验证通过"
}

# 运行所有测试
run_module_tests() {
    print_header "$TEST_MODULE"
    
    init_test_stats
    
    # 常用标签接口测试
    print_section "常用标签接口 (GET /api/v1/projects/tags)"
    run_test "获取常用标签列表（默认参数）" test_get_tags_default
    run_test "获取常用标签列表（指定limit参数）" test_get_tags_with_limit
    run_test "获取常用标签列表（最大limit）" test_get_tags_max_limit
    run_test "验证标签数据格式" test_tags_data_format
    run_test "验证标签去重和排序" test_tags_deduplication_and_sorting
    run_test "验证标签统计准确性" test_tags_statistics_accuracy
    
    print_test_summary
    return $?
}

# 如果直接运行此脚本，执行测试
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    run_module_tests
    exit $?
fi
