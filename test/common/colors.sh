#!/bin/bash
# 颜色输出模块
# 提供美观的测试输出格式

# 检查是否支持颜色输出
if [ "$COLOR_OUTPUT" = "true" ] && [ -t 1 ]; then
    # 颜色定义
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    MAGENTA='\033[0;35m'
    CYAN='\033[0;36m'
    WHITE='\033[1;37m'
    GRAY='\033[0;90m'
    BOLD='\033[1m'
    NC='\033[0m' # No Color
    DIM='\033[2m'
else
    # 禁用颜色
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    MAGENTA=''
    CYAN=''
    WHITE=''
    GRAY=''
    BOLD=''
    NC=''
    DIM=''
fi

# 打印函数
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_header() {
    echo -e "\n${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${WHITE}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_section() {
    echo -e "\n${BOLD}${MAGENTA}▶${NC} ${BOLD}$1${NC}"
}

print_test() {
    echo -e "${GRAY}[测试]${NC} $1"
}

print_result() {
    local status=$1
    local message=$2
    shift 2
    local details="$@"
    
    if [ "$status" = "PASS" ]; then
        echo -e "  ${GREEN}✓ PASS${NC} ${DIM}$message${NC}"
        [ -n "$details" ] && echo -e "    ${GRAY}$details${NC}"
    elif [ "$status" = "FAIL" ]; then
        echo -e "  ${RED}✗ FAIL${NC} ${DIM}$message${NC}"
        [ -n "$details" ] && echo -e "    ${RED}$details${NC}"
    elif [ "$status" = "SKIP" ]; then
        echo -e "  ${YELLOW}⊘ SKIP${NC} ${DIM}$message${NC}"
        [ -n "$details" ] && echo -e "    ${GRAY}$details${NC}"
    fi
}

print_json() {
    if command -v jq &> /dev/null; then
        echo "$1" | jq '.' 2>/dev/null || echo "$1"
    else
        echo "$1"
    fi
}

