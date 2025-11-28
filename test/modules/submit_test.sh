#!/bin/bash
# POST /api/v1/submit 接口测试

# 加载通用库
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../common/lib.sh"

# 测试名称
TEST_MODULE="数据提交接口 (POST /api/v1/submit)"

# 测试用的项目ID和队列ID（使用时间戳确保唯一性）
TEST_PROJECT_ID="test-project-$(date +%s)"
TEST_QUEUE_ID="test-queue-$(date +%s)"

# 测试函数：缺少 API Key（应该返回 401）
test_submit_without_api_key() {
    local data=$(cat <<EOF
{
  "project_id": "$TEST_PROJECT_ID",
  "project_name": "测试项目",
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "测试队列",
  "tasks": [
    {
      "id": "1",
      "name": "测试任务",
      "prompt": "这是一个测试任务",
      "status": "pending"
    }
  ]
}
EOF
)
    
    local response=$(http_post "/api/v1/submit" "$data" false)
    assert_status "$response" "401" "缺少 API Key 应返回401"
    assert_json_field "$response" "success" "false" "响应success应为false"
    assert_json_field "$response" "error.code" "INVALID_API_KEY" "错误码应为INVALID_API_KEY"
}

# 测试函数：缺少必填字段（应该返回 400）
test_submit_missing_required_fields() {
    ensure_api_key || return 1
    
    local data=$(cat <<EOF
{
  "project_id": "$TEST_PROJECT_ID"
}
EOF
)
    
    local response=$(http_post "/api/v1/submit" "$data" true)
    assert_status "$response" "400" "缺少必填字段应返回400"
    assert_json_field "$response" "success" "false" "响应success应为false"
    assert_field_exists "$response" "error.code" "响应应包含error.code字段"
    assert_json_field "$response" "error.code" "VALIDATION_ERROR" "错误码应为VALIDATION_ERROR"
}

# 测试函数：tasks 数组为空（应该返回 400）
test_submit_empty_tasks() {
    ensure_api_key || return 1
    
    local data=$(cat <<EOF
{
  "project_id": "$TEST_PROJECT_ID",
  "project_name": "测试项目",
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "测试队列",
  "tasks": []
}
EOF
)
    
    local response=$(http_post "/api/v1/submit" "$data" true)
    assert_status "$response" "400" "tasks数组为空应返回400"
    assert_json_field "$response" "success" "false" "响应success应为false"
}

# 测试函数：基本提交（创建项目、队列和任务）
test_submit_basic() {
    ensure_api_key || return 1
    
    local data=$(cat <<EOF
{
  "project_id": "$TEST_PROJECT_ID",
  "project_name": "测试项目",
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "测试队列",
  "tasks": [
    {
      "id": "1",
      "name": "测试任务1",
      "prompt": "这是第一个测试任务",
      "status": "pending"
    }
  ]
}
EOF
)
    
    local response=$(http_post "/api/v1/submit" "$data" true)
    assert_status "$response" "200" "基本提交应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    assert_field_exists "$response" "data.project_id" "响应应包含project_id"
    assert_field_exists "$response" "data.queue_id" "响应应包含queue_id"
    assert_field_exists "$response" "data.tasks_count" "响应应包含tasks_count"
    assert_field_exists "$response" "data.created_tasks" "响应应包含created_tasks"
    assert_field_exists "$response" "data.updated_tasks" "响应应包含updated_tasks"
    assert_json_field "$response" "data.tasks_count" "1" "任务数量应为1"
    assert_json_field "$response" "data.created_tasks" "1" "创建的任务数应为1"
}

