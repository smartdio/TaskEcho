#!/bin/bash
# 配置加载模块
# 加载测试配置，支持环境变量和配置文件

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 默认配置文件路径
CONFIG_FILE="${TEST_CONFIG_FILE:-$TEST_ROOT/config/base.conf}"

# 加载配置文件
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
else
    echo "警告: 配置文件不存在: $CONFIG_FILE" >&2
fi

# 导出配置变量
export BASE_URL
export TEST_API_KEY
export VERBOSE
export COLOR_OUTPUT
export API_KEY_FILE
export REPORT_DIR

# 确保报告目录存在
mkdir -p "$REPORT_DIR"

