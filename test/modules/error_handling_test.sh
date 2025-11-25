#!/bin/bash
# 错误处理和404页面测试

# 加载通用库
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../common/lib.sh"

# 测试名称
TEST_MODULE="错误处理和404页面"

# 测试函数：检查错误处理组件文件是否存在
test_error_component_files_exist() {
    local components_dir="$SCRIPT_DIR/../../src/components"
    local errors=0
    
    print_info "检查错误处理组件文件..."
    
    # 检查 ErrorBoundary 组件
    if [ ! -f "$components_dir/error/ErrorBoundary.js" ]; then
        print_error "ErrorBoundary 组件文件不存在"
        errors=$((errors + 1))
    else
        print_success "ErrorBoundary 组件文件存在"
    fi
    
    # 检查 NetworkError 组件
    if [ ! -f "$components_dir/error/NetworkError.js" ]; then
        print_error "NetworkError 组件文件不存在"
        errors=$((errors + 1))
    else
        print_success "NetworkError 组件文件存在"
    fi
    
    # 检查 DataLoadError 组件
    if [ ! -f "$components_dir/error/DataLoadError.js" ]; then
        print_error "DataLoadError 组件文件不存在"
        errors=$((errors + 1))
    else
        print_success "DataLoadError 组件文件存在"
    fi
    
    # 检查 not-found.js 页面
    if [ ! -f "$SCRIPT_DIR/../../src/app/not-found.js" ]; then
        print_error "not-found.js 页面文件不存在"
        errors=$((errors + 1))
    else
        print_success "not-found.js 页面文件存在"
    fi
    
    if [ $errors -gt 0 ]; then
        return 1
    fi
    
    return 0
}

# 测试函数：检查 hooks 文件是否存在
test_hooks_files_exist() {
    local hooks_dir="$SCRIPT_DIR/../../src/hooks"
    local errors=0
    
    print_info "检查 hooks 文件..."
    
    # 检查 useApiError hook
    if [ ! -f "$hooks_dir/useApiError.js" ]; then
        print_error "useApiError hook 文件不存在"
        errors=$((errors + 1))
    else
        print_success "useApiError hook 文件存在"
    fi
    
    # 检查 useFormValidation hook
    if [ ! -f "$hooks_dir/useFormValidation.js" ]; then
        print_error "useFormValidation hook 文件不存在"
        errors=$((errors + 1))
    else
        print_success "useFormValidation hook 文件存在"
    fi
    
    # 检查 useToast hook
    if [ ! -f "$hooks_dir/useToast.js" ]; then
        print_error "useToast hook 文件不存在"
        errors=$((errors + 1))
    else
        print_success "useToast hook 文件存在"
    fi
    
    if [ $errors -gt 0 ]; then
        return 1
    fi
    
    return 0
}

# 测试函数：检查 UI 组件文件是否存在
test_ui_component_files_exist() {
    local ui_dir="$SCRIPT_DIR/../../src/components/ui"
    local errors=0
    
    print_info "检查 UI 组件文件..."
    
    # 检查 Card 组件
    if [ ! -f "$ui_dir/card.jsx" ]; then
        print_error "Card 组件文件不存在"
        errors=$((errors + 1))
    else
        print_success "Card 组件文件存在"
    fi
    
    # 检查 Toast 组件
    if [ ! -f "$ui_dir/toast.jsx" ]; then
        print_error "Toast 组件文件不存在"
        errors=$((errors + 1))
    else
        print_success "Toast 组件文件存在"
    fi
    
    # 检查 use-toast hook
    if [ ! -f "$ui_dir/use-toast.js" ]; then
        print_error "use-toast hook 文件不存在"
        errors=$((errors + 1))
    else
        print_success "use-toast hook 文件存在"
    fi
    
    # 检查 Toaster 组件
    if [ ! -f "$ui_dir/toaster.jsx" ]; then
        print_error "Toaster 组件文件不存在"
        errors=$((errors + 1))
    else
        print_success "Toaster 组件文件存在"
    fi
    
    # 检查 Alert 组件
    if [ ! -f "$ui_dir/alert.jsx" ]; then
        print_error "Alert 组件文件不存在"
        errors=$((errors + 1))
    else
        print_success "Alert 组件文件存在"
    fi
    
    if [ $errors -gt 0 ]; then
        return 1
    fi
    
    return 0
}

