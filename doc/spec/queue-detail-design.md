# TaskEcho 任务队列详情页功能设计文档

## 1. 概述

### 1.1 文档目的

本文档详细说明 TaskEcho 系统任务队列详情页功能的完整设计方案，包括任务列表展示、状态过滤、页面布局、数据获取机制、交互功能等详细说明。

### 1.2 功能定位

任务队列详情页是 TaskEcho 应用的三级页面，主要功能包括：

- **任务列表展示**：展示单个任务队列下的所有任务，按最后更新时间倒序排列
- **状态过滤**：支持按状态（Pending/Done/Error）进行过滤，支持单选或全选
- **导航功能**：提供返回项目详情页和跳转到任务详情页的功能
- **数据实时更新**：支持数据自动刷新和实时更新

### 1.3 核心特性

- **只读展示**：页面完全只读，不提供任何数据修改功能
- **状态过滤**：支持按状态进行过滤，过滤条件可实时切换
- **客户端过滤**：使用客户端过滤实现实时过滤，无需重新请求数据
- **响应式布局**：支持手机、平板、桌面等多种设备
- **深浅色主题**：自动适配系统主题，支持手动切换
- **实时更新**：支持数据自动刷新，确保数据实时性
- **性能优化**：使用缓存、防抖等机制优化性能

### 1.4 技术栈

- **前端框架**：React
- **UI 组件库**：shadcn/ui
- **样式方案**：Tailwind CSS
- **数据获取**：Fetch API / React Query（可选）
- **状态管理**：React Hooks（useState, useEffect）
- **路由**：Next.js App Router

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
│  首页 > 项目名称 > 队列名称                       │
├─────────────────────────────────────────────────┤
│  页面头部（Page Header）                          │
│  ┌─────────────────────────────────────────┐   │
│  │  队列名称（大标题）                        │   │
│  │  返回项目详情页按钮                         │   │
│  └─────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│  过滤区域（Filter Section）                      │
│  ┌─────────────────────────────────────────┐   │
│  │  状态过滤：                              │   │
│  │  [全部] [Pending] [Done] [Error]        │   │
│  │  (单选，默认选中"全部")                    │   │
│  │                                          │   │
│  │  [清除过滤] 按钮                          │   │
│  └─────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│  任务列表区域（Task List）                       │
│  ┌─────────────────────────────────────────┐   │
│  │  任务卡片 1                              │   │
│  │  ┌───────────────────────────────────┐ │   │
│  │  │ 任务名称                            │ │   │
│  │  │ 规范文件: spec_file.md            │ │   │
│  │  │ [Pending] 最后更新: 2024-01-01    │ │   │
│  │  └───────────────────────────────────┘ │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐   │
│  │  任务卡片 2                              │   │
│  │  ...                                    │   │
│  └─────────────────────────────────────────┘   │
│  [分页控件]                                     │
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
- **层级路径**：`首页 > 项目名称 > 队列名称`
- **可点击项**：`首页` 和 `项目名称` 可点击跳转
- **当前项**：`队列名称` 不可点击，显示为当前页面

**样式要求**：
- 字体大小：14px（移动端）或 16px（桌面端）
- 颜色：浅色模式为灰色，深色模式为浅灰色
- 分隔符：使用 `>` 或 `/` 符号
- 间距：与上下区域保持适当间距

**交互功能**：
- 点击 `首页`：跳转到首页 `/`
- 点击 `项目名称`：跳转到项目详情页 `/project/:projectId`
- 点击 `队列名称`：无操作（当前页面）

### 2.4 页面头部（Page Header）

**位置**：面包屑导航下方

**组件内容**：
- **左侧**：队列名称（大号加粗字体）
- **右侧**：返回项目详情页按钮

**样式要求**：
- 队列名称：24px（移动端）或 32px（桌面端），加粗
- 返回按钮：标准按钮样式，带图标
- 内边距：16px（移动端）或 24px（桌面端）
- 对齐方式：左右对齐，垂直居中

