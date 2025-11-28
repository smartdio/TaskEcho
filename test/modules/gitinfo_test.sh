#!/bin/bash
# Git 信息功能测试

# 加载通用库
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../common/lib.sh"

# 测试名称
TEST_MODULE="Git 信息功能 (gitInfo)"

# 测试用的项目ID和队列ID（使用时间戳确保唯一性）
TEST_PROJECT_ID="test-gitinfo-$(date +%s)"
TEST_QUEUE_ID="test-queue-$(date +%s)"

# 测试函数：提交带完整 gitInfo 的项目
test_submit_with_full_gitinfo() {
    ensure_api_key || return 1
    
    local data=$(cat <<EOF
{
  "project_id": "$TEST_PROJECT_ID",
  "project_name": "测试项目（带Git信息）",
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "测试队列",
  "gitInfo": {
    "repository": "https://github.com/user/repo.git",
    "branch": "main"
  },
  "tasks": [
    {
      "id": "1",
      "name": "测试任务",
      "prompt": "测试提示",
      "status": "pending"
    }
  ]
}
EOF
)
    
    local response=$(http_post "/api/v1/submit" "$data" true)
    assert_status "$response" "200" "提交带完整gitInfo的项目应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    
    # 验证项目列表返回 gitInfo
    local projects_response=$(http_get "/api/v1/projects" true)
    assert_status "$projects_response" "200" "获取项目列表应返回200"
    assert_field_exists "$projects_response" "data" "响应应包含data字段"
}

# 测试函数：提交带部分 gitInfo 的项目（只有 repository）
test_submit_with_partial_gitinfo_repository() {
    ensure_api_key || return 1
    
    local project_id="test-gitinfo-partial-repo-$(date +%s)"
    local data=$(cat <<EOF
{
  "project_id": "$project_id",
  "project_name": "测试项目（只有repository）",
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "测试队列",
  "gitInfo": {
    "repository": "https://github.com/user/repo.git"
  },
  "tasks": [
    {
      "id": "1",
      "name": "测试任务",
      "prompt": "测试提示",
      "status": "pending"
    }
  ]
}
EOF
)
    
    local response=$(http_post "/api/v1/submit" "$data" true)
    assert_status "$response" "200" "提交带部分gitInfo的项目应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
}

# 测试函数：提交带部分 gitInfo 的项目（只有 branch）
test_submit_with_partial_gitinfo_branch() {
    ensure_api_key || return 1
    
    local project_id="test-gitinfo-partial-branch-$(date +%s)"
    local data=$(cat <<EOF
{
  "project_id": "$project_id",
  "project_name": "测试项目（只有branch）",
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "测试队列",
  "gitInfo": {
    "branch": "develop"
  },
  "tasks": [
    {
      "id": "1",
      "name": "测试任务",
      "prompt": "测试提示",
      "status": "pending"
    }
  ]
}
EOF
)
    
    local response=$(http_post "/api/v1/submit" "$data" true)
    assert_status "$response" "200" "提交带部分gitInfo的项目应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
}

# 测试函数：验证 gitInfo 字段格式（无效格式应返回 400）
test_submit_invalid_gitinfo_format() {
    ensure_api_key || return 1
    
    local data=$(cat <<EOF
{
  "project_id": "$TEST_PROJECT_ID",
  "project_name": "测试项目",
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "测试队列",
  "gitInfo": "invalid_string",
  "tasks": [
    {
      "id": "1",
      "name": "测试任务",
      "prompt": "测试提示",
      "status": "pending"
    }
  ]
}
EOF
)
    
    local response=$(http_post "/api/v1/submit" "$data" true)
    assert_status "$response" "400" "无效gitInfo格式应返回400"
    assert_json_field "$response" "success" "false" "响应success应为false"
}

