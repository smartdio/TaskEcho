#!/bin/bash
# 项目元数据相关接口测试
# GET /api/v1/projects/:projectId/metadata - 获取项目元数据
# PUT /api/v1/projects/:projectId/metadata - 创建或更新项目元数据
# DELETE /api/v1/projects/:projectId/metadata - 删除项目元数据

# 加载通用库
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../common/lib.sh"

# 测试名称
TEST_MODULE="项目元数据接口测试"

# 测试用的项目ID（使用时间戳确保唯一性）
TEST_PROJECT_ID="test-metadata-project-$(date +%s)"

# 创建测试项目（如果不存在）
create_test_project() {
    ensure_api_key || return 1
    
    # 检查项目是否已存在
    local check_response=$(http_get "/api/v1/projects/$TEST_PROJECT_ID" false 2>/dev/null)
    local check_code=$(echo "$check_response" | sed 's/^.*|//')
    
    if [ "$check_code" = "200" ]; then
        # 项目已存在，直接返回
        return 0
    fi
    
    # 创建测试项目
    local data=$(cat <<EOF
{
  "project_id": "$TEST_PROJECT_ID",
  "project_name": "元数据测试项目",
  "queue_id": "test-queue-$(date +%s)",
  "queue_name": "测试队列",
  "tasks": [
    {
      "id": "1",
      "name": "测试任务",
      "prompt": "测试任务",
      "status": "pending"
    }
  ]
}
EOF
)
    
    local response=$(http_post "/api/v1/submit" "$data" true)
    local http_code=$(echo "$response" | sed 's/^.*|//')
    
    if [ "$http_code" = "200" ]; then
        return 0
    else
        return 1
    fi
}

# 获取测试项目ID
get_test_project_id() {
    # 先尝试创建测试项目
    create_test_project >/dev/null 2>&1
    echo "$TEST_PROJECT_ID"
}

# 测试函数：获取项目元数据（需要认证）
test_get_metadata() {
    ensure_api_key || return 1
    
    local project_id=$(get_test_project_id)
    
    if [ -z "$project_id" ]; then
        skip_test "获取项目元数据" "没有可用的项目数据"
        return 0
    fi
    
    local response=$(http_get "/api/v1/projects/$project_id/metadata" true)
    assert_status "$response" "200" "获取项目元数据应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    assert_field_exists "$response" "data" "响应应包含data字段"
    
    # 验证元数据结构
    assert_field_exists "$response" "data.projectId" "元数据应包含projectId字段"
    assert_field_exists "$response" "data.customTitle" "元数据应包含customTitle字段"
    assert_field_exists "$response" "data.notes" "元数据应包含notes字段"
    assert_field_exists "$response" "data.tags" "元数据应包含tags字段"
}

# 测试函数：获取项目元数据（不存在的项目）
test_get_metadata_project_not_found() {
    ensure_api_key || return 1
    
    local response=$(http_get "/api/v1/projects/non-existent-project-12345/metadata" true)
    assert_status "$response" "404" "不存在的项目的元数据应返回404"
    assert_json_field "$response" "success" "false" "响应success应为false"
    assert_field_exists "$response" "error.code" "响应应包含error.code字段"
    assert_json_field "$response" "error.code" "RESOURCE_NOT_FOUND" "错误码应为RESOURCE_NOT_FOUND"
}

