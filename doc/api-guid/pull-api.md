# TaskEcho 拉取功能 API 文档

## 概述

拉取功能允许客户端从服务器获取服务端创建或编辑的任务。系统支持项目级任务和队列级任务的拉取，并提供完整的拉取状态管理和统计功能。

## 基础信息

- **Base URL**: `http://localhost:3000` (开发环境)
- **API 版本**: `v1`
- **API 前缀**: `/api/v1`
- **认证方式**: API Key（通过 `X-API-Key` header）
- **响应格式**: JSON

---

## 1. 拉取项目级任务

### GET `/api/v1/projects/[projectId]/tasks/pull`

拉取项目级任务（不属于任何队列的任务）。

**路径参数**:
- `projectId` (string, 必填): 项目ID

**查询参数**:
| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| `status` | string | 否 | 任务状态过滤: `pending`, `running`, `done`, `error`, `cancelled` | 全部 |
| `limit` | number | 否 | 拉取数量限制，最大 100 | `10` |
| `priority` | string/number | 否 | 优先级过滤 | 全部 |
| `since` | string | 否 | ISO 8601 时间戳，只拉取此时间之后创建或修改的任务 | 全部 |

**请求示例**:
```bash
curl -X GET "http://localhost:3000/api/v1/projects/my-project/tasks/pull?status=pending&limit=10" \
  -H "X-API-Key: your-api-key"
```

**响应数据结构**:
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "task_id": "task-001",
        "id": "task-001",
        "name": "任务名称",
        "prompt": "任务提示",
        "spec_file": [".flow/skills/test.md"],
        "status": "pending",
        "source": "server",
        "priority": 5,
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T00:00:00.000Z",
        "server_modified_at": "2024-01-01T00:00:00.000Z",
        "pulled_at": "2024-01-01T01:00:00.000Z",
        "pulled_by": "client-001"
      }
    ],
    "pulled_count": 1
  },
  "message": "拉取成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**HTTP 状态码**:
- `200`: 成功
- `400`: 参数错误
- `401`: 未授权
- `404`: 项目不存在
- `429`: 拉取限流

**说明**:
- 拉取操作是原子的，使用 `findOneAndUpdate` 确保不会重复拉取
- 拉取后，任务的 `pulled_at` 和 `pulled_by` 字段会被设置
- 只拉取 `source='server'` 且 `pulled_at=null` 且 `deleted_at=null` 的任务
- 按优先级排序（高优先级优先）

---

## 2. 拉取队列任务

### GET `/api/v1/projects/[projectId]/queues/[queueId]/tasks/pull`

拉取指定队列中的任务。

**路径参数**:
- `projectId` (string, 必填): 项目ID
- `queueId` (string, 必填): 队列ID

**查询参数**: 同项目级拉取接口

**请求示例**:
```bash
curl -X GET "http://localhost:3000/api/v1/projects/my-project/queues/my-queue/tasks/pull?limit=10" \
  -H "X-API-Key: your-api-key"
```

**响应数据结构**: 同项目级拉取接口

---

## 3. 批量拉取

### POST `/api/v1/projects/[projectId]/tasks/pull/batch`

批量拉取任务，支持按ID或过滤器拉取。

**路径参数**:
- `projectId` (string, 必填): 项目ID

**请求体**:
```json
{
  "taskIds": ["task-001", "task-002"],
  "filters": {
    "status": "pending",
    "limit": 10
  }
}
```

**响应数据结构**: 同拉取接口，包含成功和失败的任务列表

---

## 4. 释放拉取锁定

### POST `/api/v1/projects/[projectId]/tasks/[taskId]/pull/release`

释放单个任务的拉取锁定，使任务可以重新被拉取。

**路径参数**:
- `projectId` (string, 必填): 项目ID
- `taskId` (string, 必填): 任务ID

**请求体**:
```json
{}
```

