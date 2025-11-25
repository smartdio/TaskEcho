# TaskEcho API Key 管理页面功能设计文档

## 1. 概述

### 1.1 文档目的

本文档详细说明 TaskEcho 系统 API Key 管理页面功能的完整设计方案，包括 API Key 列表展示、添加/编辑/删除功能、表单设计、页面布局、数据操作流程等详细说明。

### 1.2 功能定位

API Key 管理页面是 TaskEcho 应用的设置页面，主要功能包括：

- **API Key 列表展示**：展示所有已创建的 API Key，包括名称、值（部分隐藏）、关联项目、状态等信息
- **添加 API Key**：通过表单创建新的 API Key
- **编辑 API Key**：修改现有 API Key 的名称、关联项目、激活状态等信息
- **删除 API Key**：删除不再需要的 API Key（需确认）
- **状态管理**：查看和管理 API Key 的激活状态

### 1.3 核心特性

- **完整 CRUD 操作**：支持创建、查询、更新、删除 API Key
- **安全显示**：API Key 值部分隐藏显示，保护敏感信息
- **项目关联**：支持将 API Key 关联到特定项目（可选）
- **状态控制**：支持激活/禁用 API Key
- **表单验证**：完整的表单验证和错误提示
- **响应式布局**：支持手机、平板、桌面等多种设备
- **深浅色主题**：自动适配系统主题

### 1.4 技术栈

- **前端框架**：React
- **UI 组件库**：shadcn/ui
- **样式方案**：Tailwind CSS
- **数据获取**：Fetch API
- **状态管理**：React Hooks（useState, useEffect）
- **表单管理**：React Hook Form（推荐）或原生表单

---

## 2. 页面布局设计

### 2.1 整体布局结构