# 测试函数：创建项目元数据
test_create_metadata() {
    ensure_api_key || return 1
    
    local project_id=$(get_test_project_id)
    
    if [ -z "$project_id" ]; then
        skip_test "创建项目元数据" "没有可用的项目数据"
        return 0
    fi
    
    # 先删除可能存在的元数据
    http_delete "/api/v1/projects/$project_id/metadata" true >/dev/null 2>&1
    
    local data='{
        "customTitle": "测试自定义标题",
        "notes": "这是测试备注",
        "tags": ["测试", "前端", "React"]
    }'
    
    local response=$(http_put "/api/v1/projects/$project_id/metadata" "$data" true)
    assert_status "$response" "200" "创建项目元数据应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    assert_field_exists "$response" "data" "响应应包含data字段"
    
    # 验证返回的数据
    assert_json_field "$response" "data.projectId" "$project_id" "projectId应匹配"
    assert_json_field "$response" "data.customTitle" "测试自定义标题" "customTitle应匹配"
    assert_json_field "$response" "data.notes" "这是测试备注" "notes应匹配"
    
    # 验证标签（应该转换为小写）
    local tags=$(echo "$response" | jq -r '.data.tags | join(",")')
    if [[ ! "$tags" =~ "测试" ]] || [[ ! "$tags" =~ "前端" ]] || [[ ! "$tags" =~ "react" ]]; then
        print_error "标签数据不正确: $tags"
        return 1
    fi
}

# 测试函数：更新项目元数据
test_update_metadata() {
    ensure_api_key || return 1
    
    local project_id=$(get_test_project_id)
    
    if [ -z "$project_id" ]; then
        skip_test "更新项目元数据" "没有可用的项目数据"
        return 0
    fi
    
    # 先创建元数据
    local create_data='{
        "customTitle": "原始标题",
        "notes": "原始备注",
        "tags": ["原始标签"]
    }'
    http_put "/api/v1/projects/$project_id/metadata" "$create_data" true >/dev/null 2>&1
    
    # 更新元数据
    local update_data='{
        "customTitle": "更新后的标题",
        "notes": "更新后的备注",
        "tags": ["新标签1", "新标签2"]
    }'
    
    local response=$(http_put "/api/v1/projects/$project_id/metadata" "$update_data" true)
    assert_status "$response" "200" "更新项目元数据应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    
    # 验证更新后的数据
    assert_json_field "$response" "data.customTitle" "更新后的标题" "customTitle应已更新"
    assert_json_field "$response" "data.notes" "更新后的备注" "notes应已更新"
    
    # 验证标签已更新
    local tags=$(echo "$response" | jq -r '.data.tags | length')
    if [ "$tags" != "2" ]; then
        print_error "标签数量不正确，期望2个，实际$tags个"
        return 1
    fi
}

# 测试函数：部分更新项目元数据
test_partial_update_metadata() {
    ensure_api_key || return 1
    
    local project_id=$(get_test_project_id)
    
    if [ -z "$project_id" ]; then
        skip_test "部分更新项目元数据" "没有可用的项目数据"
        return 0
    fi
    
    # 先创建完整的元数据
    local create_data='{
        "customTitle": "完整标题",
        "notes": "完整备注",
        "tags": ["标签1", "标签2"]
    }'
    http_put "/api/v1/projects/$project_id/metadata" "$create_data" true >/dev/null 2>&1
    
    # 只更新 customTitle
    local update_data='{
        "customTitle": "只更新标题"
    }'
    
    local response=$(http_put "/api/v1/projects/$project_id/metadata" "$update_data" true)
    assert_status "$response" "200" "部分更新应返回200"
    assert_json_field "$response" "data.customTitle" "只更新标题" "customTitle应已更新"
    
    # 验证其他字段保持不变（通过GET请求验证）
    local get_response=$(http_get "/api/v1/projects/$project_id/metadata" true)
    assert_json_field "$get_response" "data.notes" "完整备注" "notes应保持不变"
    local tags_count=$(echo "$get_response" | jq -r '.data.tags | length')
    if [ "$tags_count" != "2" ]; then
        print_error "标签数量应保持不变，期望2个，实际$tags_count个"
        return 1
    fi
}