**交互功能**：
- 点击返回项目详情页按钮：跳转到项目详情页 `/project/:projectId`

### 2.5 过滤区域（Filter Section）

**位置**：页面头部下方，任务列表上方

**布局方式**：
- **桌面端**（> 1024px）：状态过滤横向排列
- **移动端**（< 768px）：状态过滤垂直排列

#### 2.5.1 状态过滤（Status Filter）

**组件内容**：
- **标题**：`状态过滤：`（可选）
- **状态按钮组**：
  - `全部`：显示所有状态的任务（默认选中）
  - `Pending`：仅显示 Pending 状态的任务
  - `Done`：仅显示 Done 状态的任务
  - `Error`：仅显示 Error 状态的任务

**样式要求**：
- 状态按钮：类似标签按钮样式
- 选中状态：背景色高亮，边框加粗
- 状态颜色：
  - Pending：黄色/橙色
  - Done：绿色
  - Error：红色

**交互功能**：
- **点击状态按钮**：切换状态过滤（单选）
- **选中效果**：选中的状态按钮高亮显示
- **过滤逻辑**：显示匹配选中状态的任务

#### 2.5.3 清除过滤按钮

**位置**：过滤区域右侧或底部

**功能**：
- 点击后清除所有过滤条件
- 重置状态过滤：选中"全部"状态

**样式要求**：
- 标准按钮样式
- 位置：过滤区域右侧（桌面端）或底部（移动端）

**交互功能**：
- 点击清除过滤按钮：重置所有过滤条件，显示所有任务

### 2.6 任务列表区域（Task List）

**位置**：过滤区域下方

**布局方式**：
- **桌面端**（> 1024px）：单列或双列布局（根据内容宽度）
- **平板端**（768px - 1024px）：单列布局
- **移动端**（< 768px）：单列布局，卡片全宽

**任务卡片内容**：

每个任务卡片显示以下信息：

1. **任务标题**：大号加粗字体，可点击
2. **规范文件列表**：
   - 显示任务的规范文件路径（spec_file 数组）
   - 如果有多個文件，以列表形式展示
3. **状态徽章**：
   - 显示任务状态（Pending/Done/Error）
   - 状态颜色：Pending（黄色）、Done（绿色）、Error（红色）
4. **最后更新时间**：`最后更新: 2024-01-01 12:00`

**卡片样式**：
- 背景色：浅色模式为白色，深色模式为深灰色
- 边框：轻微边框或阴影
- 圆角：12px
- 内边距：20px（移动端）或 24px（桌面端）
- 间距：卡片之间间距 16px
- 悬停效果：鼠标悬停时轻微阴影或背景色变化
- 点击效果：点击时跳转到任务详情页

**排序规则**：
- 按 `updatedAt`（最后更新时间）倒序排列
- 过滤后保持排序规则

**分页支持**：
- 默认每页显示 20 个任务
- 支持分页控件（上一页、下一页、页码跳转）
- 移动端可以使用"加载更多"按钮替代分页控件

**空状态**：
- **无任务**：显示 "该任务队列下暂无任务"
- **过滤无结果**：显示 "未找到匹配的任务"

**数据来源**：`GET /api/v1/projects/:projectId/queues/:queueId/tasks` 接口

### 2.7 响应式断点设计

| 设备类型 | 屏幕宽度 | 布局特点 |
|---------|---------|---------|
| 移动端 | < 768px | 单列布局，卡片全宽，过滤区域垂直排列 |
| 平板端 | 768px - 1024px | 单列布局，过滤区域横向排列 |
| 桌面端 | > 1024px | 单列或双列布局，过滤区域横向排列 |

---

## 3. API 接口说明

### 3.1 获取任务队列详情接口

**接口路径**：`GET /api/v1/projects/:projectId/queues/:queueId`

**认证要求**：无需认证（单用户本地应用）

**路径参数**：

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `projectId` | string | 是 | 项目外部唯一标识 | `"project_001"` |
| `queueId` | string | 是 | 任务队列外部唯一标识 | `"queue_001"` |

