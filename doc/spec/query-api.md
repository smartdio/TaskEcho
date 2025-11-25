# TaskEcho 数据查询接口设计文档

## 1. 概述

### 1.1 文档目的

本文档详细说明 TaskEcho 系统的数据查询接口设计，包括获取项目列表、项目详情、任务队列列表、任务列表、任务详情、全局统计等查询接口的规范、参数、业务流程和数据库查询逻辑。

### 1.2 接口定位

数据查询接口是 TaskEcho 系统的**前端数据展示接口**，用于为前端页面提供数据支持。这些接口是只读接口，不涉及数据修改操作，主要用于展示项目、任务队列、任务等数据。

### 1.3 核心特性

- **只读操作**：所有查询接口都是只读的，不修改数据
- **无需认证**：单用户本地应用，查询接口无需 API Key 认证
- **统一响应格式**：所有接口遵循统一的响应格式
- **分页支持**：列表接口支持分页查询
- **过滤和排序**：支持按条件过滤和排序
- **关联查询**：支持查询关联数据（标签、消息、日志等）

### 1.4 适用场景

- 前端首页展示项目列表和全局统计
- 项目详情页展示任务队列列表
- 任务队列详情页展示任务列表（支持标签和状态过滤）
- 任务详情页展示完整的任务信息、对话历史和日志
- 实时数据更新和刷新

### 1.5 接口分类

| 接口类型 | 接口路径 | 功能 |
|---------|---------|------|
| **项目查询** | `GET /api/v1/projects` | 获取项目列表 |
| **项目查询** | `GET /api/v1/projects/:projectId` | 获取项目详情 |
| **队列查询** | `GET /api/v1/projects/:projectId/queues` | 获取任务队列列表 |
| **队列查询** | `GET /api/v1/projects/:projectId/queues/:queueId` | 获取任务队列详情 |
| **任务查询** | `GET /api/v1/projects/:projectId/queues/:queueId/tasks` | 获取任务列表 |
| **任务查询** | `GET /api/v1/projects/:projectId/queues/:queueId/tasks/:taskId` | 获取任务详情 |
| **统计查询** | `GET /api/v1/stats` | 获取全局统计信息 |

---

## 2. 项目查询接口

### 2.1 获取项目列表

#### 2.1.1 接口基本信息

| 项目 | 说明 |
|------|------|
| **接口路径** | `/api/v1/projects` |
| **请求方法** | `GET` |
| **认证要求** | 无需认证（单用户本地应用） |
| **分页支持** | 是 |

#### 2.1.2 查询参数

| 参数名 | 类型 | 必填 | 说明 | 默认值 | 示例 |
|--------|------|------|------|--------|------|
| `page` | number | 否 | 页码，从 1 开始 | `1` | `1` |
| `pageSize` | number | 否 | 每页数量 | `20` | `20` |

#### 2.1.3 响应格式

**成功响应（200）**：

```json
{
  "success": true,
  "data": {
    "items": [
      {
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
| `success` | boolean | 操作是否成功，固定为 `true` |
| `data` | object | 响应数据对象 |
| `data.items` | array | 项目列表数组 |
| `data.items[].id` | number | 项目内部ID（数据库主键） |
| `data.items[].project_id` | string | 项目外部唯一标识 |
| `data.items[].name` | string | 项目显示名称 |
| `data.items[].queue_count` | number | 项目下的任务队列数量 |
| `data.items[].task_count` | number | 项目下的任务总数 |
| `data.items[].task_stats` | object | 任务统计信息 |
| `data.items[].task_stats.total` | number | 任务总数 |
| `data.items[].task_stats.pending` | number | Pending 状态任务数 |
| `data.items[].task_stats.done` | number | Done 状态任务数 |
| `data.items[].task_stats.error` | number | Error 状态任务数 |
| `data.items[].last_task_at` | string | 最后任务更新时间（ISO 8601 格式） |
| `data.items[].created_at` | string | 创建时间（ISO 8601 格式） |
| `data.items[].updated_at` | string | 更新时间（ISO 8601 格式） |
| `data.pagination` | object | 分页信息 |
| `data.pagination.page` | number | 当前页码 |
| `data.pagination.pageSize` | number | 每页数量 |
| `data.pagination.total` | number | 总记录数 |
| `data.pagination.totalPages` | number | 总页数 |
| `message` | string | 成功消息 |
| `timestamp` | string | 响应时间戳（ISO 8601 格式） |

#### 2.1.4 业务流程

```
前端请求
  ↓
1. 解析查询参数
   ├─ page: 默认 1
   ├─ pageSize: 默认 20
   └─ 验证参数有效性（page >= 1, pageSize >= 1 且 <= 100）
  ↓
2. 查询项目列表（按 lastTaskAt 倒序）
   ├─ 使用分页查询（LIMIT + OFFSET）
   └─ 按 lastTaskAt DESC 排序（NULL 值排在最后）
  ↓
3. 对每个项目统计关联数据
   ├─ 统计任务队列数量（COUNT queues）
   ├─ 统计任务总数（COUNT tasks）
   └─ 统计各状态任务数量（GROUP BY status）
  ↓
4. 组装响应数据
   ├─ 项目基本信息
   ├─ 统计信息
   └─ 分页信息
  ↓
5. 返回成功响应
```

#### 2.1.5 数据库查询逻辑

```javascript
// 1. 查询项目列表（分页 + 排序）
const projects = await Project.find()
  .sort({ lastTaskAt: -1, createdAt: -1 })
  .skip((page - 1) * pageSize)
  .limit(pageSize)
  .lean()

// 2. 查询总数
const total = await Project.countDocuments()

