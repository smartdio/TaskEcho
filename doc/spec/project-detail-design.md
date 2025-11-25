# TaskEcho 项目详情页功能设计文档

## 1. 概述

### 1.1 文档目的

本文档详细说明 TaskEcho 系统项目详情页功能的完整设计方案，包括任务队列列表展示、搜索功能、页面布局、数据获取机制、交互功能等详细说明。

### 1.2 功能定位

项目详情页是 TaskEcho 应用的二级页面，主要功能包括：

- **任务队列列表展示**：展示单个项目下的所有任务队列，按最后任务更新时间倒序排列
- **搜索功能**：支持按任务队列名称进行实时搜索过滤
- **统计信息展示**：显示每个任务队列的任务数量统计（总数/Pending/Done/Error）
- **导航功能**：提供返回首页和跳转到任务队列详情页的功能
- **数据实时更新**：支持数据自动刷新和实时更新

### 1.3 核心特性

- **只读展示**：页面完全只读，不提供任何数据修改功能
- **实时搜索**：支持客户端实时搜索过滤，无需重新请求数据
- **响应式布局**：支持手机、平板、桌面等多种设备
- **深浅色主题**：自动适配系统主题，支持手动切换
- **实时更新**：支持数据自动刷新，确保数据实时性
- **性能优化**：使用缓存等机制优化性能

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
│  首页 > 项目名称                                 │
├─────────────────────────────────────────────────┤
│  页面头部（Page Header）                          │
│  ┌─────────────────────────────────────────┐   │
│  │  项目名称（大标题）                        │   │
│  │  返回首页按钮                              │   │
│  └─────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│  搜索区域（Search Section）                      │
│  ┌─────────────────────────────────────────┐   │
│  │  [搜索输入框]  🔍                         │   │
│  │  输入队列名称进行搜索...                   │   │
│  └─────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│  任务队列列表区域（Queue List）                  │
│  ┌─────────────────────────────────────────┐   │
│  │  任务队列卡片 1                           │   │
│  │  ┌───────────────────────────────────┐ │   │
│  │  │ 队列名称                            │ │   │
│  │  │ 任务数: 5                           │ │   │
│  │  │ Pending: 2 | Done: 2 | Error: 1   │ │   │
│  │  │ 最后更新: 2024-01-01 12:00          │ │   │
│  │  └───────────────────────────────────┘ │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐   │
│  │  任务队列卡片 2                           │   │
│  │  ...                                    │   │
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
- **层级路径**：`首页 > 项目名称`
- **可点击项**：`首页` 可点击跳转到首页
- **当前项**：`项目名称` 不可点击，显示为当前页面

**样式要求**：
- 字体大小：14px（移动端）或 16px（桌面端）
- 颜色：浅色模式为灰色，深色模式为浅灰色
- 分隔符：使用 `>` 或 `/` 符号
- 间距：与上下区域保持适当间距

**交互功能**：
- 点击 `首页`：跳转到首页 `/`
- 点击 `项目名称`：无操作（当前页面）

### 2.4 页面头部（Page Header）

**位置**：面包屑导航下方

**组件内容**：
- **左侧**：项目名称（大号加粗字体）
- **右侧**：返回首页按钮

**样式要求**：
- 项目名称：24px（移动端）或 32px（桌面端），加粗
- 返回按钮：标准按钮样式，带图标
- 内边距：16px（移动端）或 24px（桌面端）
- 对齐方式：左右对齐，垂直居中

**交互功能**：
- 点击返回首页按钮：跳转到首页 `/`

### 2.5 搜索区域（Search Section）

**位置**：页面头部下方，任务队列列表上方

**组件内容**：
- **搜索输入框**：
  - 占位符文本：`输入队列名称进行搜索...`
  - 搜索图标：左侧或右侧显示搜索图标
  - 清除按钮：有输入内容时显示清除按钮（可选）

**样式要求**：
- 宽度：100%（移动端）或最大宽度限制（桌面端）
- 高度：40px（移动端）或 48px（桌面端）
- 边框：轻微边框或阴影
- 圆角：8px
- 内边距：左右 12px，上下 8px
- 字体大小：14px（移动端）或 16px（桌面端）

**交互功能**：
- **实时搜索**：输入时实时过滤任务队列列表（客户端过滤）
- **清除搜索**：点击清除按钮清空搜索内容
- **键盘支持**：
  - `Enter` 键：无特殊操作（实时搜索）
  - `Esc` 键：清空搜索内容（可选）

