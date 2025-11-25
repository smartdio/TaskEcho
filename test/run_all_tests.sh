#!/bin/bash
# 主测试运行脚本
# 运行所有测试模块

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_ROOT="$SCRIPT_DIR"

# 加载通用库
source "$TEST_ROOT/common/lib.sh"
source "$TEST_ROOT/common/validate.sh"

# 测试开始时间
START_TIME=$(date +%s)

# 打印欢迎信息
print_header "TaskEcho API 测试套件"

# 验证依赖
print_section "检查依赖"
if ! validate_dependencies; then
    exit 1
fi

# 显示配置信息
print_section "测试配置"
echo -e "  ${GRAY}API地址:${NC} $BASE_URL"
api_key=$(get_api_key 2>/dev/null || echo "")
if [ -n "$api_key" ]; then
    echo -e "  ${GRAY}API Key:${NC} ${api_key:0:10}..."
else
    echo -e "  ${GRAY}API Key:${NC} ${YELLOW}未配置（查询接口不需要，提交接口需要）${NC}"
fi
echo -e "  ${GRAY}报告目录:${NC} $REPORT_DIR"

# 环境预检
print_section "环境预检"
if ! check_test_environment; then
    print_error "环境预检失败，无法继续测试"
    exit 1
fi

# 初始化全局测试统计
GLOBAL_TEST_TOTAL=0
GLOBAL_TEST_PASSED=0
GLOBAL_TEST_FAILED=0
GLOBAL_TEST_SKIPPED=0

# 运行测试模块
print_section "执行测试"

# 测试模块列表
# 注意：根据 TaskEcho 项目特点添加测试模块
TEST_MODULES=(
    "api_key_test.sh:API Key 管理模块"
    "submit_test.sh:数据提交模块"
    "client_test.sh:客户端实现模块"
    "incremental_update_test.sh:增量更新模块"
    "homepage_test.sh:首页接口模块"
    "project_detail_test.sh:项目详情页接口模块"
    "queue_detail_test.sh:任务队列详情页接口模块"
    "task_detail_test.sh:任务详情页接口模块"
    "realtime_update_test.sh:实时更新机制模块"
    # "query_test.sh:数据查询模块"
)

# 运行每个测试模块
for module_info in "${TEST_MODULES[@]}"; do
    IFS=':' read -r module_file module_name <<< "$module_info"
    module_path="$TEST_ROOT/modules/$module_file"
    
    if [ -f "$module_path" ]; then
        # 保存当前测试统计
        prev_total=$TEST_TOTAL
        prev_passed=$TEST_PASSED
        prev_failed=$TEST_FAILED
        prev_skipped=$TEST_SKIPPED
        
        # 加载并运行测试模块
        source "$module_path"
        
        # 根据模块文件名调用对应的运行函数
        # 函数名格式：run_module_tests（统一使用此函数名）
        if type "run_module_tests" &>/dev/null; then
            run_module_tests
        else
            print_warning "测试模块 $module_file 未找到 run_module_tests 函数"
        fi
        
        # 累计统计（计算增量）
        module_total=$((TEST_TOTAL - prev_total))
        module_passed=$((TEST_PASSED - prev_passed))
        module_failed=$((TEST_FAILED - prev_failed))
        module_skipped=$((TEST_SKIPPED - prev_skipped))
        
        GLOBAL_TEST_TOTAL=$((GLOBAL_TEST_TOTAL + module_total))
        GLOBAL_TEST_PASSED=$((GLOBAL_TEST_PASSED + module_passed))
        GLOBAL_TEST_FAILED=$((GLOBAL_TEST_FAILED + module_failed))
        GLOBAL_TEST_SKIPPED=$((GLOBAL_TEST_SKIPPED + module_skipped))
    else
        print_warning "测试模块不存在: $module_path"
    fi
done

# 计算测试耗时
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# 打印全局测试统计
echo ""
print_header "全局测试统计"
echo -e "  总测试数: ${BOLD}$GLOBAL_TEST_TOTAL${NC}"
echo -e "  ${GREEN}通过: $GLOBAL_TEST_PASSED${NC}"
echo -e "  ${RED}失败: $GLOBAL_TEST_FAILED${NC}"
echo -e "  ${YELLOW}跳过: $GLOBAL_TEST_SKIPPED${NC}"
echo -e "  耗时: ${BOLD}${DURATION}秒${NC}"

if [ $GLOBAL_TEST_FAILED -eq 0 ]; then
    echo ""
    print_success "所有测试通过！"
    exit 0
else
    echo ""
    print_error "有 $GLOBAL_TEST_FAILED 个测试失败"
    exit 1
fi

