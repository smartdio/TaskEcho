# TaskEcho API 接口说明文档

本文档列出 TaskEcho 系统的所有 API 端点，包括请求和响应数据结构，供前端开发使用。

## 基础信息

- **Base URL**: `http://localhost:3000` (开发环境)
- **API 版本**: `v1`
- **API 前缀**: `/api/v1`
- **认证方式**: API Key（通过 `X-API-Key` header，仅提交接口需要）
- **响应格式**: JSON

## 统一响应格式

### 成功响应

```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {}
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## 1. 数据提交接口

### POST /api/v1/submit

提交项目、任务队列和批量任务数据（完全幂等操作）。

**认证**: 需要 API Key (`X-API-Key` header)

**请求头**:
```
Content-Type: application/json
X-API-Key: <api_key_value>
```

**请求体**:
```json
{
  "project_id": "project_001",
  "project_name": "示例项目",
  "queue_id": "queue_001",
  "queue_name": "任务队列1",
  "meta": {
    "prompts": [".flow/skills/spcewriter.md"]
  },
  "tasks": [
    {
      "id": "1",
      "name": "编写系统基础框架的实现方案",
      "prompt": "请编写系统基础框架的实现方案...",
      "spec_file": [".flow/skills/spcewriter.md", "doc/requirement.md"],
      "status": "pending",
      "report": null,
      "messages": [
        {
          "role": "user",
          "content": "用户消息内容"
        },
        {
          "role": "assistant",
          "content": "AI回复内容"
        }
      ],
      "logs": [
        {
          "content": "执行日志内容"
        }
      ]
    }
  ]
}
```

**请求参数说明**:

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `project_id` | string | 是 | 项目外部唯一标识，用于幂等性判断 | `"project_001"` |
| `project_name` | string | 是 | 项目显示名称，如果项目已存在则更新此名称 | `"示例项目"` |
| `queue_id` | string | 是 | 任务队列外部唯一标识（在项目内唯一） | `"queue_001"` |
| `queue_name` | string | 是 | 任务队列显示名称，如果队列已存在则更新此名称 | `"任务队列1"` |
| `meta` | object | 否 | 元数据信息（类似 prompts） | `{"prompts": [".flow/skills/spcewriter.md"]}` |
| `tasks` | array | 是 | 任务数组，至少包含一个任务 | `[{...}]` |

**任务对象 (tasks[]) 参数说明**:

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `id` | string | 是 | 任务ID（在队列内唯一） | `"1"` |
| `name` | string | 是 | 任务名称 | `"编写系统基础框架的实现方案"` |
| `prompt` | string | 是 | 任务提示文本 | `"请编写系统基础框架的实现方案..."` |
| `spec_file` | array[string] | 否 | 规范文件路径数组 | `[".flow/skills/spcewriter.md"]` |
| `status` | string | 是 | 任务状态，必须是 `pending`、`done` 或 `error` | `"pending"` |
| `report` | string | 否 | 报告文件路径 | `".flow/tasks/report/xxx.md"` |
| `messages` | array[object] | 否 | 对话消息数组 | `[{...}]` |
| `logs` | array[object] | 否 | 执行日志数组 | `[{...}]` |

**消息对象 (messages[]) 参数说明**:

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `role` | string | 是 | 消息角色，必须是 `user` 或 `assistant` | `"user"` |
| `content` | string | 是 | 消息内容，支持 Markdown 格式 | `"请帮我实现登录功能"` |

**日志对象 (logs[]) 参数说明**:

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `content` | string | 是 | 日志内容 | `"执行错误日志"` |

**响应** (200):
```json
{
  "success": true,
  "data": {
    "project_id": "project_001",
    "queue_id": "queue_001",
    "tasks_count": 3,
    "created_tasks": 2,
    "updated_tasks": 1
  },
  "message": "提交成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**响应字段说明**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `data.project_id` | string | 项目外部标识 |
| `data.queue_id` | string | 任务队列外部标识 |
| `data.tasks_count` | number | 本次提交的任务总数 |
| `data.created_tasks` | number | 新创建的任务数量 |
| `data.updated_tasks` | number | 更新的任务数量 |

**错误响应** (400 - 参数验证失败):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": {
      "field": "project_id",
      "reason": "project_id 不能为空",
      "all_errors": [
        {"field": "project_id", "reason": "project_id 不能为空"},
        {"field": "tasks[0].id", "reason": "id 不能为空"}
      ]
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**错误响应** (401 - API Key 无效):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "API Key 无效或缺失",
    "details": {}
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**幂等性说明**:
- 该接口完全幂等，重复调用相同数据不会产生重复记录
- 项目：根据 `project_id` 判断存在性，不存在则创建，存在则更新名称
- 队列：根据 `project_id` + `queue_id` 判断存在性，不存在则创建，存在则更新名称和任务数组
- 任务：采用完全替换策略，每次提交时完全替换队列的 `tasks` 数组，确保幂等性

**使用示例**:
```bash
curl -X POST http://localhost:3000/api/v1/submit \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk-xxxxxxxxxxxxxxxx" \
  -d '{
    "project_id": "project_001",
    "project_name": "示例项目",
    "queue_id": "queue_001",
    "queue_name": "任务队列1",
    "tasks": [
      {
        "id": "1",
        "name": "测试任务",
        "prompt": "任务提示文本",
        "status": "pending"
      }
    ]
  }'
```

## 2. 增量更新接口

增量更新接口用于在任务创建后对任务进行增量更新操作，包括追加对话消息、追加执行日志、修改任务状态等。

### POST /api/v1/tasks/:projectId/:queueId/:taskId/message

追加单条对话消息到指定任务。

**认证**: 需要 API Key (`X-API-Key` header)

**路径参数**:
- `projectId`: 项目外部唯一标识（1-255字符）
- `queueId`: 任务队列外部唯一标识（在项目内唯一，1-255字符）
- `taskId`: 任务外部唯一标识（在队列内唯一，1-255字符）

**请求头**:
```
Content-Type: application/json
X-API-Key: <api_key_value>
```

**请求体**:
```json
{
  "role": "user",
  "content": "新的消息内容"
}
```

**请求参数说明**:

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `role` | string | 是 | 消息角色，必须是 `user` 或 `assistant`（不区分大小写） | `"user"` |
| `content` | string | 是 | 消息内容，支持 Markdown 格式，长度 1-100000 字符 | `"请帮我实现登录功能"` |

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "message_id": 0,
    "role": "USER",
    "content": "新的消息内容",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "消息追加成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**响应字段说明**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `data.message_id` | number | 消息在任务中的索引位置（从0开始） |
| `data.role` | string | 消息角色（USER/ASSISTANT，大写） |
| `data.content` | string | 消息内容 |
| `data.created_at` | string | 消息创建时间（ISO 8601 格式） |

**错误响应** (401 - API Key 无效):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "API Key 无效或缺失",
    "details": {}
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**错误响应** (404 - 任务不存在):
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "任务不存在",
    "details": {
      "project_id": "project_001",
      "queue_id": "queue_001",
      "task_id": "task_001"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**错误响应** (400 - 参数验证失败):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": {
      "field": "role",
      "reason": "role 必须是 user 或 assistant",
      "all_errors": [
        {"field": "role", "reason": "role 必须是 user 或 assistant"}
      ]
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**使用示例**:
```bash
curl -X POST http://localhost:3000/api/v1/tasks/project_001/queue_001/task_001/message \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk-xxxxxxxxxxxxxxxx" \
  -d '{
    "role": "user",
    "content": "请帮我实现用户登录功能"
  }'
```

**注意事项**:
- 消息采用追加模式，不会覆盖历史消息
- 每次追加消息后，任务的 `updatedAt` 时间戳会自动更新
- 项目的 `lastTaskAt` 和队列的 `lastTaskAt` 也会自动更新

---

### POST /api/v1/tasks/:projectId/:queueId/:taskId/log

追加任务执行日志。

**认证**: 需要 API Key (`X-API-Key` header)

**路径参数**: 同追加消息接口

**请求头**:
```
Content-Type: application/json
X-API-Key: <api_key_value>
```

**请求体**:
```json
{
  "content": "日志内容"
}
```

**请求参数说明**:

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `content` | string | 是 | 日志内容（纯文本），长度 1-100000 字符，自动添加时间戳 | `"开始执行任务..."` |

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "log_id": 0,
    "content": "开始执行任务...",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "日志追加成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**响应字段说明**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `data.log_id` | number | 日志在任务中的索引位置（从0开始） |
| `data.content` | string | 日志内容 |
| `data.created_at` | string | 日志创建时间（ISO 8601 格式，自动时间戳） |

**错误响应**: 同追加消息接口（401、404、400）

**使用示例**:
```bash
curl -X POST http://localhost:3000/api/v1/tasks/project_001/queue_001/task_001/log \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk-xxxxxxxxxxxxxxxx" \
  -d '{
    "content": "开始执行任务，正在初始化..."
  }'
```

**注意事项**:
- 日志采用追加模式，不会覆盖历史日志
- 日志追加**不会**更新任务的 `updatedAt` 时间戳（因为日志是辅助信息）
- 日志追加**不会**更新项目/队列的 `lastTaskAt` 时间戳

---

### PATCH /api/v1/tasks/:projectId/:queueId/:taskId/status

修改任务状态。

**认证**: 需要 API Key (`X-API-Key` header)

**路径参数**: 同追加消息接口

**请求头**:
```
Content-Type: application/json
X-API-Key: <api_key_value>
```

**请求体**:
```json
{
  "status": "done"
}
```

**请求参数说明**:

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `status` | string | 是 | 任务状态，必须是 `pending`、`done` 或 `error`（不区分大小写） | `"done"` |

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "task_id": "task_001",
    "status": "DONE",
    "previous_status": "PENDING",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "状态更新成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**响应字段说明**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `data.task_id` | string | 任务外部标识 |
| `data.status` | string | 更新后的任务状态（PENDING/DONE/ERROR，大写） |
| `data.previous_status` | string | 更新前的任务状态（PENDING/DONE/ERROR，大写） |
| `data.updated_at` | string | 任务更新时间（ISO 8601 格式） |

**错误响应**: 同追加消息接口（401、404、400）

**使用示例**:
```bash
curl -X PATCH http://localhost:3000/api/v1/tasks/project_001/queue_001/task_001/status \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk-xxxxxxxxxxxxxxxx" \
  -d '{
    "status": "done"
  }'
```

**注意事项**:
- 状态更新是幂等操作，重复调用相同状态值结果一致
- 每次更新状态后，任务的 `updatedAt` 时间戳会自动更新
- 项目的 `lastTaskAt` 和队列的 `lastTaskAt` 也会自动更新
- 支持状态之间的任意转换（pending ↔ done ↔ error）

---

### 增量更新接口使用场景示例

**任务执行流程**:
```bash
# 1. 创建任务（通过 POST /api/v1/submit）
# 2. 追加执行日志
curl -X POST .../log -d '{"content": "开始执行任务..."}'

# 3. 追加用户消息
curl -X POST .../message -d '{"role": "user", "content": "请帮我实现登录功能"}'

# 4. 追加AI回复
curl -X POST .../message -d '{"role": "assistant", "content": "好的，我来帮你实现..."}'

# 5. 追加执行日志
curl -X POST .../log -d '{"content": "正在生成代码..."}'

# 6. 更新状态为完成
curl -X PATCH .../status -d '{"status": "done"}'

# 7. 追加完成日志
curl -X POST .../log -d '{"content": "任务执行完成"}'
```

## 3. 数据查询接口

### GET /api/v1/projects

获取项目列表（支持分页）。

**认证**: 不需要

**查询参数**:
- `page` (可选): 页码，从 1 开始，默认 1
- `pageSize` (可选): 每页数量，默认 20，最大 100

**响应** (200):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "507f1f77bcf86cd799439011",
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

**响应字段说明**:
- `data.items[].id`: 项目内部ID（数据库主键）
- `data.items[].project_id`: 项目外部唯一标识
- `data.items[].name`: 项目显示名称
- `data.items[].queue_count`: 项目下的任务队列数量
- `data.items[].task_count`: 项目下的任务总数
- `data.items[].task_stats`: 任务统计信息
  - `total`: 任务总数
  - `pending`: Pending 状态任务数
  - `done`: Done 状态任务数
  - `error`: Error 状态任务数
- `data.items[].last_task_at`: 最后任务更新时间（ISO 8601 格式，可能为 null）
- `data.pagination`: 分页信息
  - `page`: 当前页码
  - `pageSize`: 每页数量
  - `total`: 总记录数
  - `totalPages`: 总页数

**排序规则**: 按 `last_task_at`（最后任务更新时间）倒序排列，如果 `last_task_at` 为 NULL，按 `created_at`（创建时间）倒序排列。

**错误响应** (400):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "页码和每页数量必须大于 0"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET /api/v1/projects/:projectId

获取项目详情。

**认证**: 不需要

**路径参数**:
- `projectId`: 项目外部唯一标识（string，必填）

**响应** (200):
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
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

**响应字段说明**:
- `data.id`: 项目内部ID（数据库主键）
- `data.project_id`: 项目外部唯一标识
- `data.name`: 项目显示名称
- `data.queue_count`: 项目下的任务队列数量
- `data.task_count`: 项目下的任务总数
- `data.task_stats`: 任务统计信息
  - `total`: 任务总数
  - `pending`: Pending 状态任务数
  - `done`: Done 状态任务数
  - `error`: Error 状态任务数
- `data.last_task_at`: 最后任务更新时间（ISO 8601 格式，可能为 null）
- `data.created_at`: 创建时间（ISO 8601 格式）
- `data.updated_at`: 更新时间（ISO 8601 格式）

**错误响应** (404):
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

### GET /api/v1/projects/:projectId/queues

获取项目下的任务队列列表。

**认证**: 不需要

**路径参数**:
- `projectId`: 项目外部唯一标识（string，必填）

**查询参数**:
- `search` (可选): 队列名称搜索关键词（模糊匹配，不区分大小写）

**响应** (200):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "507f1f77bcf86cd799439011",
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

**响应字段说明**:
- `data.items[].id`: 队列内部ID（数据库主键）
- `data.items[].queue_id`: 队列外部唯一标识
- `data.items[].name`: 队列显示名称
- `data.items[].task_count`: 队列下的任务总数
- `data.items[].task_stats`: 任务统计信息
  - `total`: 任务总数
  - `pending`: Pending 状态任务数
  - `done`: Done 状态任务数
  - `error`: Error 状态任务数
- `data.items[].last_task_at`: 最后任务更新时间（ISO 8601 格式，可能为 null）
- `data.items[].created_at`: 创建时间（ISO 8601 格式）
- `data.items[].updated_at`: 更新时间（ISO 8601 格式）

**排序规则**: 按 `last_task_at`（最后任务更新时间）倒序排列，如果 `last_task_at` 为 NULL，按 `created_at`（创建时间）倒序排列。

**错误响应** (404):
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

**使用示例**:
```bash
# 获取项目下的所有队列
curl http://localhost:3000/api/v1/projects/project_001/queues

# 搜索队列名称包含"测试"的队列
curl "http://localhost:3000/api/v1/projects/project_001/queues?search=测试"
```

### GET /api/v1/projects/:projectId/queues/:queueId

获取任务队列详情。

**认证**: 不需要

**路径参数**:
- `projectId`: 项目外部唯一标识（string，必填）
- `queueId`: 任务队列外部唯一标识（string，必填）

**响应** (200):
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
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

**响应字段说明**:
- `data.id`: 队列内部ID（数据库主键）
- `data.queue_id`: 队列外部唯一标识
- `data.name`: 队列显示名称
- `data.task_count`: 队列下的任务总数
- `data.task_stats`: 任务统计信息
  - `total`: 任务总数
  - `pending`: Pending 状态任务数
  - `done`: Done 状态任务数
  - `error`: Error 状态任务数
- `data.last_task_at`: 最后任务更新时间（ISO 8601 格式，可能为 null）
- `data.created_at`: 创建时间（ISO 8601 格式）
- `data.updated_at`: 更新时间（ISO 8601 格式）

**错误响应** (404):
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

**使用示例**:
```bash
curl http://localhost:3000/api/v1/projects/project_001/queues/queue_001
```

### GET /api/v1/projects/:projectId/queues/:queueId/tasks

获取任务队列下的任务列表（支持状态过滤和分页）。

**认证**: 不需要

**路径参数**:
- `projectId`: 项目外部唯一标识（string，必填）
- `queueId`: 任务队列外部唯一标识（string，必填）

**查询参数**:
- `status` (可选): 状态过滤，`pending`、`done` 或 `error`（不区分大小写）
- `tags` (可选): 标签过滤，多个标签用逗号分隔（如 `tag1,tag2`）
- `page` (可选): 页码，从 1 开始，默认 1
- `pageSize` (可选): 每页数量，默认 20，最大 100

**响应** (200):
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

**响应字段说明**:
- `data.items[].id`: 任务ID（在队列内唯一）
- `data.items[].name`: 任务名称
- `data.items[].prompt`: 任务提示文本
- `data.items[].spec_file`: 规范文件路径数组
- `data.items[].status`: 任务状态（`pending`、`done`、`error`，小写）
- `data.items[].report`: 报告文件路径（可能为 null）
- `data.items[].updated_at`: 更新时间（ISO 8601 格式）
- `data.items[].created_at`: 创建时间（ISO 8601 格式）
- `data.pagination`: 分页信息
  - `page`: 当前页码
  - `pageSize`: 每页数量
  - `total`: 总记录数
  - `totalPages`: 总页数

**排序规则**: 按 `updated_at`（最后更新时间）倒序排列。

**注意**: 列表查询不包含 `messages` 和 `logs` 字段，只返回基本字段，提高查询性能。如需完整任务详情（包含对话历史和日志），请使用任务详情接口。

**错误响应** (400 - 参数验证失败):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "页码和每页数量必须大于 0"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**错误响应** (400 - 无效状态值):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "状态值无效，必须是 pending、done 或 error"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**错误响应** (404 - 项目或队列不存在):
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

**使用示例**:
```bash
# 获取所有任务
curl http://localhost:3000/api/v1/projects/project_001/queues/queue_001/tasks

# 获取 Pending 状态的任务
curl "http://localhost:3000/api/v1/projects/project_001/queues/queue_001/tasks?status=pending"

# 获取第2页，每页10条
curl "http://localhost:3000/api/v1/projects/project_001/queues/queue_001/tasks?page=2&pageSize=10"

# 组合查询：获取 Done 状态的任务，第1页，每页5条
curl "http://localhost:3000/api/v1/projects/project_001/queues/queue_001/tasks?status=done&page=1&pageSize=5"
```

### GET /api/v1/projects/:projectId/queues/:queueId/tasks/:taskId

获取任务详情，包含完整的对话历史和日志。

**认证**: 不需要

**路径参数**:
- `projectId`: 项目外部唯一标识
- `queueId`: 任务队列外部唯一标识
- `taskId`: 任务外部唯一标识

**响应** (200):
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

**响应字段说明**:

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

**错误响应** (404 - 项目、队列或任务不存在):
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

**使用示例**:
```bash
curl http://localhost:3000/api/v1/projects/project_001/queues/queue_001/tasks/task_001
```

**注意事项**:
- 详情查询返回完整的任务数据，包括 `messages` 和 `logs` 字段
- `messages` 按 `created_at` 正序排列（最早的消息在前）
- `logs` 按 `created_at` 倒序排列（最新的日志在前）
- 消息的 `role` 字段返回小写（`user` 或 `assistant`）

---

### GET /api/v1/stats

获取全局统计信息。

**认证**: 不需要

**响应** (200):
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

**响应字段说明**:
- `data.project_count`: 项目总数
- `data.queue_count`: 任务队列总数
- `data.task_count`: 任务总数
- `data.task_stats`: 任务统计信息
  - `total`: 任务总数
  - `pending`: Pending 状态任务数
  - `done`: Done 状态任务数
  - `error`: Error 状态任务数

## 4. API Key 管理接口

### GET /api/v1/api-keys

获取 API Key 列表。

**认证**: 不需要（本地管理）

**查询参数**:
- `page` (可选): 页码，从 1 开始，默认 1
- `pageSize` (可选): 每页数量，默认 20，最大 100
- `is_active` (可选): 过滤激活状态，`true` 或 `false`
- `project_id` (可选): 过滤项目ID

**响应** (200):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "507f1f77bcf86cd799439011",
        "name": "项目1 API Key",
        "key": "sk-****a011",
        "project_id": "project_001",
        "is_active": true,
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 1,
      "totalPages": 1
    }
  },
  "message": "查询成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET /api/v1/api-keys/:id