# 测试函数：标签自动去重和转小写
test_tags_normalization() {
    ensure_api_key || return 1
    
    local project_id=$(get_test_project_id)
    
    if [ -z "$project_id" ]; then
        skip_test "标签规范化" "没有可用的项目数据"
        return 0
    fi
    
    # 创建包含重复标签和不同大小写的元数据
    local data='{
        "tags": ["React", "react", "REACT", "前端", "前端", "  Vue  "]
    }'
    
    local response=$(http_put "/api/v1/projects/$project_id/metadata" "$data" true)
    assert_status "$response" "200" "创建元数据应返回200"
    
    # 验证标签已去重和转小写
    local tags=$(echo "$response" | jq -r '.data.tags | sort | join(",")')
    local expected_tags="react,vue,前端"
    
    if [ "$tags" != "$expected_tags" ]; then
        print_error "标签规范化失败，期望: $expected_tags，实际: $tags"
        return 1
    fi
}

# 测试函数：验证 customTitle 长度限制
test_custom_title_length_validation() {
    ensure_api_key || return 1
    
    local project_id=$(get_test_project_id)
    
    if [ -z "$project_id" ]; then
        skip_test "验证customTitle长度" "没有可用的项目数据"
        return 0
    fi
    
    # 创建超过200字符的标题
    local long_title=$(printf 'a%.0s' {1..201})
    local data="{\"customTitle\": \"$long_title\"}"
    
    local response=$(http_put "/api/v1/projects/$project_id/metadata" "$data" true)
    assert_status "$response" "400" "超过长度限制应返回400"
    assert_json_field "$response" "success" "false" "响应success应为false"
    assert_field_exists "$response" "error.code" "响应应包含error.code字段"
    assert_json_field "$response" "error.code" "VALIDATION_ERROR" "错误码应为VALIDATION_ERROR"
}

# 测试函数：验证 notes 长度限制
test_notes_length_validation() {
    ensure_api_key || return 1
    
    local project_id=$(get_test_project_id)
    
    if [ -z "$project_id" ]; then
        skip_test "验证notes长度" "没有可用的项目数据"
        return 0
    fi
    
    # 创建超过5000字符的备注
    local long_notes=$(printf 'a%.0s' {1..5001})
    local data="{\"notes\": \"$long_notes\"}"
    
    local response=$(http_put "/api/v1/projects/$project_id/metadata" "$data" true)
    assert_status "$response" "400" "超过长度限制应返回400"
    assert_json_field "$response" "success" "false" "响应success应为false"
    assert_json_field "$response" "error.code" "VALIDATION_ERROR" "错误码应为VALIDATION_ERROR"
}

# 测试函数：验证标签数量限制
test_tags_count_validation() {
    ensure_api_key || return 1
    
    local project_id=$(get_test_project_id)
    
    if [ -z "$project_id" ]; then
        skip_test "验证标签数量" "没有可用的项目数据"
        return 0
    fi
    
    # 创建超过20个标签的数组
    local tags_array="["
    for i in {1..21}; do
        if [ $i -gt 1 ]; then
            tags_array+=","
        fi
        tags_array+="\"tag$i\""
    done
    tags_array+="]"
    
    local data="{\"tags\": $tags_array}"
    
    local response=$(http_put "/api/v1/projects/$project_id/metadata" "$data" true)
    assert_status "$response" "400" "超过标签数量限制应返回400"
    assert_json_field "$response" "success" "false" "响应success应为false"
    assert_json_field "$response" "error.code" "VALIDATION_ERROR" "错误码应为VALIDATION_ERROR"
}

# 测试函数：验证标签长度限制
test_tag_length_validation() {
    ensure_api_key || return 1
    
    local project_id=$(get_test_project_id)
    
    if [ -z "$project_id" ]; then
        skip_test "验证标签长度" "没有可用的项目数据"
        return 0
    fi
    
    # 创建超过50字符的标签
    local long_tag=$(printf 'a%.0s' {1..51})
    local data="{\"tags\": [\"$long_tag\"]}"
    
    local response=$(http_put "/api/v1/projects/$project_id/metadata" "$data" true)
    assert_status "$response" "400" "超过标签长度限制应返回400"
    assert_json_field "$response" "success" "false" "响应success应为false"
    assert_json_field "$response" "error.code" "VALIDATION_ERROR" "错误码应为VALIDATION_ERROR"
}

