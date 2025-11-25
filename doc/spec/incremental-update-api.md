# TaskEcho 增量更新接口设计文档

## 1. 概述

### 1.1 文档目的

本文档详细说明 TaskEcho 系统的增量更新接口设计，包括追加对话消息、追加执行日志、修改任务状态等接口的规范、参数和业务流程。

### 1.2 接口定位

增量更新接口是 TaskEcho 系统的**轻量级数据更新接口**，用于在任务创建后对任务进行增量更新操作。这些接口与核心提交接口（`POST /api/v1/submit`）配合使用，提供更灵活的数据更新方式。

### 1.3 核心特性

- **轻量级**：只更新特定字段，不覆盖其他数据
- **追加模式**：消息和日志采用追加模式，不删除历史数据
- **原子性操作**：每个接口操作都是原子性的
- **API Key 认证**：使用项目专属 API Key 进行安全认证
- **任务定位**：通过 `projectId + queueId + taskId` 精确定位任务

### 1.4 适用场景

- 外部系统在任务执行过程中追加对话消息
- 外部系统记录任务执行日志
- 外部系统更新任务状态（pending → done/error）
- 实时更新任务数据，无需全量替换

### 1.5 与核心提交接口的区别

| 特性 | 核心提交接口 (POST /api/v1/submit) | 增量更新接口 |
|------|-----------------------------------|-------------|
| **操作模式** | 全量替换 | 增量追加/更新 |
| **数据范围** | 项目、队列、任务完整数据 | 单个任务的特定字段 |
| **幂等性** | 完全幂等 | 追加操作非幂等 |
| **性能** | 较重，适合批量操作 | 轻量，适合单次操作 |
| **使用场景** | 首次提交、全量同步 | 实时更新、增量同步 |

---

## 2. 接口列表

### 2.1 接口总览

| 接口路径 | 方法 | 功能 | 认证 |
|---------|------|------|------|
| `/api/v1/tasks/:projectId/:queueId/:taskId/message` | POST | 追加对话消息 | API Key |
| `/api/v1/tasks/:projectId/:queueId/:taskId/log` | POST | 追加执行日志 | API Key |
| `/api/v1/tasks/:projectId/:queueId/:taskId/status` | PATCH | 修改任务状态 | API Key |

### 2.2 路径参数说明

所有增量更新接口都使用相同的路径参数结构：

| 参数名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `projectId` | string | 项目外部唯一标识 | `"project_001"` |
| `queueId` | string | 任务队列外部唯一标识（在项目内唯一） | `"queue_001"` |
| `taskId` | string | 任务外部唯一标识（在队列内唯一） | `"task_001"` |

**路径参数验证规则**：
- 所有路径参数不能为空
- 参数长度限制：1-255 字符
- 参数格式：字符串，不支持特殊字符（建议使用字母、数字、下划线、连字符）

---

## 3. 追加对话消息接口

### 3.1 接口基本信息

| 项目 | 说明 |
|------|------|
| **接口路径** | `/api/v1/tasks/:projectId/:queueId/:taskId/message` |
| **请求方法** | `POST` |
| **Content-Type** | `application/json` |
| **认证方式** | API Key（Header: `X-API-Key`） |
| **幂等性** | 非幂等（每次调用都会追加新消息） |

### 3.2 请求头

```
Content-Type: application/json
X-API-Key: <api_key_value>
```

### 3.3 请求体结构

```json
{
  "role": "user|assistant (必填)",
  "content": "string (必填)"
}
```

### 3.4 请求参数详细说明

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `role` | string | 是 | 消息角色，必须是 `user` 或 `assistant` | `"user"` |
| `content` | string | 是 | 消息内容，支持 Markdown 格式 | `"请帮我实现登录功能"` |

### 3.5 参数验证规则

#### 3.5.1 必填字段验证

- `role` 不能为空
- `content` 不能为空

#### 3.5.2 格式验证

- `role`：必须是枚举值 `user` 或 `assistant`（不区分大小写，统一存储为大写）
- `content`：字符串，长度 1-100000 字符，支持 Markdown 格式

#### 3.5.3 业务规则验证

- 任务必须存在（通过 `projectId + queueId + taskId` 查找）
- 如果任务不存在，返回 404 错误