```
┌─────────────────────────────────────────────────┐
│  顶部导航栏（Header）                            │
│  ┌─────────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Logo/标题   │  │ 设置图标  │  │ 主题切换  │  │
│  └─────────────┘  └──────────┘  └──────────┘  │
├─────────────────────────────────────────────────┤
│  页面头部（Page Header）                         │
│  ┌───────────────────────────────────────────┐  │
│  │  面包屑导航：首页 > API Key 管理          │  │
│  │  页面标题：API Key 管理                  │  │
│  │  返回首页按钮                            │  │
│  └───────────────────────────────────────────┘  │
├─────────────────────────────────────────────────┤
│  操作区域（Action Section）                      │
│  ┌───────────────────────────────────────────┐  │
│  │  [添加 API Key 按钮]                       │  │
│  └───────────────────────────────────────────┘  │
├─────────────────────────────────────────────────┤
│  API Key 列表区域（List Section）               │
│  ┌───────────────────────────────────────────┐  │
│  │  ┌────────────────────────────────────┐  │  │
│  │  │  表格头部                           │  │  │
│  │  │  名称 | Key值 | 项目 | 状态 | 操作  │  │  │
│  │  └────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────┐  │  │
│  │  │  表格行 1                           │  │  │
│  │  │  项目1 Key | sk-****0001 | ...      │  │  │
│  │  └────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────┐  │  │
│  │  │  表格行 2                           │  │  │
│  │  │  通用 Key | sk-****0002 | ...      │  │  │
│  │  └────────────────────────────────────┘  │  │
│  │  ...                                      │  │
│  └───────────────────────────────────────────┘  │
├─────────────────────────────────────────────────┤
│  表单弹窗（Modal/Dialog）                       │
│  ┌───────────────────────────────────────────┐  │
│  │  添加/编辑 API Key 表单                   │  │
│  │  ┌────────────────────────────────────┐  │  │
│  │  │  名称（必填）                       │  │  │
│  │  │  [输入框]                           │  │  │
│  │  └────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────┐  │  │
│  │  │  API Key 值（必填，仅创建时）       │  │  │
│  │  │  [输入框]                           │  │  │
│  │  └────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────┐  │  │
│  │  │  关联项目 ID（可选）                │  │  │
│  │  │  [输入框/下拉选择]                  │  │  │
│  │  └────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────┐  │  │
│  │  │  激活状态（编辑时）                  │  │  │
│  │  │  [开关/复选框]                       │  │  │
│  │  └────────────────────────────────────┘  │  │
│  │  [取消] [保存]                            │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 2.2 顶部导航栏（Header）

**位置**：页面顶部，固定位置

**组件内容**：
- **左侧**：应用 Logo 和标题（"TaskEcho"）
- **右侧**：
  - 设置图标（当前页面，高亮显示）
  - 主题切换按钮（深浅色模式切换）

**样式要求**：
- 背景色：浅色模式为白色，深色模式为深灰色
- 高度：64px（移动端）或 72px（桌面端）
- 阴影：轻微阴影效果
- 响应式：移动端图标和文字适当缩小

**交互功能**：
- 点击 Logo/标题：跳转到首页
- 设置图标：当前页面，无操作
- 点击主题切换按钮：切换深浅色模式

### 2.3 页面头部（Page Header）

**位置**：导航栏下方

**组件内容**：
- **面包屑导航**：首页 > API Key 管理
- **页面标题**：API Key 管理（大号加粗字体）
- **返回首页按钮**：左侧或右上角

**样式要求**：
- 内边距：16px（移动端）或 24px（桌面端）
- 标题字体：24px（移动端）或 32px（桌面端）
- 面包屑导航：小号灰色字体，可点击跳转

**交互功能**：
- 点击面包屑"首页"：跳转到首页
- 点击返回首页按钮：跳转到首页

### 2.4 操作区域（Action Section）

**位置**：页面头部下方，列表上方

**组件内容**：
- **添加 API Key 按钮**：主要操作按钮，点击后显示添加表单

**样式要求**：
- 按钮样式：主要按钮样式（Primary Button）
- 位置：右侧对齐（桌面端）或全宽（移动端）
- 图标：添加图标（+）

**交互功能**：
- 点击添加按钮：显示添加表单弹窗

### 2.5 API Key 列表区域（List Section）

**位置**：操作区域下方

**布局方式**：
- **桌面端**（> 1024px）：表格布局
- **平板端**（768px - 1024px）：表格布局（可横向滚动）
- **移动端**（< 768px）：卡片布局（每行一个卡片）

#### 2.5.1 表格布局（桌面端/平板端）

**表格列**：

| 列名 | 说明 | 宽度 | 对齐方式 |
|------|------|------|---------|
| 名称 | API Key 名称/标识 | 20% | 左对齐 |
| Key 值 | API Key 值（部分隐藏） | 25% | 左对齐 |
| 关联项目 | 关联的项目 ID | 20% | 左对齐 |
| 状态 | 激活/禁用状态 | 10% | 居中 |
| 创建时间 | 创建时间 | 15% | 左对齐 |
| 操作 | 编辑、删除按钮 | 10% | 居中 |

**表格行内容**：

每行显示一个 API Key 的完整信息：

1. **名称**：API Key 名称/标识（可点击查看详情）
2. **Key 值**：部分隐藏显示，格式为 `sk-****1234`（前3字符 + `****` + 后4字符）
   - 可选：显示/隐藏切换按钮（点击显示完整值，再次点击隐藏）
3. **关联项目**：
   - 如果有关联项目：显示项目 ID（可点击跳转到项目详情页）
   - 如果无关联项目：显示"未关联"（灰色文字）
4. **状态**：状态徽章
   - 激活：绿色徽章，显示"激活"
   - 禁用：灰色徽章，显示"禁用"
5. **创建时间**：格式化的时间显示（如"2024-01-01 12:00"）
6. **操作**：
   - 编辑按钮：点击后显示编辑表单
   - 删除按钮：点击后显示确认对话框

**表格样式**：
- 背景色：浅色模式为白色，深色模式为深灰色
- 边框：表格边框或行分隔线
- 圆角：8px
- 悬停效果：鼠标悬停时行背景色变化
- 表头样式：加粗、背景色区分

#### 2.5.2 卡片布局（移动端）

**卡片内容**：

每个卡片显示一个 API Key 的完整信息：

```
┌─────────────────────────────────┐
│  名称：项目1 API Key            │
│  Key值：sk-****0001  [显示/隐藏] │
│  关联项目：project_001           │
│  状态：[激活]                    │
│  创建时间：2024-01-01 12:00     │
│  [编辑] [删除]                  │
└─────────────────────────────────┘
```

**卡片样式**：
- 背景色：浅色模式为白色，深色模式为深灰色
- 边框：轻微边框或阴影
- 圆角：12px
- 内边距：16px
- 间距：卡片之间间距 12px

**排序规则**：
- 按 `createdAt`（创建时间）倒序排列（最新的在上方）

**空状态**：
- 如果没有 API Key：显示空状态提示
  - 图标：空状态图标
  - 文字："暂无 API Key"
  - 按钮："添加第一个 API Key"

### 2.6 表单弹窗（Modal/Dialog）

**触发方式**：
- 点击"添加 API Key"按钮：显示添加表单
- 点击表格行的"编辑"按钮：显示编辑表单（预填充数据）

**弹窗内容**：

#### 2.6.1 添加表单

**表单字段**：

1. **API Key 名称**（必填）
   - 标签：名称
   - 输入框：文本输入框
   - 占位符："请输入 API Key 名称"
   - 验证规则：
     - 必填
     - 长度：1-255 字符
     - 不能为空或仅空格

2. **API Key 值**（必填）
   - 标签：API Key 值
   - 输入框：文本输入框（密码类型，可选）
   - 占位符："请输入 API Key 值"
   - 验证规则：
     - 必填
     - 长度：1-255 字符
     - 不能为空或仅空格
   - 提示文字："API Key 值将加密存储，创建后无法查看完整值"

3. **关联项目 ID**（可选）
   - 标签：关联项目
   - 输入框：文本输入框或下拉选择框
   - 占位符："请输入项目 ID（可选）"
   - 验证规则：
     - 可选
     - 如果填写，必须是有效的项目 ID
   - 提示文字："如果设置，该 API Key 只能用于指定项目"

**表单按钮**：
- **取消按钮**：关闭弹窗，不保存
- **保存按钮**：提交表单，创建 API Key

#### 2.6.2 编辑表单

**表单字段**：

1. **API Key 名称**（必填）
   - 标签：名称
   - 输入框：文本输入框（预填充现有名称）
   - 验证规则：同添加表单

2. **API Key 值**（不可编辑）
   - 标签：API Key 值
   - 显示：部分隐藏的值（如 `sk-****0001`）
   - 提示文字："API Key 值无法修改，如需更换请删除后重新创建"

3. **关联项目 ID**（可选）
   - 标签：关联项目
   - 输入框：文本输入框或下拉选择框（预填充现有项目 ID）
   - 占位符："请输入项目 ID（可选，留空表示不关联）"
   - 验证规则：同添加表单

4. **激活状态**（可选）
   - 标签：激活状态
   - 控件：开关（Toggle）或复选框
   - 默认值：当前状态
   - 提示文字："禁用后，该 API Key 将无法通过认证"

**表单按钮**：
- **取消按钮**：关闭弹窗，不保存
- **保存按钮**：提交表单，更新 API Key

**弹窗样式**：
- 背景：半透明遮罩层
- 弹窗：居中显示，最大宽度 600px（桌面端）或全宽（移动端）
- 圆角：12px
- 阴影：明显阴影效果
- 内边距：24px（桌面端）或 16px（移动端）

**响应式设计**：
- **桌面端**：弹窗居中，固定宽度
- **移动端**：弹窗全宽，从底部滑入

### 2.7 删除确认对话框（Dialog）

**触发方式**：
- 点击表格行的"删除"按钮

**对话框内容**：
- **标题**：确认删除
- **内容**：
  - 警告图标
  - 文字："确定要删除 API Key「{名称}」吗？"
  - 提示文字："删除后，使用该 API Key 的请求将无法通过认证。此操作不可恢复。"
- **按钮**：
  - **取消按钮**：关闭对话框，不删除
  - **确认删除按钮**：执行删除操作（危险按钮样式，红色）

**对话框样式**：
- 背景：半透明遮罩层
- 对话框：居中显示，最大宽度 400px
- 圆角：12px
- 阴影：明显阴影效果

### 2.8 响应式断点设计

| 设备类型 | 屏幕宽度 | 布局特点 |
|---------|---------|---------|
| 移动端 | < 768px | 卡片布局，表单弹窗全宽从底部滑入 |
| 平板端 | 768px - 1024px | 表格布局（可横向滚动），表单弹窗居中 |
| 桌面端 | > 1024px | 表格布局，表单弹窗居中 |

---

## 3. API 接口说明

### 3.1 获取 API Key 列表接口

**接口路径**：`GET /api/v1/api-keys`

**认证要求**：无需认证（本地管理）

**查询参数**：

| 参数名 | 类型 | 必填 | 说明 | 默认值 | 示例 |
|--------|------|------|------|--------|------|
| `page` | number | 否 | 页码，从 1 开始 | `1` | `1` |
| `pageSize` | number | 否 | 每页数量 | `20` | `20` |
| `is_active` | boolean | 否 | 过滤激活状态 | 无 | `true` |
| `project_id` | string | 否 | 过滤项目ID | 无 | `"project_001"` |

**响应格式**：

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "name": "项目1 API Key",
        "key": "sk-****0001",
        "project_id": "project_001",
        "is_active": true,
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T00:00:00.000Z"
      },
      {
        "id": 2,
        "name": "通用 API Key",
        "key": "sk-****0002",
        "project_id": null,
        "is_active": true,
        "created_at": "2024-01-02T00:00:00.000Z",
        "updated_at": "2024-01-02T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 2,
      "totalPages": 1
    }
  },
  "message": "查询成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**详细说明**：参考 `doc/spec/api-key-management-api.md` 第 3.1 节

### 3.2 创建 API Key 接口

**接口路径**：`POST /api/v1/api-keys`

**认证要求**：无需认证

**请求体**：

```json
{
  "name": "项目1 API Key",
  "key": "sk-xxxxxxxxxxxxxxxx",
  "project_id": "project_001"
}
```

**响应格式**：

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "项目1 API Key",
    "key": "sk-****0001",
    "project_id": "project_001",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "API Key 创建成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**详细说明**：参考 `doc/spec/api-key-management-api.md` 第 3.3 节

### 3.3 更新 API Key 接口

**接口路径**：`PUT /api/v1/api-keys/:id`

**认证要求**：无需认证

**路径参数**：

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `id` | number | 是 | API Key 内部ID | `1` |

**请求体**：

```json
{
  "name": "更新后的名称",
  "project_id": "project_002",
  "is_active": true
}
```

**响应格式**：

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "更新后的名称",
    "key": "sk-****0001",
    "project_id": "project_002",
    "is_active": true,
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "API Key 更新成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**详细说明**：参考 `doc/spec/api-key-management-api.md` 第 3.4 节

### 3.4 删除 API Key 接口

**接口路径**：`DELETE /api/v1/api-keys/:id`

**认证要求**：无需认证

**路径参数**：

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `id` | number | 是 | API Key 内部ID | `1` |

**响应格式**：

```json
{
  "success": true,
  "data": {
    "id": 1
  },
  "message": "API Key 删除成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**详细说明**：参考 `doc/spec/api-key-management-api.md` 第 3.5 节

---

## 4. 数据获取和更新机制

### 4.1 初始数据加载流程

```
用户打开 API Key 管理页面
  ↓
1. 显示加载状态（Loading）
  ↓
2. 请求 GET /api/v1/api-keys?page=1&pageSize=20
  ↓
3. 等待响应
  ↓
4. 处理响应：
   ├─ 成功：更新状态，渲染列表
   └─ 失败：显示错误提示，提供重试
  ↓
5. 隐藏加载状态
```

### 4.2 数据更新机制

#### 4.2.1 创建 API Key 后刷新

```
用户提交添加表单
  ↓
1. 验证表单数据
  ↓
2. 发送 POST /api/v1/api-keys
  ↓
3. 等待响应
  ↓
4. 处理响应：
   ├─ 成功：
   │   ├─ 关闭表单弹窗
   │   ├─ 显示成功提示
   │   └─ 刷新列表数据
   └─ 失败：
       ├─ 显示错误提示
       └─ 保持表单打开
```

#### 4.2.2 更新 API Key 后刷新

```
用户提交编辑表单
  ↓
1. 验证表单数据
  ↓
2. 发送 PUT /api/v1/api-keys/:id
  ↓
3. 等待响应
  ↓
4. 处理响应：
   ├─ 成功：
   │   ├─ 关闭表单弹窗
   │   ├─ 显示成功提示
   │   └─ 刷新列表数据
   └─ 失败：
       ├─ 显示错误提示
       └─ 保持表单打开
```

#### 4.2.3 删除 API Key 后刷新

```
用户确认删除
  ↓
1. 发送 DELETE /api/v1/api-keys/:id
  ↓
2. 等待响应
  ↓
3. 处理响应：
   ├─ 成功：
   │   ├─ 关闭确认对话框
   │   ├─ 显示成功提示
   │   └─ 刷新列表数据
   └─ 失败：
       ├─ 显示错误提示
       └─ 保持对话框打开
```

### 4.3 数据缓存策略

**客户端缓存**：
- **缓存时间**：不缓存（API Key 数据需要实时性）
- **缓存失效**：每次操作后立即刷新列表

**实现建议**：
- 不使用缓存，每次操作后立即请求最新数据
- 使用乐观更新（Optimistic Update）提升用户体验（可选）

---

## 5. 表单设计和验证

### 5.1 表单字段设计

#### 5.1.1 API Key 名称字段

**字段类型**：文本输入框（Text Input）

**验证规则**：
- **必填**：不能为空
- **长度**：1-255 字符
- **格式**：不能仅包含空格
- **实时验证**：输入时实时验证，显示错误提示

**错误提示**：
- 空值："API Key 名称不能为空"
- 长度超限："API Key 名称长度不能超过 255 字符"
- 仅空格："API Key 名称不能仅包含空格"

**实现示例**：

```javascript
const validateName = (value) => {
  if (!value || !value.trim()) {
    return 'API Key 名称不能为空'
  }
  if (value.length > 255) {
    return 'API Key 名称长度不能超过 255 字符'
  }
  return null
}
```

#### 5.1.2 API Key 值字段

**字段类型**：文本输入框（Text Input，密码类型可选）

**验证规则**：
- **必填**：创建时必填，编辑时不可编辑
- **长度**：1-255 字符
- **格式**：不能仅包含空格
- **实时验证**：输入时实时验证，显示错误提示

**错误提示**：
- 空值："API Key 值不能为空"
- 长度超限："API Key 值长度不能超过 255 字符"
- 仅空格："API Key 值不能仅包含空格"

**安全提示**：
- 创建时显示："API Key 值将加密存储，创建后无法查看完整值"
- 编辑时显示："API Key 值无法修改，如需更换请删除后重新创建"

#### 5.1.3 关联项目 ID 字段

**字段类型**：文本输入框（Text Input）或下拉选择框（Select）

**验证规则**：
- **可选**：可以为空
- **格式**：如果填写，必须是有效的项目 ID
- **实时验证**：输入时实时验证（可选，可延迟到提交时验证）

**错误提示**：
- 项目不存在："关联的项目不存在"

**实现建议**：
- **方案一**：文本输入框，用户手动输入项目 ID
- **方案二**：下拉选择框，从项目列表中选择（需要先获取项目列表）

**提示文字**：
- "如果设置，该 API Key 只能用于指定项目"
- "留空表示该 API Key 可用于所有项目"

#### 5.1.4 激活状态字段

**字段类型**：开关（Toggle）或复选框（Checkbox）

**验证规则**：
- **类型**：布尔值
- **默认值**：创建时为 `true`，编辑时为当前值

**提示文字**：
- "禁用后，该 API Key 将无法通过认证"

### 5.2 表单提交验证

**提交前验证**：
1. 验证所有必填字段
2. 验证字段格式和长度
3. 验证业务规则（如项目是否存在）
4. 如果验证失败，显示错误提示，阻止提交

**提交时处理**：
1. 禁用提交按钮，显示加载状态
2. 发送 API 请求
3. 等待响应
4. 处理响应（成功或失败）
5. 恢复提交按钮状态

**实现示例**：

```javascript
const handleSubmit = async (data) => {
  // 1. 验证数据
  const errors = validateForm(data)
  if (Object.keys(errors).length > 0) {
    setFormErrors(errors)
    return
  }
  
  // 2. 禁用按钮，显示加载
  setSubmitting(true)
  
  try {
    // 3. 发送请求
    const response = await fetch(
      isEditMode 
        ? `/api/v1/api-keys/${editingId}`
        : '/api/v1/api-keys',
      {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }
    )
    
    const result = await response.json()
    
    // 4. 处理响应
    if (result.success) {
      // 成功：关闭表单，刷新列表，显示成功提示
      closeForm()
      refreshList()
      showSuccessMessage('API Key 保存成功')
    } else {
      // 失败：显示错误提示
      setFormErrors(result.error.details || {})
      showErrorMessage(result.error.message)
    }
  } catch (error) {
    // 网络错误
    showErrorMessage('网络错误，请稍后重试')
  } finally {
    // 5. 恢复按钮状态
    setSubmitting(false)
  }
}
```

### 5.3 表单状态管理

**表单状态**：
- **初始状态**：空表单（添加模式）或预填充数据（编辑模式）
- **输入状态**：用户正在输入
- **验证状态**：显示验证错误
- **提交状态**：正在提交，禁用按钮
- **成功状态**：提交成功，关闭表单
- **失败状态**：提交失败，显示错误

**实现示例**：

```javascript
const [formData, setFormData] = useState({
  name: '',
  key: '',
  project_id: '',
  is_active: true
})

const [formErrors, setFormErrors] = useState({})
const [submitting, setSubmitting] = useState(false)

// 编辑模式：预填充数据
useEffect(() => {
  if (editingApiKey) {
    setFormData({
      name: editingApiKey.name,
      key: editingApiKey.key, // 部分隐藏的值
      project_id: editingApiKey.project_id || '',
      is_active: editingApiKey.is_active
    })
  } else {
    // 添加模式：重置表单
    setFormData({
      name: '',
      key: '',
      project_id: '',
      is_active: true
    })
  }
  setFormErrors({})
}, [editingApiKey])
```

---

## 6. 交互功能

### 6.1 列表交互

#### 6.1.1 点击编辑按钮

**行为**：
1. 获取当前行的 API Key 数据
2. 打开编辑表单弹窗
3. 预填充表单数据（名称、关联项目、激活状态）
4. API Key 值显示为部分隐藏格式（不可编辑）

**实现示例**：

```javascript
const handleEdit = (apiKey) => {
  setEditingApiKey(apiKey)
  setIsEditMode(true)
  setFormOpen(true)
}
```

#### 6.1.2 点击删除按钮

**行为**：
1. 显示删除确认对话框
2. 对话框显示 API Key 名称和警告信息
3. 用户确认后执行删除操作
4. 删除成功后刷新列表

**实现示例**：

```javascript
const handleDelete = (apiKey) => {
  setDeletingApiKey(apiKey)
  setDeleteDialogOpen(true)
}

const confirmDelete = async () => {
  try {
    const response = await fetch(`/api/v1/api-keys/${deletingApiKey.id}`, {
      method: 'DELETE'
    })
    
    const result = await response.json()
    
    if (result.success) {
      setDeleteDialogOpen(false)
      refreshList()
      showSuccessMessage('API Key 删除成功')
    } else {
      showErrorMessage(result.error.message)
    }
  } catch (error) {
    showErrorMessage('网络错误，请稍后重试')
  }
}
```

#### 6.1.3 Key 值显示/隐藏切换

**行为**：
1. 默认显示部分隐藏的值（如 `sk-****0001`）
2. 点击"显示"按钮：显示完整值（从后端获取，如果支持）
3. 点击"隐藏"按钮：恢复部分隐藏显示

**注意**：由于 API Key 值使用 bcrypt 哈希存储，无法从数据库还原原始值。实际实现中：
- **方案一**：不提供显示完整值功能，始终显示部分隐藏格式
- **方案二**：在创建时临时保存原始值到内存/状态，仅在创建后短时间内可查看

**实现示例**（方案二）：

```javascript
const [visibleKeys, setVisibleKeys] = useState(new Set())

const toggleKeyVisibility = (id) => {
  const newVisibleKeys = new Set(visibleKeys)
  if (newVisibleKeys.has(id)) {
    newVisibleKeys.delete(id)
  } else {
    newVisibleKeys.add(id)
  }
  setVisibleKeys(newVisibleKeys)
}

// 在创建 API Key 时，临时保存原始值
const [createdKeys, setCreatedKeys] = useState(new Map())

const handleCreateSuccess = (apiKey, originalKey) => {
  // 临时保存原始值（5分钟后自动清除）
  setCreatedKeys(prev => {
    const newMap = new Map(prev)
    newMap.set(apiKey.id, originalKey)
    setTimeout(() => {
      setCreatedKeys(prev => {
        const newMap = new Map(prev)
        newMap.delete(apiKey.id)
        return newMap
      })
    }, 5 * 60 * 1000) // 5分钟
    return newMap
  })
}
```

### 6.2 表单交互

#### 6.2.1 打开添加表单

**行为**：
1. 点击"添加 API Key"按钮
2. 打开表单弹窗
3. 重置表单为初始状态
4. 设置表单模式为"添加"

#### 6.2.2 打开编辑表单

**行为**：
1. 点击表格行的"编辑"按钮
2. 打开表单弹窗
3. 预填充表单数据
4. 设置表单模式为"编辑"
5. API Key 值字段禁用（不可编辑）

#### 6.2.3 关闭表单

**行为**：
1. 点击"取消"按钮或点击遮罩层
2. 关闭表单弹窗
3. 清除表单数据和错误
4. 重置表单状态

#### 6.2.4 表单提交

**行为**：
1. 点击"保存"按钮
2. 验证表单数据
3. 如果验证失败，显示错误提示
4. 如果验证通过，发送 API 请求
5. 显示加载状态
6. 等待响应
7. 处理响应（成功或失败）

### 6.3 导航交互

#### 6.3.1 返回首页

**行为**：
1. 点击面包屑"首页"或"返回首页"按钮
2. 路由跳转到首页（`/`）

#### 6.3.2 跳转到项目详情页

**行为**：
1. 点击表格中"关联项目"列的项目 ID
2. 路由跳转到项目详情页（`/project/:projectId`）

---

## 7. 业务流程

### 7.1 页面加载流程

```
用户访问 API Key 管理页面 (/settings)
  ↓
1. 显示加载状态
  ↓
2. 请求 GET /api/v1/api-keys?page=1&pageSize=20
  ↓
3. 等待响应
  ↓
4. 处理响应：
   ├─ 成功：
   │   ├─ 更新 API Key 列表状态
   │   ├─ 渲染列表内容
   │   └─ 隐藏加载状态
   └─ 失败：
       ├─ 显示错误提示
       ├─ 提供重试按钮
       └─ 隐藏加载状态
```

### 7.2 添加 API Key 流程

```
用户点击"添加 API Key"按钮
  ↓
1. 打开表单弹窗
  ↓
2. 用户填写表单：
   ├─ 输入名称（必填）
   ├─ 输入 API Key 值（必填）
   ├─ 输入关联项目 ID（可选）
   └─ 设置激活状态（默认激活）
  ↓
3. 用户点击"保存"按钮
  ↓
4. 前端验证表单数据
   ├─ 验证失败：显示错误提示，阻止提交
   └─ 验证通过：继续提交
  ↓
5. 发送 POST /api/v1/api-keys 请求
  ↓
6. 等待响应
  ↓
7. 处理响应：
   ├─ 成功：
   │   ├─ 关闭表单弹窗
   │   ├─ 显示成功提示
   │   ├─ 刷新 API Key 列表
   │   └─ 临时保存原始 Key 值（用于显示）
   └─ 失败：
       ├─ 显示错误提示
       └─ 保持表单打开
```

### 7.3 编辑 API Key 流程

```
用户点击表格行的"编辑"按钮
  ↓
1. 获取当前行的 API Key 数据
  ↓
2. 打开编辑表单弹窗
  ↓
3. 预填充表单数据：
   ├─ 名称：当前名称
   ├─ Key 值：部分隐藏格式（不可编辑）
   ├─ 关联项目：当前关联项目（如果有）
   └─ 激活状态：当前状态
  ↓
4. 用户修改表单数据
  ↓
5. 用户点击"保存"按钮
  ↓
6. 前端验证表单数据
  ↓
7. 发送 PUT /api/v1/api-keys/:id 请求
  ↓
8. 等待响应
  ↓
9. 处理响应：
   ├─ 成功：
   │   ├─ 关闭表单弹窗
   │   ├─ 显示成功提示
   │   └─ 刷新 API Key 列表
   └─ 失败：
       ├─ 显示错误提示
       └─ 保持表单打开
```

### 7.4 删除 API Key 流程

```
用户点击表格行的"删除"按钮
  ↓
1. 显示删除确认对话框
  ↓
2. 对话框显示：
   ├─ API Key 名称
   ├─ 警告信息
   └─ 确认和取消按钮
  ↓
3. 用户确认删除
  ↓
4. 发送 DELETE /api/v1/api-keys/:id 请求
  ↓
5. 等待响应
  ↓
6. 处理响应：
   ├─ 成功：
   │   ├─ 关闭确认对话框
   │   ├─ 显示成功提示
   │   └─ 刷新 API Key 列表
   └─ 失败：
       ├─ 显示错误提示
       └─ 保持对话框打开
```

### 7.5 错误处理流程

```
API 请求失败
  ↓
1. 检查错误类型：
   ├─ 网络错误：显示"网络连接失败，请检查网络"
   ├─ 400 错误：显示服务器返回的错误消息
   ├─ 404 错误：显示"API Key 不存在"
   └─ 500 错误：显示"服务器错误，请稍后重试"
  ↓
2. 显示错误提示（Toast 或 Alert）
  ↓
3. 如果是表单提交错误：
   ├─ 在表单字段下方显示字段级错误
   └─ 保持表单打开
  ↓
4. 如果是列表加载错误：
   ├─ 显示错误提示
   └─ 提供重试按钮
```

---

## 8. 前端实现要点

### 8.1 组件结构

```
ApiKeyManagementPage/
├── Header.tsx                    # 顶部导航栏（共用组件）
├── PageHeader.tsx               # 页面头部（面包屑、标题、返回按钮）
├── ActionSection.tsx            # 操作区域（添加按钮）
├── ApiKeyList.tsx               # API Key 列表
│   ├── ApiKeyTable.tsx          # 表格布局（桌面端）
│   ├── ApiKeyCard.tsx           # 卡片布局（移动端）
│   └── ApiKeyRow.tsx            # 表格行组件
├── ApiKeyForm.tsx               # 表单组件（添加/编辑）
│   ├── FormField.tsx            # 表单字段组件
│   └── FormActions.tsx          # 表单操作按钮
├── DeleteConfirmDialog.tsx      # 删除确认对话框
├── LoadingState.tsx              # 加载状态
└── EmptyState.tsx                # 空状态
```

### 8.2 状态管理

**使用 React Hooks**：

```javascript
const ApiKeyManagementPage = () => {
  // API Key 列表状态
  const [apiKeys, setApiKeys] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  })
  
  // 加载状态
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // 表单状态
  const [formOpen, setFormOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingApiKey, setEditingApiKey] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    key: '',
    project_id: '',
    is_active: true
  })
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  
  // 删除对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingApiKey, setDeletingApiKey] = useState(null)
  
  // Key 值显示状态（临时保存创建时的原始值）
  const [visibleKeys, setVisibleKeys] = useState(new Set())
  const [createdKeys, setCreatedKeys] = useState(new Map())
  
  // ... 其他逻辑
}
```

### 8.3 数据获取函数

```javascript
// 获取 API Key 列表
const fetchApiKeys = async (page = 1, pageSize = 20) => {
  try {
    setLoading(true)
    setError(null)
    
    const response = await fetch(
      `/api/v1/api-keys?page=${page}&pageSize=${pageSize}`
    )
    
    if (!response.ok) {
      throw new Error('获取 API Key 列表失败')
    }
    
    const data = await response.json()
    
    if (data.success) {
      setApiKeys(data.data.items)
      setPagination(data.data.pagination)
    } else {
      throw new Error(data.error.message || '获取 API Key 列表失败')
    }
  } catch (err) {
    setError(err.message)
  } finally {
    setLoading(false)
  }
}

// 创建 API Key
const createApiKey = async (formData) => {
  try {
    setSubmitting(true)
    
    const response = await fetch('/api/v1/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.name.trim(),
        key: formData.key.trim(),
        project_id: formData.project_id?.trim() || null
      })
    })
    
    const result = await response.json()
    
    if (result.success) {
      // 临时保存原始 Key 值（用于显示）
      setCreatedKeys(prev => {
        const newMap = new Map(prev)
        newMap.set(result.data.id, formData.key.trim())
        return newMap
      })
      
      // 关闭表单，刷新列表
      setFormOpen(false)
      resetForm()
      await fetchApiKeys(pagination.page, pagination.pageSize)
      
      return { success: true, message: 'API Key 创建成功' }
    } else {
      return { 
        success: false, 
        message: result.error.message,
        errors: result.error.details || {}
      }
    }
  } catch (error) {
    return { 
      success: false, 
      message: '网络错误，请稍后重试' 
    }
  } finally {
    setSubmitting(false)
  }
}

// 更新 API Key
const updateApiKey = async (id, formData) => {
  try {
    setSubmitting(true)
    
    const response = await fetch(`/api/v1/api-keys/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.name.trim(),
        project_id: formData.project_id?.trim() || null,
        is_active: formData.is_active
      })
    })
    
    const result = await response.json()
    
    if (result.success) {
      // 关闭表单，刷新列表
      setFormOpen(false)
      resetForm()
      await fetchApiKeys(pagination.page, pagination.pageSize)
      
      return { success: true, message: 'API Key 更新成功' }
    } else {
      return { 
        success: false, 
        message: result.error.message,
        errors: result.error.details || {}
      }
    }
  } catch (error) {
    return { 
      success: false, 
      message: '网络错误，请稍后重试' 
    }
  } finally {
    setSubmitting(false)
  }
}

