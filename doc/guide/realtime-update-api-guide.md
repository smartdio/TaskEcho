# TaskEcho 实时更新机制 API 说明文档

本文档说明 TaskEcho 系统的实时更新机制，包括轮询方案、数据缓存策略和智能轮询策略，为前端开发提供实时数据更新能力。

## 概述

TaskEcho 使用**轮询方案**实现实时数据更新，通过定时请求后端 API 接口来检查数据更新。该方案实现简单、兼容性好，适合单用户本地应用场景。

## 轮询策略

### 不同页面的轮询频率

| 页面 | 轮询接口 | 轮询频率 | 说明 |
|------|---------|---------|------|
| **首页** | `GET /api/v1/projects`<br>`GET /api/v1/stats` | 30 秒 | 项目列表和全局统计更新频率较低 |
| **项目详情页** | `GET /api/v1/projects/:projectId`<br>`GET /api/v1/projects/:projectId/queues` | 30 秒 | 任务队列列表更新频率较低 |
| **任务队列详情页** | `GET /api/v1/projects/:projectId/queues/:queueId`<br>`GET /api/v1/projects/:projectId/queues/:queueId/tasks` | 30 秒 | 任务列表更新频率较低 |
| **任务详情页** | `GET /api/v1/projects/:projectId/queues/:queueId/tasks/:taskId` | 5-10 秒 | 对话消息和日志需要更频繁的更新 |

### 智能轮询策略

#### 页面可见性控制

- **页面可见时**：正常轮询
- **页面隐藏时**：暂停轮询（使用 `document.visibilitychange` 事件）
- **页面重新可见时**：立即执行一次轮询，然后恢复正常轮询

#### 用户交互优化

- **用户正在搜索/过滤时**：延迟轮询（避免打断用户操作）
- **用户正在输入时**：暂停轮询
- **用户滚动查看历史消息时**：暂停轮询（任务详情页）

#### 网络状态感知

- **网络离线时**：暂停轮询
- **网络恢复时**：立即执行一次轮询
- **请求失败时**：指数退避重试（1秒、2秒、4秒...）

## API 端点说明

### 1. 首页数据接口

#### GET /api/v1/projects

获取项目列表，支持分页。

**请求参数**:
- `page` (number, 可选): 页码，默认 1
- `pageSize` (number, 可选): 每页数量，默认 20

**响应示例**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "507f1f77bcf86cd799439011",
        "project_id": "project_001",
        "name": "示例项目",
        "queue_count": 5,
        "task_count": 20,
        "task_stats": {
          "total": 20,
          "pending": 5,
          "done": 10,
          "error": 5
        },
        "last_task_at": "2024-01-01T00:00:00Z",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 1,
      "totalPages": 1
    }
  },
  "message": "操作成功",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### GET /api/v1/stats

获取全局统计信息。

**响应示例**:
```json
{
  "success": true,
  "data": {
    "project_count": 10,
    "queue_count": 50,
    "task_count": 200,
    "task_stats": {
      "total": 200,
      "pending": 50,
      "done": 100,
      "error": 50
    }
  },
  "message": "操作成功",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 2. 项目详情页接口

#### GET /api/v1/projects/:projectId

获取项目详情。

**路径参数**:
- `projectId` (string, 必填): 项目ID

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "project_id": "project_001",
    "name": "示例项目",
    "queue_count": 5,
    "task_count": 20,
    "task_stats": {
      "total": 20,
      "pending": 5,
      "done": 10,
      "error": 5
    },
    "last_task_at": "2024-01-01T00:00:00Z",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "message": "操作成功",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### GET /api/v1/projects/:projectId/queues

获取项目下的任务队列列表。

**路径参数**:
- `projectId` (string, 必填): 项目ID

**响应示例**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "507f1f77bcf86cd799439012",
        "queue_id": "queue_001",
        "name": "任务队列1",
        "task_count": 10,
        "task_stats": {
          "total": 10,
          "pending": 3,
          "done": 5,
          "error": 2
        },
        "last_task_at": "2024-01-01T00:00:00Z",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 1,
      "totalPages": 1
    }
  },
  "message": "操作成功",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 3. 任务队列详情页接口

#### GET /api/v1/projects/:projectId/queues/:queueId

获取任务队列详情。

**路径参数**:
- `projectId` (string, 必填): 项目ID
- `queueId` (string, 必填): 任务队列ID

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "queue_id": "queue_001",
    "name": "任务队列1",
    "task_count": 10,
    "task_stats": {
      "total": 10,
      "pending": 3,
      "done": 5,
      "error": 2
    },
    "last_task_at": "2024-01-01T00:00:00Z",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "message": "操作成功",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### GET /api/v1/projects/:projectId/queues/:queueId/tasks

获取任务队列下的任务列表。

**路径参数**:
- `projectId` (string, 必填): 项目ID
- `queueId` (string, 必填): 任务队列ID

**请求参数**:
- `page` (number, 可选): 页码，默认 1
- `pageSize` (number, 可选): 每页数量，默认 20
- `status` (string, 可选): 状态过滤（pending/done/error）
- `tags` (string, 可选): 标签过滤（逗号分隔）

**响应示例**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "507f1f77bcf86cd799439013",
        "task_id": "task_001",
        "name": "测试任务",
        "status": "pending",
        "tags": ["test", "urgent"],
        "message_count": 5,
        "log_count": 10,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 1,
      "totalPages": 1
    }
  },
  "message": "操作成功",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 4. 任务详情页接口

#### GET /api/v1/projects/:projectId/queues/:queueId/tasks/:taskId

获取任务详情（包含消息和日志）。

**路径参数**:
- `projectId` (string, 必填): 项目ID
- `queueId` (string, 必填): 任务队列ID
- `taskId` (string, 必填): 任务ID

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439013",
    "task_id": "task_001",
    "name": "测试任务",
    "status": "pending",
    "tags": ["test", "urgent"],
    "messages": [
      {
        "id": "msg_001",
        "role": "user",
        "content": "用户消息内容",
        "created_at": "2024-01-01T00:00:00Z"
      },
      {
        "id": "msg_002",
        "role": "assistant",
        "content": "AI回复内容",
        "created_at": "2024-01-01T00:01:00Z"
      }
    ],
    "logs": [
      {
        "id": "log_001",
        "content": "执行日志内容",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "message": "操作成功",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**注意**: 任务详情页使用增量更新机制，只检测和添加新消息、新日志，不重新渲染全部内容。

## 数据缓存策略

### React Query 缓存配置

系统使用 React Query 进行数据缓存管理，全局配置如下：

- **staleTime**: 30秒（数据在30秒内认为是新鲜的）
- **gcTime**: 5分钟（数据在5分钟内保留在缓存中）
- **refetchOnWindowFocus**: true（窗口聚焦时重新获取）
- **refetchOnReconnect**: true（网络重连时重新获取）
- **retry**: 3次（失败重试3次）
- **retryDelay**: 指数退避（1秒、2秒、4秒...，最大30秒）

### 缓存失效策略

- **时间失效**: 数据超过缓存时间后自动失效
- **事件失效**: 用户操作触发数据更新时，立即失效相关缓存
- **手动失效**: 提供手动刷新按钮

## 性能优化

### 请求去重

系统实现了请求去重机制，防止并发请求：

```javascript
import { fetchWithDeduplication } from '@/lib/fetch-utils'