获取单个 API Key 详情。

**认证**: 不需要

**路径参数**:
- `id`: API Key 内部ID（MongoDB ObjectId）

**响应** (200):
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "项目1 API Key",
    "key": "sk-****a011",
    "project_id": "project_001",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "查询成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**错误响应** (404):
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "API Key 不存在",
    "details": {
      "id": "507f1f77bcf86cd799439011"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### POST /api/v1/api-keys

创建新的 API Key。

**认证**: 不需要

**请求体**:
```json
{
  "name": "项目1 API Key",
  "key": "sk-xxxxxxxxxxxxxxxx",
  "project_id": "project_001"
}
```

**请求参数说明**:
- `name` (必填): API Key 名称/标识，1-255 字符
- `key` (必填): API Key 值（原始值），1-255 字符
- `project_id` (可选): 关联的项目ID

**响应** (201):
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "项目1 API Key",
    "key": "sk-****a011",
    "project_id": "project_001",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "API Key 创建成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**错误响应** (400):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "API Key 值已存在",
    "details": {
      "field": "key"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### PUT /api/v1/api-keys/:id

更新 API Key 信息。

**认证**: 不需要

**路径参数**:
- `id`: API Key 内部ID

**请求体**:
```json
{
  "name": "更新后的名称",
  "project_id": "project_002",
  "is_active": true
}
```

**请求参数说明**:
- `name` (可选): API Key 名称
- `project_id` (可选): 关联的项目ID，设置为 `null` 可取消关联
- `is_active` (可选): 是否激活

**注意**: API Key 值（`key`）不支持更新，如需更换 key，应删除旧 key 并创建新 key。

**响应** (200):
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "更新后的名称",
    "key": "sk-****a011",
    "project_id": "project_002",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "API Key 更新成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### DELETE /api/v1/api-keys/:id

删除 API Key。

**认证**: 不需要

**路径参数**:
- `id`: API Key 内部ID

**响应** (200):
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011"
  },
  "message": "API Key 删除成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**错误响应** (404):
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "API Key 不存在",
    "details": {
      "id": "507f1f77bcf86cd799439011"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 错误码说明

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 |
| `RESOURCE_NOT_FOUND` | 404 | 资源不存在 |
| `INVALID_API_KEY` | 401 | API Key 无效或缺失 |
| `DUPLICATE_KEY` | 400 | 资源已存在（唯一约束冲突） |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

## 使用示例

### 创建 API Key

```bash
curl -X POST http://localhost:3000/api/v1/api-keys \
  -H "Content-Type: application/json" \
  -d '{
    "name": "项目1 API Key",
    "key": "sk-xxxxxxxxxxxxxxxx",
    "project_id": "project_001"
  }'
```

### 查询 API Key 列表

```bash
curl http://localhost:3000/api/v1/api-keys?page=1&pageSize=20
```

### 更新 API Key

```bash
curl -X PUT http://localhost:3000/api/v1/api-keys/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "更新后的名称",
    "is_active": false
  }'
```

### 删除 API Key

```bash
curl -X DELETE http://localhost:3000/api/v1/api-keys/507f1f77bcf86cd799439011
```

### 使用 API Key 认证

```bash
curl -X POST http://localhost:3000/api/v1/submit \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk-xxxxxxxxxxxxxxxx" \
  -d '{
    "project_id": "project_001",
    "project_name": "示例项目",
    "queue_id": "queue_001",
    "queue_name": "任务队列1",
    "tasks": []
  }'
```

## 安全说明

1. **API Key 存储**: API Key 值使用 bcrypt 单向哈希存储，无法还原原始值
2. **API Key 显示**: 前端显示时只显示部分字符（`sk-****` + 后4位ID），确保不会泄露完整的 API Key 值
3. **项目隔离**: 支持项目专属 API Key（`project_id` 不为空），项目专属 API Key 只能用于指定项目的数据提交
4. **状态控制**: 通过 `is_active` 字段控制 API Key 的有效性，禁用后立即无法通过认证
5. **请求安全**: API Key 必须通过请求头 `X-API-Key` 传递，不要在 URL 参数或请求体中传递