**搜索逻辑**：
- **客户端过滤**：在已加载的任务队列数据中进行过滤
- **匹配规则**：队列名称包含搜索关键词（不区分大小写）
- **性能优化**：使用防抖（debounce）优化搜索性能

### 2.6 任务队列列表区域（Queue List）

**位置**：搜索区域下方

**布局方式**：
- **桌面端**（> 1024px）：单列或双列布局（根据内容宽度）
- **平板端**（768px - 1024px）：单列布局
- **移动端**（< 768px）：单列布局，卡片全宽

**任务队列卡片内容**：

每个任务队列卡片显示以下信息：

1. **队列名称**：大号加粗字体，可点击
2. **统计信息**：
   - 任务总数：`任务数: 5`
   - 任务状态分布：`Pending: 2 | Done: 2 | Error: 1`
3. **最后更新时间**：`最后更新: 2024-01-01 12:00`
4. **视觉指示**：
   - 状态徽章（可选）：显示主要状态
   - 进度条（可选）：显示任务完成进度

**卡片样式**：
- 背景色：浅色模式为白色，深色模式为深灰色
- 边框：轻微边框或阴影
- 圆角：12px
- 内边距：20px（移动端）或 24px（桌面端）
- 间距：卡片之间间距 16px
- 悬停效果：鼠标悬停时轻微阴影或背景色变化
- 点击效果：点击时跳转到任务队列详情页

**排序规则**：
- 按 `lastTaskAt`（最后任务更新时间）倒序排列
- 如果 `lastTaskAt` 为 NULL，按 `createdAt`（创建时间）倒序排列
- 搜索过滤后保持排序规则

**空状态**：
- **无队列**：显示 "该项目下暂无任务队列"
- **搜索无结果**：显示 "未找到匹配的任务队列"

**数据来源**：`GET /api/v1/projects/:projectId/queues` 接口

### 2.7 响应式断点设计

| 设备类型 | 屏幕宽度 | 布局特点 |
|---------|---------|---------|
| 移动端 | < 768px | 单列布局，卡片全宽，搜索框全宽 |
| 平板端 | 768px - 1024px | 单列布局，搜索框居中 |
| 桌面端 | > 1024px | 单列或双列布局，搜索框最大宽度限制 |

---

## 3. API 接口说明

### 3.1 获取项目详情接口

**接口路径**：`GET /api/v1/projects/:projectId`

**认证要求**：无需认证（单用户本地应用）

**路径参数**：

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `projectId` | string | 是 | 项目外部唯一标识 | `"project_001"` |

**响应格式**：

```json
{
  "success": true,
  "data": {
    "id": 1,
    "project_id": "project_001",
    "name": "示例项目",
    "queue_count": 3,
    "task_count": 15,
    "task_stats": {
      "total": 15,
      "pending": 5,
      "done": 8,
      "error": 2
    },
    "last_task_at": "2024-01-01T00:00:00.000Z",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "查询成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
```

**响应字段说明**：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `data.id` | number | 项目内部ID（数据库主键） |
| `data.project_id` | string | 项目外部唯一标识 |
| `data.name` | string | 项目显示名称 |
| `data.queue_count` | number | 项目下的任务队列数量 |
| `data.task_count` | number | 项目下的任务总数 |
| `data.task_stats` | object | 任务统计信息 |
| `data.task_stats.total` | number | 任务总数 |
| `data.task_stats.pending` | number | Pending 状态任务数 |
| `data.task_stats.done` | number | Done 状态任务数 |
| `data.task_stats.error` | number | Error 状态任务数 |
| `data.last_task_at` | string | 最后任务更新时间（ISO 8601 格式） |

**详细说明**：参考 `doc/spec/query-api.md` 第 2.2 节

### 3.2 获取任务队列列表接口

**接口路径**：`GET /api/v1/projects/:projectId/queues`

**认证要求**：无需认证

**路径参数**：

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `projectId` | string | 是 | 项目外部唯一标识 | `"project_001"` |

**查询参数**：

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `search` | string | 否 | 队列名称搜索关键词（模糊匹配） | `"队列"` |

**响应格式**：

```json
{
  "success": true,
  "data": {
    "items": [
      {
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
      }
    ]
  },
  "message": "查询成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
```

