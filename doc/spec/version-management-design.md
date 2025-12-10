# 版本管理和显示功能设计方案

## 1. 需求概述

- **每次提交都会生成一个新的版本号**：在 Git commit 时自动生成版本号
- **在设置页面显示版本号**：显示完整的版本信息（包括版本号、构建时间、Git 提交信息等）
- **系统名称旁边显示大版本号**：在 Header 组件中，系统名称 "TaskEcho" 旁边以小字显示大版本号（如 v1.0）

## 2. 版本号格式

采用**语义化版本号（Semantic Versioning）**格式：`MAJOR.MINOR.PATCH`

- **MAJOR（主版本号）**：不兼容的 API 修改
- **MINOR（次版本号）**：向下兼容的功能性新增
- **PATCH（修订号）**：向下兼容的问题修正

**示例**：`1.2.3`、`2.0.0`、`0.1.5`

### 2.1 版本号生成规则

- **初始版本**：`0.1.0`
- **每次提交自动递增 PATCH**：`0.1.0` → `0.1.1` → `0.1.2`
- **手动指定 MAJOR/MINOR**：通过 Git commit message 中的特殊标记来触发
  - `[major]` 或 `[MAJOR]`：递增主版本号，重置次版本号和修订号（如 `1.0.0` → `2.0.0`）
  - `[minor]` 或 `[MINOR]`：递增次版本号，重置修订号（如 `1.2.3` → `1.3.0`）
  - 默认：只递增修订号（如 `1.2.3` → `1.2.4`）

## 3. 技术实现方案

### 3.1 版本信息存储

创建版本信息文件：`public/version.json`

```json
{
  "version": "1.2.3",
  "major": 1,
  "minor": 2,
  "patch": 3,
  "buildTime": "2024-01-15T10:30:00.000Z",
  "gitCommit": "a1b2c3d",
  "gitCommitShort": "a1b2c3d",
  "gitBranch": "main",
  "buildNumber": 42
}
```

**字段说明**：
- `version`：完整版本号字符串（如 "1.2.3"）
- `major`、`minor`、`patch`：版本号的三个组成部分
- `buildTime`：构建时间（ISO 8601 格式）
- `gitCommit`：Git 提交的完整哈希值
- `gitCommitShort`：Git 提交的短哈希值（7位）
- `gitBranch`：当前 Git 分支名称
- `buildNumber`：构建序号（每次构建递增）

### 3.2 版本号生成脚本

创建脚本：`scripts/generate-version.js`

**功能**：
1. 读取当前 `package.json` 中的版本号或 `public/version.json` 中的版本号
2. 解析 Git commit message，判断版本号递增规则
3. 根据规则生成新版本号
4. 获取 Git 信息（commit hash、branch）
5. 生成 `public/version.json` 文件
6. 更新 `package.json` 中的版本号（可选）

**执行时机**：
- Git pre-commit hook：在提交前生成版本号
- 构建脚本：在 `npm run build` 时生成版本号

### 3.3 Git Hook 配置

创建 Git hook：`.git/hooks/pre-commit`（或使用 husky 管理）

**功能**：
1. 在每次 commit 前执行版本号生成脚本
2. 将生成的 `public/version.json` 和更新的 `package.json` 添加到本次提交中

**注意**：需要确保 hook 文件有执行权限

### 3.4 构建时版本生成

修改 `package.json` 的 `build` 脚本：

```json
{
  "scripts": {
    "build": "node scripts/generate-version.js && next build",
    "prebuild": "node scripts/generate-version.js"
  }
}
```

确保在构建前生成最新的版本信息。

### 3.5 前端版本信息读取

#### 3.5.1 创建版本信息工具函数

创建文件：`src/lib/version.js`

**功能**：
- 提供读取版本信息的函数
- 支持客户端和服务端读取
- 提供版本号格式化函数

#### 3.5.2 在 Header 组件中显示大版本号

修改文件：`src/components/layout/Header.js`

**修改位置**：系统名称 "TaskEcho" 旁边

**显示格式**：
- 移动端：`TaskEcho v1.0`（大版本号）
- 桌面端：`TaskEcho v1.0`（大版本号）

**样式要求**：
- 版本号使用小字号（`text-xs` 或 `text-sm`）
- 颜色使用次要文字颜色（`text-gray-600`）
- 与系统名称保持适当间距

#### 3.5.3 在设置页面显示完整版本信息

修改文件：`src/app/settings/page.js`

**显示位置**：在设置页面底部或单独的信息卡片中

**显示内容**：
- 版本号：`1.2.3`
- 构建时间：`2024-01-15 10:30:00`
- Git 提交：`a1b2c3d`
- Git 分支：`main`
- 构建序号：`42`

**UI 设计**：
- 使用 Card 组件展示
- 信息以列表形式展示
- 支持复制版本信息功能

## 4. 文件结构

```
TaskEcho/
├── scripts/
│   └── generate-version.js      # 版本号生成脚本（新增）
├── .git/
│   └── hooks/
│       └── pre-commit           # Git pre-commit hook（新增）
├── public/
│   └── version.json             # 版本信息文件（新增，gitignore 中排除）
├── src/
│   ├── lib/
│   │   └── version.js           # 版本信息工具函数（新增）
│   ├── components/
│   │   └── layout/
│   │       └── Header.js        # 修改：添加版本号显示
│   └── app/
│       └── settings/
│           └── page.js          # 修改：添加版本信息显示
└── package.json                 # 修改：添加版本相关脚本
```

