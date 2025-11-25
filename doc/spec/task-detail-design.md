# TaskEcho 任务详情页功能设计文档

## 1. 概述

### 1.1 文档目的

本文档详细说明 TaskEcho 系统任务详情页功能的完整设计方案，包括对话历史展示、Markdown 渲染、代码高亮、日志展示、回复输入功能、页面布局、数据获取机制等详细说明。

### 1.2 功能定位

任务详情页是 TaskEcho 应用的四级页面，也是应用的核心交互页面，主要功能包括：

- **对话历史展示**：完整展示用户和 AI 之间的多轮对话历史，支持 Markdown 渲染和代码高亮
- **日志展示**：独立展示任务的执行日志，倒序排列，最新的在上方
- **回复输入功能**：页面底部提供回复输入框，用户可以直接输入回复（仅本地保存，不触发外部 API）
- **任务信息展示**：展示任务标题、状态、标签等基本信息
- **数据实时更新**：支持对话消息和日志的自动刷新和实时更新

### 1.3 核心特性

- **Markdown 渲染**：完整支持 Markdown 语法，包括标题、列表、链接、代码块等
- **代码高亮**：代码块支持语法高亮，支持多种编程语言
- **对话流展示**：清晰展示用户和 AI 的对话流程，区分角色
- **日志独立展示**：日志区域独立展示，倒序排列，便于查看最新日志
- **本地回复**：回复功能仅本地保存，不触发外部 API，等待外部系统轮询发现
- **响应式布局**：支持手机、平板、桌面等多种设备
- **深浅色主题**：自动适配系统主题，支持手动切换
- **实时更新**：支持数据自动刷新，确保对话和日志实时性
- **性能优化**：使用虚拟滚动、代码分割等机制优化性能

### 1.4 技术栈

- **前端框架**：React
- **UI 组件库**：shadcn/ui
- **样式方案**：Tailwind CSS
- **Markdown 渲染**：react-markdown（或 marked + DOMPurify）
- **代码高亮**：react-syntax-highlighter（或 Prism.js）
- **数据获取**：Fetch API / React Query（可选）
- **状态管理**：React Hooks（useState, useEffect）
- **路由**：Next.js App Router
- **虚拟滚动**：react-window 或 react-virtualized（可选，用于长对话）

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
│  面包屑导航（Breadcrumb）                        │
│  首页 > 项目名称 > 队列名称 > 任务标题           │
├─────────────────────────────────────────────────┤
│  页面头部（Page Header）                          │
│  ┌─────────────────────────────────────────┐   │
│  │  任务标题（大标题）                        │   │
│  │  [Pending] [tag1] [tag2] [tag3]        │   │
│  │  返回任务队列详情页按钮                     │   │
│  └─────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│  对话区域（Conversation Section）                │
│  ┌─────────────────────────────────────────┐   │
│  │  对话消息 1（用户）                      │   │
│  │  ┌───────────────────────────────────┐ │   │
│  │  │ 👤 用户                            │ │   │
│  │  │ 消息内容（Markdown 渲染）          │ │   │
│  │  │ 时间戳: 2024-01-01 10:00:00       │ │   │
│  │  └───────────────────────────────────┘ │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐   │
│  │  对话消息 2（AI）                        │   │
│  │  ┌───────────────────────────────────┐ │   │
│  │  │ 🤖 AI                              │ │   │
│  │  │ 消息内容（Markdown 渲染）          │ │   │
│  │  │ ```javascript                      │ │   │
│  │  │ // 代码块（语法高亮）              │ │   │
│  │  │ ```                                │ │   │
│  │  │ 时间戳: 2024-01-01 10:01:00       │ │   │
│  │  └───────────────────────────────────┘ │   │
│  └─────────────────────────────────────────┘   │
│  ...（更多对话消息）                            │
├─────────────────────────────────────────────────┤
│  日志区域（Log Section）                        │
│  ┌─────────────────────────────────────────┐   │
│  │  执行日志                                │   │
│  │  ┌───────────────────────────────────┐ │   │
│  │  │ 2024-01-01 10:05:00               │ │   │
│  │  │ 日志内容（纯文本）                  │ │   │
│  │  └───────────────────────────────────┘ │   │
│  │  ┌───────────────────────────────────┐ │   │
│  │  │ 2024-01-01 10:04:00               │ │   │
│  │  │ 日志内容（纯文本）                  │ │   │
│  │  └───────────────────────────────────┘ │   │
│  │  ...（更多日志，倒序排列）              │   │
│  └─────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│  回复输入区域（Reply Input Section）            │
│  ┌─────────────────────────────────────────┐   │
│  │  多行文本输入框                          │   │
│  │  ┌───────────────────────────────────┐ │   │
│  │  │ 输入回复内容...                    │ │   │
│  │  │                                    │ │   │
│  │  └───────────────────────────────────┘ │   │
│  │  [发送] 按钮                            │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### 2.2 顶部导航栏（Header）

**位置**：页面顶部，固定位置

**组件内容**：
- **左侧**：应用 Logo 和标题（"TaskEcho"）
- **右侧**：
  - 设置图标（点击跳转到 API Key 管理页面）
  - 主题切换按钮（深浅色模式切换）