# 测试函数：批量任务提交
test_submit_multiple_tasks() {
    ensure_api_key || return 1
    
    local data=$(cat <<EOF
{
  "project_id": "$TEST_PROJECT_ID",
  "project_name": "测试项目",
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "测试队列",
  "tasks": [
    {
      "id": "1",
      "name": "测试任务1",
      "prompt": "这是第一个测试任务",
      "status": "pending"
    },
    {
      "id": "2",
      "name": "测试任务2",
      "prompt": "这是第二个测试任务",
      "status": "done",
      "report": ".flow/tasks/report/test.md"
    },
    {
      "id": "3",
      "name": "测试任务3",
      "prompt": "这是第三个测试任务",
      "status": "error",
      "spec_file": [".flow/skills/test.md"]
    }
  ]
}
EOF
)
    
    local response=$(http_post "/api/v1/submit" "$data" true)
    assert_status "$response" "200" "批量任务提交应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
    assert_json_field "$response" "data.tasks_count" "3" "任务数量应为3"
}

# 测试函数：提交带消息和日志的任务
test_submit_with_messages_and_logs() {
    ensure_api_key || return 1
    
    local data=$(cat <<EOF
{
  "project_id": "$TEST_PROJECT_ID",
  "project_name": "测试项目",
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "测试队列",
  "tasks": [
    {
      "id": "4",
      "name": "带消息和日志的任务",
      "prompt": "这是一个包含消息和日志的测试任务",
      "status": "done",
      "messages": [
        {
          "role": "user",
          "content": "用户消息1"
        },
        {
          "role": "assistant",
          "content": "AI回复1"
        }
      ],
      "logs": [
        {
          "content": "执行日志1"
        },
        {
          "content": "执行日志2"
        }
      ]
    }
  ]
}
EOF
)
    
    local response=$(http_post "/api/v1/submit" "$data" true)
    assert_status "$response" "200" "提交带消息和日志的任务应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
}

# 测试函数：幂等性测试（重复提交相同数据）
test_submit_idempotent() {
    ensure_api_key || return 1
    
    local data=$(cat <<EOF
{
  "project_id": "$TEST_PROJECT_ID",
  "project_name": "测试项目（更新）",
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "测试队列（更新）",
  "tasks": [
    {
      "id": "1",
      "name": "更新的任务",
      "prompt": "这是更新后的任务",
      "status": "done"
    }
  ]
}
EOF
)
    
    # 第一次提交
    local response1=$(http_post "/api/v1/submit" "$data" true)
    assert_status "$response1" "200" "第一次提交应返回200"
    
    # 第二次提交相同数据（幂等性）
    local response2=$(http_post "/api/v1/submit" "$data" true)
    assert_status "$response2" "200" "第二次提交应返回200"
    assert_json_field "$response2" "success" "true" "响应success应为true"
    # 第二次提交应该是更新，不是创建
    assert_json_field "$response2" "data.updated_tasks" "1" "更新的任务数应为1"
}

# 测试函数：验证任务ID重复（应该返回 400）
test_submit_duplicate_task_ids() {
    ensure_api_key || return 1
    
    local data=$(cat <<EOF
{
  "project_id": "$TEST_PROJECT_ID",
  "project_name": "测试项目",
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "测试队列",
  "tasks": [
    {
      "id": "1",
      "name": "任务1",
      "prompt": "任务1提示",
      "status": "pending"
    },
    {
      "id": "1",
      "name": "任务2",
      "prompt": "任务2提示",
      "status": "pending"
    }
  ]
}
EOF
)
    
    local response=$(http_post "/api/v1/submit" "$data" true)
    assert_status "$response" "400" "任务ID重复应返回400"
    assert_json_field "$response" "success" "false" "响应success应为false"
}

# 测试函数：验证状态枚举值（应该返回 400）
test_submit_invalid_status() {
    ensure_api_key || return 1
    
    local data=$(cat <<EOF
{
  "project_id": "$TEST_PROJECT_ID",
  "project_name": "测试项目",
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "测试队列",
  "tasks": [
    {
      "id": "1",
      "name": "测试任务",
      "prompt": "测试提示",
      "status": "invalid_status"
    }
  ]
}
EOF
)
    
    local response=$(http_post "/api/v1/submit" "$data" true)
    assert_status "$response" "400" "无效状态应返回400"
    assert_json_field "$response" "success" "false" "响应success应为false"
}