// 3. 对每个项目统计关联数据
const projectsWithStats = await Promise.all(
  projects.map(async (project) => {
    // 统计任务队列数量
    const queueCount = await Queue.countDocuments({
      projectId: project._id
    })
    
    // 查询所有队列（包含 tasks 数组，但排除 messages 和 logs）
    const queues = await Queue.find({
      projectId: project._id
    }).select({
      'tasks.messages': 0,  // 排除 messages
      'tasks.logs': 0       // 排除 logs
    }).lean()
    
    // 统计任务总数和各状态任务数（从队列的 tasks 数组中统计）
    let totalTasks = 0
    let pendingTasks = 0
    let doneTasks = 0
    let errorTasks = 0
    
    queues.forEach(queue => {
      const tasks = queue.tasks || []
      totalTasks += tasks.length
      tasks.forEach(task => {
        const status = task.status?.toLowerCase()
        if (status === 'pending') pendingTasks++
        else if (status === 'done') doneTasks++
        else if (status === 'error') errorTasks++
      })
    })
    
    const taskStats = {
      total: totalTasks,
      pending: pendingTasks,
      done: doneTasks,
      error: errorTasks
    }
    
    return {
      id: project._id.toString(),
      project_id: project.projectId,
      name: project.name,
      queue_count: queueCount,
      task_count: taskStats.total,
      task_stats: taskStats,
      last_task_at: project.lastTaskAt?.toISOString() || null,
      created_at: project.createdAt.toISOString(),
      updated_at: project.updatedAt.toISOString()
    }
  })
)
```

**性能优化建议**：

1. **使用聚合查询优化统计**（MongoDB 聚合管道）：
```javascript
// 使用 MongoDB 聚合管道统计任务
const taskStats = await Queue.aggregate([
  { $match: { projectId: project._id } },
  { $unwind: '$tasks' },
  { $group: {
    _id: '$tasks.status',
    count: { $sum: 1 }
  }}
])
```

2. **使用 select 排除大字段**：
```javascript
// 列表查询时排除 messages 和 logs
const queues = await Queue.find({
  projectId: project._id
}).select({
  'tasks.messages': 0,  // 排除 messages
  'tasks.logs': 0       // 排除 logs
}).lean()
```

#### 2.1.6 实现示例

```javascript
// GET /api/v1/projects
export async function GET(request) {
  try {
    // 1. 解析查询参数
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100)
    
    // 2. 验证参数
    if (page < 1 || pageSize < 1) {
      return createErrorResponse(
        '页码和每页数量必须大于 0',
        'VALIDATION_ERROR',
        400
      )
    }
    
    // 3. 查询项目列表
    const [projects, total] = await Promise.all([
      Project.find()
        .sort({ lastTaskAt: -1, createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Project.countDocuments()
    ])
    
    // 4. 对每个项目统计关联数据
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        // 统计任务队列数量
        const queueCount = await Queue.countDocuments({
          projectId: project._id
        })
        
        // 查询所有队列（排除 messages 和 logs）
        const queues = await Queue.find({
          projectId: project._id
        }).select({
          'tasks.messages': 0,  // 排除 messages
          'tasks.logs': 0      // 排除 logs
        }).lean()
        
        // 统计任务总数和各状态任务数（从队列的 tasks 数组中统计）
        let totalTasks = 0
        let pendingTasks = 0
        let doneTasks = 0
        let errorTasks = 0
        
        queues.forEach(queue => {
          const tasks = queue.tasks || []
          totalTasks += tasks.length
          tasks.forEach(task => {
            const status = task.status?.toLowerCase()
            if (status === 'pending') pendingTasks++
            else if (status === 'done') doneTasks++
            else if (status === 'error') errorTasks++
          })
        })
        
        const taskStats = {
          total: totalTasks,
          pending: pendingTasks,
          done: doneTasks,
          error: errorTasks
        }
        
        return {
          id: project._id.toString(),
          project_id: project.projectId,
          name: project.name,
          queue_count: queueCount,
          task_count: taskStats.total,
          task_stats: taskStats,
          last_task_at: project.lastTaskAt?.toISOString() || null,
          created_at: project.createdAt.toISOString(),
          updated_at: project.updatedAt.toISOString()
        }
      })
    )
    
    // 5. 返回成功响应
    return createPaginatedResponse(
      projectsWithStats,
      {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      },
      '查询成功'
    )
    
  } catch (error) {
    return handleError(error)
  }
}
```

#### 2.1.7 使用示例

**请求**：
```bash
curl http://localhost:3000/api/v1/projects?page=1&pageSize=20
```

**响应**：
```json
{
  "success": true,
  "data": {
    "items": [
      {
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

---

### 2.2 获取项目详情

#### 2.2.1 接口基本信息

| 项目 | 说明 |
|------|------|
| **接口路径** | `/api/v1/projects/:projectId` |
| **请求方法** | `GET` |
| **认证要求** | 无需认证 |
| **路径参数** | `projectId`（项目外部唯一标识） |

#### 2.2.2 路径参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `projectId` | string | 是 | 项目外部唯一标识 | `"project_001"` |

#### 2.2.3 响应格式

**成功响应（200）**：

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
}
```

**项目不存在（404）**：

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "项目不存在",
    "details": {
      "project_id": "project_001"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 2.2.4 业务流程

```
前端请求
  ↓
1. 解析路径参数
   └─ projectId: 项目外部唯一标识
  ↓
2. 查询项目
   └─ 根据 projectId 查找项目
  ↓
3. 验证项目是否存在
   ├─ 如果不存在 → 返回 404 错误
   └─ 如果存在 → 继续处理
  ↓
4. 统计项目关联数据
   ├─ 统计任务队列数量
   ├─ 统计任务总数
   └─ 统计各状态任务数量
  ↓
5. 组装响应数据
  ↓
6. 返回成功响应
```

#### 2.2.5 数据库查询逻辑

```javascript
// 1. 查询项目
const project = await Project.findOne({ projectId })

if (!project) {
  return createErrorResponse(
    '项目不存在',
    'RESOURCE_NOT_FOUND',
    404
  )
}

// 2. 统计关联数据
const queueCount = await Queue.countDocuments({
  projectId: project._id
})

// 查询所有队列（排除 messages 和 logs）
const queues = await Queue.find({
  projectId: project._id
}).select({
  'tasks.messages': 0,  // 排除 messages
  'tasks.logs': 0      // 排除 logs
}).lean()

// 3. 统计任务总数和各状态任务数（从队列的 tasks 数组中统计）
let totalTasks = 0
let pendingTasks = 0
let doneTasks = 0
let errorTasks = 0

queues.forEach(queue => {
  const tasks = queue.tasks || []
  totalTasks += tasks.length
  tasks.forEach(task => {
    const status = task.status?.toLowerCase()
    if (status === 'pending') pendingTasks++
    else if (status === 'done') doneTasks++
    else if (status === 'error') errorTasks++
  })
})

const taskStats = {
  total: totalTasks,
  pending: pendingTasks,
  done: doneTasks,
  error: errorTasks
}
```

#### 2.2.6 实现示例

```javascript
// GET /api/v1/projects/:projectId
export async function GET(request, { params }) {
  try {
    // 1. 解析路径参数
    const { projectId } = await params
    
    // 2. 查询项目
    const project = await Project.findOne({ projectId })
    
    if (!project) {
      return createErrorResponse(
        '项目不存在',
        'RESOURCE_NOT_FOUND',
        404,
        { project_id: projectId }
      )
    }
    
    // 3. 统计关联数据
    const queueCount = await Queue.countDocuments({
      projectId: project._id
    })
    
    // 查询所有队列（排除 messages 和 logs）
    const queues = await Queue.find({
      projectId: project._id
    }).select({
      'tasks.messages': 0,  // 排除 messages
      'tasks.logs': 0      // 排除 logs
    }).lean()
    
    // 4. 统计任务总数和各状态任务数（从队列的 tasks 数组中统计）
    let totalTasks = 0
    let pendingTasks = 0
    let doneTasks = 0
    let errorTasks = 0
    
    queues.forEach(queue => {
      const tasks = queue.tasks || []
      totalTasks += tasks.length
      tasks.forEach(task => {
        const status = task.status?.toLowerCase()
        if (status === 'pending') pendingTasks++
        else if (status === 'done') doneTasks++
        else if (status === 'error') errorTasks++
      })
    })
    
    const taskStats = {
      total: totalTasks,
      pending: pendingTasks,
      done: doneTasks,
      error: errorTasks
    }
    
    // 5. 返回成功响应
    return createSuccessResponse({
      id: project.id,
      project_id: project.projectId,
      name: project.name,
      queue_count: queueCount,
      task_count: taskStats.total,
      task_stats: taskStats,
      last_task_at: project.lastTaskAt?.toISOString() || null,
      created_at: project.createdAt.toISOString(),
      updated_at: project.updatedAt.toISOString()
    }, '查询成功')
    
  } catch (error) {
    return handleError(error)
  }
}
```

---

## 3. 任务队列查询接口

### 3.1 获取任务队列列表

#### 3.1.1 接口基本信息

| 项目 | 说明 |
|------|------|
| **接口路径** | `/api/v1/projects/:projectId/queues` |
| **请求方法** | `GET` |
| **认证要求** | 无需认证 |
| **路径参数** | `projectId`（项目外部唯一标识） |
| **查询参数** | `search`（可选，队列名称搜索） |

#### 3.1.2 路径参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `projectId` | string | 是 | 项目外部唯一标识 | `"project_001"` |

#### 3.1.3 查询参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `search` | string | 否 | 队列名称搜索关键词（模糊匹配） | `"队列"` |

#### 3.1.4 响应格式

**成功响应（200）**：

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
}
```

**项目不存在（404）**：

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "项目不存在",
    "details": {
      "project_id": "project_001"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 3.1.5 业务流程

```
前端请求
  ↓
1. 解析路径参数和查询参数
   ├─ projectId: 项目外部唯一标识
   └─ search: 队列名称搜索关键词（可选）
  ↓
2. 查询项目
   └─ 根据 projectId 查找项目
  ↓
3. 验证项目是否存在
   ├─ 如果不存在 → 返回 404 错误
   └─ 如果存在 → 继续处理
  ↓
4. 查询任务队列列表
   ├─ 如果提供了 search 参数，按名称模糊匹配
   └─ 按 lastTaskAt 倒序排序
  ↓
5. 对每个队列统计关联数据
   ├─ 统计任务总数
   └─ 统计各状态任务数量
  ↓
6. 组装响应数据
  ↓
7. 返回成功响应
```

#### 3.1.6 数据库查询逻辑

```javascript
// 1. 查询项目
const project = await Project.findOne({ projectId })

if (!project) {
  return createErrorResponse('项目不存在', 'RESOURCE_NOT_FOUND', 404)
}

// 2. 构建查询条件
const query = {
  projectId: project._id
}

// 如果提供了搜索关键词，添加名称模糊匹配条件
if (search) {
  query.name = { $regex: search, $options: 'i' }
}

// 3. 查询任务队列列表（列表查询，排除 messages 和 logs）
const queues = await Queue.find(query)
  .select({
    'tasks.messages': 0,  // 排除 messages
    'tasks.logs': 0       // 排除 logs
  })
  .sort({ lastTaskAt: -1, createdAt: -1 })
  .lean()

// 4. 对每个队列统计任务数据（从队列的 tasks 数组中统计）
const queuesWithStats = queues.map(queue => {
  const tasks = queue.tasks || []
  
  let totalTasks = 0
  let pendingTasks = 0
  let doneTasks = 0
  let errorTasks = 0
  
  tasks.forEach(task => {
    totalTasks++
    const status = task.status?.toLowerCase()
    if (status === 'pending') pendingTasks++
    else if (status === 'done') doneTasks++
    else if (status === 'error') errorTasks++
  })
  
  const taskStats = {
    total: totalTasks,
    pending: pendingTasks,
    done: doneTasks,
    error: errorTasks
  }
  
  return {
    id: queue._id.toString(),
    queue_id: queue.queueId,
    name: queue.name,
    task_count: taskStats.total,
    task_stats: taskStats,
    last_task_at: queue.lastTaskAt?.toISOString() || null,
    created_at: queue.createdAt.toISOString(),
    updated_at: queue.updatedAt.toISOString()
  }
})
```

#### 3.1.7 实现示例

```javascript
// GET /api/v1/projects/:projectId/queues
export async function GET(request, { params }) {
  try {
    // 1. 解析路径参数和查询参数
    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim()
    
    // 2. 查询项目
    const project = await Project.findOne({ projectId })
    
    if (!project) {
      return createErrorResponse(
        '项目不存在',
        'RESOURCE_NOT_FOUND',
        404,
        { project_id: projectId }
      )
    }
    
    // 3. 构建查询条件
    const query = {
      projectId: project._id
    }
    
    // 如果提供了搜索关键词，添加名称模糊匹配条件
    if (search) {
      query.name = { $regex: search, $options: 'i' }
    }
    
    // 4. 查询任务队列列表（列表查询，排除 messages 和 logs）
    const queues = await Queue.find(query)
      .select({
        'tasks.messages': 0,  // 排除 messages
        'tasks.logs': 0       // 排除 logs
      })
      .sort({ lastTaskAt: -1, createdAt: -1 })
      .lean()
    
    // 5. 对每个队列统计任务数据（从队列的 tasks 数组中统计）
    const queuesWithStats = queues.map(queue => {
      const tasks = queue.tasks || []
      
      let totalTasks = 0
      let pendingTasks = 0
      let doneTasks = 0
      let errorTasks = 0
      
      tasks.forEach(task => {
        totalTasks++
        const status = task.status?.toLowerCase()
        if (status === 'pending') pendingTasks++
        else if (status === 'done') doneTasks++
        else if (status === 'error') errorTasks++
      })
      
      const taskStats = {
        total: totalTasks,
        pending: pendingTasks,
        done: doneTasks,
        error: errorTasks
      }
      
      return {
        id: queue._id.toString(),
        queue_id: queue.queueId,
        name: queue.name,
        task_count: taskStats.total,
        task_stats: taskStats,
        last_task_at: queue.lastTaskAt?.toISOString() || null,
        created_at: queue.createdAt.toISOString(),
        updated_at: queue.updatedAt.toISOString()
      }
    })
    
    // 6. 返回成功响应
    return createSuccessResponse(
      { items: queuesWithStats },
      '查询成功'
    )
    
  } catch (error) {
    return handleError(error)
  }
}
```

---

### 3.2 获取任务队列详情

#### 3.2.1 接口基本信息

| 项目 | 说明 |
|------|------|
| **接口路径** | `/api/v1/projects/:projectId/queues/:queueId` |
| **请求方法** | `GET` |
| **认证要求** | 无需认证 |
| **路径参数** | `projectId`（项目外部唯一标识）、`queueId`（队列外部唯一标识） |

#### 3.2.2 路径参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `projectId` | string | 是 | 项目外部唯一标识 | `"project_001"` |
| `queueId` | string | 是 | 任务队列外部唯一标识 | `"queue_001"` |

#### 3.2.3 响应格式

**成功响应（200）**：

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

**资源不存在（404）**：

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "项目或任务队列不存在",
    "details": {
      "project_id": "project_001",
      "queue_id": "queue_001"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 3.2.4 业务流程

```
前端请求
  ↓
1. 解析路径参数
   ├─ projectId: 项目外部唯一标识
   └─ queueId: 队列外部唯一标识
  ↓
2. 查询项目和队列
   ├─ 根据 projectId 查找项目
   └─ 根据 projectId + queueId 查找队列
  ↓
3. 验证资源是否存在
   ├─ 如果项目不存在 → 返回 404 错误
   ├─ 如果队列不存在 → 返回 404 错误
   └─ 如果都存在 → 继续处理
  ↓
4. 统计队列关联数据
   ├─ 统计任务总数
   └─ 统计各状态任务数量
  ↓
5. 组装响应数据
  ↓
6. 返回成功响应
```

#### 3.2.5 数据库查询逻辑

```javascript
// 1. 查询项目
const project = await Project.findOne({ projectId })

if (!project) {
  return createErrorResponse('项目不存在', 'RESOURCE_NOT_FOUND', 404)
}

// 2. 查询队列（列表查询，排除 messages 和 logs）
const queue = await Queue.findOne({
  projectId: project._id,
  queueId: queueId
}).select({
  'tasks.messages': 0,  // 排除 messages
  'tasks.logs': 0       // 排除 logs
}).lean()

if (!queue) {
  return createErrorResponse('任务队列不存在', 'RESOURCE_NOT_FOUND', 404)
}

// 3. 统计任务数据（从队列的 tasks 数组中统计）
const tasks = queue.tasks || []

let totalTasks = 0
let pendingTasks = 0
let doneTasks = 0
let errorTasks = 0

tasks.forEach(task => {
  totalTasks++
  const status = task.status?.toLowerCase()
  if (status === 'pending') pendingTasks++
  else if (status === 'done') doneTasks++
  else if (status === 'error') errorTasks++
})

const taskStats = {
  total: totalTasks,
  pending: pendingTasks,
  done: doneTasks,
  error: errorTasks
}
```

#### 3.2.6 实现示例

```javascript
// GET /api/v1/projects/:projectId/queues/:queueId
export async function GET(request, { params }) {
  try {
    // 1. 解析路径参数
    const { projectId, queueId } = await params
    
    // 2. 查询项目
    const project = await Project.findOne({ projectId })
    
    if (!project) {
      return createErrorResponse(
        '项目不存在',
        'RESOURCE_NOT_FOUND',
        404,
        { project_id: projectId }
      )
    }
    
    // 3. 查询队列（列表查询，排除 messages 和 logs）
    const queue = await Queue.findOne({
      projectId: project._id,
      queueId: queueId
    }).select({
      'tasks.messages': 0,  // 排除 messages
      'tasks.logs': 0       // 排除 logs
    }).lean()
    
    if (!queue) {
      return createErrorResponse(
        '任务队列不存在',
        'RESOURCE_NOT_FOUND',
        404,
        { project_id: projectId, queue_id: queueId }
      )
    }
    
    // 4. 统计任务数据（从队列的 tasks 数组中统计）
    const tasks = queue.tasks || []
    
    let totalTasks = 0
    let pendingTasks = 0
    let doneTasks = 0
    let errorTasks = 0
    
    tasks.forEach(task => {
      totalTasks++
      const status = task.status?.toLowerCase()
      if (status === 'pending') pendingTasks++
      else if (status === 'done') doneTasks++
      else if (status === 'error') errorTasks++
    })
    
    const taskStats = {
      total: totalTasks,
      pending: pendingTasks,
      done: doneTasks,
      error: errorTasks
    }
    
    // 5. 返回成功响应
    return createSuccessResponse({
      id: queue.id,
      queue_id: queue.queueId,
      name: queue.name,
      task_count: taskStats.total,
      task_stats: taskStats,
      last_task_at: queue.lastTaskAt?.toISOString() || null,
      created_at: queue.createdAt.toISOString(),
      updated_at: queue.updatedAt.toISOString()
    }, '查询成功')
    
  } catch (error) {
    return handleError(error)
  }
}
```

---

## 4. 任务查询接口

### 4.1 获取任务列表

#### 4.1.1 接口基本信息

| 项目 | 说明 |
|------|------|
| **接口路径** | `/api/v1/projects/:projectId/queues/:queueId/tasks` |
| **请求方法** | `GET` |
| **认证要求** | 无需认证 |
| **路径参数** | `projectId`（项目外部唯一标识）、`queueId`（队列外部唯一标识） |
| **查询参数** | `status`（可选，状态过滤）、`tags`（可选，标签过滤）、`page`（可选，页码）、`pageSize`（可选，每页数量） |
| **分页支持** | 是 |

#### 4.1.2 路径参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `projectId` | string | 是 | 项目外部唯一标识 | `"project_001"` |
| `queueId` | string | 是 | 任务队列外部唯一标识 | `"queue_001"` |

#### 4.1.3 查询参数

| 参数名 | 类型 | 必填 | 说明 | 默认值 | 示例 |
|--------|------|------|------|--------|------|
| `status` | string | 否 | 状态过滤（pending/done/error） | 无 | `"pending"` |
| `tags` | string | 否 | 标签过滤（多个标签用逗号分隔） | 无 | `"tag1,tag2"` |
| `page` | number | 否 | 页码，从 1 开始 | `1` | `1` |
| `pageSize` | number | 否 | 每页数量 | `20` | `20` |

#### 4.1.4 响应格式

**成功响应（200）**：

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

#### 4.1.5 业务流程

```
前端请求
  ↓
1. 解析路径参数和查询参数
   ├─ projectId: 项目外部唯一标识
   ├─ queueId: 队列外部唯一标识
   ├─ status: 状态过滤（可选）
   ├─ tags: 标签过滤（可选，逗号分隔）
   ├─ page: 页码（默认 1）
   └─ pageSize: 每页数量（默认 20）
  ↓
2. 查询项目和队列
   ├─ 根据 projectId 查找项目
   └─ 根据 projectId + queueId 查找队列
  ↓
3. 验证资源是否存在
   ├─ 如果项目不存在 → 返回 404 错误
   ├─ 如果队列不存在 → 返回 404 错误
   └─ 如果都存在 → 继续处理
  ↓
4. 构建任务查询条件
   ├─ queueId: 队列ID
   ├─ status: 如果提供了 status 参数，添加状态过滤
   └─ tags: 如果提供了 tags 参数，添加标签过滤（多标签用 OR 逻辑）
  ↓
5. 查询任务列表（分页 + 排序）
   ├─ 使用分页查询（LIMIT + OFFSET）
   └─ 按 updatedAt DESC 排序
  ↓
6. 查询每个任务的关联数据
   ├─ 查询标签（include tags）
   └─ 统计消息数量
  ↓
7. 组装响应数据
  ↓
8. 返回成功响应
```

#### 4.1.6 数据库查询逻辑

```javascript
// 1. 查询项目和队列
const project = await Project.findOne({ projectId })

if (!project) {
  return createErrorResponse('项目不存在', 'RESOURCE_NOT_FOUND', 404)
}

const queue = await Queue.findOne({
  projectId: project._id,
  queueId: queueId
}).select({
  'tasks.messages': 0,  // 列表查询排除 messages
  'tasks.logs': 0       // 列表查询排除 logs
}).lean()

if (!queue) {
  return createErrorResponse('任务队列不存在', 'RESOURCE_NOT_FOUND', 404)
}

// 2. 从队列的 tasks 数组中过滤任务
let tasks = queue.tasks || []

// 状态过滤
if (status) {
  tasks = tasks.filter(task => 
    task.status.toLowerCase() === status.toLowerCase()
  )
}

// 标签过滤（如果提供了多个标签，使用 OR 逻辑）
// 注意：当前任务结构中没有 tags 字段，如果需要标签过滤，需要调整数据结构
// 这里暂时跳过标签过滤逻辑

// 3. 排序（按 updatedAt 倒序）
tasks.sort((a, b) => {
  const dateA = a.updatedAt || a.createdAt || new Date(0)
  const dateB = b.updatedAt || b.createdAt || new Date(0)
  return dateB - dateA
})

// 4. 分页
const total = tasks.length
const startIndex = (page - 1) * pageSize
const paginatedTasks = tasks.slice(startIndex, startIndex + pageSize)

// 5. 转换数据格式
const tasksFormatted = paginatedTasks.map(task => ({
  id: task.id,
  name: task.name,
  prompt: task.prompt,
  spec_file: task.spec_file || [],
  status: task.status,
  report: task.report || null,
  updated_at: task.updatedAt?.toISOString() || task.createdAt?.toISOString(),
  created_at: task.createdAt?.toISOString()
}))
```

#### 4.1.7 实现示例

```javascript
// GET /api/v1/projects/:projectId/queues/:queueId/tasks
export async function GET(request, { params }) {
  try {
    // 1. 解析路径参数和查询参数
    const { projectId, queueId } = await params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')?.trim()
    const tags = searchParams.get('tags')?.trim()
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100)
    
    // 2. 验证参数
    if (page < 1 || pageSize < 1) {
      return createErrorResponse(
        '页码和每页数量必须大于 0',
        'VALIDATION_ERROR',
        400
      )
    }
    
    // 3. 查询项目
    const project = await Project.findOne({ projectId })
    
    if (!project) {
      return createErrorResponse(
        '项目不存在',
        'RESOURCE_NOT_FOUND',
        404,
        { project_id: projectId }
      )
    }
    
    // 4. 查询队列（列表查询，排除 messages 和 logs）
    const queue = await Queue.findOne({
      projectId: project._id,
      queueId: queueId
    }).select({
      'tasks.messages': 0,  // 排除 messages 字段
      'tasks.logs': 0       // 排除 logs 字段
    }).lean()
    
    if (!queue) {
      return createErrorResponse(
        '任务队列不存在',
        'RESOURCE_NOT_FOUND',
        404,
        { project_id: projectId, queue_id: queueId }
      )
    }
    
    // 5. 从队列的 tasks 数组中过滤任务
    let tasks = queue.tasks || []
    
    // 状态过滤
    if (status) {
      const validStatuses = ['pending', 'done', 'error']
      if (!validStatuses.includes(status.toLowerCase())) {
        return createErrorResponse(
          '状态值无效，必须是 pending、done 或 error',
          'VALIDATION_ERROR',
          400
        )
      }
      tasks = tasks.filter(task => 
        task.status.toLowerCase() === status.toLowerCase()
      )
    }
    
    // 标签过滤（如果需要，可以基于 spec_file 或其他字段进行过滤）
    // 注意：当前任务结构中没有 tags 字段，标签过滤功能需要根据实际需求调整
    
    // 6. 排序（按 updatedAt 倒序）
    tasks.sort((a, b) => {
      const dateA = a.updatedAt || a.createdAt || new Date(0)
      const dateB = b.updatedAt || b.createdAt || new Date(0)
      return dateB.getTime() - dateA.getTime()
    })
    
    // 7. 分页
    const total = tasks.length
    const startIndex = (page - 1) * pageSize
    const paginatedTasks = tasks.slice(startIndex, startIndex + pageSize)
    
    // 8. 转换数据格式
    const tasksFormatted = paginatedTasks.map(task => ({
      id: task.id,
      name: task.name,
      prompt: task.prompt,
      spec_file: task.spec_file || [],
      status: task.status,
      report: task.report || null,
      updated_at: task.updatedAt?.toISOString() || task.createdAt?.toISOString(),
      created_at: task.createdAt?.toISOString()
    }))
    
    // 8. 返回成功响应
    return createPaginatedResponse(
      tasksFormatted,
      {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      },
      '查询成功'
    )
    
  } catch (error) {
    return handleError(error)
  }
}
```

---

### 4.2 获取任务详情

#### 4.2.1 接口基本信息

| 项目 | 说明 |
|------|------|
| **接口路径** | `/api/v1/projects/:projectId/queues/:queueId/tasks/:taskId` |
| **请求方法** | `GET` |
| **认证要求** | 无需认证 |
| **路径参数** | `projectId`（项目外部唯一标识）、`queueId`（队列外部唯一标识）、`taskId`（任务外部唯一标识） |

#### 4.2.2 路径参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `projectId` | string | 是 | 项目外部唯一标识 | `"project_001"` |
| `queueId` | string | 是 | 任务队列外部唯一标识 | `"queue_001"` |
| `taskId` | string | 是 | 任务外部唯一标识 | `"task_001"` |

#### 4.2.3 响应格式

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
| `data.messages` | array | 对话消息数组（按 createdAt 正序排列） |
| `data.messages[].id` | number | 消息ID |
| `data.messages[].role` | string | 消息角色（user/assistant，小写） |
| `data.messages[].content` | string | 消息内容（支持 Markdown） |
| `data.messages[].created_at` | string | 消息创建时间（ISO 8601 格式） |
| `data.logs` | array | 执行日志数组（按 createdAt 倒序排列，最新的在上方） |
| `data.logs[].id` | number | 日志ID |
| `data.logs[].content` | string | 日志内容（纯文本） |
| `data.logs[].created_at` | string | 日志创建时间（ISO 8601 格式） |

#### 4.2.4 业务流程

```
前端请求
  ↓
1. 解析路径参数
   ├─ projectId: 项目外部唯一标识
   ├─ queueId: 队列外部唯一标识
   └─ taskId: 任务外部唯一标识
  ↓
2. 查询项目、队列和任务
   ├─ 根据 projectId 查找项目
   ├─ 根据 projectId + queueId 查找队列
   └─ 根据 queueId + taskId 查找任务
  ↓
3. 验证资源是否存在
   ├─ 如果项目不存在 → 返回 404 错误
   ├─ 如果队列不存在 → 返回 404 错误
   ├─ 如果任务不存在 → 返回 404 错误
   └─ 如果都存在 → 继续处理
  ↓
4. 查询任务关联数据
   ├─ 查询标签（include tags）
   ├─ 查询消息（include messages，按 createdAt 正序）
   └─ 查询日志（include logs，按 createdAt 倒序）
  ↓
5. 组装响应数据
  ↓
6. 返回成功响应
```

#### 4.2.5 数据库查询逻辑

```javascript
// 1. 查询项目
const project = await prisma.project.findUnique({
  where: { projectId }
})

if (!project) {
  return createErrorResponse('项目不存在', 'RESOURCE_NOT_FOUND', 404)
}

// 2. 查询队列
const queue = await prisma.queue.findUnique({
  where: {
    projectId_queueId: {
      projectId: project.id,
      queueId
    }
  }
})

if (!queue) {
  return createErrorResponse('任务队列不存在', 'RESOURCE_NOT_FOUND', 404)
}

// 3. 查询任务（包含关联数据）
const task = await prisma.task.findUnique({
  where: {
    queueId_taskId: {
      queueId: queue.id,
      taskId
    }
  },
  include: {
    tags: {
      include: {
        tag: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      }
    },
    messages: {
      orderBy: { createdAt: 'asc' }  // 消息按时间正序
    },
    logs: {
      orderBy: { createdAt: 'desc' }  // 日志按时间倒序
    }
  }
})

if (!task) {
  return createErrorResponse('任务不存在', 'RESOURCE_NOT_FOUND', 404)
}
```

#### 4.2.6 实现示例

```javascript
// GET /api/v1/projects/:projectId/queues/:queueId/tasks/:taskId
export async function GET(request, { params }) {
  try {
    // 1. 解析路径参数
    const { projectId, queueId, taskId } = await params
    
    // 2. 查询项目
    const project = await Project.findOne({ projectId })
    
    if (!project) {
      return createErrorResponse(
        '项目不存在',
        'RESOURCE_NOT_FOUND',
        404,
        { project_id: projectId }
      )
    }
    
    // 3. 查询队列（详情查询，包含完整的 tasks 数组）
    const queue = await Queue.findOne({
      projectId: project._id,
      queueId: queueId
    }).lean()
    
    if (!queue) {
      return createErrorResponse(
        '任务队列不存在',
        'RESOURCE_NOT_FOUND',
        404,
        { project_id: projectId, queue_id: queueId }
      )
    }
    
    // 4. 在队列的 tasks 数组中查找指定任务
    const task = queue.tasks?.find(t => t.id === taskId)
    
    if (!task) {
      return createErrorResponse(
        '任务不存在',
        'RESOURCE_NOT_FOUND',
        404,
        { project_id: projectId, queue_id: queueId, task_id: taskId }
      )
    }
    
    // 5. 排序 messages 和 logs
    const messages = (task.messages || []).sort((a, b) => {
      const dateA = a.createdAt || new Date(0)
      const dateB = b.createdAt || new Date(0)
      return dateA.getTime() - dateB.getTime()  // 正序
    })

    const logs = (task.logs || []).sort((a, b) => {
      const dateA = a.createdAt || new Date(0)
      const dateB = b.createdAt || new Date(0)
      return dateB.getTime() - dateA.getTime()  // 倒序
    })
    
    // 6. 转换数据格式
    const taskFormatted = {
      id: task.id,
      name: task.name,
      prompt: task.prompt,
      spec_file: task.spec_file || [],
      status: task.status,
      report: task.report || null,
      messages: messages.map(msg => ({
        role: msg.role.toLowerCase(),
        content: msg.content,
        created_at: msg.createdAt?.toISOString()
      })),
      logs: logs.map(log => ({
        content: log.content,
        created_at: log.createdAt?.toISOString()
      })),
      created_at: task.createdAt?.toISOString(),
      updated_at: task.updatedAt?.toISOString()
    }
    
    // 6. 返回成功响应
    return createSuccessResponse(taskFormatted, '查询成功')
    
  } catch (error) {
    return handleError(error)
  }
}
```

---

## 5. 全局统计查询接口

### 5.1 获取全局统计信息

#### 5.1.1 接口基本信息

| 项目 | 说明 |
|------|------|
| **接口路径** | `/api/v1/stats` |
| **请求方法** | `GET` |
| **认证要求** | 无需认证 |

#### 5.1.2 响应格式

**成功响应（200）**：

```json
{
  "success": true,
  "data": {
    "project_count": 10,
    "queue_count": 30,
    "task_count": 150,
    "task_stats": {
      "total": 150,
      "pending": 50,
      "done": 80,
      "error": 20
    }
  },
  "message": "查询成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**响应字段说明**：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `data.project_count` | number | 项目总数 |
| `data.queue_count` | number | 任务队列总数 |
| `data.task_count` | number | 任务总数 |
| `data.task_stats` | object | 任务统计信息 |
| `data.task_stats.total` | number | 任务总数 |
| `data.task_stats.pending` | number | Pending 状态任务数 |
| `data.task_stats.done` | number | Done 状态任务数 |
| `data.task_stats.error` | number | Error 状态任务数 |

#### 5.1.3 业务流程

```
前端请求
  ↓
1. 统计项目总数
   └─ COUNT projects
  ↓
2. 统计任务队列总数
   └─ COUNT queues
  ↓
3. 统计任务总数和各状态任务数
   ├─ COUNT tasks
   └─ GROUP BY status
  ↓
4. 组装响应数据
  ↓
5. 返回成功响应
```

#### 5.1.4 数据库查询逻辑

```javascript
// 1. 统计项目总数
const projectCount = await prisma.project.count()

// 2. 统计任务队列总数
const queueCount = await prisma.queue.count()

// 3. 统计任务总数和各状态任务数
const taskStatsRaw = await prisma.task.groupBy({
  by: ['status'],
  _count: {
    id: true
  }
})

const taskStats = {
  total: 0,
  pending: 0,
  done: 0,
  error: 0
}

taskStatsRaw.forEach(stat => {
  const count = stat._count.id
  taskStats.total += count
  if (stat.status === 'PENDING') taskStats.pending = count
  if (stat.status === 'DONE') taskStats.done = count
  if (stat.status === 'ERROR') taskStats.error = count
})

const taskCount = taskStats.total
```

#### 5.1.5 实现示例

```javascript
// GET /api/v1/stats
export async function GET(request) {
  try {
    // 1. 统计项目总数
    const projectCount = await Project.countDocuments()
    
    // 2. 统计任务队列总数
    const queueCount = await Queue.countDocuments()
    
    // 3. 查询所有队列（排除 messages 和 logs）
    const queues = await Queue.find().select({
      'tasks.messages': 0,  // 排除 messages
      'tasks.logs': 0       // 排除 logs
    }).lean()
    
    // 4. 统计任务总数和各状态任务数（从队列的 tasks 数组中统计）
    let totalTasks = 0
    let pendingTasks = 0
    let doneTasks = 0
    let errorTasks = 0
    
    queues.forEach(queue => {
      const tasks = queue.tasks || []
      totalTasks += tasks.length
      tasks.forEach(task => {
        const status = task.status?.toLowerCase()
        if (status === 'pending') pendingTasks++
        else if (status === 'done') doneTasks++
        else if (status === 'error') errorTasks++
      })
    })
    
    const taskStats = {
      total: totalTasks,
      pending: pendingTasks,
      done: doneTasks,
      error: errorTasks
    }
    
    // 4. 返回成功响应
    return createSuccessResponse({
      project_count: projectCount,
      queue_count: queueCount,
      task_count: taskStats.total,
      task_stats: taskStats
    }, '查询成功')
    
  } catch (error) {
    return handleError(error)
  }
}
```

#### 5.1.6 使用示例

**请求**：
```bash
curl http://localhost:3000/api/v1/stats
```

**响应**：
```json
{
  "success": true,
  "data": {
    "project_count": 10,
    "queue_count": 30,
    "task_count": 150,
    "task_stats": {
      "total": 150,
      "pending": 50,
      "done": 80,
      "error": 20
    }
  },
  "message": "查询成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 6. 错误处理

### 6.1 错误码定义

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `RESOURCE_NOT_FOUND` | 404 | 资源不存在（项目/队列/任务） |
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

### 6.2 错误响应格式

所有错误响应都遵循统一的格式：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {
      // 可选的详细错误信息
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 6.3 常见错误场景

#### 6.3.1 资源不存在错误

**场景**：项目、队列或任务不存在

**处理**：
- 返回 404 错误
- 错误码：`RESOURCE_NOT_FOUND`
- 在 `details` 中提供资源标识信息

#### 6.3.2 参数验证错误

**场景**：请求参数格式不正确或不符合业务规则

**处理**：
- 返回 400 错误
- 错误码：`VALIDATION_ERROR`
- 在 `details` 中提供字段和原因

#### 6.3.3 服务器错误

**场景**：数据库连接失败、查询执行失败等

**处理**：
- 返回 500 错误
- 错误码：`INTERNAL_ERROR`
- 记录错误日志

---

## 7. 性能优化建议

### 7.1 查询优化

1. **使用索引**：确保常用查询字段都建立了索引
   - `projects.projectId`（唯一索引）
   - `projects.lastTaskAt`（排序索引）
   - `queues(projectId, queueId)`（复合唯一索引）
   - `queues.lastTaskAt`（排序索引）
   - `tasks(queueId, taskId)`（复合唯一索引）
   - `tasks.status`（过滤索引）
   - `tasks.updatedAt`（排序索引）

2. **使用 select 排除大字段**：列表查询时排除 `tasks.messages` 和 `tasks.logs` 字段，提高查询性能

3. **使用聚合查询**：统计信息使用 MongoDB 聚合管道优化性能

4. **分页查询**：列表接口使用分页，避免一次性加载大量数据

5. **字段选择**：使用 `select` 只查询需要的字段
   - **列表查询**：必须排除 `tasks.messages` 和 `tasks.logs`
   - **详情查询**：返回完整字段，包括 `messages` 和 `logs`

### 7.2 缓存策略

1. **统计信息缓存**：全局统计信息可以缓存，定期更新（如 30 秒）

2. **项目列表缓存**：项目列表可以适当缓存，但要注意数据更新时及时失效

3. **任务详情缓存**：任务详情可以缓存，但要注意消息和日志更新时及时失效

### 7.3 数据库查询优化

1. **批量统计**：使用 `Promise.all` 并行执行多个统计查询

2. **避免全表扫描**：使用 `WHERE` 条件过滤，利用索引

3. **合理使用事务**：对于需要多个查询的操作，考虑使用事务确保一致性

---

## 8. 安全建议

### 8.1 数据验证

- 所有路径参数和查询参数必须验证
- 防止 SQL 注入（Prisma 自动处理）
- 限制分页参数范围（如 pageSize <= 100）
- 验证枚举值（如 status 必须是 pending/done/error）

### 8.2 错误信息

- 不要暴露敏感信息（如数据库错误详情）
- 返回友好的错误消息
- 记录详细错误日志用于排查

### 8.3 请求限制

- 考虑添加请求频率限制（Rate Limiting）
- 防止恶意请求
- 限制单次查询的数据量

---

## 9. 总结

本文档详细说明了 TaskEcho 系统的数据查询接口设计，包括：

1. **项目查询接口**：
   - `GET /api/v1/projects` - 获取项目列表（支持分页）
   - `GET /api/v1/projects/:projectId` - 获取项目详情

2. **任务队列查询接口**：
   - `GET /api/v1/projects/:projectId/queues` - 获取任务队列列表（支持搜索）
   - `GET /api/v1/projects/:projectId/queues/:queueId` - 获取任务队列详情

3. **任务查询接口**：
   - `GET /api/v1/projects/:projectId/queues/:queueId/tasks` - 获取任务列表（支持状态和标签过滤、分页）
   - `GET /api/v1/projects/:projectId/queues/:queueId/tasks/:taskId` - 获取任务详情（包含消息和日志）

4. **全局统计查询接口**：
   - `GET /api/v1/stats` - 获取全局统计信息

所有接口都遵循以下设计原则：

- **统一响应格式**：成功和错误响应都遵循统一格式
- **完整验证**：对路径参数、查询参数进行全面验证
- **错误处理**：统一的错误码和错误响应格式
- **性能优化**：利用索引、聚合查询、分页等优化查询性能
- **安全建议**：数据验证、错误信息处理、请求限制

这些接口为前端页面提供完整的数据支持，确保用户能够流畅地浏览和查看项目、任务队列和任务的详细信息。