// 删除 API Key
const deleteApiKey = async (id) => {
  try {
    const response = await fetch(`/api/v1/api-keys/${id}`, {
      method: 'DELETE'
    })
    
    const result = await response.json()
    
    if (result.success) {
      // 关闭对话框，刷新列表
      setDeleteDialogOpen(false)
      setDeletingApiKey(null)
      await fetchApiKeys(pagination.page, pagination.pageSize)
      
      return { success: true, message: 'API Key 删除成功' }
    } else {
      return { 
        success: false, 
        message: result.error.message 
      }
    }
  } catch (error) {
    return { 
      success: false, 
      message: '网络错误，请稍后重试' 
    }
  }
}
```

### 8.4 表单验证函数

```javascript
// 验证表单数据
const validateForm = (data, isEditMode = false) => {
  const errors = {}
  
  // 验证名称
  if (!data.name || !data.name.trim()) {
    errors.name = 'API Key 名称不能为空'
  } else if (data.name.length > 255) {
    errors.name = 'API Key 名称长度不能超过 255 字符'
  }
  
  // 验证 Key 值（仅创建时）
  if (!isEditMode) {
    if (!data.key || !data.key.trim()) {
      errors.key = 'API Key 值不能为空'
    } else if (data.key.length > 255) {
      errors.key = 'API Key 值长度不能超过 255 字符'
    }
  }
  
  // 验证项目 ID（如果填写）
  if (data.project_id && data.project_id.trim()) {
    // 可以在这里添加项目存在性验证（需要先获取项目列表）
    // 或者延迟到提交时验证
  }
  
  return errors
}
```

### 8.5 格式化时间显示

```javascript
const formatDateTime = (dateString) => {
  if (!dateString) return '暂无'
  
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  
  // 小于1分钟：刚刚
  if (diff < 60000) return '刚刚'
  
  // 小于1小时：X分钟前
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes}分钟前`
  }
  
  // 小于24小时：X小时前
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours}小时前`
  }
  
  // 小于7天：X天前
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000)
    return `${days}天前`
  }
  
  // 其他：显示具体日期时间
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
```

### 8.6 Key 值部分隐藏函数

```javascript
// 格式化 Key 值显示（部分隐藏）
const formatApiKeyDisplay = (id, originalKey = null) => {
  // 如果提供了原始 Key 值且当前可见，显示完整值
  if (originalKey && visibleKeys.has(id)) {
    return originalKey
  }
  
  // 否则显示部分隐藏格式
  const suffix = String(id).padStart(4, '0').slice(-4)
  return `sk-****${suffix}`
}