**样式要求**：
- 背景色：浅色模式为白色，深色模式为深灰色
- 高度：64px（移动端）或 72px（桌面端）
- 阴影：轻微阴影效果，区分内容区域
- 响应式：移动端图标和文字适当缩小

**交互功能**：
- 点击 Logo/标题：跳转到首页 `/`
- 点击设置图标：跳转到 `/settings` 页面
- 点击主题切换按钮：切换深浅色模式（保存到 localStorage）

### 2.3 面包屑导航（Breadcrumb）

**位置**：导航栏下方，页面头部上方

**内容**：
- **层级路径**：`首页 > 项目名称 > 队列名称 > 任务标题`
- **可点击项**：`首页`、`项目名称`、`队列名称` 可点击跳转
- **当前项**：`任务标题` 不可点击，显示为当前页面

**样式要求**：
- 字体大小：14px（移动端）或 16px（桌面端）
- 颜色：浅色模式为灰色，深色模式为浅灰色
- 分隔符：使用 `>` 或 `/` 符号
- 间距：与上下区域保持适当间距

**交互功能**：
- 点击 `首页`：跳转到首页 `/`
- 点击 `项目名称`：跳转到项目详情页 `/project/:projectId`
- 点击 `队列名称`：跳转到任务队列详情页 `/project/:projectId/queue/:queueId`
- 点击 `任务标题`：无操作（当前页面）

### 2.4 页面头部（Page Header）

**位置**：面包屑导航下方

**组件内容**：
- **左侧**：
  - 任务标题（大号加粗字体）
  - 任务状态徽章（Pending/Done/Error）
  - 任务标签列表（多标签彩色展示）
- **右侧**：返回任务队列详情页按钮

**样式要求**：
- 任务标题：24px（移动端）或 32px（桌面端），加粗
- 状态徽章：标准徽章样式，不同状态不同颜色
  - Pending：黄色/橙色
  - Done：绿色
  - Error：红色
- 标签列表：标签按钮样式，支持彩色标签
- 返回按钮：标准按钮样式，带图标
- 内边距：16px（移动端）或 24px（桌面端）
- 对齐方式：左右对齐，垂直居中

**交互功能**：
- 点击返回任务队列详情页按钮：跳转到任务队列详情页 `/project/:projectId/queue/:queueId`
- 点击规范文件：可选跳转到文件查看页面（如果实现）

### 2.5 对话区域（Conversation Section）

**位置**：页面头部下方，日志区域上方

**布局方式**：
- **桌面端**（> 1024px）：对话消息左右对齐，用户消息靠右，AI 消息靠左
- **移动端**（< 768px）：对话消息垂直排列，用户消息和 AI 消息交替显示

#### 2.5.1 对话消息卡片（Message Card）

**组件结构**：
```
┌─────────────────────────────────────────┐
│  角色标识（用户/AI）                      │
│  ┌───────────────────────────────────┐ │
│  │  消息内容（Markdown 渲染）          │ │
│  │  - 支持标题、列表、链接等          │ │
│  │  - 代码块支持语法高亮              │ │
│  │  - 表格支持渲染                    │ │
│  └───────────────────────────────────┘ │
│  时间戳: 2024-01-01 10:00:00          │
└─────────────────────────────────────────┘
```

**样式要求**：
- **用户消息**：
  - 背景色：浅蓝色（浅色模式）或深蓝色（深色模式）
  - 对齐方式：右侧对齐（桌面端）
  - 角色标识：👤 用户 或 "User"
- **AI 消息**：
  - 背景色：浅灰色（浅色模式）或深灰色（深色模式）
  - 对齐方式：左侧对齐（桌面端）
  - 角色标识：🤖 AI 或 "Assistant"
- **消息卡片**：
  - 圆角：8px
  - 内边距：12px（移动端）或 16px（桌面端）
  - 外边距：12px（移动端）或 16px（桌面端）
  - 最大宽度：80%（桌面端）或 100%（移动端）
  - 阴影：轻微阴影效果

**Markdown 渲染要求**：
- **标题**：支持 H1-H6，样式清晰
- **列表**：支持有序列表和无序列表
- **链接**：支持内联链接，新窗口打开
- **代码块**：支持语法高亮，支持多种编程语言
- **行内代码**：背景色区分，等宽字体
- **表格**：支持表格渲染，边框清晰
- **引用**：支持引用块，左侧边框标识
- **图片**：支持图片显示（如果消息中包含图片链接）

**代码高亮要求**：
- **支持语言**：JavaScript、TypeScript、Python、Java、Go、Rust、SQL、HTML、CSS、JSON、YAML 等常见语言
- **主题**：根据深浅色模式自动切换代码高亮主题
- **复制功能**：代码块右上角提供复制按钮
- **行号**：可选显示行号（长代码块）

**时间戳显示**：
- **格式**：`YYYY-MM-DD HH:mm:ss`（中文环境）或 `MM/DD/YYYY HH:mm:ss`（英文环境）
- **位置**：消息卡片底部，小号字体
- **颜色**：浅灰色（浅色模式）或深灰色（深色模式）

#### 2.5.2 消息排序

**排序规则**：
- 消息按 `createdAt` 字段**正序**排列
- 最早的消息在上方，最新的消息在下方
- 确保对话流程的连续性