// 相同的URL只发起一次请求
const response = await fetchWithDeduplication('/api/v1/projects')
```

### 条件请求

支持使用 `If-Modified-Since` 头进行条件请求：

```javascript
import { fetchWithConditionalRequest } from '@/lib/fetch-utils'

// 如果数据未更新，返回304状态码
const { data, modified } = await fetchWithConditionalRequest(
  '/api/v1/projects',
  lastModifiedDate
)
```

### 请求合并

首页等页面使用请求合并，同时获取多个接口的数据：

```javascript
// 并行请求项目列表和统计
const [projects, stats] = await Promise.all([
  fetch('/api/v1/projects').then(res => res.json()),
  fetch('/api/v1/stats').then(res => res.json())
])
```

## 使用示例

### 基础轮询

```javascript
import { usePolling } from '@/hooks/usePolling'

function MyComponent() {
  const { data, isLoading, error, refetch } = usePolling(
    async () => {
      const response = await fetch('/api/v1/projects')
      const result = await response.json()
      return result.data
    },
    30000, // 30秒轮询间隔
    {
      onSuccess: (data) => {
        console.log('数据更新:', data)
      },
      onError: (error) => {
        console.error('请求失败:', error)
      }
    }
  )

  return (
    <div>
      {isLoading && <p>加载中...</p>}
      {error && <p>错误: {error.message}</p>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
      <button onClick={refetch}>手动刷新</button>
    </div>
  )
}
```

### 页面可见性感知轮询

```javascript
import { useVisibilityAwarePolling } from '@/hooks/useVisibilityAwarePolling'

function MyComponent() {
  const { data, isLoading } = useVisibilityAwarePolling(
    async () => {
      const response = await fetch('/api/v1/projects')
      const result = await response.json()
      return result.data
    },
    30000 // 30秒轮询间隔，页面隐藏时自动暂停
  )

  // ...
}
```

### 增量更新（任务详情页）

```javascript
import { useIncrementalUpdate } from '@/hooks/useIncrementalUpdate'

function TaskDetailPage({ projectId, queueId, taskId }) {
  const { data, isLoading, refetch } = useIncrementalUpdate(
    async () => {
      const response = await fetch(
        `/api/v1/projects/${projectId}/queues/${queueId}/tasks/${taskId}`
      )
      const result = await response.json()
      return result.data
    },
    5000, // 5秒轮询间隔
    {
      onNewMessages: (newMessages) => {
        console.log('新消息:', newMessages)
        // 自动滚动到底部
      },
      onNewLogs: (newLogs) => {
        console.log('新日志:', newLogs)
      },
      onStatusChange: (newStatus, oldStatus) => {
        console.log(`状态变化: ${oldStatus} -> ${newStatus}`)
      }
    }
  )

  // ...
}
```

## 注意事项

1. **轮询频率**: 不要设置过高的轮询频率，避免对服务器造成过大压力
2. **页面可见性**: 页面隐藏时会自动暂停轮询，节省资源
3. **错误处理**: 请求失败时会自动重试，使用指数退避策略
4. **数据一致性**: 使用增量更新机制确保数据一致性，避免重复渲染
5. **网络状态**: 网络离线时会自动暂停轮询，网络恢复后立即恢复

## 相关文档

- [API 接口说明文档](./api-guide.md)
- [实时更新机制设计文档](../doc/spec/realtime-update-design.md)