## 5. 实现步骤

### 步骤 1：创建版本号生成脚本
- 创建 `scripts/generate-version.js`
- 实现版本号解析和递增逻辑
- 实现 Git 信息获取
- 实现版本信息文件生成

### 步骤 2：配置 Git Hook
- 创建 `.git/hooks/pre-commit` 或使用 husky
- 配置 hook 执行版本生成脚本
- 确保 hook 文件有执行权限

### 步骤 3：修改构建脚本
- 在 `package.json` 中添加 `prebuild` 脚本
- 确保构建时生成版本信息

### 步骤 4：创建版本信息工具函数
- 创建 `src/lib/version.js`
- 实现版本信息读取函数
- 支持客户端和服务端读取

### 步骤 5：修改 Header 组件
- 在系统名称旁边添加版本号显示
- 使用响应式样式
- 只显示大版本号（如 v1.0）

### 步骤 6：修改设置页面
- 添加版本信息显示区域
- 显示完整的版本信息
- 添加复制功能（可选）

## 6. 版本号更新流程

### 6.1 自动更新（默认）

每次 Git commit 时：
1. Git pre-commit hook 触发
2. 执行 `scripts/generate-version.js`
3. 脚本读取当前版本号
4. 解析 commit message，判断递增规则
5. 生成新版本号
6. 更新 `public/version.json` 和 `package.json`
7. 将更新后的文件添加到本次提交

### 6.2 手动指定版本号

如果需要手动指定版本号：
1. 在 commit message 中包含 `[major]` 或 `[minor]` 标记
2. 或者直接修改 `package.json` 中的版本号
3. 运行 `node scripts/generate-version.js` 同步版本信息

### 6.3 构建时更新

每次运行 `npm run build` 时：
1. `prebuild` 脚本执行
2. 运行版本生成脚本
3. 确保构建时使用最新版本信息

## 7. 注意事项

### 7.1 Git 配置

- `public/version.json` 需要提交到 Git（不应在 `.gitignore` 中）
- Git hook 需要确保有执行权限
- 建议使用 husky 管理 Git hooks（可选）

### 7.2 版本号冲突

- 如果多人协作，可能出现版本号冲突
- 建议在合并分支时检查版本号
- 或者使用基于时间戳的版本号生成策略

### 7.3 构建环境

- 确保构建环境有 Git 访问权限
- 如果构建环境没有 Git，需要提供默认版本信息
- 考虑在 Docker 构建时的版本信息处理

### 7.4 性能考虑

- `public/version.json` 是静态文件，读取性能良好
- 客户端读取版本信息不会影响页面性能
- 版本信息可以缓存

## 8. 扩展功能（可选）

### 8.1 版本历史记录

- 记录版本变更历史
- 在设置页面显示版本变更日志

### 8.2 版本比较

- 比较当前版本和最新版本
- 提示用户更新（如果有新版本）

### 8.3 版本 API

- 提供 API 端点返回版本信息
- 供外部系统查询版本

### 8.4 版本标签

- 自动创建 Git tag
- 与版本号同步

## 9. 测试方案

### 9.1 单元测试

- 测试版本号递增逻辑
- 测试版本号解析
- 测试 Git 信息获取

### 9.2 集成测试

- 测试 Git hook 执行
- 测试构建时版本生成
- 测试版本信息文件生成

### 9.3 UI 测试

- 测试 Header 中版本号显示
- 测试设置页面版本信息显示
- 测试响应式布局

## 10. 示例代码结构

### 10.1 版本号生成脚本示例结构

```javascript
// scripts/generate-version.js
// 1. 读取当前版本
// 2. 解析 Git commit message（从环境变量或参数获取）
// 3. 判断版本递增规则
// 4. 生成新版本号
// 5. 获取 Git 信息
// 6. 生成 version.json
// 7. 更新 package.json（可选）
```

### 10.2 Header 组件修改示例

```javascript
// src/components/layout/Header.js
// 在系统名称旁边添加：
<span className="text-xs text-gray-600">v{version.major}.{version.minor}</span>
```

### 10.3 设置页面修改示例

```javascript
// src/app/settings/page.js
// 添加版本信息卡片：
<Card>
  <CardHeader>版本信息</CardHeader>
  <CardContent>
    <div>版本号: {version.version}</div>
    <div>构建时间: {version.buildTime}</div>
    <div>Git 提交: {version.gitCommitShort}</div>
    {/* ... */}
  </CardContent>
</Card>
```

## 11. 总结

本方案提供了完整的版本管理和显示功能实现：

1. **版本号格式**：采用语义化版本号（MAJOR.MINOR.PATCH）
2. **自动生成**：通过 Git hook 和构建脚本自动生成版本号
3. **版本信息存储**：使用 JSON 文件存储版本信息
4. **前端显示**：在 Header 显示大版本号，在设置页面显示完整版本信息
5. **扩展性**：方案支持后续扩展功能（版本历史、版本比较等）

该方案无需修改现有业务逻辑，只需添加版本管理相关脚本和修改 UI 显示即可实现需求。