**滚动行为**：
- 页面加载时：自动滚动到底部，显示最新消息
- 新消息到达时：自动滚动到底部，显示新消息
- 用户手动滚动时：不自动滚动，保持用户当前位置

### 2.6 日志区域（Log Section）

**位置**：对话区域下方，回复输入区域上方

**组件结构**：
```
┌─────────────────────────────────────────┐
│  执行日志                                │
│  ┌───────────────────────────────────┐ │
│  │ 2024-01-01 10:05:00               │ │
│  │ 日志内容（纯文本）                  │ │
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │ 2024-01-01 10:04:00               │ │
│  │ 日志内容（纯文本）                  │ │
│  └───────────────────────────────────┘ │
│  ...（更多日志，倒序排列）              │
└─────────────────────────────────────────┘
```

**样式要求**：
- **区域标题**：`执行日志` 或 `Logs`，大号加粗字体
- **日志卡片**：
  - 背景色：浅灰色（浅色模式）或深灰色（深色模式）
  - 圆角：4px
  - 内边距：8px（移动端）或 12px（桌面端）
  - 外边距：8px（移动端）或 12px（桌面端）
  - 边框：左侧边框，区分不同日志
- **时间戳**：
  - 字体大小：12px
  - 颜色：深灰色（浅色模式）或浅灰色（深色模式）
  - 字体：等宽字体（monospace）
- **日志内容**：
  - 字体：等宽字体（monospace）
  - 换行：支持换行显示
  - 颜色：深色（浅色模式）或浅色（深色模式）

**排序规则**：
- 日志按 `createdAt` 字段**倒序**排列
- 最新的日志在上方，最旧的日志在下方
- 便于用户查看最新日志

**交互功能**：
- **展开/折叠**：可选支持日志区域的展开/折叠功能
- **自动滚动**：新日志到达时，可选自动滚动到顶部显示最新日志

### 2.7 回复输入区域（Reply Input Section）

**位置**：页面底部，固定位置（移动端）或相对位置（桌面端）

**组件结构**：
```
┌─────────────────────────────────────────┐
│  多行文本输入框                          │
│  ┌───────────────────────────────────┐ │
│  │ 输入回复内容...                    │ │
│  │                                    │ │
│  │                                    │ │
│  └───────────────────────────────────┘ │
│  [发送] 按钮                            │
└─────────────────────────────────────────┘
```

**样式要求**：
- **输入框**：
  - 多行文本输入框，支持换行
  - 最小高度：80px（移动端）或 100px（桌面端）
  - 最大高度：200px（移动端）或 300px（桌面端）
  - 超出最大高度时显示滚动条
  - 圆角：8px
  - 内边距：12px
  - 边框：1px 实线边框
- **发送按钮**：
  - 位置：输入框右侧（桌面端）或下方（移动端）
  - 样式：主要按钮样式，带图标
  - 禁用状态：输入框为空时禁用
- **字符计数**（可选）：
  - 位置：输入框右下角
  - 显示：当前字符数 / 最大字符数（可选）
  - 颜色：灰色

**固定位置**（移动端）：
- 使用 `position: fixed` 固定在页面底部
- 背景色：与页面背景色一致
- 阴影：顶部阴影，区分内容区域
- 内边距：16px

**相对位置**（桌面端）：
- 使用 `position: relative` 或 `sticky`
- 跟随页面滚动

**交互功能**：
- **输入**：支持多行文本输入，支持换行
- **发送**：
  - 点击发送按钮或按 `Ctrl+Enter`（Windows）或 `Cmd+Enter`（Mac）发送
  - 发送后立即在对话区域追加一条用户消息（仅本地保存）
  - 输入框清空
  - 页面滚动到底部显示新消息
  - 不触发任何外部 API 调用
- **禁用状态**：输入框为空时，发送按钮禁用

---

## 3. API 接口说明

### 3.1 获取任务详情接口

#### 3.1.1 接口基本信息

| 项目 | 说明 |
|------|------|
| **接口路径** | `/api/v1/projects/:projectId/queues/:queueId/tasks/:taskId` |
| **请求方法** | `GET` |
| **认证要求** | 无需认证（单用户本地应用） |
| **路径参数** | `projectId`（项目外部唯一标识）、`queueId`（队列外部唯一标识）、`taskId`（任务外部唯一标识） |

#### 3.1.2 响应格式

**成功响应（200）**：

