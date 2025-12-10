# TaskEcho 拉取功能使用指南

## 概述

TaskEcho 拉取功能允许客户端从服务器获取服务端创建或编辑的任务。系统支持项目级任务和队列级任务的拉取，并提供完整的拉取状态管理和统计功能。

## 核心概念

### 任务来源（Source）

- **server**：服务端创建的任务，可以通过拉取接口获取
- **client**：客户端推送的任务，不会出现在拉取结果中

### 拉取状态

- **未拉取**：`pulled_at` 为 `null`，任务可以被拉取
- **已拉取**：`pulled_at` 不为 `null`，任务已被某个客户端拉取，其他客户端无法拉取
- **已释放**：通过释放接口重置 `pulled_at` 为 `null`，任务可以重新被拉取

### 拉取流程

1. **拉取任务**：客户端调用拉取接口，获取服务端任务
2. **处理任务**：客户端处理任务（执行、更新等）
3. **推送更新**：客户端通过 submit 接口推送更新后的任务
4. **释放锁定**（可选）：如果处理失败，可以释放拉取锁定，使任务重新可拉取

## 基本使用

### 1. 拉取项目级任务

```bash
# 拉取项目级任务（最多10个）
curl -X GET "http://localhost:3000/api/v1/projects/my-project/tasks/pull?limit=10" \
  -H "X-API-Key: your-api-key"
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "task_id": "task-001",
        "name": "任务名称",
        "prompt": "任务提示",
        "status": "pending",
        "source": "server",
        "pulled_at": "2024-01-01T01:00:00.000Z",
        "pulled_by": "client-001"
      }
    ],
    "pulled_count": 1
  }
}
```

### 2. 拉取队列任务

```bash
# 拉取指定队列中的任务
curl -X GET "http://localhost:3000/api/v1/projects/my-project/queues/my-queue/tasks/pull?limit=10" \
  -H "X-API-Key: your-api-key"
```

### 3. 按状态过滤拉取

```bash
# 只拉取 pending 状态的任务
curl -X GET "http://localhost:3000/api/v1/projects/my-project/tasks/pull?status=pending&limit=10" \
  -H "X-API-Key: your-api-key"
```

### 4. 批量拉取

```bash
# 批量拉取任务
curl -X POST "http://localhost:3000/api/v1/projects/my-project/tasks/pull/batch" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "status": "pending",
      "limit": 20
    }
  }'
```

### 5. 释放拉取锁定

如果任务处理失败，可以释放拉取锁定：

```bash
# 释放单个任务的拉取锁定
curl -X POST "http://localhost:3000/api/v1/projects/my-project/tasks/task-001/pull/release" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 6. 推送更新后的任务

处理完成后，通过 submit 接口推送更新：

```bash
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
      "status": "done",
      "report": ".flow/tasks/report/task-001.md"
    }]
  }'
```

## 高级功能

### 1. 拉取统计

查看项目的拉取统计信息：

```bash
curl -X GET "http://localhost:3000/api/v1/projects/my-project/tasks/pull/stats" \
  -H "X-API-Key: your-api-key"
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "total_server_tasks": 100,
    "not_pulled": 50,
    "pulled": 50,
    "pull_success_rate": 95.5,
    "average_pull_duration": 3600
  }
}
```

### 2. 拉取历史

查看任务的拉取历史记录：

```bash
curl -X GET "http://localhost:3000/api/v1/projects/my-project/tasks/task-001/pull/history" \
  -H "X-API-Key: your-api-key"
```

### 3. 未推送任务列表

查询已拉取但未推送的任务（可能超时）：

```bash
curl -X GET "http://localhost:3000/api/v1/projects/my-project/tasks/pull/pending?timeout=3600" \
  -H "X-API-Key: your-api-key"
```

### 4. 批量释放

批量释放多个任务的拉取锁定：

```bash
curl -X POST "http://localhost:3000/api/v1/projects/my-project/tasks/pull/release/batch" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "taskIds": ["task-001", "task-002", "task-003"]
  }'
```

## 最佳实践

### 1. 拉取频率控制

- 建议使用合理的拉取频率，避免频繁请求
- 系统对拉取操作进行限流，超过限制会返回 429 状态码
- 建议使用轮询机制，间隔时间不少于 5 秒

### 2. 错误处理

- 拉取失败时，检查 HTTP 状态码和错误信息
- 429 状态码表示限流，需要等待后重试
- 404 状态码表示项目或队列不存在

### 3. 任务处理

- 拉取任务后，尽快处理并推送更新
- 如果处理失败，及时释放拉取锁定
- 系统会自动释放超过 1 小时未推送的任务

### 4. 幂等性

- 拉取操作是原子的，不会重复拉取同一任务
- 推送更新时，使用相同的 `task_id` 可以更新现有任务
- 释放操作是幂等的，可以多次调用

## 常见问题

### Q1: 为什么拉取不到任务？

**可能原因**：
1. 任务 `source` 不是 `'server'`
2. 任务已被其他客户端拉取（`pulled_at` 不为 null）
3. 任务已被删除（`deleted_at` 不为 null）
4. 任务已过期（`expires_at < now`）

**解决方法**：
- 检查任务状态和来源
- 使用拉取统计接口查看可用任务数量
- 检查是否有未推送的超时任务

### Q2: 如何处理拉取限流？

**解决方法**：
- 降低拉取频率
- 使用批量拉取接口减少请求次数
- 检查响应头中的 `X-RateLimit-Remaining` 和 `X-RateLimit-Reset`

### Q3: 任务拉取后如何处理？

**推荐流程**：
1. 拉取任务
2. 处理任务（执行、更新等）
3. 通过 submit 接口推送更新
4. 如果处理失败，释放拉取锁定

### Q4: 如何查看任务的拉取历史？

使用拉取历史接口：
```bash
GET /api/v1/projects/{projectId}/tasks/{taskId}/pull/history
```

## 参考文档

- [拉取功能 API 文档](../api-guid/pull-api.md)
- [任务管理 API 文档](../api-guid/task-management-api.md)
- [队列操作 API 文档](../api-guid/queue-operations-api.md)
- [数据库设计文档](../spec/database-design.md)