**响应格式**：

```json
{
  "success": true,
  "data": {
    "id": 1,
    "queue_id": "queue_001",
    "name": "任务队列1",
    "task_count": 5,
    "task_stats": {
      "total": 5,
      "pending": 2,
      "done": 2,
      "error": 1
    },
    "last_task_at": "2024-01-01T00:00:00.000Z",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "查询成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**响应字段说明**：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `data.id` | number | 队列内部ID（数据库主键） |
| `data.queue_id` | string | 队列外部唯一标识 |
| `data.name` | string | 队列显示名称 |
| `data.task_count` | number | 队列下的任务总数 |
| `data.task_stats` | object | 任务统计信息 |
| `data.task_stats.total` | number | 任务总数 |
| `data.task_stats.pending` | number | Pending 状态任务数 |
| `data.task_stats.done` | number | Done 状态任务数 |
| `data.task_stats.error` | number | Error 状态任务数 |
| `data.last_task_at` | string | 最后任务更新时间（ISO 8601 格式） |

**详细说明**：参考 `doc/spec/query-api.md` 第 3.2 节

### 3.2 获取任务列表接口

**接口路径**：`GET /api/v1/projects/:projectId/queues/:queueId/tasks`

**认证要求**：无需认证

**路径参数**：

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `projectId` | string | 是 | 项目外部唯一标识 | `"project_001"` |
| `queueId` | string | 是 | 任务队列外部唯一标识 | `"queue_001"` |

**查询参数**：

| 参数名 | 类型 | 必填 | 说明 | 默认值 | 示例 |
|--------|------|------|------|--------|------|
| `status` | string | 否 | 状态过滤（pending/done/error） | 无 | `"pending"` |
| `page` | number | 否 | 页码，从 1 开始 | `1` | `1` |
| `pageSize` | number | 否 | 每页数量 | `20` | `20` |


**响应格式**：

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "1",
        "name": "编写系统基础框架的实现方案",
        "prompt": "请编写系统基础框架的实现方案...",
        "spec_file": [
          ".flow/skills/spcewriter.md",
          "doc/requirement.md"
        ],
        "status": "pending",
        "report": null,
        "updated_at": "2024-01-01T00:00:00.000Z",
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 10,
      "totalPages": 1
    }
  },
  "message": "查询成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**响应字段说明**：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `data.items[].id` | string | 任务ID（在队列内唯一） |
| `data.items[].name` | string | 任务名称 |
| `data.items[].prompt` | string | 任务提示文本 |
| `data.items[].spec_file` | array[string] | 规范文件路径数组 |
| `data.items[].status` | string | 任务状态（pending/done/error，小写） |
| `data.items[].report` | string\|null | 报告文件路径（可选） |
| `data.items[].updated_at` | string | 更新时间（ISO 8601 格式） |
| `data.items[].created_at` | string | 创建时间（ISO 8601 格式） |

**注意**：列表查询不包含 `messages` 和 `logs` 字段，只返回基本字段，提高查询性能。
| `data.pagination` | object | 分页信息 |

**详细说明**：参考 `doc/spec/query-api.md` 第 4.1 节

**注意**：虽然接口支持 `status` 查询参数，但前端实现时建议使用**客户端过滤**方式，即：

1. 首次加载时获取所有任务数据（不带过滤参数）
2. 过滤时在客户端对已加载的数据进行过滤
3. 优点：响应更快，减少服务器请求，支持实时过滤

---

## 4. 数据获取和更新机制

### 4.1 初始数据加载流程

```
用户访问任务队列详情页 (/project/:projectId/queue/:queueId)
  ↓
1. 显示加载状态（Loading）
  ↓
2. 并行请求两个接口：
   ├─ GET /api/v1/projects/:projectId/queues/:queueId
   └─ GET /api/v1/projects/:projectId/queues/:queueId/tasks
  ↓
3. 等待两个接口响应
  ↓