```json
{
  "success": true,
  "data": {
    "id": "1",
    "name": "编写系统基础框架的实现方案",
    "prompt": "请编写系统基础框架的实现方案，包括主要api规范和数据库规范，数据库使用sqlite。",
    "spec_file": [
      ".flow/skills/spcewriter.md",
      "doc/requirement.md"
    ],
    "status": "pending",
    "report": ".flow/tasks/report/编写系统基础框架的实现方案_2025-11-24T14-28-50.md",
    "messages": [
      {
        "role": "user",
        "content": "用户消息内容",
        "created_at": "2024-01-01T00:00:00.000Z"
      },
      {
        "role": "assistant",
        "content": "AI 回复内容",
        "created_at": "2024-01-01T00:01:00.000Z"
      }
    ],
    "logs": [
      {
        "content": "日志内容",
        "created_at": "2024-01-01T00:02:00.000Z"
      }
    ],
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:02:00.000Z"
  },
  "message": "查询成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**响应字段说明**：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `data.id` | string | 任务ID（在队列内唯一） |
| `data.name` | string | 任务名称 |
| `data.prompt` | string | 任务提示文本 |
| `data.spec_file` | array[string] | 规范文件路径数组 |
| `data.status` | string | 任务状态（pending/done/error，小写） |
| `data.report` | string\|null | 报告文件路径（可选） |
| `data.messages` | array | 对话消息数组（按 createdAt 正序排列） |
| `data.messages[].role` | string | 消息角色（user/assistant，小写） |
| `data.messages[].content` | string | 消息内容（支持 Markdown） |
| `data.messages[].created_at` | string | 消息创建时间（ISO 8601 格式） |
| `data.logs` | array | 执行日志数组（按 createdAt 倒序排列，最新的在上方） |
| `data.logs[].content` | string | 日志内容（纯文本） |
| `data.logs[].created_at` | string | 日志创建时间（ISO 8601 格式） |
| `data.created_at` | string | 任务创建时间（ISO 8601 格式） |
| `data.updated_at` | string | 任务更新时间（ISO 8601 格式） |

**注意**：详情查询返回完整的任务数据，包括 `messages` 和 `logs` 字段。

**资源不存在（404）**：

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "项目、任务队列或任务不存在",
    "details": {
      "project_id": "project_001",
      "queue_id": "queue_001",
      "task_id": "task_001"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 3.1.3 接口使用示例

**请求**：
```bash
curl http://localhost:3000/api/v1/projects/project_001/queues/queue_001/tasks/task_001
```

**响应**：见上面的成功响应格式

---

## 4. 数据获取和更新机制

### 4.1 初始加载

**触发时机**：
- 页面首次加载时
- 路由参数（projectId、queueId、taskId）变化时

**加载流程**：
```
1. 解析路由参数（projectId、queueId、taskId）
   ↓
2. 显示加载状态（Loading Spinner）
   ↓
3. 调用 GET /api/v1/projects/:projectId/queues/:queueId/tasks/:taskId 接口
   ↓
4. 处理响应数据
   ├─ 如果成功：更新任务数据、对话消息、日志
   ├─ 如果 404：显示错误提示，提供返回按钮
   └─ 如果其他错误：显示错误提示，提供重试按钮
   ↓
5. 隐藏加载状态
   ↓
6. 渲染页面内容
   ├─ 渲染任务信息（标题、状态、标签）
   ├─ 渲染对话消息列表（按时间正序）
   ├─ 渲染日志列表（按时间倒序）
   └─ 自动滚动到底部（显示最新消息）
```

### 4.2 自动刷新机制

**刷新策略**：
- **轮询方式**：定时请求任务详情接口，检查是否有新消息或新日志
- **刷新频率**：每 5-10 秒刷新一次（可配置）
- **智能刷新**：仅在页面可见时刷新，页面隐藏时暂停刷新

**刷新流程**：
```
1. 设置定时器（setInterval）
   ↓
2. 定时调用任务详情接口
   ↓
3. 比较新旧数据
   ├─ 检查是否有新消息（比较 messages 数组长度或最后一条消息的 ID）
   ├─ 检查是否有新日志（比较 logs 数组长度或第一条日志的 ID）
   └─ 检查任务状态是否变化
   ↓
4. 如果有更新：
   ├─ 更新任务数据
   ├─ 追加新消息到对话区域（不重新渲染所有消息）
   ├─ 追加新日志到日志区域顶部（不重新渲染所有日志）
   └─ 可选：自动滚动到底部（显示新消息）
   ↓
5. 如果没有更新：不更新 UI
```

**性能优化**：
- **增量更新**：只更新变化的部分，不重新渲染整个列表
- **防抖处理**：避免频繁刷新，合并多个刷新请求
- **页面可见性**：使用 `document.visibilityState` API，页面隐藏时暂停刷新

### 4.3 手动刷新

**触发方式**：
- 点击刷新按钮（可选）
- 下拉刷新（移动端，可选）

**刷新流程**：
```
1. 用户触发刷新
   ↓
2. 显示刷新状态（Loading Spinner）
   ↓
3. 调用任务详情接口
   ↓
4. 更新所有数据（全量更新）
   ↓
5. 重新渲染页面
   ↓
6. 隐藏刷新状态
```

### 4.4 缓存策略

**缓存机制**：
- **本地缓存**：使用 React Query 或自定义缓存机制缓存任务详情数据
- **缓存时间**：5-10 秒（与自动刷新频率一致）
- **缓存失效**：任务更新时自动失效缓存

**缓存键**：
- 格式：`task:${projectId}:${queueId}:${taskId}`
- 示例：`task:project_001:queue_001:task_001`

### 4.5 本地回复数据管理

**数据存储**：
- **存储位置**：React 组件状态（useState）
- **存储格式**：与 API 返回的消息格式一致
- **数据标识**：本地消息使用临时 ID（如 `local_${timestamp}`）

**数据合并**：
- **显示逻辑**：本地消息和 API 返回的消息合并显示
- **排序规则**：按 `createdAt` 正序排列
- **区分标识**：本地消息可以添加特殊标识（如 "待发送" 标签）

**数据同步**：
- **等待轮询**：本地消息等待外部系统轮询发现
- **状态更新**：外部系统通过增量更新接口追加消息后，自动刷新时会显示真实消息
- **清理逻辑**：真实消息到达后，可以清理对应的本地消息（可选）

---

## 5. 对话历史展示

### 5.1 Markdown 渲染

#### 5.1.1 使用的库

**推荐方案**：
- **react-markdown**：React 组件，支持 Markdown 渲染
- **remark-gfm**：GitHub Flavored Markdown 支持（表格、删除线等）
- **rehype-raw**：支持 HTML 标签（可选）
- **rehype-sanitize**：HTML 安全过滤（如果使用 rehype-raw）

**安装命令**：
```bash
npm install react-markdown remark-gfm rehype-raw rehype-sanitize
```

#### 5.1.2 渲染配置

**基本配置**：
```javascript
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'