**响应字段说明**：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `data.items[].id` | number | 队列内部ID（数据库主键） |
| `data.items[].queue_id` | string | 队列外部唯一标识 |
| `data.items[].name` | string | 队列显示名称 |
| `data.items[].task_count` | number | 队列下的任务总数 |
| `data.items[].task_stats` | object | 任务统计信息 |
| `data.items[].task_stats.total` | number | 任务总数 |
| `data.items[].task_stats.pending` | number | Pending 状态任务数 |
| `data.items[].task_stats.done` | number | Done 状态任务数 |
| `data.items[].task_stats.error` | number | Error 状态任务数 |
| `data.items[].last_task_at` | string | 最后任务更新时间（ISO 8601 格式） |

**详细说明**：参考 `doc/spec/query-api.md` 第 3.1 节

**注意**：虽然接口支持 `search` 查询参数，但前端实现时建议使用**客户端过滤**方式，即：
1. 首次加载时获取所有任务队列数据（不带 `search` 参数）
2. 搜索时在客户端对已加载的数据进行过滤
3. 优点：响应更快，减少服务器请求，支持实时搜索

---

## 4. 数据获取和更新机制

### 4.1 初始数据加载流程

```
用户访问项目详情页 (/project/:projectId)
  ↓
1. 显示加载状态（Loading）
  ↓
2. 并行请求两个接口：
   ├─ GET /api/v1/projects/:projectId
   └─ GET /api/v1/projects/:projectId/queues
  ↓
3. 等待两个接口响应
  ↓
4. 更新状态：
   ├─ 项目信息数据
   ├─ 任务队列列表数据
   └─ 加载状态（Loading → Success）
  ↓
5. 渲染页面内容
```

### 4.2 数据更新机制

#### 4.2.1 自动刷新机制

**轮询方式**（推荐）：

- **刷新频率**：每 30 秒自动刷新一次
- **刷新范围**：
  - 项目信息：每次刷新
  - 任务队列列表：每次刷新
- **刷新策略**：
  - 页面可见时：正常刷新
  - 页面隐藏时：暂停刷新（使用 `document.visibilitychange` 事件）
  - 用户正在搜索时：延迟刷新（避免打断用户操作）

**实现示例**：

```javascript
useEffect(() => {
  let intervalId
  
  const refreshData = async () => {
    // 检查页面是否可见
    if (document.hidden) {
      return
    }
    
    // 刷新数据（不包含搜索参数，获取全部数据）
    await Promise.all([
      fetchProject(projectId),
      fetchQueues(projectId)  // 不带 search 参数
    ])
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
}, [projectId])
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
  - 项目信息：`project:${projectId}`
  - 任务队列列表：`queues:${projectId}`
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

### 4.3 搜索功能实现

#### 4.3.1 客户端搜索策略

**实现方式**：

1. **首次加载**：获取所有任务队列数据（不带 `search` 参数）
2. **搜索过滤**：在客户端对已加载的数据进行过滤
3. **实时搜索**：输入时实时过滤，使用防抖优化性能

**优点**：
- 响应速度快，无需等待网络请求
- 减少服务器请求，降低服务器负载
- 支持实时搜索，用户体验好

**缺点**：
- 如果任务队列数量非常大，首次加载可能较慢
- 需要在前端维护完整的数据列表

**适用场景**：
- 单个项目下的任务队列数量通常不会太多（< 1000）
- 客户端搜索性能足够

#### 4.3.2 搜索实现示例

```javascript
const [searchKeyword, setSearchKeyword] = useState('')
const [filteredQueues, setFilteredQueues] = useState([])

// 防抖函数
const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// 搜索过滤函数
const filterQueues = (queues, keyword) => {
  if (!keyword.trim()) {
    return queues
  }
  
  const lowerKeyword = keyword.toLowerCase()
  return queues.filter(queue => 
    queue.name.toLowerCase().includes(lowerKeyword)
  )
}

// 防抖搜索处理
const handleSearchChange = debounce((keyword) => {
  const filtered = filterQueues(queues, keyword)
  setFilteredQueues(filtered)
}, 300)  // 300ms 防抖

// 搜索输入处理
const onSearchInputChange = (e) => {
  const keyword = e.target.value
  setSearchKeyword(keyword)
  handleSearchChange(keyword)
}

// 当队列数据更新时，重新过滤
useEffect(() => {
  const filtered = filterQueues(queues, searchKeyword)
  setFilteredQueues(filtered)
}, [queues, searchKeyword])
```

#### 4.3.3 服务端搜索策略（可选）

如果任务队列数量非常大（> 1000），可以考虑使用服务端搜索：

**实现方式**：

1. **首次加载**：获取第一页数据（带分页）
2. **搜索请求**：输入搜索关键词后，发送带 `search` 参数的请求
3. **服务端过滤**：服务器根据 `search` 参数过滤数据

**优点**：
- 支持大量数据
- 减少客户端内存占用

**缺点**：
- 需要等待网络请求，响应较慢
- 增加服务器负载

**实现示例**：

```javascript
const [searchKeyword, setSearchKeyword] = useState('')

