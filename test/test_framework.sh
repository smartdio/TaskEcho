#!/bin/bash
# 测试框架功能验证脚本
# 即使API服务不可用，也能验证框架的基本功能

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common/lib.sh"

print_header "测试框架功能验证"

# 测试1: 颜色输出
print_section "测试颜色输出功能"
print_success "成功消息测试"
print_error "错误消息测试"
print_warning "警告消息测试"
print_info "信息消息测试"
print_test "测试项消息测试"
print_result "PASS" "测试通过" "详细信息"
print_result "FAIL" "测试失败" "错误详情"
print_result "SKIP" "测试跳过" "跳过原因"

# 测试2: HTTP请求（项目列表端点，不需要认证）
print_section "测试HTTP请求功能"
print_test "项目列表端点"
projects_response=$(http_get "/api/v1/projects" false)
projects_status=$(get_status_code "$projects_response")
projects_body=$(get_response_body "$projects_response")

if [ "$projects_status" = "200" ]; then
    print_success "项目列表查询成功 (HTTP $projects_status)"
    [ "$VERBOSE" = "true" ] && echo -e "  ${GRAY}响应: $projects_body${NC}"
else
    print_warning "项目列表查询失败 (HTTP $projects_status)"
    [ "$VERBOSE" = "true" ] && echo -e "  ${GRAY}响应: $projects_body${NC}"
fi

# 测试3: 断言功能
print_section "测试断言功能"
test_response="$projects_body|$projects_status"
assert_status "$test_response" "$projects_status" "状态码断言测试"

# 测试4: 配置加载
print_section "测试配置加载"
echo -e "  ${GRAY}BASE_URL: $BASE_URL${NC}"
api_key=$(get_api_key 2>/dev/null || echo "未配置")
if [ -n "$api_key" ]; then
    echo -e "  ${GRAY}TEST_API_KEY: ${api_key:0:10}...${NC}"
else
    echo -e "  ${GRAY}TEST_API_KEY: 未配置${NC}"
fi
echo -e "  ${GRAY}VERBOSE: $VERBOSE${NC}"
echo -e "  ${GRAY}COLOR_OUTPUT: $COLOR_OUTPUT${NC}"

# 测试5: API Key 功能
print_section "测试 API Key 功能"
api_key=$(get_api_key 2>/dev/null || echo "")
if [ -n "$api_key" ]; then
    print_success "API Key 已配置"
else
    print_warning "API Key 未配置（查询接口不需要，提交接口需要）"
fi

# 测试6: 测试统计
print_section "测试统计功能"
init_test_stats
run_test "示例测试1" true
run_test "示例测试2" false
skip_test "示例测试3" "跳过原因"
print_test_summary

print_header "框架功能验证完成"