4. 更新状态：
   ├─ 任务队列信息数据
   ├─ 任务列表数据
   └─ 加载状态（Loading → Success）
  ↓
5. 渲染页面内容
```

### 4.2 数据更新机制

#### 4.2.1 自动刷新机制

**轮询方式**（推荐）：

- **刷新频率**：每 30 秒自动刷新一次
- **刷新范围**：
  - 任务队列信息：每次刷新
  - 任务列表：每次刷新（不带过滤参数，获取全部数据）
- **刷新策略**：
  - 页面可见时：正常刷新
  - 页面隐藏时：暂停刷新（使用 `document.visibilitychange` 事件）
  - 用户正在过滤时：延迟刷新（避免打断用户操作）

**实现示例**：

```javascript
useEffect(() => {
  let intervalId
  
  const refreshData = async () => {
    // 检查页面是否可见
    if (document.hidden) {
      return
    }
    
    // 刷新数据（不包含过滤参数，获取全部数据）
    await Promise.all([
      fetchQueue(projectId, queueId),
      fetchTasks(projectId, queueId)  // 不带 status 和 tags 参数
    ])
    
    // 重新应用过滤（如果有过滤条件）
    if (selectedStatus !== 'all') {
      applyFilters()
    }
  }
  
  // 初始加载
  refreshData()
  
  // 设置定时刷新
  intervalId = setInterval(refreshData, 30000) // 30秒
  
  // 监听页面可见性变化
  const handleVisibilityChange = () => {
    if (!document.hidden) {
      refreshData()
    }
  }
  document.addEventListener('visibilitychange', handleVisibilityChange)
  
  // 清理
  return () => {
    clearInterval(intervalId)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}, [projectId, queueId])
```

#### 4.2.2 手动刷新机制

**刷新按钮**：

- **位置**：页面头部右侧，返回按钮旁边
- **功能**：点击后立即刷新所有数据
- **状态**：刷新时显示加载状态，禁用按钮

**下拉刷新**（移动端）：

- **触发方式**：在页面顶部下拉
- **视觉反馈**：显示刷新指示器
- **功能**：刷新所有数据

#### 4.2.3 数据缓存策略

**客户端缓存**：

- **缓存时间**：5 秒（避免频繁请求）
- **缓存键**：
  - 任务队列信息：`queue:${projectId}:${queueId}`
  - 任务列表：`tasks:${projectId}:${queueId}`
- **缓存失效**：
  - 时间过期
  - 手动刷新
  - 数据更新后（通过轮询检测）

**实现示例**：

```javascript
const cache = new Map()
const CACHE_TTL = 5000 // 5秒

const fetchWithCache = async (key, fetcher) => {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  
  const data = await fetcher()
  cache.set(key, {
    data,
    timestamp: Date.now()
  })
  
  return data
}
```

### 4.3 过滤功能实现

#### 4.3.1 客户端过滤策略

**实现方式**：

1. **首次加载**：获取所有任务数据（不带 `status` 和 `tags` 参数）
2. **过滤处理**：在客户端对已加载的数据进行过滤
3. **实时过滤**：选择标签或状态时实时过滤，无需等待网络请求

**优点**：
- 响应速度快，无需等待网络请求
- 减少服务器请求，降低服务器负载
- 支持实时过滤，用户体验好

**缺点**：
- 如果任务数量非常大，首次加载可能较慢
- 需要在前端维护完整的数据列表

**适用场景**：
- 单个任务队列下的任务数量通常不会太多（< 1000）
- 客户端过滤性能足够

#### 4.3.2 状态过滤实现

**过滤逻辑**：

- **单选逻辑**：显示匹配选中状态的任务
- **全部状态**：选中"全部"时，显示所有状态的任务

**实现示例**：

```javascript
const [selectedStatus, setSelectedStatus] = useState('all')

// 状态过滤函数
const filterByStatus = (tasks, selectedStatus) => {
  if (selectedStatus === 'all') {
    return tasks
  }
  
  return tasks.filter(task => 
    task.status.toLowerCase() === selectedStatus.toLowerCase()
  )
}

// 状态点击处理
const handleStatusClick = (status) => {
  setSelectedStatus(status)
}
```

#### 4.3.3 清除过滤实现

**清除逻辑**：

- **清除状态过滤**：设置 `selectedStatus` 为 `'all'`
- **清除后**：显示所有任务

**实现示例**：

```javascript
const handleClearFilters = () => {
  setSelectedStatus('all')
}
```

### 4.4 错误处理和重试机制

**错误处理**：

1. **网络错误**：
   - 显示错误提示："网络连接失败，请检查网络"
   - 提供重试按钮
   - 自动重试（最多 3 次，每次间隔递增）

2. **任务队列不存在**：
   - 显示错误提示："任务队列不存在"
   - 提供返回项目详情页按钮
   - 自动跳转到项目详情页（可选）

3. **数据为空**：
   - 显示空状态："该任务队列下暂无任务"
   - 提供刷新按钮

**重试机制**：

```javascript
const fetchWithRetry = async (fetcher, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetcher()
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error
      }
      // 指数退避：1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)))
    }
  }
}
```

---

## 5. 交互功能

### 5.1 任务卡片交互

**点击任务卡片**：

- **行为**：跳转到任务详情页
- **路由**：`/project/:projectId/queue/:queueId/task/:taskId`
- **参数传递**：通过路由参数传递 `projectId`、`queueId` 和 `taskId`

**悬停效果**（桌面端）：

- **行为**：鼠标悬停时显示阴影或背景色变化
- **视觉反馈**：轻微提升效果，提示可点击

### 5.2 状态过滤交互

**点击状态按钮**：

- **行为**：切换状态过滤（单选）
- **选中效果**：选中的状态按钮高亮显示
- **过滤效果**：实时过滤任务列表

**状态按钮样式**：

- **全部**：默认选中，灰色
- **Pending**：黄色/橙色
- **Done**：绿色
- **Error**：红色

### 5.3 清除过滤交互

**点击清除过滤按钮**：

- **行为**：清除所有过滤条件
- **效果**：
  - 重置状态过滤为"全部"
  - 显示所有任务

### 5.4 导航交互

**面包屑导航点击**：

- **点击 `首页`**：跳转到首页 `/`
- **点击 `项目名称`**：跳转到项目详情页 `/project/:projectId`
- **点击 `队列名称`**：无操作（当前页面）

**返回项目详情页按钮点击**：

- **行为**：跳转到项目详情页 `/project/:projectId`

**设置图标点击**：

- **行为**：跳转到 API Key 管理页面 `/settings`

**主题切换按钮点击**：

- **行为**：切换深浅色模式
- **存储**：保存到 `localStorage`（key: `theme`）
- **应用**：立即应用到整个应用
- **持久化**：刷新页面后保持主题设置

### 5.5 加载状态交互

**加载状态显示**：

- **初始加载**：显示骨架屏（Skeleton）或加载动画
- **刷新加载**：显示顶部加载指示器（不影响现有内容）
- **加载完成**：隐藏加载状态，显示内容

**骨架屏示例**：

```jsx
{loading ? (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="animate-pulse bg-gray-200 h-32 rounded-lg" />
    ))}
  </div>
) : (
  <TaskList tasks={filteredTasks} />
)}
```

---

## 6. 业务流程

### 6.1 页面加载流程

```
用户访问任务队列详情页 (/project/:projectId/queue/:queueId)
  ↓