<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  rehypePlugins={[rehypeRaw, rehypeSanitize]}
  components={{
    // 自定义组件样式
    h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-4" {...props} />,
    h2: ({node, ...props}) => <h2 className="text-xl font-bold mb-3" {...props} />,
    code: ({node, inline, className, children, ...props}) => {
      // 代码块处理（见代码高亮部分）
    },
    // ... 其他组件
  }}
>
  {messageContent}
</ReactMarkdown>
```

#### 5.1.3 支持的 Markdown 语法

**基础语法**：
- **标题**：`# H1`、`## H2`、`### H3` 等
- **粗体**：`**粗体**` 或 `__粗体__`
- **斜体**：`*斜体*` 或 `_斜体_`
- **删除线**：`~~删除线~~`（需要 remark-gfm）
- **链接**：`[链接文本](URL)`
- **图片**：`![图片描述](图片URL)`
- **列表**：
  - 无序列表：`- 项目` 或 `* 项目`
  - 有序列表：`1. 项目`
- **引用**：`> 引用内容`
- **行内代码**：`` `代码` ``
- **代码块**：`` ```语言\n代码\n``` ``

**扩展语法**（GitHub Flavored Markdown）：
- **表格**：支持表格渲染
- **任务列表**：`- [ ] 未完成`、`- [x] 已完成`
- **自动链接**：自动识别 URL 并转换为链接

#### 5.1.4 样式定制

**主题适配**：
- 使用 Tailwind CSS 的深色模式类（`dark:`）
- 根据系统主题自动切换样式

**示例样式**：
```css
/* 浅色模式 */
.markdown-content {
  color: #333;
}

.markdown-content h1 {
  color: #000;
  border-bottom: 1px solid #eaecef;
}

.markdown-content a {
  color: #0366d6;
}

/* 深色模式 */
.dark .markdown-content {
  color: #e1e4e8;
}

.dark .markdown-content h1 {
  color: #fff;
  border-bottom: 1px solid #30363d;
}

.dark .markdown-content a {
  color: #58a6ff;
}
```

### 5.2 代码高亮

#### 5.2.1 使用的库

**推荐方案**：
- **react-syntax-highlighter**：React 组件，支持代码高亮
- **prismjs**：轻量级代码高亮库（备选）

**安装命令**：
```bash
npm install react-syntax-highlighter
```

#### 5.2.2 代码高亮配置

**基本配置**：
```javascript
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useTheme } from 'next-themes'

function CodeBlock({ language, children }) {
  const { theme } = useTheme()
  const style = theme === 'dark' ? vscDarkPlus : vs
  
  return (
    <SyntaxHighlighter
      language={language || 'text'}
      style={style}
      showLineNumbers={false}
      customStyle={{
        borderRadius: '8px',
        padding: '16px',
        fontSize: '14px',
      }}
    >
      {children}
    </SyntaxHighlighter>
  )
}
```

#### 5.2.3 支持的语言

**常见语言**：
- JavaScript、TypeScript
- Python
- Java
- Go
- Rust
- SQL
- HTML、CSS
- JSON
- YAML
- Shell、Bash
- 其他常见编程语言

**语言检测**：
- 从代码块的 `language` 属性获取语言
- 如果未指定语言，尝试自动检测（可选）
- 如果无法检测，使用 `text` 作为默认语言

#### 5.2.4 代码块功能

**复制功能**：
- 代码块右上角显示复制按钮
- 点击复制按钮，复制代码内容到剪贴板
- 复制成功后显示提示（Toast）

**行号显示**：
- 可选显示行号（长代码块）
- 使用 `showLineNumbers` 属性控制

**代码块样式**：
- 圆角：8px
- 内边距：16px
- 背景色：根据主题自动切换
- 字体：等宽字体（monospace）

### 5.3 对话消息组件

#### 5.3.1 消息组件结构

```javascript
function MessageCard({ message }) {
  const { role, content, createdAt } = message
  
  return (
    <div className={`message-card message-${role}`}>
      <div className="message-header">
        <span className="message-role">
          {role === 'user' ? '👤 用户' : '🤖 AI'}
        </span>
      </div>
      <div className="message-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code: CodeBlock,
            // ... 其他组件
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
      <div className="message-footer">
        <span className="message-time">
          {formatDateTime(createdAt)}
        </span>
      </div>
    </div>
  )
}
```

#### 5.3.2 消息列表组件

```javascript
function MessageList({ messages }) {
  return (
    <div className="message-list">
      {messages.map((message) => (
        <MessageCard key={message.id} message={message} />
      ))}
    </div>
  )
}
```