# 测试函数：删除项目元数据
test_delete_metadata() {
    ensure_api_key || return 1
    
    local project_id=$(get_test_project_id)
    
    if [ -z "$project_id" ]; then
        skip_test "删除项目元数据" "没有可用的项目数据"
        return 0
    fi
    
    # 先创建元数据
    local data='{
        "customTitle": "待删除的标题",
        "notes": "待删除的备注",
        "tags": ["待删除"]
    }'
    http_put "/api/v1/projects/$project_id/metadata" "$data" true >/dev/null 2>&1
    
    # 删除元数据
    local response=$(http_delete "/api/v1/projects/$project_id/metadata" true)
    assert_status "$response" "200" "删除项目元数据应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    
    # 验证元数据已删除（GET应返回空数据）
    local get_response=$(http_get "/api/v1/projects/$project_id/metadata" true)
    assert_status "$get_response" "200" "获取已删除的元数据应返回200"
    local custom_title=$(echo "$get_response" | jq -r '.data.customTitle')
    if [ "$custom_title" != "null" ]; then
        print_error "元数据应已删除，但customTitle不为null: $custom_title"
        return 1
    fi
}

# 测试函数：删除不存在的元数据（幂等操作）
test_delete_nonexistent_metadata() {
    ensure_api_key || return 1
    
    local project_id=$(get_test_project_id)
    
    if [ -z "$project_id" ]; then
        skip_test "删除不存在的元数据" "没有可用的项目数据"
        return 0
    fi
    
    # 确保元数据不存在
    http_delete "/api/v1/projects/$project_id/metadata" true >/dev/null 2>&1
    
    # 再次删除（应该成功，幂等操作）
    local response=$(http_delete "/api/v1/projects/$project_id/metadata" true)
    assert_status "$response" "200" "删除不存在的元数据应返回200（幂等）"
    assert_json_field "$response" "success" "true" "响应success应为true"
}

# 测试函数：删除不存在的项目的元数据
test_delete_metadata_project_not_found() {
    ensure_api_key || return 1
    
    local response=$(http_delete "/api/v1/projects/non-existent-project-12345/metadata" true)
    assert_status "$response" "404" "不存在的项目的元数据删除应返回404"
    assert_json_field "$response" "success" "false" "响应success应为false"
    assert_json_field "$response" "error.code" "RESOURCE_NOT_FOUND" "错误码应为RESOURCE_NOT_FOUND"
}

# 运行所有测试
run_module_tests() {
    print_header "$TEST_MODULE"
    
    init_test_stats
    
    # GET接口测试
    print_section "获取项目元数据 (GET /api/v1/projects/:projectId/metadata)"
    run_test "获取项目元数据（需要认证）" test_get_metadata
    run_test "获取项目元数据（不存在的项目）" test_get_metadata_project_not_found
    
    # PUT接口测试
    print_section "创建/更新项目元数据 (PUT /api/v1/projects/:projectId/metadata)"
    run_test "创建项目元数据" test_create_metadata
    run_test "更新项目元数据" test_update_metadata
    run_test "部分更新项目元数据" test_partial_update_metadata
    run_test "标签自动去重和转小写" test_tags_normalization
    
    # 数据验证测试
    print_section "数据验证测试"
    run_test "验证customTitle长度限制（200字符）" test_custom_title_length_validation
    run_test "验证notes长度限制（5000字符）" test_notes_length_validation
    run_test "验证标签数量限制（20个）" test_tags_count_validation
    run_test "验证标签长度限制（50字符）" test_tag_length_validation
    
    # DELETE接口测试
    print_section "删除项目元数据 (DELETE /api/v1/projects/:projectId/metadata)"
    run_test "删除项目元数据" test_delete_metadata
    run_test "删除不存在的元数据（幂等操作）" test_delete_nonexistent_metadata
    run_test "删除不存在的项目的元数据" test_delete_metadata_project_not_found
    
    print_test_summary
    return $?
}

# 如果直接运行此脚本，执行测试
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    run_module_tests
    exit $?
fi