1. 检查主题设置（localStorage）
   └─ 应用主题到页面
  ↓
2. 显示加载状态
  ↓
3. 并行请求数据：
   ├─ GET /api/v1/projects/:projectId/queues/:queueId
   └─ GET /api/v1/projects/:projectId/queues/:queueId/tasks
  ↓
4. 等待响应
  ↓
5. 处理响应：
   ├─ 成功：更新状态，渲染内容
   └─ 失败：显示错误提示，提供重试
  ↓
6. 隐藏加载状态
  ↓
7. 启动自动刷新（30秒间隔）
```

### 6.2 数据更新流程

```
定时器触发（30秒）
  ↓
1. 检查页面可见性
   ├─ 隐藏：跳过本次刷新
   └─ 可见：继续刷新
  ↓
2. 检查缓存
   ├─ 有效：使用缓存数据
   └─ 无效：请求新数据
  ↓
3. 请求数据：
   ├─ GET /api/v1/projects/:projectId/queues/:queueId
   └─ GET /api/v1/projects/:projectId/queues/:queueId/tasks
  ↓
4. 更新数据：
   ├─ 对比新旧数据
   ├─ 有变化：更新状态，重新渲染
   └─ 无变化：不更新（避免不必要的渲染）
  ↓
5. 更新缓存时间戳
  ↓