### 3.6 响应格式

#### 3.6.1 成功响应（200）

**HTTP 状态码**：`200 OK`

**响应体**：
```json
{
  "success": true,
  "data": {
    "message_id": 123,
    "role": "USER",
    "content": "请帮我实现登录功能",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "消息追加成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**响应字段说明**：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `success` | boolean | 操作是否成功，固定为 `true` |
| `data` | object | 响应数据对象 |
| `data.message_id` | number | 新创建的消息ID（数据库主键） |
| `data.role` | string | 消息角色（USER/ASSISTANT） |
| `data.content` | string | 消息内容 |
| `data.created_at` | string | 消息创建时间（ISO 8601 格式） |
| `message` | string | 成功消息 |
| `timestamp` | string | 响应时间戳（ISO 8601 格式） |

#### 3.6.2 错误响应

**认证失败（401）**：
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

**任务不存在（404）**：
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

**参数验证失败（400）**：
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": {
      "field": "role",
      "reason": "role 必须是 user 或 assistant"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 3.7 业务流程

```
外部系统
  ↓
1. 构造消息数据（role, content）
  ↓
2. 发送 POST /api/v1/tasks/:projectId/:queueId/:taskId/message
  ↓
后端 API
  ↓
3. 验证 API Key
   ├─ 检查请求头是否存在 X-API-Key
   ├─ 查询数据库验证 API Key 是否存在
   ├─ 检查 API Key 是否激活（is_active = true）
   └─ 如果 API Key 关联了项目，验证 projectId 是否匹配
  ↓
4. 验证路径参数
   ├─ 验证 projectId、queueId、taskId 是否存在
   └─ 验证参数格式是否符合要求
  ↓
5. 验证请求体数据
   ├─ 验证必填字段（role, content）
   ├─ 验证字段格式（role 枚举值、content 长度）
   └─ 验证业务规则
  ↓
6. 查找任务
   ├─ 根据 projectId 查找项目
   ├─ 根据 projectId + queueId 查找任务队列
   └─ 根据 queueId + taskId 查找任务
  ↓
7. 验证任务是否存在
   ├─ 如果任务不存在 → 返回 404 错误
   └─ 如果任务存在 → 继续处理
  ↓
8. 创建新消息记录
   ├─ role: 转换为大写（USER/ASSISTANT）
   ├─ content: 消息内容
   ├─ taskId: 关联的任务ID
   └─ createdAt: 自动设置为当前时间
  ↓
9. 更新任务的 updatedAt 时间戳
   └─ 更新任务的 updatedAt 为当前时间
  ↓
10. 更新项目/队列的 lastTaskAt 时间戳（可选）
   ├─ 更新项目的 lastTaskAt 为当前时间
   └─ 更新队列的 lastTaskAt 为当前时间
  ↓
11. 返回成功响应
   ├─ message_id
   ├─ role
   ├─ content
   └─ created_at