# 测试函数：验证 repository 字段长度限制（超过500字符应返回 400）
test_submit_gitinfo_repository_too_long() {
    ensure_api_key || return 1
    
    # 生成超过500字符的字符串
    local long_repo=$(printf 'a%.0s' {1..501})
    
    local data=$(cat <<EOF
{
  "project_id": "$TEST_PROJECT_ID",
  "project_name": "测试项目",
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "测试队列",
  "gitInfo": {
    "repository": "$long_repo"
  },
  "tasks": [
    {
      "id": "1",
      "name": "测试任务",
      "prompt": "测试提示",
      "status": "pending"
    }
  ]
}
EOF
)
    
    local response=$(http_post "/api/v1/submit" "$data" true)
    assert_status "$response" "400" "repository字段过长应返回400"
    assert_json_field "$response" "success" "false" "响应success应为false"
}

# 测试函数：验证 branch 字段长度限制（超过255字符应返回 400）
test_submit_gitinfo_branch_too_long() {
    ensure_api_key || return 1
    
    # 生成超过255字符的字符串
    local long_branch=$(printf 'a%.0s' {1..256})
    
    local data=$(cat <<EOF
{
  "project_id": "$TEST_PROJECT_ID",
  "project_name": "测试项目",
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "测试队列",
  "gitInfo": {
    "branch": "$long_branch"
  },
  "tasks": [
    {
      "id": "1",
      "name": "测试任务",
      "prompt": "测试提示",
      "status": "pending"
    }
  ]
}
EOF
)
    
    local response=$(http_post "/api/v1/submit" "$data" true)
    assert_status "$response" "400" "branch字段过长应返回400"
    assert_json_field "$response" "success" "false" "响应success应为false"
}

# 测试函数：查询项目列表时返回 gitInfo
test_get_projects_with_gitinfo() {
    ensure_api_key || return 1
    
    # 先创建一个带 gitInfo 的项目
    local project_id="test-gitinfo-list-$(date +%s)"
    local data=$(cat <<EOF
{
  "project_id": "$project_id",
  "project_name": "测试项目（用于列表查询）",
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "测试队列",
  "gitInfo": {
    "repository": "https://github.com/user/repo.git",
    "branch": "main"
  },
  "tasks": [
    {
      "id": "1",
      "name": "测试任务",
      "prompt": "测试提示",
      "status": "pending"
    }
  ]
}
EOF
)
    
    local submit_response=$(http_post "/api/v1/submit" "$data" true)
    assert_status "$submit_response" "200" "提交项目应返回200"
    
    # 等待一下确保数据已保存
    sleep 1
    
    # 查询项目列表
    local projects_response=$(http_get "/api/v1/projects" true)
    assert_status "$projects_response" "200" "获取项目列表应返回200"
    assert_field_exists "$projects_response" "data" "响应应包含data字段"
    
    # 验证响应中包含 gitInfo 字段（通过检查 JSON 结构）
    # 注意：这里只检查字段存在，不检查具体值（因为可能有多个项目）
    echo "$projects_response" | grep -q "gitInfo" || {
        print_error "项目列表响应中应包含gitInfo字段"
        return 1
    }
    
    # 验证 gitInfo 字段结构（如果存在）
    # 使用 jq 检查 gitInfo 字段的结构（如果 jq 可用）
    if command -v jq &> /dev/null; then
        local gitinfo_count=$(echo "$projects_response" | jq -r '.data.items[]?.gitInfo // empty' | grep -c "repository" || echo "0")
        if [ "$gitinfo_count" -gt 0 ]; then
            # 验证 gitInfo 对象包含 repository 和 branch 字段
            local has_repo=$(echo "$projects_response" | jq -r '.data.items[]?.gitInfo.repository // empty' | grep -c "." || echo "0")
            local has_branch=$(echo "$projects_response" | jq -r '.data.items[]?.gitInfo.branch // empty' | grep -c "." || echo "0")
            
            if [ "$has_repo" -eq 0 ] && [ "$has_branch" -eq 0 ]; then
                print_warning "gitInfo 字段存在但结构可能不正确"
            fi
        fi
    fi
}