6. 重新应用过滤（如果有过滤条件）
```

### 6.3 用户交互流程

#### 6.3.1 点击任务卡片

```
用户点击任务卡片
  ↓
1. 获取任务 projectId、queueId 和 taskId
  ↓
2. 路由跳转：/project/:projectId/queue/:queueId/task/:taskId
  ↓
3. 页面切换（使用 Next.js Router）
```

#### 6.3.2 状态过滤

```
用户点击状态按钮
  ↓
1. 更新 selectedStatus 状态
  ↓
2. 触发过滤函数（useEffect）
  ↓
3. 应用状态过滤
  ↓
4. 更新 filteredTasks 状态
  ↓
5. 重新渲染任务列表
```

#### 6.3.3 清除过滤

```
用户点击清除过滤按钮
  ↓
1. 重置 selectedStatus 为 'all'
  ↓
2. 触发过滤函数（useEffect）
  ↓
3. 显示所有任务
  ↓
4. 重新渲染任务列表
```

#### 6.3.5 手动刷新

```
用户点击刷新按钮
  ↓
1. 显示加载状态
  ↓
2. 清除缓存
  ↓
3. 请求新数据：
   ├─ GET /api/v1/projects/:projectId/queues/:queueId
   └─ GET /api/v1/projects/:projectId/queues/:queueId/tasks
  ↓
4. 更新数据
  ↓
5. 重新应用过滤（如果有过滤条件）
  ↓
6. 隐藏加载状态
```

---

## 7. 前端实现要点

### 7.1 组件结构

```
QueueDetailPage/
├── Header.tsx              # 顶部导航栏（共用组件）
│   ├── Logo.tsx            # Logo/标题
│   ├── SettingsButton.tsx  # 设置按钮
│   └── ThemeToggle.tsx     # 主题切换按钮
├── Breadcrumb.tsx          # 面包屑导航
├── PageHeader.tsx          # 页面头部
│   ├── QueueTitle.tsx      # 队列名称
│   └── BackButton.tsx      # 返回项目详情页按钮
├── FilterSection.tsx       # 过滤区域
│   ├── StatusFilter.tsx    # 状态过滤
│   │   └── StatusButton.tsx # 状态按钮
│   └── ClearFilterButton.tsx # 清除过滤按钮
├── TaskList.tsx            # 任务列表
│   ├── TaskCard.tsx        # 任务卡片
│   ├── Pagination.tsx      # 分页控件
│   └── EmptyState.tsx      # 空状态
└── LoadingState.tsx        # 加载状态
```

### 7.2 状态管理

**使用 React Hooks**：

```javascript
const QueueDetailPage = ({ projectId, queueId }) => {
  // 任务队列信息状态
  const [queue, setQueue] = useState(null)
  
  // 任务列表状态
  const [tasks, setTasks] = useState([])
  
  // 过滤状态
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [filteredTasks, setFilteredTasks] = useState([])
  
  // 加载状态
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // 主题状态
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light'
  })
  
  // ... 其他逻辑
}
```

### 7.3 数据获取函数

```javascript
// 获取任务队列信息
const fetchQueue = async (projectId, queueId) => {
  try {
    const response = await fetch(`/api/v1/projects/${projectId}/queues/${queueId}`)
    if (!response.ok) {
      throw new Error('获取任务队列信息失败')
    }
    const data = await response.json()
    if (data.success) {
      setQueue(data.data)
    }
  } catch (err) {
    setError(err.message)
  }
}