```

### 3.8 实现示例

```javascript
// POST /api/v1/tasks/:projectId/:queueId/:taskId/message
export async function POST(request, { params }) {
  try {
    // 1. 验证 API Key
    const apiKey = await authenticateApiKey(request)
    
    // 2. 解析路径参数
    const { projectId, queueId, taskId } = await params
    
    // 3. 解析请求体
    const body = await request.json()
    const { role, content } = body
    
    // 4. 验证请求数据
    if (!role || !['user', 'assistant'].includes(role.toLowerCase())) {
      return createErrorResponse(
        'role 必须是 user 或 assistant',
        'VALIDATION_ERROR',
        400
      )
    }
    
    if (!content || !content.trim()) {
      return createErrorResponse(
        'content 不能为空',
        'VALIDATION_ERROR',
        400
      )
    }
    
    // 5. 查找任务
    const project = await prisma.project.findUnique({
      where: { projectId }
    })
    
    if (!project) {
      return createErrorResponse(
        '项目不存在',
        'RESOURCE_NOT_FOUND',
        404
      )
    }
    
    const queue = await prisma.queue.findUnique({
      where: {
        projectId_queueId: {
          projectId: project.id,
          queueId
        }
      }
    })
    
    if (!queue) {
      return createErrorResponse(
        '任务队列不存在',
        'RESOURCE_NOT_FOUND',
        404
      )
    }
    
    const task = await prisma.task.findUnique({
      where: {
        queueId_taskId: {
          queueId: queue.id,
          taskId
        }
      }
    })
    
    if (!task) {
      return createErrorResponse(
        '任务不存在',
        'RESOURCE_NOT_FOUND',
        404
      )
    }
    
    // 6. 创建新消息记录
    const message = await prisma.message.create({
      data: {
        taskId: task.id,
        role: role.toUpperCase(),
        content: content.trim()
      }
    })
    
    // 7. 更新任务的 updatedAt 时间戳
    await prisma.task.update({
      where: { id: task.id },
      data: { updatedAt: new Date() }
    })
    
    // 8. 更新项目/队列的 lastTaskAt 时间戳
    const now = new Date()
    await prisma.project.update({
      where: { id: project.id },
      data: { lastTaskAt: now }
    })
    
    await prisma.queue.update({
      where: { id: queue.id },
      data: { lastTaskAt: now }
    })
    
    // 9. 返回成功响应
    return createSuccessResponse({
      message_id: message.id,
      role: message.role,
      content: message.content,
      created_at: message.createdAt.toISOString()
    }, '消息追加成功')
    
  } catch (error) {
    return handleError(error)
  }
}
```

### 3.9 使用示例

**请求**：
```bash
curl -X POST http://localhost:3000/api/v1/tasks/project_001/queue_001/task_001/message \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk-xxxxxxxxxxxxxxxx" \
  -d '{
    "role": "user",
    "content": "请帮我实现用户登录功能"
  }'
