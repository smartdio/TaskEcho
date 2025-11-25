#!/bin/bash
# 通用库主入口
# 加载所有通用模块

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 加载所有通用模块
source "$SCRIPT_DIR/config.sh"
source "$SCRIPT_DIR/colors.sh"
source "$SCRIPT_DIR/auth.sh"  # 先加载 auth.sh，因为 http.sh 依赖它
source "$SCRIPT_DIR/http.sh"

# 测试统计
TEST_TOTAL=0
TEST_PASSED=0
TEST_FAILED=0
TEST_SKIPPED=0

# 初始化测试统计
init_test_stats() {
    TEST_TOTAL=0
    TEST_PASSED=0
    TEST_FAILED=0
    TEST_SKIPPED=0
}

# 记录测试结果
record_test_result() {
    local status="$1"
    TEST_TOTAL=$((TEST_TOTAL + 1))
    
    case "$status" in
        PASS)
            TEST_PASSED=$((TEST_PASSED + 1))
            ;;
        FAIL)
            TEST_FAILED=$((TEST_FAILED + 1))
            ;;
        SKIP)
            TEST_SKIPPED=$((TEST_SKIPPED + 1))
            ;;
    esac
}

# 打印测试统计
print_test_summary() {
    echo ""
    print_header "测试统计"
    echo -e "  总测试数: ${BOLD}$TEST_TOTAL${NC}"
    echo -e "  ${GREEN}通过: $TEST_PASSED${NC}"
    echo -e "  ${RED}失败: $TEST_FAILED${NC}"
    echo -e "  ${YELLOW}跳过: $TEST_SKIPPED${NC}"
    
    if [ $TEST_FAILED -eq 0 ]; then
        echo ""
        print_success "所有测试通过！"
        return 0
    else
        echo ""
        print_error "有 $TEST_FAILED 个测试失败"
        return 1
    fi
}

# 运行测试函数并记录结果
run_test() {
    local test_name="$1"
    local test_func="$2"
    
    print_test "$test_name"
    
    if $test_func; then
        record_test_result "PASS"
        return 0
    else
        record_test_result "FAIL"
        return 1
    fi
}

# 跳过测试
skip_test() {
    local test_name="$1"
    local reason="${2:-未指定原因}"
    
    print_test "$test_name"
    print_result "SKIP" "$reason"
    record_test_result "SKIP"
}

# 智能等待函数
# 参数: condition_cmd timeout [interval] [progress_message]
# condition_cmd: 条件检查命令，返回0表示条件满足
# timeout: 最大等待时间（秒）
# interval: 轮询间隔（秒，默认2）
# progress_message: 进度提示信息（可选）
wait_for_condition() {
    local condition_cmd="$1"
    local timeout="${2:-60}"
    local interval="${3:-2}"
    local progress_message="${4:-等待条件满足}"
    
    local start_time=$(date +%s)
    local last_progress_time=$start_time
    local progress_interval=10  # 每10秒输出一次进度
    
    while true; do
        # 执行条件检查
        if eval "$condition_cmd" 2>/dev/null; then
            return 0
        fi
        
        # 计算已等待时间
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        # 检查是否超时
        if [ "$elapsed" -ge "$timeout" ]; then
            return 1
        fi
        
        # 定期输出进度信息
        local time_since_last_progress=$((current_time - last_progress_time))
        if [ "$time_since_last_progress" -ge "$progress_interval" ]; then
            echo "    ${GRAY}[进度] ${progress_message}... 已等待 ${elapsed}/${timeout}秒${NC}"
            last_progress_time=$current_time
        fi
        
        sleep "$interval"
    done
}

# 检查API服务健康状态
# TaskEcho 没有专门的健康检查端点，使用根路径或项目列表接口检查
check_api_health() {
    # 尝试访问项目列表接口（不需要认证）
    local health_response=$(http_get "/api/v1/projects" false 2>/dev/null)
    local status_code=$(get_status_code "$health_response")
    
    # 200 或 401（401 表示服务正常，只是需要认证）都算服务正常
    if [ "$status_code" = "200" ] || [ "$status_code" = "401" ]; then
        return 0
    else
        return 1
    fi
}

# 环境预检
check_test_environment() {
    echo ""
    print_header "环境预检"
    
    # 检查API服务
    echo -n "  检查API服务状态... "
    if check_api_health; then
        echo -e "${GREEN}✓ 正常${NC}"
    else
        echo -e "${RED}✗ 失败${NC}"
        print_error "API服务不可用，请确保 Next.js 服务正在运行"
        print_info "启动服务: npm run dev"
        return 1
    fi
    
    # 检查 API Key（可选，查询接口不需要）
    echo -n "  检查 API Key 配置... "
    local api_key=$(get_api_key 2>/dev/null || echo "")
    if [ -n "$api_key" ]; then
        echo -e "${GREEN}✓ 已配置${NC}"
        [ "$VERBOSE" = "true" ] && echo -e "    ${GRAY}API Key: ${api_key:0:10}...${NC}"
    else
        echo -e "${YELLOW}⚠ 未配置${NC}"
        print_info "查询接口不需要 API Key，但提交接口需要"
        print_info "设置 API Key: export TEST_API_KEY='your-api-key'"
    fi
    
    echo ""
    return 0
}