// 获取任务列表
const fetchTasks = async (projectId, queueId) => {
  try {
    const response = await fetch(`/api/v1/projects/${projectId}/queues/${queueId}/tasks`)
    if (!response.ok) {
      throw new Error('获取任务列表失败')
    }
    const data = await response.json()
    if (data.success) {
      setTasks(data.data.items)
    }
  } catch (err) {
    setError(err.message)
  }
}
```

### 7.4 过滤函数

```javascript
// 状态过滤函数
const filterByStatus = (tasks, selectedStatus) => {
  if (selectedStatus === 'all') {
    return tasks
  }
  
  return tasks.filter(task => 
    task.status.toLowerCase() === selectedStatus.toLowerCase()
  )
}

// 使用 useMemo 优化性能
const filteredTasks = useMemo(() => {
  return filterByStatus(tasks, selectedStatus)
}, [tasks, selectedStatus])
```

### 7.5 格式化时间显示

```javascript
const formatDateTime = (dateString) => {
  if (!dateString) return '暂无更新'
  
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

---

## 8. 性能优化建议

### 8.1 数据加载优化

1. **并行请求**：任务队列信息和任务列表并行请求，减少等待时间
2. **客户端过滤**：使用客户端过滤避免频繁请求服务器
3. **防抖优化**：如果使用服务端过滤，使用防抖避免频繁请求
4. **虚拟滚动**：如果任务数量很大，考虑使用虚拟滚动（如 `react-window`）

### 8.2 渲染优化

1. **React.memo**：对任务卡片组件使用 `React.memo` 避免不必要的重渲染
2. **useMemo**：对过滤后的任务列表使用 `useMemo` 缓存结果
3. **useCallback**：对事件处理函数使用 `useCallback` 避免重复创建

```javascript
const TaskCard = React.memo(({ task, onClick }) => {
  // ...
})

const filteredTasksMemo = useMemo(() => {
  return filterByStatus(tasks, selectedStatus)
}, [tasks, selectedStatus])

const handleTaskClick = useCallback((taskId) => {
  router.push(`/project/${projectId}/queue/${queueId}/task/${taskId}`)
}, [projectId, queueId, router])
```

### 8.3 缓存策略

1. **客户端缓存**：使用内存缓存减少重复请求
2. **HTTP 缓存**：设置适当的 HTTP 缓存头（如 `Cache-Control`）
3. **过滤结果缓存**：缓存过滤结果（可选）

### 8.4 网络优化

1. **请求去重**：避免同时发起多个相同请求
2. **请求取消**：组件卸载时取消未完成的请求
3. **压缩响应**：确保服务器启用 Gzip/Brotli 压缩

```javascript
useEffect(() => {
  const controller = new AbortController()
  
  const fetchData = async () => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/queues/${queueId}/tasks`, {
        signal: controller.signal
      })
      // ...
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('请求已取消')
      }
    }
  }
  
  fetchData()
  
  return () => {
    controller.abort()
  }
}, [projectId, queueId])
```

---

## 9. 错误处理和用户体验

### 9.1 错误状态显示

**网络错误**：

```jsx
{error && (
  <div className="error-banner">
    <p>{error}</p>
    <button onClick={handleRetry}>重试</button>
  </div>
)}
```

**任务队列不存在**：

```jsx
{queue === null && !loading && (
  <div className="error-state">
    <p>任务队列不存在</p>
    <button onClick={() => router.push(`/project/${projectId}`)}>
      返回项目详情页
    </button>
  </div>
)}
```

**空状态**：

```jsx
{!loading && filteredTasks.length === 0 && (
  <div className="empty-state">
    {selectedStatus !== 'all' ? (
      <>
        <p>未找到匹配的任务</p>
        <button onClick={handleClearFilters}>清除过滤</button>
      </>
    ) : (
      <>
        <p>该任务队列下暂无任务</p>
        <button onClick={handleRefresh}>刷新</button>
      </>
    )}
  </div>
)}
```

### 9.2 加载状态优化

1. **骨架屏**：使用骨架屏替代简单的加载动画，提供更好的视觉反馈
2. **渐进式加载**：先显示已加载的数据，再加载新数据
3. **加载提示**：显示加载进度或预计时间（可选）

### 9.3 过滤体验优化

1. **实时反馈**：选择标签或状态时立即显示过滤结果
2. **过滤计数**：显示过滤后的任务数量（如 "显示 5 个任务"）
3. **过滤高亮**：选中的标签和状态按钮高亮显示
4. **清除提示**：有过滤条件时，显示清除过滤按钮

### 9.4 无障碍性（A11y）

1. **键盘导航**：支持 Tab 键切换焦点，Enter 键触发操作
2. **ARIA 标签**：为交互元素添加适当的 ARIA 标签
3. **颜色对比度**：确保文字和背景颜色对比度符合 WCAG 标准
4. **屏幕阅读器**：确保屏幕阅读器能够正确读取内容

```jsx
<button
  onClick={() => handleStatusClick(status)}
  aria-label={`过滤状态 ${status}`}
  aria-pressed={selectedStatus === status}
  className={selectedStatus === status ? 'selected' : ''}