# 测试函数：检查错误日志工具文件是否存在
test_error_logger_exists() {
    local lib_dir="$SCRIPT_DIR/../../src/lib"
    
    print_info "检查错误日志工具文件..."
    
    if [ ! -f "$lib_dir/errorLogger.js" ]; then
        print_error "errorLogger.js 文件不存在"
        return 1
    else
        print_success "errorLogger.js 文件存在"
    fi
    
    return 0
}

# 测试函数：检查 layout.js 是否集成 ErrorBoundary
test_layout_error_boundary() {
    local layout_file="$SCRIPT_DIR/../../src/app/layout.js"
    local wrapper_file="$SCRIPT_DIR/../../src/components/layout/ErrorBoundaryWrapper.js"
    local errors=0
    
    print_info "检查 layout.js 配置..."
    
    if [ ! -f "$layout_file" ]; then
        print_error "layout.js 文件不存在"
        return 1
    fi
    
    if [ ! -f "$wrapper_file" ]; then
        print_error "ErrorBoundaryWrapper 组件文件不存在"
        errors=$((errors + 1))
    else
        print_success "ErrorBoundaryWrapper 组件文件存在"
    fi
    
    if ! grep -q "ErrorBoundaryWrapper" "$layout_file"; then
        print_error "layout.js 缺少 ErrorBoundaryWrapper"
        errors=$((errors + 1))
    else
        print_success "layout.js 包含 ErrorBoundaryWrapper"
    fi
    
    if [ $errors -gt 0 ]; then
        return 1
    fi
    
    return 0
}

# 测试函数：检查依赖包是否安装
test_dependencies() {
    local package_json="$SCRIPT_DIR/../../package.json"
    local errors=0
    
    print_info "检查依赖包..."
    
    if [ ! -f "$package_json" ]; then
        print_error "package.json 文件不存在"
        return 1
    fi
    
    if ! grep -q '"@radix-ui/react-toast"' "$package_json"; then
        print_error "package.json 缺少 @radix-ui/react-toast 依赖"
        errors=$((errors + 1))
    else
        print_success "@radix-ui/react-toast 依赖已安装"
    fi
    
    if ! grep -q '"@radix-ui/react-alert-dialog"' "$package_json"; then
        print_error "package.json 缺少 @radix-ui/react-alert-dialog 依赖"
        errors=$((errors + 1))
    else
        print_success "@radix-ui/react-alert-dialog 依赖已安装"
    fi
    
    if [ $errors -gt 0 ]; then
        return 1
    fi
    
    return 0
}

# 测试函数：检查组件导入是否正确
test_component_imports() {
    local components_dir="$SCRIPT_DIR/../../src/components"
    local errors=0
    
    print_info "检查组件导入..."
    
    # 检查 ErrorBoundary 组件导入
    if ! grep -q "import.*AlertCircle" "$components_dir/error/ErrorBoundary.js" 2>/dev/null; then
        print_error "ErrorBoundary 组件缺少 AlertCircle 导入"
        errors=$((errors + 1))
    elif ! grep -q "import.*Card" "$components_dir/error/ErrorBoundary.js" 2>/dev/null; then
        print_error "ErrorBoundary 组件缺少 Card 导入"
        errors=$((errors + 1))
    else
        print_success "ErrorBoundary 组件导入检查通过"
    fi
    
    # 检查 not-found.js 导入
    if ! grep -q "import.*Header" "$SCRIPT_DIR/../../src/app/not-found.js" 2>/dev/null; then
        print_error "not-found.js 缺少 Header 导入"
        errors=$((errors + 1))
    elif ! grep -q "import.*Card" "$SCRIPT_DIR/../../src/app/not-found.js" 2>/dev/null; then
        print_error "not-found.js 缺少 Card 导入"
        errors=$((errors + 1))
    else
        print_success "not-found.js 导入检查通过"
    fi
    
    if [ $errors -gt 0 ]; then
        return 1
    fi
    
    return 0
}

# 运行所有测试
run_module_tests() {
    print_header "$TEST_MODULE"
    
    init_test_stats
    
    run_test "检查错误处理组件文件" test_error_component_files_exist
    run_test "检查 hooks 文件" test_hooks_files_exist
    run_test "检查 UI 组件文件" test_ui_component_files_exist
    run_test "检查错误日志工具" test_error_logger_exists
    run_test "检查 layout.js 配置" test_layout_error_boundary
    run_test "检查依赖包" test_dependencies
    run_test "检查组件导入" test_component_imports
    
    print_test_summary
    return $?
}

# 如果直接运行此脚本，执行测试
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    run_module_tests
    exit $?
fi