// 切换 Key 值显示/隐藏
const toggleKeyVisibility = (id) => {
  const newVisibleKeys = new Set(visibleKeys)
  if (newVisibleKeys.has(id)) {
    newVisibleKeys.delete(id)
  } else {
    // 检查是否有保存的原始值
    if (createdKeys.has(id)) {
      newVisibleKeys.add(id)
    } else {
      // 如果没有原始值，提示无法显示
      showErrorMessage('无法显示完整 Key 值，仅在创建后短时间内可查看')
      return
    }
  }
  setVisibleKeys(newVisibleKeys)
}
```

---

## 9. 性能优化建议

### 9.1 数据加载优化

1. **分页加载**：使用分页避免一次性加载大量数据
2. **懒加载**：非关键内容使用懒加载
3. **请求去重**：避免同时发起多个相同请求

### 9.2 渲染优化

1. **React.memo**：对列表项组件使用 `React.memo` 避免不必要的重渲染
2. **useMemo**：对计算属性使用 `useMemo` 缓存结果
3. **useCallback**：对事件处理函数使用 `useCallback` 避免重复创建

```javascript
const ApiKeyRow = React.memo(({ apiKey, onEdit, onDelete }) => {
  // ...
})

const formattedApiKeys = useMemo(() => {
  return apiKeys.map(apiKey => ({
    ...apiKey,
    formattedTime: formatDateTime(apiKey.created_at),
    displayKey: formatApiKeyDisplay(
      apiKey.id, 
      createdKeys.get(apiKey.id)
    )
  }))
}, [apiKeys, createdKeys, visibleKeys])
```

### 9.3 表单优化

1. **防抖处理**：对输入框使用防抖处理，减少验证频率
2. **延迟验证**：输入时延迟验证，避免频繁验证
3. **乐观更新**：提交成功后立即更新 UI，提升用户体验

---

## 10. 错误处理和用户体验

### 10.1 错误状态显示

**网络错误**：

```jsx
{error && (
  <div className="error-banner">
    <p>{error}</p>
    <button onClick={() => fetchApiKeys()}>重试</button>
  </div>
)}
```

**表单错误**：

```jsx
{formErrors.name && (
  <p className="error-message">{formErrors.name}</p>
)}
```

**空状态**：

```jsx
{!loading && apiKeys.length === 0 && (
  <EmptyState
    message="暂无 API Key"
    actionLabel="添加第一个 API Key"
    onAction={() => setFormOpen(true)}
  />
)}
```

### 10.2 加载状态优化

1. **骨架屏**：使用骨架屏替代简单的加载动画
2. **按钮加载状态**：提交时禁用按钮，显示加载指示器
3. **表单加载状态**：提交时显示加载状态，禁用所有输入

### 10.3 成功提示

**Toast 提示**：

```javascript
const showSuccessMessage = (message) => {
  // 使用 Toast 组件显示成功提示
  toast.success(message, {
    duration: 3000,
    position: 'top-right'
  })
}
```

### 10.4 无障碍性（A11y）

1. **键盘导航**：支持 Tab 键切换焦点，Enter 键触发操作
2. **ARIA 标签**：为交互元素添加适当的 ARIA 标签
3. **颜色对比度**：确保文字和背景颜色对比度符合 WCAG 标准
4. **屏幕阅读器**：确保屏幕阅读器能够正确读取内容

```jsx
<button
  onClick={handleEdit}
  aria-label={`编辑 API Key ${apiKey.name}`}
  aria-busy={submitting}