---

## 6. 日志展示

### 6.1 日志组件结构

```javascript
function LogCard({ log }) {
  const { content, createdAt } = log
  
  return (
    <div className="log-card">
      <div className="log-header">
        <span className="log-time">
          {formatDateTime(createdAt)}
        </span>
      </div>
      <div className="log-content">
        <pre className="log-text">{content}</pre>
      </div>
    </div>
  )
}
```

### 6.2 日志列表组件

```javascript
function LogList({ logs }) {
  return (
    <div className="log-section">
      <h2 className="log-section-title">执行日志</h2>
      <div className="log-list">
        {logs.map((log) => (
          <LogCard key={log.id} log={log} />
        ))}
      </div>
    </div>
  )
}
```

### 6.3 日志样式

**日志卡片样式**：
- 背景色：浅灰色（浅色模式）或深灰色（深色模式）
- 圆角：4px
- 内边距：8px（移动端）或 12px（桌面端）
- 外边距：8px（移动端）或 12px（桌面端）
- 边框：左侧边框，区分不同日志

**日志内容样式**：
- 字体：等宽字体（monospace）
- 换行：支持换行显示（`white-space: pre-wrap`）
- 颜色：深色（浅色模式）或浅色（深色模式）

---

## 7. 回复输入功能

### 7.1 回复输入组件

```javascript
function ReplyInput({ onSend }) {
  const [content, setContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  
  const handleSend = async () => {
    if (!content.trim()) return
    
    setIsSending(true)
    
    // 创建本地消息
    const localMessage = {
      id: `local_${Date.now()}`,
      role: 'user',
      content: content.trim(),
      createdAt: new Date().toISOString(),
      isLocal: true // 标识为本地消息
    }
    
    // 调用回调函数
    await onSend(localMessage)
    
    // 清空输入框
    setContent('')
    setIsSending(false)
  }
  
  const handleKeyDown = (e) => {
    // Ctrl+Enter 或 Cmd+Enter 发送
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSend()
    }
  }
  
  return (
    <div className="reply-input-section">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入回复内容..."
        rows={4}
        className="reply-textarea"
      />
      <button
        onClick={handleSend}
        disabled={!content.trim() || isSending}
        className="reply-send-button"
      >
        发送
      </button>
    </div>
  )
}
```

### 7.2 本地消息处理

**消息追加**：
```javascript
function TaskDetailPage() {
  const [messages, setMessages] = useState([])
  
  const handleSendReply = (localMessage) => {
    // 追加本地消息到消息列表
    setMessages(prev => [...prev, localMessage])
    
    // 滚动到底部
    scrollToBottom()
    
    // 不触发 API 调用
    // 等待外部系统轮询发现
  }
  
  return (
    <div>
      <MessageList messages={messages} />
      <ReplyInput onSend={handleSendReply} />
    </div>
  )
}
```

### 7.3 消息同步逻辑

**真实消息到达时**：
```javascript
// 自动刷新时，如果收到真实消息，可以清理对应的本地消息
useEffect(() => {
  if (newMessages.length > messages.length) {
    // 检查是否有对应的本地消息
    const realMessages = newMessages.filter(msg => !msg.isLocal)
    const localMessages = messages.filter(msg => msg.isLocal)
    
    // 如果真实消息已到达，清理本地消息（可选）
    // 这里可以根据业务需求决定是否清理
  }
}, [newMessages])
```

---

## 8. 交互功能

### 8.1 页面滚动

**自动滚动**：
- 页面加载时：自动滚动到底部，显示最新消息
- 新消息到达时：自动滚动到底部，显示新消息
- 发送回复后：自动滚动到底部，显示新消息

**手动滚动**：
- 用户手动滚动时：不自动滚动，保持用户当前位置
- 滚动到底部按钮：可选提供"滚动到底部"按钮，点击后滚动到底部

### 8.2 代码复制

**复制功能**：
- 代码块右上角显示复制按钮
- 点击复制按钮，复制代码内容到剪贴板
- 复制成功后显示提示（Toast）

**实现示例**：
```javascript
function CodeBlock({ language, children }) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <div className="code-block-wrapper">
      <button onClick={handleCopy} className="copy-button">
        {copied ? '已复制' : '复制'}
      </button>
      <SyntaxHighlighter language={language}>
        {children}
      </SyntaxHighlighter>
    </div>
  )
}
```

### 8.3 消息展开/折叠

**长消息处理**：
- 可选支持消息的展开/折叠功能
- 超过一定长度（如 500 字符）的消息默认折叠
- 点击"展开"按钮显示完整内容
- 点击"折叠"按钮收起内容

### 8.4 日志展开/折叠

**日志区域**：
- 可选支持日志区域的展开/折叠功能
- 默认展开，用户可以折叠以节省空间
- 折叠后显示日志数量提示

---

## 9. 完整业务流程

### 9.1 页面加载流程

```
用户访问任务详情页
  ↓
1. 解析路由参数（projectId、queueId、taskId）
  ↓
2. 显示加载状态
  ↓
3. 调用任务详情接口
  ↓
4. 获取任务数据
  ├─ 任务基本信息（标题、状态、标签）
  ├─ 对话消息列表（按时间正序）
  └─ 日志列表（按时间倒序）
  ↓
5. 渲染页面内容
  ├─ 渲染任务信息
  ├─ 渲染对话消息列表
  ├─ 渲染日志列表
  └─ 自动滚动到底部
  ↓
6. 启动自动刷新机制
  ↓
7. 页面加载完成
```