>
  {status}
</button>
```

---

## 10. 测试建议

### 10.1 功能测试

1. **数据加载**：测试初始加载、刷新、自动刷新
2. **过滤功能**：测试状态过滤、清除过滤
3. **交互功能**：测试任务卡片点击、导航跳转、主题切换
4. **错误处理**：测试网络错误、任务队列不存在、空数据状态

### 10.2 性能测试

1. **加载时间**：测试页面首次加载时间
2. **过滤性能**：测试大量任务时的过滤性能
3. **渲染性能**：测试大量任务时的渲染性能
4. **内存使用**：测试长时间运行的内存使用情况

### 10.3 响应式测试

1. **设备测试**：在不同设备上测试布局和交互
2. **浏览器测试**：在不同浏览器上测试兼容性
3. **主题测试**：测试深浅色主题的显示效果

### 10.4 过滤功能测试

1. **状态过滤**：测试各状态过滤、全部状态
2. **边界情况**：测试无状态任务、空任务列表等

---

## 11. 总结

本文档详细说明了 TaskEcho 系统任务队列详情页功能的完整设计方案，包括：

1. **页面布局设计**：顶部导航栏、面包屑导航、页面头部、过滤区域、任务列表区域的详细布局说明
2. **API 接口说明**：任务队列详情和任务列表接口的详细规范
3. **数据获取和更新机制**：初始加载、自动刷新、手动刷新、缓存策略、过滤功能实现
4. **交互功能**：任务卡片交互、状态过滤交互、清除过滤交互、导航交互、加载状态交互
5. **业务流程**：页面加载流程、数据更新流程、用户交互流程
6. **前端实现要点**：组件结构、状态管理、数据获取函数、过滤函数、时间格式化
7. **性能优化建议**：数据加载优化、渲染优化、缓存策略、网络优化
8. **错误处理和用户体验**：错误状态显示、加载状态优化、过滤体验优化、无障碍性
9. **测试建议**：功能测试、性能测试、响应式测试、过滤功能测试

任务队列详情页作为应用的三级页面，需要提供清晰的任务展示、灵活的过滤功能和流畅的交互体验，确保用户能够快速找到所需的任务并导航到任务详情页。

---

## 12. 相关文档

- [需求文档](../requirement.md)
- [页面结构文档](../page-structure.md)
- [数据库设计文档](database-design.md)
- [查询接口设计文档](query-api.md)
- [系统框架文档](system-framework.md)
- [首页功能设计文档](homepage-design.md)
- [项目详情页功能设计文档](project-detail-design.md)