```

**响应**：
```json
{
  "success": true,
  "data": {
    "message_id": 123,
    "role": "USER",
    "content": "请帮我实现用户登录功能",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "消息追加成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 4. 追加执行日志接口

### 4.1 接口基本信息

| 项目 | 说明 |
|------|------|
| **接口路径** | `/api/v1/tasks/:projectId/:queueId/:taskId/log` |
| **请求方法** | `POST` |
| **Content-Type** | `application/json` |
| **认证方式** | API Key（Header: `X-API-Key`） |
| **幂等性** | 非幂等（每次调用都会追加新日志） |

### 4.2 请求头

```
Content-Type: application/json
X-API-Key: <api_key_value>
```

### 4.3 请求体结构

```json
{
  "content": "string (必填)"
}
```

### 4.4 请求参数详细说明

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `content` | string | 是 | 日志内容（纯文本），自动添加时间戳 | `"开始执行任务..."` |

### 4.5 参数验证规则

#### 4.5.1 必填字段验证

- `content` 不能为空

#### 4.5.2 格式验证

- `content`：字符串，长度 1-100000 字符，纯文本格式（不支持 Markdown）

#### 4.5.3 业务规则验证

- 任务必须存在（通过 `projectId + queueId + taskId` 查找）
- 如果任务不存在，返回 404 错误

### 4.6 响应格式

#### 4.6.1 成功响应（200）

**HTTP 状态码**：`200 OK`

**响应体**：
```json
{
  "success": true,
  "data": {
    "log_id": 456,
    "content": "开始执行任务...",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "日志追加成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**响应字段说明**：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `success` | boolean | 操作是否成功，固定为 `true` |
| `data` | object | 响应数据对象 |
| `data.log_id` | number | 新创建的日志ID（数据库主键） |
| `data.content` | string | 日志内容 |
| `data.created_at` | string | 日志创建时间（ISO 8601 格式，自动时间戳） |
| `message` | string | 成功消息 |
| `timestamp` | string | 响应时间戳（ISO 8601 格式） |

#### 4.6.2 错误响应

**认证失败（401）**：
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

**任务不存在（404）**：
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

**参数验证失败（400）**：
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": {
      "field": "content",
      "reason": "content 不能为空"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 4.7 业务流程

```
外部系统
  ↓
1. 构造日志内容
  ↓
2. 发送 POST /api/v1/tasks/:projectId/:queueId/:taskId/log
  ↓
后端 API
  ↓
3. 验证 API Key
   ├─ 检查请求头是否存在 X-API-Key
   ├─ 查询数据库验证 API Key 是否存在
   ├─ 检查 API Key 是否激活（is_active = true）
   └─ 如果 API Key 关联了项目，验证 projectId 是否匹配
  ↓
4. 验证路径参数
   ├─ 验证 projectId、queueId、taskId 是否存在
   └─ 验证参数格式是否符合要求
  ↓
5. 验证请求体数据
   ├─ 验证必填字段（content）
   ├─ 验证字段格式（content 长度）
   └─ 验证业务规则
  ↓
6. 查找任务
   ├─ 根据 projectId 查找项目
   ├─ 根据 projectId + queueId 查找任务队列
   └─ 根据 queueId + taskId 查找任务
  ↓
7. 验证任务是否存在
   ├─ 如果任务不存在 → 返回 404 错误
   └─ 如果任务存在 → 继续处理
  ↓
8. 创建新日志记录
   ├─ content: 日志内容（纯文本）
   ├─ taskId: 关联的任务ID
   └─ createdAt: 自动设置为当前时间（自动时间戳）
  ↓
9. 返回成功响应
   ├─ log_id
   ├─ content
   └─ created_at
```

**注意**：日志追加接口**不更新**任务的 `updatedAt` 时间戳，因为日志是辅助信息，不影响任务本身的更新时间。

### 4.8 实现示例

```javascript
// POST /api/v1/tasks/:projectId/:queueId/:taskId/log
export async function POST(request, { params }) {
  try {
    // 1. 验证 API Key
    const apiKey = await authenticateApiKey(request)
    
    // 2. 解析路径参数
    const { projectId, queueId, taskId } = await params
    
    // 3. 解析请求体
    const body = await request.json()
    const { content } = body
    
    // 4. 验证请求数据
    if (!content || !content.trim()) {
      return createErrorResponse(
        'content 不能为空',
        'VALIDATION_ERROR',
        400
      )
    }
    
    // 5. 查找任务
    const project = await prisma.project.findUnique({
      where: { projectId }
    })
    
    if (!project) {
      return createErrorResponse(
        '项目不存在',
        'RESOURCE_NOT_FOUND',
        404
      )
    }
    
    const queue = await prisma.queue.findUnique({
      where: {
        projectId_queueId: {
          projectId: project.id,
          queueId
        }
      }
    })
    
    if (!queue) {
      return createErrorResponse(
        '任务队列不存在',
        'RESOURCE_NOT_FOUND',
        404
      )
    }
    
    const task = await prisma.task.findUnique({
      where: {
        queueId_taskId: {
          queueId: queue.id,
          taskId
        }
      }
    })
    
    if (!task) {
      return createErrorResponse(
        '任务不存在',
        'RESOURCE_NOT_FOUND',
        404
      )
    }
    
    // 6. 创建新日志记录（自动添加时间戳）
    const log = await prisma.log.create({
      data: {
        taskId: task.id,
        content: content.trim()
        // createdAt 自动设置为当前时间
      }
    })
    
    // 7. 返回成功响应
    return createSuccessResponse({
      log_id: log.id,
      content: log.content,
      created_at: log.createdAt.toISOString()
    }, '日志追加成功')
    
  } catch (error) {
    return handleError(error)
  }
}
```

### 4.9 使用示例

**请求**：
```bash
curl -X POST http://localhost:3000/api/v1/tasks/project_001/queue_001/task_001/log \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk-xxxxxxxxxxxxxxxx" \
  -d '{
    "content": "开始执行任务，正在初始化..."
  }'
```

**响应**：
```json
{
  "success": true,
  "data": {
    "log_id": 456,
    "content": "开始执行任务，正在初始化...",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "日志追加成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 5. 修改任务状态接口

### 5.1 接口基本信息

| 项目 | 说明 |
|------|------|
| **接口路径** | `/api/v1/tasks/:projectId/:queueId/:taskId/status` |
| **请求方法** | `PATCH` |
| **Content-Type** | `application/json` |
| **认证方式** | API Key（Header: `X-API-Key`） |
| **幂等性** | 幂等（重复调用相同状态值结果一致） |

### 5.2 请求头

```
Content-Type: application/json
X-API-Key: <api_key_value>
```

### 5.3 请求体结构

```json
{
  "status": "pending|done|error (必填)"
}
```

### 5.4 请求参数详细说明

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `status` | string | 是 | 任务状态，必须是 `pending`、`done` 或 `error` | `"done"` |

### 5.5 参数验证规则

#### 5.5.1 必填字段验证

- `status` 不能为空

#### 5.5.2 格式验证

- `status`：必须是枚举值 `pending`、`done` 或 `error`（不区分大小写，统一存储为大写）

#### 5.5.3 业务规则验证

- 任务必须存在（通过 `projectId + queueId + taskId` 查找）
- 如果任务不存在，返回 404 错误
- 状态值必须是有效的枚举值

### 5.6 响应格式

#### 5.6.1 成功响应（200）

**HTTP 状态码**：`200 OK`

**响应体**：
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

**响应字段说明**：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `success` | boolean | 操作是否成功，固定为 `true` |
| `data` | object | 响应数据对象 |
| `data.task_id` | string | 任务外部标识 |
| `data.status` | string | 更新后的任务状态（PENDING/DONE/ERROR） |
| `data.previous_status` | string | 更新前的任务状态（可选） |
| `data.updated_at` | string | 任务更新时间（ISO 8601 格式） |
| `message` | string | 成功消息 |
| `timestamp` | string | 响应时间戳（ISO 8601 格式） |

#### 5.6.2 错误响应

**认证失败（401）**：
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

**任务不存在（404）**：
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

**参数验证失败（400）**：
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": {
      "field": "status",
      "reason": "status 必须是 pending、done 或 error"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 5.7 业务流程

```
外部系统
  ↓
1. 构造状态数据（status）
  ↓
2. 发送 PATCH /api/v1/tasks/:projectId/:queueId/:taskId/status
  ↓
后端 API
  ↓
3. 验证 API Key
   ├─ 检查请求头是否存在 X-API-Key
   ├─ 查询数据库验证 API Key 是否存在
   ├─ 检查 API Key 是否激活（is_active = true）
   └─ 如果 API Key 关联了项目，验证 projectId 是否匹配
  ↓
4. 验证路径参数
   ├─ 验证 projectId、queueId、taskId 是否存在
   └─ 验证参数格式是否符合要求
  ↓
5. 验证请求体数据
   ├─ 验证必填字段（status）
   ├─ 验证字段格式（status 枚举值）
   └─ 验证业务规则
  ↓
6. 查找任务
   ├─ 根据 projectId 查找项目
   ├─ 根据 projectId + queueId 查找任务队列
   └─ 根据 queueId + taskId 查找任务
  ↓
7. 验证任务是否存在
   ├─ 如果任务不存在 → 返回 404 错误
   └─ 如果任务存在 → 继续处理
  ↓
8. 记录当前状态（用于返回 previous_status）
  ↓
9. 验证状态值是否有效
   ├─ 必须是 pending、done 或 error 之一
   └─ 如果无效 → 返回 400 错误
  ↓
10. 更新任务状态
   ├─ status: 转换为大写（PENDING/DONE/ERROR）
   └─ updatedAt: 自动更新为当前时间
  ↓
11. 更新项目/队列的 lastTaskAt 时间戳（可选）
   ├─ 更新项目的 lastTaskAt 为当前时间
   └─ 更新队列的 lastTaskAt 为当前时间
  ↓
12. 返回成功响应
   ├─ task_id
   ├─ status
   ├─ previous_status（可选）
   └─ updated_at
```

### 5.8 实现示例

```javascript
// PATCH /api/v1/tasks/:projectId/:queueId/:taskId/status
export async function PATCH(request, { params }) {
  try {
    // 1. 验证 API Key
    const apiKey = await authenticateApiKey(request)
    
    // 2. 解析路径参数
    const { projectId, queueId, taskId } = await params
    
    // 3. 解析请求体
    const body = await request.json()
    const { status } = body
    
    // 4. 验证请求数据
    if (!status || !['pending', 'done', 'error'].includes(status.toLowerCase())) {
      return createErrorResponse(
        'status 必须是 pending、done 或 error',
        'VALIDATION_ERROR',
        400
      )
    }
    
    // 5. 查找任务
    const project = await prisma.project.findUnique({
      where: { projectId }
    })
    
    if (!project) {
      return createErrorResponse(
        '项目不存在',
        'RESOURCE_NOT_FOUND',
        404
      )
    }
    
    const queue = await prisma.queue.findUnique({
      where: {
        projectId_queueId: {
          projectId: project.id,
          queueId
        }
      }
    })
    
    if (!queue) {
      return createErrorResponse(
        '任务队列不存在',
        'RESOURCE_NOT_FOUND',
        404
      )
    }
    
    const task = await prisma.task.findUnique({
      where: {
        queueId_taskId: {
          queueId: queue.id,
          taskId
        }
      }
    })
    
    if (!task) {
      return createErrorResponse(
        '任务不存在',
        'RESOURCE_NOT_FOUND',
        404
      )
    }
    
    // 6. 记录当前状态
    const previousStatus = task.status
    
    // 7. 更新任务状态
    const updatedTask = await prisma.task.update({
      where: { id: task.id },
      data: {
        status: status.toUpperCase(),
        updatedAt: new Date()
      }
    })
    
    // 8. 更新项目/队列的 lastTaskAt 时间戳
    const now = new Date()
    await prisma.project.update({
      where: { id: project.id },
      data: { lastTaskAt: now }
    })
    
    await prisma.queue.update({
      where: { id: queue.id },
      data: { lastTaskAt: now }
    })
    
    // 9. 返回成功响应
    return createSuccessResponse({
      task_id: task.taskId,
      status: updatedTask.status,
      previous_status: previousStatus,
      updated_at: updatedTask.updatedAt.toISOString()
    }, '状态更新成功')
    
  } catch (error) {
    return handleError(error)
  }
}
```

### 5.9 使用示例

**请求**：
```bash
curl -X PATCH http://localhost:3000/api/v1/tasks/project_001/queue_001/task_001/status \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk-xxxxxxxxxxxxxxxx" \
  -d '{
    "status": "done"
  }'
```

**响应**：
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

---

## 6. 错误处理

### 6.1 错误码定义

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `INVALID_API_KEY` | 401 | API Key 无效或缺失 |
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 |
| `RESOURCE_NOT_FOUND` | 404 | 资源不存在（项目/队列/任务） |
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

#### 6.3.1 认证错误

**场景**：API Key 缺失、无效或未激活

**处理**：
- 返回 401 错误
- 错误码：`INVALID_API_KEY`
- 不继续处理请求

#### 6.3.2 资源不存在错误

**场景**：项目、队列或任务不存在

**处理**：
- 返回 404 错误
- 错误码：`RESOURCE_NOT_FOUND`
- 在 `details` 中提供资源标识信息

#### 6.3.3 参数验证错误

**场景**：请求参数格式不正确或不符合业务规则

**处理**：
- 返回 400 错误
- 错误码：`VALIDATION_ERROR`
- 在 `details` 中提供字段和原因

#### 6.3.4 服务器错误

**场景**：数据库连接失败、事务执行失败等

**处理**：
- 返回 500 错误
- 错误码：`INTERNAL_ERROR`
- 记录错误日志

---

## 7. 性能优化建议

### 7.1 查询优化

1. **索引利用**：确保路径参数查询使用索引
   - `projects.projectId`（唯一索引）
   - `queues(projectId, queueId)`（复合唯一索引）
   - `tasks(queueId, taskId)`（复合唯一索引）

2. **关联查询优化**：使用 Prisma 的 `include` 或 `select` 只查询需要的字段

3. **批量操作**：如果需要在同一任务上执行多个操作，考虑使用事务批量处理

### 7.2 写入优化

1. **事务使用**：对于需要更新多个表的操作（如更新任务状态时同时更新项目/队列时间戳），使用事务确保原子性

2. **异步处理**：更新时间戳等非关键操作可以考虑异步处理（但要注意数据一致性）

### 7.3 缓存策略

1. **任务查询缓存**：对于频繁查询的任务信息，可以考虑缓存（但要注意缓存失效）

2. **API Key 缓存**：活跃的 API Key 可以缓存，减少数据库查询

---

## 8. 安全建议

### 8.1 API Key 安全

- API Key 值使用单向哈希（bcrypt）存储
- 验证时进行哈希比对，不存储明文
- 支持禁用 API Key（`is_active = false`）
- 如果 API Key 关联了项目，验证 `projectId` 是否匹配

### 8.2 数据验证

- 所有输入数据必须验证
- 防止 SQL 注入（Prisma 自动处理）
- 限制字符串长度，防止过大数据
- 验证枚举值，防止无效值

### 8.3 请求限制

- 考虑添加请求频率限制（Rate Limiting）
- 防止恶意请求
- 限制单次请求的数据大小

---

## 9. 使用场景示例

### 9.1 任务执行流程示例

**场景**：外部系统执行任务，需要实时更新任务状态和记录日志

**流程**：
```
1. 任务创建（通过 POST /api/v1/submit）
   ↓
2. 任务开始执行
   ↓
3. 追加执行日志
   POST /api/v1/tasks/:projectId/:queueId/:taskId/log
   { "content": "开始执行任务..." }
   ↓
4. 追加对话消息（用户提问）
   POST /api/v1/tasks/:projectId/:queueId/:taskId/message
   { "role": "user", "content": "请帮我实现登录功能" }
   ↓
5. 追加对话消息（AI 回复）
   POST /api/v1/tasks/:projectId/:queueId/:taskId/message
   { "role": "assistant", "content": "好的，我来帮你实现..." }
   ↓
6. 追加执行日志
   POST /api/v1/tasks/:projectId/:queueId/:taskId/log
   { "content": "正在生成代码..." }
   ↓
7. 任务完成，更新状态
   PATCH /api/v1/tasks/:projectId/:queueId/:taskId/status
   { "status": "done" }
   ↓
8. 追加执行日志
   POST /api/v1/tasks/:projectId/:queueId/:taskId/log
   { "content": "任务执行完成" }
```

### 9.2 错误处理流程示例

**场景**：任务执行过程中出现错误

**流程**：
```
1. 追加执行日志
   POST /api/v1/tasks/:projectId/:queueId/:taskId/log
   { "content": "执行过程中出现错误：..." }
   ↓
2. 更新任务状态为错误
   PATCH /api/v1/tasks/:projectId/:queueId/:taskId/status
   { "status": "error" }
```

### 9.3 实时对话更新示例

**场景**：外部系统与 AI 进行多轮对话

**流程**：
```
1. 用户消息
   POST /api/v1/tasks/:projectId/:queueId/:taskId/message
   { "role": "user", "content": "问题1" }
   ↓
2. AI 回复
   POST /api/v1/tasks/:projectId/:queueId/:taskId/message
   { "role": "assistant", "content": "回答1" }
   ↓
3. 用户消息
   POST /api/v1/tasks/:projectId/:queueId/:taskId/message
   { "role": "user", "content": "问题2" }
   ↓
4. AI 回复
   POST /api/v1/tasks/:projectId/:queueId/:taskId/message
   { "role": "assistant", "content": "回答2" }
```

---

## 10. 总结

本文档详细说明了 TaskEcho 系统的增量更新接口设计，包括：

1. **追加对话消息接口**：`POST /api/v1/tasks/:projectId/:queueId/:taskId/message`
   - 追加单条对话消息，不覆盖历史消息
   - 支持 user 和 assistant 两种角色
   - 消息内容支持 Markdown 格式

2. **追加执行日志接口**：`POST /api/v1/tasks/:projectId/:queueId/:taskId/log`
   - 追加任务执行日志，自动添加时间戳
   - 日志内容为纯文本格式
   - 不影响任务的更新时间

3. **修改任务状态接口**：`PATCH /api/v1/tasks/:projectId/:queueId/:taskId/status`
   - 修改任务状态（pending/done/error）
   - 幂等操作，重复调用结果一致
   - 返回更新前后的状态

所有接口都遵循以下设计原则：

- **统一认证**：使用 API Key 进行安全认证
- **统一响应格式**：成功和错误响应都遵循统一格式
- **完整验证**：对路径参数、请求体数据进行全面验证
- **错误处理**：统一的错误码和错误响应格式
- **性能优化**：利用索引、事务等优化查询和写入性能
- **安全建议**：API Key 安全、数据验证、请求限制

这些接口与核心提交接口（`POST /api/v1/submit`）配合使用，为外部系统提供灵活的数据更新方式，支持实时更新任务数据，无需全量替换。
