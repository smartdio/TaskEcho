#!/bin/bash
# 通用组件测试脚本

# 加载通用库
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../common/lib.sh"

# 测试名称
TEST_MODULE="通用组件测试"

# 测试函数：检查组件文件是否存在
test_component_files_exist() {
    local components_dir="$SCRIPT_DIR/../../src/components"
    local errors=0
    
    print_info "检查组件文件..."
    
    # 检查 Header 组件
    if [ ! -f "$components_dir/layout/Header.js" ]; then
        print_error "Header 组件文件不存在"
        errors=$((errors + 1))
    else
        print_success "Header 组件文件存在"
    fi
    
    # 检查 Breadcrumb 组件
    if [ ! -f "$components_dir/layout/Breadcrumb.js" ]; then
        print_error "Breadcrumb 组件文件不存在"
        errors=$((errors + 1))
    else
        print_success "Breadcrumb 组件文件存在"
    fi
    
    # 检查 PageContainer 组件
    if [ ! -f "$components_dir/layout/PageContainer.js" ]; then
        print_error "PageContainer 组件文件不存在"
        errors=$((errors + 1))
    else
        print_success "PageContainer 组件文件存在"
    fi
    
    # 检查 ThemeToggle 组件
    if [ ! -f "$components_dir/theme/ThemeToggle.js" ]; then
        print_error "ThemeToggle 组件文件不存在"
        errors=$((errors + 1))
    else
        print_success "ThemeToggle 组件文件存在"
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
    
    # 检查 Header 组件导入（Header 组件本身不需要导入自己，检查它导入的其他组件）
    if ! grep -q "import.*Link" "$components_dir/layout/Header.js" 2>/dev/null; then
        print_error "Header 组件缺少 Link 导入"
        errors=$((errors + 1))
    elif ! grep -q "import.*Button" "$components_dir/layout/Header.js" 2>/dev/null; then
        print_error "Header 组件缺少 Button 导入"
        errors=$((errors + 1))
    elif ! grep -q "import.*ThemeToggle" "$components_dir/layout/Header.js" 2>/dev/null; then
        print_error "Header 组件缺少 ThemeToggle 导入"
        errors=$((errors + 1))
    else
        print_success "Header 组件导入检查通过"
    fi
    
    # 检查 ThemeToggle 组件导入
    if ! grep -q "next-themes" "$components_dir/theme/ThemeToggle.js" 2>/dev/null; then
        print_error "ThemeToggle 组件缺少 next-themes 导入"
        errors=$((errors + 1))
    else
        print_success "ThemeToggle 组件导入检查通过"
    fi
    
    if [ $errors -gt 0 ]; then
        return 1
    fi
    
    return 0
}

# 测试函数：检查 layout.js 是否包含 ThemeProvider
test_layout_theme_provider() {
    local layout_file="$SCRIPT_DIR/../../src/app/layout.js"
    local errors=0
    
    print_info "检查 layout.js 配置..."
    
    if [ ! -f "$layout_file" ]; then
        print_error "layout.js 文件不存在"
        return 1
    fi
    
    if ! grep -q "ThemeProvider" "$layout_file"; then
        print_error "layout.js 缺少 ThemeProvider"
        errors=$((errors + 1))
    else
        print_success "layout.js 包含 ThemeProvider"
    fi
    
    if ! grep -q "next-themes" "$layout_file"; then
        print_error "layout.js 缺少 next-themes 导入"
        errors=$((errors + 1))
    else
        print_success "layout.js 包含 next-themes 导入"
    fi
    
    if ! grep -q "suppressHydrationWarning" "$layout_file"; then
        print_error "layout.js 缺少 suppressHydrationWarning 属性"
        errors=$((errors + 1))
    else
        print_success "layout.js 包含 suppressHydrationWarning 属性"
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
    
    if ! grep -q '"next-themes"' "$package_json"; then
        print_error "package.json 缺少 next-themes 依赖"
        errors=$((errors + 1))
    else
        print_success "next-themes 依赖已安装"
    fi
    
    if [ $errors -gt 0 ]; then
        return 1
    fi
    
    return 0
}

# 测试函数：检查组件代码语法
test_component_syntax() {
    local components_dir="$SCRIPT_DIR/../../src/components"
    local errors=0
    
    print_info "检查组件代码语法..."
    
    # 检查是否有明显的语法错误（简单检查）
    for file in "$components_dir/layout/Header.js" \
                "$components_dir/layout/Breadcrumb.js" \
                "$components_dir/layout/PageContainer.js" \
                "$components_dir/theme/ThemeToggle.js"; do
        if [ -f "$file" ]; then
            # 检查文件是否包含基本的 React 组件结构
            if ! grep -q "export" "$file"; then
                print_error "$(basename $file) 可能缺少 export"
                errors=$((errors + 1))
            else
                print_success "$(basename $file) 语法检查通过"
            fi
        fi
    done
    
    if [ $errors -gt 0 ]; then
        return 1
    fi
    
    return 0
}

# 运行所有测试
run_module_tests() {
    print_header "$TEST_MODULE"
    
    init_test_stats
    
    run_test "检查组件文件是否存在" test_component_files_exist
    run_test "检查组件导入" test_component_imports
    run_test "检查 layout.js 配置" test_layout_theme_provider
    run_test "检查依赖包" test_dependencies
    run_test "检查组件代码语法" test_component_syntax
    
    print_test_summary
    return $?
}

# 如果直接运行此脚本，执行测试
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    run_module_tests
    exit $?
fi