### 9.2 数据更新流程

```
自动刷新触发（每 5-10 秒）
  ↓
1. 调用任务详情接口
  ↓
2. 比较新旧数据
  ├─ 检查是否有新消息
  ├─ 检查是否有新日志
  └─ 检查任务状态是否变化
  ↓
3. 如果有更新：
  ├─ 更新任务数据
  ├─ 追加新消息到对话区域
  ├─ 追加新日志到日志区域顶部
  └─ 可选：自动滚动到底部
  ↓
4. 如果没有更新：不更新 UI
  ↓
5. 等待下次刷新
```

### 9.3 用户回复流程

```
用户在回复输入框输入内容
  ↓
1. 用户点击发送按钮或按 Ctrl+Enter
  ↓
2. 验证输入内容
  ├─ 如果为空：不发送
  └─ 如果不为空：继续处理
  ↓
3. 创建本地消息对象
  ├─ id: local_${timestamp}
  ├─ role: 'user'
  ├─ content: 输入内容
  ├─ createdAt: 当前时间
  └─ isLocal: true
  ↓
4. 追加本地消息到消息列表
  ↓
5. 清空输入框
  ↓
6. 自动滚动到底部显示新消息
  ↓
7. 不触发任何外部 API 调用
  ↓
8. 等待外部系统轮询发现新消息
  ↓
9. 外部系统通过增量更新接口追加消息后，自动刷新时会显示真实消息
```

### 9.4 错误处理流程

```
接口调用失败
  ↓
1. 捕获错误
  ↓
2. 判断错误类型
  ├─ 404 错误：资源不存在
  │   └─ 显示错误提示，提供返回按钮
  ├─ 网络错误：网络连接失败
  │   └─ 显示错误提示，提供重试按钮
  └─ 其他错误：服务器错误
      └─ 显示错误提示，提供重试按钮
  ↓
3. 记录错误日志（开发环境）
  ↓
4. 用户操作
  ├─ 点击返回按钮：返回上一页
  ├─ 点击重试按钮：重新调用接口
  └─ 其他操作：根据具体情况处理
```

---

## 10. 前端实现要点

### 10.1 组件结构

```
TaskDetailPage/
├── Header/              # 顶部导航栏
├── Breadcrumb/          # 面包屑导航
├── TaskHeader/          # 任务头部（标题、状态、标签）
├── MessageList/         # 对话消息列表
│   └── MessageCard/     # 对话消息卡片
│       └── MarkdownContent/  # Markdown 内容
│           └── CodeBlock/    # 代码块（带高亮）
├── LogList/             # 日志列表
│   └── LogCard/         # 日志卡片
└── ReplyInput/          # 回复输入区域
```

### 10.2 状态管理

**主要状态**：
```javascript
const [task, setTask] = useState(null)           // 任务数据
const [messages, setMessages] = useState([])      // 对话消息列表
const [logs, setLogs] = useState([])              // 日志列表
const [loading, setLoading] = useState(true)      // 加载状态
const [error, setError] = useState(null)          // 错误状态
const [autoRefresh, setAutoRefresh] = useState(true) // 自动刷新开关
```

### 10.3 数据获取函数

```javascript
async function fetchTaskDetail(projectId, queueId, taskId) {
  try {
    const response = await fetch(
      `/api/v1/projects/${projectId}/queues/${queueId}/tasks/${taskId}`
    )
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('任务不存在')
      }
      throw new Error('获取任务详情失败')
    }
    
    const result = await response.json()
    return result.data
  } catch (error) {
    throw error
  }
}
```

### 10.4 自动刷新 Hook

```javascript
function useAutoRefresh(projectId, queueId, taskId, enabled = true) {
  const [data, setData] = useState(null)
  
  useEffect(() => {
    if (!enabled) return
    
    const fetchData = async () => {
      try {
        const taskData = await fetchTaskDetail(projectId, queueId, taskId)
        setData(taskData)
      } catch (error) {
        console.error('自动刷新失败:', error)
      }
    }
    
    // 立即执行一次
    fetchData()
    
    // 设置定时器
    const interval = setInterval(fetchData, 5000) // 5秒刷新一次
    
    return () => clearInterval(interval)
  }, [projectId, queueId, taskId, enabled])
  
  return data
}
```

### 10.5 时间格式化函数

```javascript
function formatDateTime(dateString) {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}
```

---

## 11. 性能优化建议

### 11.1 数据加载优化

**分页加载**（可选）：
- 如果对话消息或日志数量很大，可以考虑分页加载
- 初始加载只加载最近的 N 条消息和日志
- 滚动到顶部时加载更多历史消息

**虚拟滚动**（可选）：
- 如果消息数量很大（> 100 条），使用虚拟滚动技术
- 只渲染可见区域的消息，提高渲染性能
- 使用 `react-window` 或 `react-virtualized` 库

### 11.2 渲染优化

**React.memo**：
- 对消息卡片和日志卡片使用 `React.memo` 优化
- 避免不必要的重新渲染