# 测试函数：验证消息角色枚举值（应该返回 400）
test_submit_invalid_message_role() {
    ensure_api_key || return 1
    
    local data=$(cat <<EOF
{
  "project_id": "$TEST_PROJECT_ID",
  "project_name": "测试项目",
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "测试队列",
  "tasks": [
    {
      "id": "1",
      "name": "测试任务",
      "prompt": "测试提示",
      "status": "pending",
      "messages": [
        {
          "role": "invalid_role",
          "content": "消息内容"
        }
      ]
    }
  ]
}
EOF
)
    
    local response=$(http_post "/api/v1/submit" "$data" true)
    assert_status "$response" "400" "无效消息角色应返回400"
    assert_json_field "$response" "success" "false" "响应success应为false"
}

# 测试函数：提交带 meta 数据的队列
test_submit_with_meta() {
    ensure_api_key || return 1
    
    local data=$(cat <<EOF
{
  "project_id": "$TEST_PROJECT_ID",
  "project_name": "测试项目",
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "测试队列",
  "meta": {
    "prompts": [".flow/skills/test.md"]
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
    assert_status "$response" "200" "提交带meta数据的队列应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
}

# 测试函数：提交带 clientInfo 的项目
test_submit_with_client_info() {
    ensure_api_key || return 1
    
    local data=$(cat <<EOF
{
  "project_id": "$TEST_PROJECT_ID",
  "project_name": "测试项目",
  "clientInfo": {
    "username": "testuser",
    "hostname": "testhost",
    "project_path": "~/test/project"
  },
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "测试队列",
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
    assert_status "$response" "200" "提交带clientInfo的项目应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
}

# 测试函数：验证 clientInfo 字段格式（无效格式应返回 400）
test_submit_invalid_client_info() {
    ensure_api_key || return 1
    
    local data=$(cat <<EOF
{
  "project_id": "$TEST_PROJECT_ID",
  "project_name": "测试项目",
  "clientInfo": "invalid_string",
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "测试队列",
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
    assert_status "$response" "400" "无效clientInfo格式应返回400"
    assert_json_field "$response" "success" "false" "响应success应为false"
}

# 测试函数：提交带完整 gitInfo 的项目
test_submit_with_git_info() {
    ensure_api_key || return 1
    
    local data=$(cat <<EOF
{
  "project_id": "$TEST_PROJECT_ID",
  "project_name": "测试项目",
  "gitInfo": {
    "repository": "https://github.com/user/repo.git",
    "branch": "main"
  },
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "测试队列",
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
    assert_status "$response" "200" "提交带gitInfo的项目应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
}

# 测试函数：提交带部分 gitInfo 的项目（只有 repository）
test_submit_with_partial_git_info_repository() {
    ensure_api_key || return 1
    
    local data=$(cat <<EOF
{
  "project_id": "$TEST_PROJECT_ID",
  "project_name": "测试项目",
  "gitInfo": {
    "repository": "https://github.com/user/repo.git"
  },
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "测试队列",
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
    assert_status "$response" "200" "提交带部分gitInfo（repository）的项目应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
}

# 测试函数：提交带部分 gitInfo 的项目（只有 branch）
test_submit_with_partial_git_info_branch() {
    ensure_api_key || return 1
    
    local data=$(cat <<EOF
{
  "project_id": "$TEST_PROJECT_ID",
  "project_name": "测试项目",
  "gitInfo": {
    "branch": "develop"
  },
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "测试队列",
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
    assert_status "$response" "200" "提交带部分gitInfo（branch）的项目应返回200"
    assert_json_field "$response" "success" "true" "响应success应为true"
}

# 测试函数：验证 gitInfo 字段格式（无效格式应返回 400）
test_submit_invalid_git_info() {
    ensure_api_key || return 1
    
    local data=$(cat <<EOF
{
  "project_id": "$TEST_PROJECT_ID",
  "project_name": "测试项目",
  "gitInfo": "invalid_string",
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "测试队列",
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

# 测试函数：验证 gitInfo.repository 长度限制（超过 500 字符应返回 400）
test_submit_git_info_repository_too_long() {
    ensure_api_key || return 1
    
    # 生成一个超过 500 字符的 repository 字符串
    local long_repo=$(printf 'a%.0s' {1..501})
    
    local data=$(cat <<EOF
{
  "project_id": "$TEST_PROJECT_ID",
  "project_name": "测试项目",
  "gitInfo": {
    "repository": "$long_repo",
    "branch": "main"
  },
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "测试队列",
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
    assert_status "$response" "400" "repository超过500字符应返回400"
    assert_json_field "$response" "success" "false" "响应success应为false"
}

# 测试函数：验证 gitInfo.branch 长度限制（超过 255 字符应返回 400）
test_submit_git_info_branch_too_long() {
    ensure_api_key || return 1
    
    # 生成一个超过 255 字符的 branch 字符串
    local long_branch=$(printf 'a%.0s' {1..256})
    
    local data=$(cat <<EOF
{
  "project_id": "$TEST_PROJECT_ID",
  "project_name": "测试项目",
  "gitInfo": {
    "repository": "https://github.com/user/repo.git",
    "branch": "$long_branch"
  },
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "测试队列",
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
    assert_status "$response" "400" "branch超过255字符应返回400"
    assert_json_field "$response" "success" "false" "响应success应为false"
}

# 测试函数：验证 gitInfo 部分更新功能
test_submit_git_info_partial_update() {
    ensure_api_key || return 1
    
    # 第一次提交：完整的 gitInfo
    local data1=$(cat <<EOF
{
  "project_id": "$TEST_PROJECT_ID",
  "project_name": "测试项目",
  "gitInfo": {
    "repository": "https://github.com/user/repo.git",
    "branch": "main"
  },
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "测试队列",
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
    
    # 第二次提交：只更新 branch，repository 应该保留
    local data2=$(cat <<EOF
{
  "project_id": "$TEST_PROJECT_ID",
  "project_name": "测试项目",
  "gitInfo": {
    "branch": "develop"
  },
  "queue_id": "$TEST_QUEUE_ID",
  "queue_name": "测试队列",
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
    assert_status "$response2" "200" "第二次提交（部分更新）应返回200"
    assert_json_field "$response2" "success" "true" "响应success应为true"
}

# 运行所有测试
run_module_tests() {
    print_header "$TEST_MODULE 测试"
    
    init_test_stats
    
    run_test "缺少 API Key" test_submit_without_api_key
    run_test "缺少必填字段" test_submit_missing_required_fields
    run_test "tasks数组为空" test_submit_empty_tasks
    run_test "基本提交" test_submit_basic
    run_test "批量任务提交" test_submit_multiple_tasks
    run_test "提交带消息和日志的任务" test_submit_with_messages_and_logs
    run_test "幂等性测试" test_submit_idempotent
    run_test "任务ID重复验证" test_submit_duplicate_task_ids
    run_test "无效状态验证" test_submit_invalid_status
    run_test "无效消息角色验证" test_submit_invalid_message_role
    run_test "提交带meta数据的队列" test_submit_with_meta
    run_test "提交带clientInfo的项目" test_submit_with_client_info
    run_test "无效clientInfo格式验证" test_submit_invalid_client_info
    run_test "提交带完整gitInfo的项目" test_submit_with_git_info
    run_test "提交带部分gitInfo（repository）的项目" test_submit_with_partial_git_info_repository
    run_test "提交带部分gitInfo（branch）的项目" test_submit_with_partial_git_info_branch
    run_test "无效gitInfo格式验证" test_submit_invalid_git_info
    run_test "gitInfo.repository长度限制验证" test_submit_git_info_repository_too_long
    run_test "gitInfo.branch长度限制验证" test_submit_git_info_branch_too_long
    run_test "gitInfo部分更新功能验证" test_submit_git_info_partial_update
    
    print_test_summary
    return $?
}

# 如果直接运行此脚本，执行测试
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    run_module_tests
    exit $?
fi