**响应数据结构**:
```json
{
  "success": true,
  "data": {
    "task_id": "task-001",
    "released": true
  },
  "message": "释放成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 5. 批量释放拉取锁定

### POST `/api/v1/projects/[projectId]/tasks/pull/release/batch`

批量释放多个任务的拉取锁定。

**路径参数**:
- `projectId` (string, 必填): 项目ID

**请求体**:
```json
{
  "taskIds": ["task-001", "task-002"]
}
```

**响应数据结构**:
```json
{
  "success": true,
  "data": {
    "released_count": 2,
    "failed_count": 0,
    "failed_tasks": []
  },
  "message": "批量释放成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 6. 拉取统计

### GET `/api/v1/projects/[projectId]/tasks/pull/stats`

获取项目的拉取统计信息。

**路径参数**:
- `projectId` (string, 必填): 项目ID

**响应数据结构**:
```json
{
  "success": true,
  "data": {
    "total_server_tasks": 100,
    "not_pulled": 50,
    "pulled": 50,
    "pull_success_rate": 95.5,
    "average_pull_duration": 3600
  },
  "message": "查询成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 7. 拉取历史

### GET `/api/v1/projects/[projectId]/tasks/[taskId]/pull/history`

获取任务的拉取历史记录。

**路径参数**:
- `projectId` (string, 必填): 项目ID
- `taskId` (string, 必填): 任务ID

**响应数据结构**:
```json
{
  "success": true,
  "data": {
    "pull_history": [
      {
        "pulled_at": "2024-01-01T00:00:00.000Z",
        "pulled_by": "client-001",
        "released_at": "2024-01-01T01:00:00.000Z",
        "released_by": "client-001"
      }
    ]
  },
  "message": "查询成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 8. 未推送任务列表

### GET `/api/v1/projects/[projectId]/tasks/pull/pending`

查询已拉取但未推送的任务（可能超时）。

**路径参数**:
- `projectId` (string, 必填): 项目ID

**查询参数**:
| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| `timeout` | number | 否 | 超时时间（秒），只返回超过此时间未推送的任务 | `3600` |

**响应数据结构**:
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "task_id": "task-001",
        "name": "超时任务",
        "pulled_at": "2024-01-01T00:00:00.000Z",
        "pulled_by": "client-001",
        "timeout_hours": 2
      }
    ],
    "total": 1
  },
  "message": "查询成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 错误码说明

| 错误码 | HTTP 状态码 | 说明 |
|--------|-------------|------|
| `VALIDATION_ERROR` | 400 | 参数验证失败 |
| `UNAUTHORIZED` | 401 | 未授权 |
| `RESOURCE_NOT_FOUND` | 404 | 资源不存在 |
| `RATE_LIMIT_EXCEEDED` | 429 | 拉取限流 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

---

## 注意事项

1. **原子操作**: 所有拉取操作使用 MongoDB 的原子操作，确保不会重复拉取
2. **拉取限流**: 系统对拉取操作进行限流，超过限制会返回 429 状态码
3. **超时释放**: 系统会自动释放超过 `pull_timeout`（默认1小时）未推送的任务
4. **优先级**: 拉取时按优先级排序，高优先级任务优先拉取
5. **软删除**: 已删除的任务（`deleted_at` 不为 null）不会被拉取

---

## 使用示例

### 基本拉取流程

```bash
# 1. 拉取项目级任务
curl -X GET "http://localhost:3000/api/v1/projects/my-project/tasks/pull?limit=10" \
  -H "X-API-Key: your-api-key"

# 2. 处理任务...

# 3. 如果处理失败，释放拉取锁定
curl -X POST "http://localhost:3000/api/v1/projects/my-project/tasks/task-001/pull/release" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d "{}"

# 4. 如果处理成功，通过 submit 接口推送更新后的任务
curl -X POST "http://localhost:3000/api/v1/submit" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "my-project",
    "project_name": "我的项目",
    "queue_id": "my-queue",
    "queue_name": "我的队列",
    "tasks": [{
      "id": "task-001",
      "name": "更新后的任务",
      "prompt": "更新后的提示",
      "status": "done"
    }]
  }'
```

---

## 参考文档

- [任务管理 API](./task-management-api.md)
- [队列操作 API](./queue-operations-api.md)
- [数据库设计文档](../spec/database-design.md)