**useMemo 和 useCallback**：
- 使用 `useMemo` 缓存计算结果
- 使用 `useCallback` 缓存回调函数

**代码分割**：
- 使用动态导入（`import()`）延迟加载 Markdown 和代码高亮库
- 减少初始加载体积

### 11.3 缓存策略

**React Query**（推荐）：
- 使用 React Query 管理数据缓存
- 自动处理缓存失效和重新获取
- 支持后台刷新和乐观更新

**本地缓存**：
- 使用 localStorage 或 sessionStorage 缓存任务详情
- 页面刷新时从缓存加载，提高用户体验

### 11.4 网络优化

**请求去重**：
- 避免同时发起多个相同的请求
- 使用请求队列或防抖机制

**增量更新**：
- 只更新变化的部分，不重新渲染整个列表
- 使用 `useEffect` 监听数据变化，增量更新 UI

---

## 12. 错误处理和用户体验

### 12.1 错误状态显示

**404 错误**：
- 显示友好的错误提示："任务不存在"
- 提供返回按钮，返回任务队列详情页

**网络错误**：
- 显示友好的错误提示："网络连接失败，请检查网络"
- 提供重试按钮，重新加载数据

**服务器错误**：
- 显示友好的错误提示："服务器错误，请稍后重试"
- 提供重试按钮，重新加载数据

### 12.2 加载状态优化

**初始加载**：
- 显示全屏加载动画（Loading Spinner）
- 显示加载提示文字："正在加载任务详情..."

**自动刷新**：
- 不显示加载动画，静默刷新
- 可选：在页面顶部显示"正在刷新..."提示

### 12.3 空状态处理

**无消息**：
- 显示空状态提示："暂无对话消息"
- 提供友好的引导文字

**无日志**：
- 显示空状态提示："暂无执行日志"
- 提供友好的引导文字

### 12.4 无障碍性（A11y）

**键盘导航**：
- 支持 Tab 键切换焦点
- 支持 Enter 键发送回复
- 支持 Esc 键关闭弹窗（如果有）

**屏幕阅读器**：
- 添加适当的 ARIA 标签
- 使用语义化 HTML 标签
- 提供有意义的 alt 文本

**颜色对比度**：
- 确保文字和背景颜色对比度符合 WCAG 标准
- 使用颜色之外的方式区分用户和 AI 消息

---

## 13. 测试建议

### 13.1 功能测试

**页面加载测试**：
- 测试正常加载流程
- 测试 404 错误处理
- 测试网络错误处理

**对话展示测试**：
- 测试 Markdown 渲染（各种语法）
- 测试代码高亮（各种语言）
- 测试消息排序（正序）
- 测试长消息显示

**日志展示测试**：
- 测试日志排序（倒序）
- 测试长日志显示
- 测试日志换行显示

**回复功能测试**：
- 测试输入和发送
- 测试本地消息追加
- 测试输入框清空
- 测试自动滚动

**自动刷新测试**：
- 测试自动刷新机制
- 测试增量更新
- 测试页面隐藏时暂停刷新

### 13.2 性能测试

**渲染性能**：
- 测试大量消息（> 100 条）的渲染性能
- 测试虚拟滚动（如果使用）
- 测试代码高亮的性能影响

**网络性能**：
- 测试自动刷新的频率和性能影响
- 测试请求去重机制

### 13.3 响应式测试

**设备测试**：
- 测试手机端（< 768px）
- 测试平板端（768px - 1024px）
- 测试桌面端（> 1024px）

**主题测试**：
- 测试浅色模式
- 测试深色模式
- 测试主题切换

### 13.4 兼容性测试

**浏览器测试**：
- Chrome/Edge（Chromium）
- Firefox
- Safari

**Markdown 渲染测试**：
- 测试各种 Markdown 语法
- 测试代码高亮（各种语言）
- 测试表格渲染
- 测试链接和图片

---

## 14. 总结

本文档详细说明了 TaskEcho 系统任务详情页功能的完整设计方案，包括：

1. **页面布局设计**：整体布局结构、各个区域的详细设计
2. **API 接口说明**：任务详情接口的详细规范
3. **数据获取和更新机制**：初始加载、自动刷新、手动刷新、缓存策略
4. **对话历史展示**：Markdown 渲染、代码高亮、消息组件设计
5. **日志展示**：日志组件设计和样式要求
6. **回复输入功能**：本地回复功能设计和消息同步逻辑
7. **交互功能**：页面滚动、代码复制、消息展开/折叠等
8. **完整业务流程**：页面加载、数据更新、用户回复、错误处理流程
9. **前端实现要点**：组件结构、状态管理、数据获取函数等
10. **性能优化建议**：数据加载、渲染、缓存、网络优化
11. **错误处理和用户体验**：错误状态显示、加载状态优化、无障碍性
12. **测试建议**：功能测试、性能测试、响应式测试、兼容性测试

任务详情页是 TaskEcho 应用的核心交互页面，提供了完整的对话历史展示、日志展示和回复输入功能。通过 Markdown 渲染和代码高亮，用户可以清晰地查看对话内容；通过自动刷新机制，确保数据的实时性；通过本地回复功能，用户可以方便地与任务进行交互。

所有设计遵循需求文档的要求，采用完全只读的界面设计（除回复功能外），数据完全由外部系统通过 API 推送，为用户提供流畅的使用体验。
