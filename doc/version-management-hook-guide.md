# Git Hook 版本管理使用指南

## 已安装的 Git Hooks

项目已安装以下 Git hooks 用于自动版本管理：

### 1. `pre-commit` Hook
**位置**: `.git/hooks/pre-commit`

**功能**: 
- 在每次提交前检查版本文件是否存在
- 如果版本文件不存在，自动生成版本信息

**执行时机**: 在 `git commit` 执行前

### 2. `prepare-commit-msg` Hook
**位置**: `.git/hooks/prepare-commit-msg`

**功能**:
- 读取 commit message
- 根据 commit message 中的标记（`[major]`、`[minor]`）自动生成版本号
- 将生成的版本文件添加到暂存区

**执行时机**: 在 commit message 准备好后，提交前

## 版本号递增规则

### 默认行为（自动递增 PATCH）
每次提交时，版本号的 PATCH 部分会自动递增：
- `0.1.0` → `0.1.1`
- `0.1.1` → `0.1.2`

### 手动指定版本递增

在 commit message 中包含特殊标记来控制版本递增：

#### 递增主版本号（MAJOR）
在 commit message 中包含 `[major]` 或 `[MAJOR]`：

```bash
git commit -m "[major] 重大更新：重构核心功能"
```

结果：`1.2.3` → `2.0.0`

#### 递增次版本号（MINOR）
在 commit message 中包含 `[minor]` 或 `[MINOR]`：

```bash
git commit -m "[minor] 新增用户管理功能"
```

结果：`1.2.3` → `1.3.0`

#### 默认递增修订号（PATCH）
不包含任何标记时，自动递增 PATCH：

```bash
git commit -m "修复登录bug"
```

结果：`1.2.3` → `1.2.4`

## 使用示例

### 示例 1：普通提交（自动递增 PATCH）

```bash
# 当前版本：0.1.1
git add .
git commit -m "修复设置页面显示问题"
# 版本自动更新为：0.1.2
```

### 示例 2：功能更新（递增 MINOR）

```bash
# 当前版本：0.1.2
git add .
git commit -m "[minor] 添加版本管理功能"
# 版本自动更新为：0.2.0
```

### 示例 3：重大更新（递增 MAJOR）

```bash
# 当前版本：0.2.0
git add .
git commit -m "[major] 重构API架构，不兼容旧版本"
# 版本自动更新为：1.0.0
```

## 版本信息文件

每次提交后，会自动更新以下文件：

1. **`public/version.json`**: 包含完整的版本信息
   ```json
   {
     "version": "0.1.2",
     "major": 0,
     "minor": 1,
     "patch": 2,
     "buildTime": "2025-11-30T08:10:00.000Z",
     "gitCommit": "abc123...",
     "gitCommitShort": "abc1234",
     "gitBranch": "main",
     "buildNumber": 2
   }
   ```

2. **`package.json`**: 更新 `version` 字段

这些文件会自动添加到本次提交中。

## 禁用 Hook（临时）

如果需要临时禁用版本管理 hook，可以使用 `--no-verify` 选项：

```bash
git commit -m "临时提交" --no-verify
```

**注意**: 使用 `--no-verify` 会跳过所有 pre-commit 和 prepare-commit-msg hooks。

## 手动生成版本号

如果需要手动生成版本号（不通过 Git commit），可以运行：

```bash
npm run version:generate
```

或者直接运行脚本：

```bash
node scripts/generate-version.js "你的 commit message"
```

## 故障排除

### Hook 不执行

1. **检查文件权限**:
   ```bash
   ls -la .git/hooks/pre-commit
   ls -la .git/hooks/prepare-commit-msg
   ```
   确保文件有执行权限（`-rwxr-xr-x`）

2. **重新设置权限**:
   ```bash
   chmod +x .git/hooks/pre-commit
   chmod +x .git/hooks/prepare-commit-msg
   ```

### 版本号未更新

1. **检查 Node.js 是否可用**:
   ```bash
   which node
   node --version
   ```

2. **检查版本生成脚本**:
   ```bash
   node scripts/generate-version.js "test"
   ```

3. **查看 Git 输出**: 提交时查看是否有错误信息

### Hook 执行失败

如果 hook 执行失败，Git 会阻止提交。可以：

1. **查看错误信息**: Git 会显示具体的错误
2. **修复问题后重试**: 根据错误信息修复问题
3. **临时跳过**: 使用 `--no-verify` 跳过 hook（不推荐）

## 注意事项

1. **版本文件会自动提交**: `public/version.json` 和 `package.json` 会自动添加到暂存区
2. **版本冲突**: 如果多人协作，可能出现版本号冲突，建议在合并分支时检查版本号
3. **构建环境**: 确保构建环境有 Git 访问权限，否则版本信息可能不完整
4. **Docker 构建**: 在 Docker 构建时，需要确保 Git 信息可用，或提供默认版本信息

## 相关文件

- 版本生成脚本: `scripts/generate-version.js`
- 版本工具函数: `src/lib/version.js`
- 版本信息文件: `public/version.json`
- Hook 示例文件: `.git/hooks/pre-commit.example`