>
  编辑
</button>
```

---

## 11. 测试建议

### 11.1 功能测试

1. **列表展示**：测试列表加载、空状态、错误状态
2. **添加功能**：测试表单验证、提交成功、提交失败
3. **编辑功能**：测试数据预填充、表单验证、提交成功、提交失败
4. **删除功能**：测试确认对话框、删除成功、删除失败
5. **Key 值显示**：测试部分隐藏显示、显示/隐藏切换（如果支持）

### 11.2 表单验证测试

1. **必填字段**：测试空值验证
2. **长度限制**：测试字段长度验证
3. **格式验证**：测试字段格式验证
4. **业务规则**：测试项目存在性验证（如果实现）

### 11.3 响应式测试

1. **设备测试**：在不同设备上测试布局和交互
2. **浏览器测试**：在不同浏览器上测试兼容性
3. **主题测试**：测试深浅色主题的显示效果

### 11.4 性能测试

1. **加载时间**：测试页面首次加载时间
2. **渲染性能**：测试大量 API Key 时的渲染性能
3. **表单性能**：测试表单验证和提交的性能

---

## 12. 总结

本文档详细说明了 TaskEcho 系统 API Key 管理页面功能的完整设计方案，包括：

1. **页面布局设计**：顶部导航栏、页面头部、操作区域、API Key 列表区域、表单弹窗、删除确认对话框的详细布局说明
2. **API 接口说明**：获取列表、创建、更新、删除接口的详细规范
3. **数据获取和更新机制**：初始加载、创建/更新/删除后的刷新机制
4. **表单设计和验证**：表单字段设计、验证规则、提交验证、状态管理
5. **交互功能**：列表交互、表单交互、导航交互
6. **业务流程**：页面加载流程、添加/编辑/删除流程、错误处理流程
7. **前端实现要点**：组件结构、状态管理、数据获取函数、表单验证函数、时间格式化、Key 值格式化
8. **性能优化建议**：数据加载优化、渲染优化、表单优化
9. **错误处理和用户体验**：错误状态显示、加载状态优化、成功提示、无障碍性
10. **测试建议**：功能测试、表单验证测试、响应式测试、性能测试

API Key 管理页面作为应用的设置页面，需要提供清晰的数据展示、完整的 CRUD 功能、友好的表单交互和良好的错误处理，确保用户能够方便地管理 API Key，保障系统的安全性和可用性。

---

## 13. 相关文档

- [需求文档](../../requirement.md)
- [页面结构文档](../../page-structure.md)
- [数据库设计文档](database-design.md)
- [API Key 管理接口设计文档](api-key-management-api.md)
- [系统框架文档](system-framework.md)
- [首页功能设计文档](homepage-design.md)