# 测试函数：查询项目详情时返回 gitInfo
test_get_project_detail_with_gitinfo() {
    ensure_api_key || return 1
    
    # 先创建一个带 gitInfo 的项目
    local project_id="test-gitinfo-detail-$(date +%s)"
    local data=$(cat <<EOF
{
  "project_id": "$project_id",
  "project_name": "测试项目（用于详情查询）",
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "测试队列",
  "gitInfo": {
    "repository": "https://github.com/user/repo.git",
    "branch": "develop"
  },
  "tasks": [
    {
      "id": "1",
      "name": "测试任务",
      "prompt": "测试提示",
      "status": "pending"
    }
  ]
}
EOF
)
    
    local submit_response=$(http_post "/api/v1/submit" "$data" true)
    assert_status "$submit_response" "200" "提交项目应返回200"
    
    # 查询项目详情
    local detail_response=$(http_get "/api/v1/projects/$project_id" true)
    assert_status "$detail_response" "200" "获取项目详情应返回200"
    assert_field_exists "$detail_response" "data.gitInfo" "响应应包含gitInfo字段"
    assert_json_field "$detail_response" "data.gitInfo.repository" "https://github.com/user/repo.git" "repository应为https://github.com/user/repo.git"
    assert_json_field "$detail_response" "data.gitInfo.branch" "develop" "branch应为develop"
}

# 测试函数：更新项目的 gitInfo（部分更新）
test_update_project_gitinfo() {
    ensure_api_key || return 1
    
    local project_id="test-gitinfo-update-$(date +%s)"
    
    # 第一次提交：只提供 repository
    local data1=$(cat <<EOF
{
  "project_id": "$project_id",
  "project_name": "测试项目（更新gitInfo）",
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "测试队列",
  "gitInfo": {
    "repository": "https://github.com/user/repo.git"
  },
  "tasks": [
    {
      "id": "1",
      "name": "测试任务",
      "prompt": "测试提示",
      "status": "pending"
    }
  ]
}
EOF
)
    
    local response1=$(http_post "/api/v1/submit" "$data1" true)
    assert_status "$response1" "200" "第一次提交应返回200"
    
    # 第二次提交：添加 branch
    local data2=$(cat <<EOF
{
  "project_id": "$project_id",
  "project_name": "测试项目（更新gitInfo）",
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "测试队列",
  "gitInfo": {
    "branch": "main"
  },
  "tasks": [
    {
      "id": "1",
      "name": "测试任务",
      "prompt": "测试提示",
      "status": "pending"
    }
  ]
}
EOF
)
    
    local response2=$(http_post "/api/v1/submit" "$data2" true)
    assert_status "$response2" "200" "第二次提交应返回200"
    
    # 查询项目详情，验证 gitInfo 已更新
    local detail_response=$(http_get "/api/v1/projects/$project_id" true)
    assert_status "$detail_response" "200" "获取项目详情应返回200"
    assert_json_field "$detail_response" "data.gitInfo.repository" "https://github.com/user/repo.git" "repository应保留"
    assert_json_field "$detail_response" "data.gitInfo.branch" "main" "branch应已更新"
}

# 运行所有测试
run_module_tests() {
    print_header "$TEST_MODULE 测试"
    
    init_test_stats
    
    run_test "提交带完整gitInfo的项目" test_submit_with_full_gitinfo
    run_test "提交带部分gitInfo的项目（只有repository）" test_submit_with_partial_gitinfo_repository
    run_test "提交带部分gitInfo的项目（只有branch）" test_submit_with_partial_gitinfo_branch
    run_test "无效gitInfo格式验证" test_submit_invalid_gitinfo_format
    run_test "repository字段长度限制验证" test_submit_gitinfo_repository_too_long
    run_test "branch字段长度限制验证" test_submit_gitinfo_branch_too_long
    run_test "查询项目列表时返回gitInfo" test_get_projects_with_gitinfo
    run_test "查询项目详情时返回gitInfo" test_get_project_detail_with_gitinfo
    run_test "更新项目的gitInfo（部分更新）" test_update_project_gitinfo
    
    print_test_summary
    return $?
}

# 如果直接运行此脚本，执行测试
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    run_module_tests
    exit $?
fi