// 防抖搜索请求
const handleSearchChange = debounce(async (keyword) => {
  setLoading(true)
  try {
    const url = keyword 
      ? `/api/v1/projects/${projectId}/queues?search=${encodeURIComponent(keyword)}`
      : `/api/v1/projects/${projectId}/queues`
    
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.success) {
      setQueues(data.data.items)
    }
  } catch (error) {
    console.error('搜索失败:', error)
  } finally {
    setLoading(false)
  }
}, 500)  // 500ms 防抖
```

### 4.4 错误处理和重试机制

**错误处理**：

1. **网络错误**：
   - 显示错误提示："网络连接失败，请检查网络"
   - 提供重试按钮
   - 自动重试（最多 3 次，每次间隔递增）

2. **项目不存在**：
   - 显示错误提示："项目不存在"
   - 提供返回首页按钮
   - 自动跳转到首页（可选）

3. **数据为空**：
   - 显示空状态："该项目下暂无任务队列"
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

### 5.1 任务队列卡片交互

**点击任务队列卡片**：

- **行为**：跳转到任务队列详情页
- **路由**：`/project/:projectId/queue/:queueId`
- **参数传递**：通过路由参数传递 `projectId` 和 `queueId`

**悬停效果**（桌面端）：

- **行为**：鼠标悬停时显示阴影或背景色变化
- **视觉反馈**：轻微提升效果，提示可点击

### 5.2 搜索交互

**搜索输入**：

- **实时过滤**：输入时实时过滤任务队列列表
- **清除搜索**：点击清除按钮或 `Esc` 键清空搜索
- **搜索高亮**：搜索结果中高亮显示匹配的关键词（可选）

**搜索状态**：

- **有搜索结果**：显示过滤后的队列列表
- **无搜索结果**：显示 "未找到匹配的任务队列" 提示
- **搜索中**：显示加载状态（仅服务端搜索时）

### 5.3 导航交互

**面包屑导航点击**：

- **点击 `首页`**：跳转到首页 `/`
- **点击 `项目名称`**：无操作（当前页面）

**返回首页按钮点击**：

- **行为**：跳转到首页 `/`

**设置图标点击**：

- **行为**：跳转到 API Key 管理页面 `/settings`

**主题切换按钮点击**：

- **行为**：切换深浅色模式
- **存储**：保存到 `localStorage`（key: `theme`）
- **应用**：立即应用到整个应用
- **持久化**：刷新页面后保持主题设置

### 5.4 加载状态交互

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
  <QueueList queues={filteredQueues} />
)}
```

---

## 6. 业务流程

### 6.1 页面加载流程

```
用户访问项目详情页 (/project/:projectId)
  ↓
1. 检查主题设置（localStorage）
   └─ 应用主题到页面
  ↓
2. 显示加载状态
  ↓
3. 并行请求数据：
   ├─ GET /api/v1/projects/:projectId
   └─ GET /api/v1/projects/:projectId/queues
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
   ├─ GET /api/v1/projects/:projectId
   └─ GET /api/v1/projects/:projectId/queues
  ↓
4. 更新数据：
   ├─ 对比新旧数据
   ├─ 有变化：更新状态，重新渲染
   └─ 无变化：不更新（避免不必要的渲染）
  ↓
5. 更新缓存时间戳
  ↓
6. 重新应用搜索过滤（如果有搜索关键词）
```

### 6.3 用户交互流程

#### 6.3.1 点击任务队列卡片

```
用户点击任务队列卡片
  ↓
1. 获取队列 projectId 和 queueId
  ↓
2. 路由跳转：/project/:projectId/queue/:queueId
  ↓
3. 页面切换（使用 Next.js Router）
```

#### 6.3.2 搜索任务队列

```
用户在搜索框输入关键词
  ↓
1. 更新搜索关键词状态
  ↓
2. 防抖处理（300ms）
  ↓
3. 在客户端过滤任务队列列表
   └─ 队列名称包含关键词（不区分大小写）
  ↓
4. 更新过滤后的队列列表
  ↓
5. 重新渲染列表
  ↓
6. 显示搜索结果数量（可选）
```

#### 6.3.3 手动刷新

```
用户点击刷新按钮
  ↓
1. 显示加载状态
  ↓
2. 清除缓存
  ↓
3. 请求新数据：
   ├─ GET /api/v1/projects/:projectId
   └─ GET /api/v1/projects/:projectId/queues
  ↓
4. 更新数据
  ↓
5. 重新应用搜索过滤（如果有搜索关键词）
  ↓
6. 隐藏加载状态
```

---

## 7. 前端实现要点

### 7.1 组件结构

```
ProjectDetailPage/
├── Header.tsx              # 顶部导航栏（共用组件）
│   ├── Logo.tsx            # Logo/标题
│   ├── SettingsButton.tsx  # 设置按钮
│   └── ThemeToggle.tsx     # 主题切换按钮
├── Breadcrumb.tsx          # 面包屑导航
├── PageHeader.tsx          # 页面头部
│   ├── ProjectTitle.tsx    # 项目名称
│   └── BackButton.tsx      # 返回首页按钮
├── SearchSection.tsx       # 搜索区域
│   └── SearchInput.tsx     # 搜索输入框
├── QueueList.tsx           # 任务队列列表
│   ├── QueueCard.tsx       # 任务队列卡片
│   └── EmptyState.tsx      # 空状态
└── LoadingState.tsx        # 加载状态
```

### 7.2 状态管理

**使用 React Hooks**：

```javascript
const ProjectDetailPage = ({ projectId }) => {
  // 项目信息状态
  const [project, setProject] = useState(null)
  
  // 任务队列列表状态
  const [queues, setQueues] = useState([])
  
  // 搜索状态
  const [searchKeyword, setSearchKeyword] = useState('')
  const [filteredQueues, setFilteredQueues] = useState([])
  
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
// 获取项目信息
const fetchProject = async (projectId) => {
  try {
    const response = await fetch(`/api/v1/projects/${projectId}`)
    if (!response.ok) {
      throw new Error('获取项目信息失败')
    }
    const data = await response.json()
    if (data.success) {
      setProject(data.data)
    }
  } catch (err) {
    setError(err.message)
  }
}

// 获取任务队列列表
const fetchQueues = async (projectId) => {
  try {
    const response = await fetch(`/api/v1/projects/${projectId}/queues`)
    if (!response.ok) {
      throw new Error('获取任务队列列表失败')
    }
    const data = await response.json()
    if (data.success) {
      setQueues(data.data.items)
      // 如果有搜索关键词，重新过滤
      if (searchKeyword) {
        const filtered = filterQueues(data.data.items, searchKeyword)
        setFilteredQueues(filtered)
      } else {
        setFilteredQueues(data.data.items)
      }
    }
  } catch (err) {
    setError(err.message)
  }
}
```

### 7.4 搜索过滤函数

```javascript
// 搜索过滤函数
const filterQueues = (queues, keyword) => {
  if (!keyword.trim()) {
    return queues
  }
  
  const lowerKeyword = keyword.toLowerCase()
  return queues.filter(queue => 
    queue.name.toLowerCase().includes(lowerKeyword)
  )
}

// 防抖函数
const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// 搜索处理
const handleSearchChange = debounce((keyword) => {
  const filtered = filterQueues(queues, keyword)
  setFilteredQueues(filtered)
}, 300)
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

1. **并行请求**：项目信息和任务队列列表并行请求，减少等待时间
2. **客户端搜索**：使用客户端搜索避免频繁请求服务器
3. **防抖优化**：搜索输入使用防抖，避免频繁过滤操作
4. **虚拟滚动**：如果任务队列数量很大，考虑使用虚拟滚动（如 `react-window`）

### 8.2 渲染优化

1. **React.memo**：对任务队列卡片组件使用 `React.memo` 避免不必要的重渲染
2. **useMemo**：对过滤后的队列列表使用 `useMemo` 缓存结果
3. **useCallback**：对事件处理函数使用 `useCallback` 避免重复创建

```javascript
const QueueCard = React.memo(({ queue, onClick }) => {
  // ...
})

const filteredQueuesMemo = useMemo(() => {
  return filterQueues(queues, searchKeyword)
}, [queues, searchKeyword])

const handleQueueClick = useCallback((queueId) => {
  router.push(`/project/${projectId}/queue/${queueId}`)
}, [projectId, router])
```

### 8.3 缓存策略

1. **客户端缓存**：使用内存缓存减少重复请求
2. **HTTP 缓存**：设置适当的 HTTP 缓存头（如 `Cache-Control`）
3. **搜索缓存**：缓存搜索结果（可选）

### 8.4 网络优化

1. **请求去重**：避免同时发起多个相同请求
2. **请求取消**：组件卸载时取消未完成的请求
3. **压缩响应**：确保服务器启用 Gzip/Brotli 压缩

```javascript
useEffect(() => {
  const controller = new AbortController()
  
  const fetchData = async () => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/queues`, {
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
}, [projectId])
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

**项目不存在**：

```jsx
{project === null && !loading && (
  <div className="error-state">
    <p>项目不存在</p>
    <button onClick={() => router.push('/')}>返回首页</button>
  </div>
)}
```

**空状态**：

```jsx
{!loading && filteredQueues.length === 0 && (
  <div className="empty-state">
    {searchKeyword ? (
      <>
        <p>未找到匹配的任务队列</p>
        <button onClick={() => setSearchKeyword('')}>清除搜索</button>
      </>
    ) : (
      <>
        <p>该项目下暂无任务队列</p>
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

### 9.3 搜索体验优化

1. **实时反馈**：输入时立即显示过滤结果
2. **搜索高亮**：搜索结果中高亮显示匹配的关键词
3. **搜索历史**：保存最近搜索关键词（可选）
4. **快捷键支持**：`Ctrl/Cmd + K` 聚焦搜索框（可选）

### 9.4 无障碍性（A11y）

1. **键盘导航**：支持 Tab 键切换焦点，Enter 键触发操作
2. **ARIA 标签**：为交互元素添加适当的 ARIA 标签
3. **颜色对比度**：确保文字和背景颜色对比度符合 WCAG 标准
4. **屏幕阅读器**：确保屏幕阅读器能够正确读取内容

```jsx
<input
  type="text"
  placeholder="输入队列名称进行搜索..."
  value={searchKeyword}
  onChange={onSearchInputChange}
  aria-label="搜索任务队列"
  aria-describedby="search-description"
/>
<span id="search-description" className="sr-only">
  输入关键词搜索任务队列名称
</span>
```

---

## 10. 测试建议

### 10.1 功能测试

1. **数据加载**：测试初始加载、刷新、自动刷新
2. **搜索功能**：测试实时搜索、清除搜索、空搜索结果
3. **交互功能**：测试队列卡片点击、导航跳转、主题切换
4. **错误处理**：测试网络错误、项目不存在、空数据状态

### 10.2 性能测试

1. **加载时间**：测试页面首次加载时间
2. **搜索性能**：测试大量队列时的搜索性能
3. **渲染性能**：测试大量队列时的渲染性能
4. **内存使用**：测试长时间运行的内存使用情况

### 10.3 响应式测试

1. **设备测试**：在不同设备上测试布局和交互
2. **浏览器测试**：在不同浏览器上测试兼容性
3. **主题测试**：测试深浅色主题的显示效果

### 10.4 搜索功能测试

1. **实时搜索**：测试输入时的实时过滤效果
2. **防抖功能**：测试防抖是否正常工作
3. **边界情况**：测试空搜索、特殊字符、长文本等

---

## 11. 总结

本文档详细说明了 TaskEcho 系统项目详情页功能的完整设计方案，包括：

1. **页面布局设计**：顶部导航栏、面包屑导航、页面头部、搜索区域、任务队列列表区域的详细布局说明
2. **API 接口说明**：项目详情和任务队列列表接口的详细规范
3. **数据获取和更新机制**：初始加载、自动刷新、手动刷新、缓存策略、搜索功能实现
4. **交互功能**：任务队列卡片交互、搜索交互、导航交互、加载状态交互
5. **业务流程**：页面加载流程、数据更新流程、用户交互流程
6. **前端实现要点**：组件结构、状态管理、数据获取函数、搜索过滤函数、时间格式化
7. **性能优化建议**：数据加载优化、渲染优化、缓存策略、网络优化
8. **错误处理和用户体验**：错误状态显示、加载状态优化、搜索体验优化、无障碍性
9. **测试建议**：功能测试、性能测试、响应式测试、搜索功能测试

项目详情页作为应用的二级页面，需要提供清晰的任务队列展示、流畅的搜索体验和实时的数据更新，确保用户能够快速找到所需的任务队列并导航到任务队列详情页。

---

## 12. 相关文档

- [需求文档](../requirement.md)
- [页面结构文档](../page-structure.md)
- [数据库设计文档](database-design.md)
- [查询接口设计文档](query-api.md)
- [系统框架文档](system-framework.md)
- [首页功能设计文档](homepage-design.md)
