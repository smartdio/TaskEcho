# POST /api/v1/submit 接口设计文档

## 1. 概述

### 1.1 接口定位

`POST /api/v1/submit` 是 TaskEcho 系统的**核心数据提交接口**，是外部系统向 TaskEcho 推送数据的唯一入口。该接口采用完全幂等的设计，支持重复调用，确保数据一致性。

### 1.2 核心特性

- **完全幂等**：重复调用结果一致，不会产生重复数据
- **批量处理**：一次请求可提交多个任务
- **原子性操作**：使用数据库事务确保数据一致性
- **自动创建/更新**：根据外部标识自动判断创建或更新
- **API Key 认证**：使用项目专属 API Key 进行安全认证

### 1.3 适用场景

- 外部系统首次推送项目、任务队列和任务数据
- 外部系统全量更新任务数据（包括对话历史）
- 外部系统同步数据到 TaskEcho
- 数据恢复和重新同步场景

---

## 2. 接口规范

### 2.1 基本信息

| 项目 | 说明 |
|------|------|
| **接口路径** | `/api/v1/submit` |
| **请求方法** | `POST` |
| **Content-Type** | `application/json` |
| **认证方式** | API Key（Header: `X-API-Key`） |
| **幂等性** | 完全幂等，支持重复调用 |

### 2.2 请求头

```
Content-Type: application/json
X-API-Key: <api_key_value>
```

**认证说明**：
- `X-API-Key` 为必填请求头
- API Key 必须在系统中存在且处于激活状态（`is_active = true`）
- API Key 可以关联特定项目（`project_id`），如果关联了项目，则只能用于该项目的提交

### 2.3 请求体结构

```json
{
  "project_id": "string (必填)",
  "project_name": "string (必填)",
  "queue_id": "string (必填)",
  "queue_name": "string (必填)",
  "meta": {
    "prompts": [".flow/skills/spcewriter.md"]
  },
  "tasks": [
    {
      "id": "string (必填)",
      "name": "string (必填)",
      "prompt": "string (必填)",
      "spec_file": ["string (可选)"],
      "status": "pending|done|error (必填)",
      "report": "string (可选)",
      "messages": [
        {
          "role": "user|assistant (必填)",
          "content": "string (必填)"
        }
      ],
      "logs": [
        {
          "content": "string (必填)"
        }
      ]
    }
  ]
}
```

---

## 3. 请求参数详细说明

### 3.1 顶层参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `project_id` | string | 是 | 项目外部唯一标识，用于幂等性判断 | `"project_001"` |
| `project_name` | string | 是 | 项目显示名称，如果项目已存在则更新此名称 | `"示例项目"` |
| `queue_id` | string | 是 | 任务队列外部唯一标识（在项目内唯一） | `"queue_001"` |
| `queue_name` | string | 是 | 任务队列显示名称，如果队列已存在则更新此名称 | `"任务队列1"` |
| `meta` | object | 否 | 元数据信息（类似 prompts） | `{"prompts": [".flow/skills/spcewriter.md"]}` |
| `tasks` | array | 是 | 任务数组，至少包含一个任务 | `[{...}]` |

### 3.2 任务对象（tasks[]）

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `id` | string | 是 | 任务ID（在队列内唯一） | `"1"` |
| `name` | string | 是 | 任务名称 | `"编写系统基础框架的实现方案"` |
| `prompt` | string | 是 | 任务提示文本 | `"请编写系统基础框架的实现方案..."` |
| `spec_file` | array[string] | 否 | 规范文件路径数组 | `[".flow/skills/spcewriter.md"]` |
| `status` | string | 是 | 任务状态，必须是 `pending`、`done` 或 `error` | `"pending"` |
| `report` | string | 否 | 报告文件路径 | `".flow/tasks/report/xxx.md"` |
| `messages` | array[object] | 否 | 对话消息数组（导入时通常为空） | `[{...}]` |
| `logs` | array[object] | 否 | 执行日志数组（导入时通常为空） | `[{...}]` |

### 3.3 消息对象（messages[]）

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `role` | string | 是 | 消息角色，必须是 `user` 或 `assistant` | `"user"` |
| `content` | string | 是 | 消息内容，支持 Markdown 格式 | `"请帮我实现登录功能"` |

### 3.4 参数验证规则

#### 3.4.1 必填字段验证

- `project_id`、`project_name`、`queue_id`、`queue_name` 不能为空
- `tasks` 数组不能为空，至少包含一个任务
- 每个任务必须包含 `id`、`name`、`prompt`、`status`

#### 3.4.2 格式验证

- `project_id`、`queue_id`、`tasks[].id`：字符串，长度 1-255 字符
- `project_name`、`queue_name`、`tasks[].name`：字符串，长度 1-1000 字符
- `tasks[].prompt`：字符串，长度 1-100000 字符
- `tasks[].spec_file`：字符串数组，每个路径长度 1-500 字符
- `status`：必须是枚举值 `pending`、`done`、`error`（不区分大小写，统一存储为小写）
- `tasks[].report`：字符串，长度 0-500 字符（可选）
- `messages[].role`：必须是 `user` 或 `assistant`（不区分大小写，统一存储为大写）
- `messages[].content`：字符串，长度 1-100000 字符
- `logs[].content`：字符串，长度 1-100000 字符

#### 3.4.3 业务规则验证

- 如果 API Key 关联了特定项目（`project_id`），则请求中的 `project_id` 必须匹配
- `tasks` 数组中的 `id` 在本次请求中不能重复
- `spec_file` 数组中的路径不能重复

---

## 4. 响应格式

### 4.1 成功响应（200）

**HTTP 状态码**：`200 OK`

**响应体**：
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

**响应字段说明**：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `success` | boolean | 操作是否成功，固定为 `true` |
| `data` | object | 响应数据对象 |
| `data.project_id` | string | 项目外部标识 |
| `data.queue_id` | string | 任务队列外部标识 |
| `data.tasks_count` | number | 本次提交的任务总数 |
| `data.created_tasks` | number | 新创建的任务数量 |
| `data.updated_tasks` | number | 更新的任务数量 |
| `message` | string | 成功消息 |
| `timestamp` | string | 响应时间戳（ISO 8601 格式） |

### 4.2 错误响应

#### 4.2.1 认证失败（401）

**HTTP 状态码**：`401 Unauthorized`

**响应体**：
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

**错误场景**：
- 请求头中缺少 `X-API-Key`
- API Key 不存在
- API Key 未激活（`is_active = false`）
- API Key 关联的项目与请求中的 `project_id` 不匹配

#### 4.2.2 参数验证失败（400）

**HTTP 状态码**：`400 Bad Request`

**响应体**：
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": {
      "field": "project_id",
      "reason": "project_id 不能为空"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**错误场景**：
- 必填字段缺失
- 字段格式不正确
- 字段值不符合业务规则

#### 4.2.3 服务器错误（500）

**HTTP 状态码**：`500 Internal Server Error`

**响应体**：
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "服务器内部错误",
    "details": {}
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**错误场景**：
- 数据库连接失败
- 事务执行失败
- 其他未预期的服务器错误

### 4.3 错误码定义

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `INVALID_API_KEY` | 401 | API Key 无效或缺失 |
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

---

## 5. 幂等性处理逻辑

### 5.1 幂等性定义

**幂等性**：同一个请求执行一次和执行多次的效果相同，不会因为重复调用而产生副作用。

### 5.2 幂等性保证机制

#### 5.2.1 数据库唯一约束

系统通过数据库唯一索引确保数据的唯一性：

- **项目**：`projects.projectId` 唯一索引
- **任务队列**：`queues(projectId, queueId)` 复合唯一索引
- **任务**：任务嵌入在队列的 `tasks` 数组中，通过应用层逻辑确保 `tasks[].id` 在队列内唯一

#### 5.2.2 Upsert 操作

使用 Mongoose 的 `findOneAndUpdate` 方法配合 `upsert` 选项实现创建或更新：

```javascript
// 项目 Upsert
const project = await Project.findOneAndUpdate(
  { projectId: data.project_id },
  {
    projectId: data.project_id,
    name: data.project_name,
    $setOnInsert: { createdAt: new Date() }
  },
  { upsert: true, new: true }
)

// 任务队列 Upsert（包含嵌入的任务）
const tasks = (data.tasks || []).map(taskData => ({
  id: taskData.id,
  name: taskData.name,
  prompt: taskData.prompt,
  spec_file: taskData.spec_file || [],
  status: taskData.status.toLowerCase(),
  report: taskData.report || null,
  messages: (taskData.messages || []).map(msg => ({
    role: msg.role.toUpperCase(),
    content: msg.content,
    createdAt: new Date()
  })),
  logs: (taskData.logs || []).map(log => ({
    content: log.content,
    createdAt: new Date()
  }))
}))

const queue = await Queue.findOneAndUpdate(
  {
    projectId: project._id,
    queueId: data.queue_id
  },
  {
    projectId: project._id,
    queueId: data.queue_id,
    name: data.queue_name,
    meta: data.meta || null,
    tasks: tasks,  // 完全替换任务数组（幂等性）
    lastTaskAt: new Date(),
    $setOnInsert: { createdAt: new Date() }
  },
  { upsert: true, new: true }
)
```

#### 5.2.3 任务完全替换策略

对于任务，采用**完全替换**策略，确保幂等性：

1. **任务嵌入在队列中**：任务作为队列文档的 `tasks` 数组元素
2. **完全替换**：每次提交时，完全替换队列的 `tasks` 数组
3. **保留历史数据**：如果任务已存在且包含 `messages` 和 `logs`，可以选择保留或替换（根据业务需求）

**实现示例**：
```javascript
// 准备任务数组（完全替换）
const tasks = (data.tasks || []).map(taskData => {
  // 如果任务已存在，可以选择保留现有的 messages 和 logs
  const existingTask = queue?.tasks?.find(t => t.id === taskData.id)
  
  return {
    id: taskData.id,
    name: taskData.name,
    prompt: taskData.prompt,
    spec_file: taskData.spec_file || [],
    status: taskData.status.toLowerCase(),
    report: taskData.report || null,
    // 如果请求中提供了 messages，使用请求中的；否则保留现有的
    messages: taskData.messages?.length > 0 
      ? taskData.messages.map(msg => ({
          role: msg.role.toUpperCase(),
          content: msg.content,
          createdAt: new Date()
        }))
      : (existingTask?.messages || []),
    // 如果请求中提供了 logs，使用请求中的；否则保留现有的
    logs: taskData.logs?.length > 0
      ? taskData.logs.map(log => ({
          content: log.content,
          createdAt: new Date()
        }))
      : (existingTask?.logs || [])
  }
})

// 使用 findOneAndUpdate 完全替换任务数组
const queue = await Queue.findOneAndUpdate(
  {
    projectId: project._id,
    queueId: data.queue_id
  },
  {
    $set: {
      name: data.queue_name,
      meta: data.meta || null,
      tasks: tasks,  // 完全替换
      lastTaskAt: new Date()
    }
  },
  { upsert: true, new: true }
)
```

#### 5.2.4 事务原子性

所有操作在一个数据库事务中执行，确保原子性：

- 如果任何一步失败，整个事务回滚
- 确保数据一致性，不会出现部分更新的情况
- 重复调用时，如果数据已存在，则更新；如果不存在，则创建

### 5.3 幂等性验证场景

#### 场景 1：首次提交

**请求 1**：
```json
{
  "project_id": "project_001",
  "project_name": "示例项目",
  "queue_id": "queue_001",
  "queue_name": "任务队列1",
  "tasks": [
    {
      "id": "1",
      "name": "任务1",
      "prompt": "任务提示文本",
      "spec_file": [],
      "status": "pending",
      "report": null,
      "messages": [
        {"role": "user", "content": "消息1"}
      ],
      "logs": []
    }
  ]
}
```

**结果**：创建项目、队列、任务

#### 场景 2：重复提交相同数据

**请求 2**：与请求 1 完全相同

**结果**：
- 项目名称更新为 "示例项目"（如果已存在）
- 队列名称更新为 "任务队列1"（如果已存在）
- 任务完全替换（删除旧数据，创建新数据）
- 最终数据与请求 1 一致

#### 场景 3：更新项目名称

**请求 3**：
```json
{
  "project_id": "project_001",
  "project_name": "更新后的项目名称",  // 名称变更
  "queue_id": "queue_001",
  "queue_name": "任务队列1",
  "tasks": [
    {
      "id": "1",
      "name": "任务1",
      "prompt": "任务提示文本",
      "spec_file": [],
      "status": "pending",
      "report": null,
      "messages": [
        {"role": "user", "content": "消息1"}
      ],
      "logs": []
    }
  ]
}
```

**结果**：
- 项目名称更新为 "更新后的项目名称"
- 其他数据保持不变

#### 场景 4：更新任务数据

**请求 4**：
```json
{
  "project_id": "project_001",
  "project_name": "更新后的项目名称",
  "queue_id": "queue_001",
  "queue_name": "任务队列1",
  "tasks": [
    {
      "id": "1",
      "name": "更新后的任务名称",  // 名称变更
      "prompt": "更新后的任务提示",  // 提示变更
      "spec_file": [".flow/skills/spcewriter.md"],  // 规范文件变更
      "status": "done",  // 状态变更
      "report": ".flow/tasks/report/xxx.md",  // 报告变更
      "messages": [
        {"role": "user", "content": "消息1"},
        {"role": "assistant", "content": "消息2"}  // 消息变更
      ]
    }
  ]
}
```

**结果**：
- 任务完全替换，旧数据删除，新数据创建
- 最终任务数据与请求 4 一致

---

## 6. 业务流程说明

### 6.1 完整业务流程

```
外部系统
  ↓
1. 构造请求数据（项目、队列、任务）
  ↓
2. 携带 API Key 发送 POST /api/v1/submit
  ↓
后端 API
  ↓
3. 验证 API Key
   ├─ 检查请求头是否存在 X-API-Key
   ├─ 查询数据库验证 API Key 是否存在
   ├─ 检查 API Key 是否激活（is_active = true）
   └─ 如果 API Key 关联了项目，验证 project_id 是否匹配
  ↓
4. 验证请求数据格式
   ├─ 验证必填字段
   ├─ 验证字段格式
   └─ 验证业务规则
  ↓
5. 处理项目（Upsert）
   ├─ 根据 project_id 查询项目是否存在
   ├─ 不存在：创建新项目
   │   └─ projectId: data.project_id
   │   └─ name: data.project_name
   └─ 存在：更新项目名称
       └─ name: data.project_name
  ↓
6. 处理任务队列和任务（Upsert，任务嵌入在队列中）
   ├─ 根据 project_id + queue_id 查询队列是否存在
   ├─ 准备任务数组（从 data.tasks 转换）
   │   ├─ id: task.id
   │   ├─ name: task.name
   │   ├─ prompt: task.prompt
   │   ├─ spec_file: task.spec_file
   │   ├─ status: task.status (转换为小写)
   │   ├─ report: task.report
   │   ├─ messages: task.messages (转换为大写 role)
   │   └─ logs: task.logs
   ├─ 不存在：创建新队列（包含 tasks 数组）
   │   └─ projectId: project._id
   │   └─ queueId: data.queue_id
   │   └─ name: data.queue_name
   │   └─ meta: data.meta
   │   └─ tasks: tasks 数组
   └─ 存在：完全替换 tasks 数组（幂等性）
       └─ tasks: tasks 数组（完全替换）
  ↓
7. 更新时间戳
   ├─ 更新项目的 lastTaskAt 为当前时间
   └─ 更新队列的 lastTaskAt 为当前时间
  ↓
8. 返回成功响应
    ├─ project_id
    ├─ queue_id
    ├─ tasks_count
    ├─ created_tasks
    └─ updated_tasks
```

### 6.2 关键步骤详解

#### 6.2.1 API Key 验证

```javascript
async function authenticateApiKey(request) {
  // 1. 从请求头提取 API Key
  const apiKey = request.headers.get('X-API-Key')
  
  if (!apiKey) {
    throw new Error('缺少 API Key')
  }
  
  // 2. 查询数据库验证 API Key
  const keyRecords = await ApiKey.find({
    isActive: true
  })
  
  // 3. 验证 API Key（哈希比对）
  let validKey = null
  for (const record of keyRecords) {
    const isValid = await bcrypt.compare(apiKey, record.key)
    if (isValid) {
      validKey = record
      break
    }
  }
  
  if (!validKey) {
    throw new Error('无效的 API Key')
  }
  
  // 4. 如果 API Key 关联了项目，验证 project_id
  if (validKey.projectId) {
    const requestData = await request.json()
    if (requestData.project_id !== validKey.projectId) {
      throw new Error('API Key 只能用于指定项目')
    }
  }
  
  return validKey
}
```

#### 6.2.2 数据验证

```javascript
function validateSubmitData(data) {
  const errors = []
  
  // 验证必填字段
  if (!data.project_id || !data.project_id.trim()) {
    errors.push({ field: 'project_id', message: 'project_id 不能为空' })
  }
  if (!data.project_name || !data.project_name.trim()) {
    errors.push({ field: 'project_name', message: 'project_name 不能为空' })
  }
  if (!data.queue_id || !data.queue_id.trim()) {
    errors.push({ field: 'queue_id', message: 'queue_id 不能为空' })
  }
  if (!data.queue_name || !data.queue_name.trim()) {
    errors.push({ field: 'queue_name', message: 'queue_name 不能为空' })
  }
  if (!data.tasks || !Array.isArray(data.tasks) || data.tasks.length === 0) {
    errors.push({ field: 'tasks', message: 'tasks 必须是非空数组' })
  }
  
  // 验证任务数据
  const taskIds = new Set()
  data.tasks?.forEach((task, index) => {
    if (!task.id || !task.id.trim()) {
      errors.push({ field: `tasks[${index}].id`, message: 'id 不能为空' })
    }
    if (!task.name || !task.name.trim()) {
      errors.push({ field: `tasks[${index}].name`, message: 'name 不能为空' })
    }
    if (!task.prompt || !task.prompt.trim()) {
      errors.push({ field: `tasks[${index}].prompt`, message: 'prompt 不能为空' })
    }
    if (!task.status || !['pending', 'done', 'error'].includes(task.status.toLowerCase())) {
      errors.push({ field: `tasks[${index}].status`, message: 'status 必须是 pending、done 或 error' })
    }
    
    // 检查 id 重复
    if (taskIds.has(task.id)) {
      errors.push({ field: `tasks[${index}].id`, message: `id ${task.id} 在本次请求中重复` })
    }
    taskIds.add(task.id)
    
    // 验证 logs 数据
    task.logs?.forEach((log, logIndex) => {
      if (!log.content || !log.content.trim()) {
        errors.push({ field: `tasks[${index}].logs[${logIndex}].content`, message: 'content 不能为空' })
      }
    })
    
    // 验证消息数据
    task.messages?.forEach((msg, msgIndex) => {
      if (!msg.role || !['user', 'assistant'].includes(msg.role.toLowerCase())) {
        errors.push({ field: `tasks[${index}].messages[${msgIndex}].role`, message: 'role 必须是 user 或 assistant' })
      }
      if (!msg.content || !msg.content.trim()) {
        errors.push({ field: `tasks[${index}].messages[${msgIndex}].content`, message: 'content 不能为空' })
      }
    })
  })
  
  if (errors.length > 0) {
    throw new ValidationError('请求参数验证失败', errors)
  }
}
```

#### 6.2.3 数据处理

```javascript
async function processSubmit(data) {
  const now = new Date()
  
  // 1. 处理项目（Upsert）
  const project = await Project.findOneAndUpdate(
    { projectId: data.project_id },
    {
      projectId: data.project_id,
      name: data.project_name,
      $setOnInsert: { createdAt: now }
    },
    { upsert: true, new: true }
  )
  
  // 2. 准备任务数组（嵌入在队列中）
  const tasks = (data.tasks || []).map(taskData => {
    // 准备嵌入的消息数组
    const messages = (taskData.messages || []).map(msg => ({
      role: msg.role.toUpperCase(),
      content: msg.content,
      createdAt: msg.createdAt || now
    }))
    
    // 准备嵌入的日志数组
    const logs = (taskData.logs || []).map(log => ({
      content: log.content,
      createdAt: log.createdAt || now
    }))
    
    return {
      id: taskData.id,
      name: taskData.name,
      prompt: taskData.prompt,
      spec_file: taskData.spec_file || [],
      status: taskData.status.toLowerCase(),
      report: taskData.report || null,
      messages: messages,
      logs: logs
    }
  })
  
  // 3. 处理任务队列（Upsert，包含嵌入的任务）
  const queue = await Queue.findOneAndUpdate(
    {
      projectId: project._id,
      queueId: data.queue_id
    },
    {
      projectId: project._id,
      queueId: data.queue_id,
      name: data.queue_name,
      meta: data.meta || null,
      tasks: tasks,  // 完全替换任务数组（幂等性）
      lastTaskAt: now,
      $setOnInsert: { createdAt: now }
    },
    { upsert: true, new: true }
  )
  
  // 4. 更新时间戳
  await Project.findByIdAndUpdate(project._id, {
    lastTaskAt: now
  })
  
  return {
    project_id: data.project_id,
    queue_id: data.queue_id,
    tasks_count: data.tasks.length
  }
}
```

### 6.3 异常处理流程

```
异常发生
  ↓
1. 捕获异常
  ↓
2. 判断异常类型
   ├─ 认证异常 → 返回 401 错误
   ├─ 验证异常 → 返回 400 错误
   └─ 其他异常 → 返回 500 错误
  ↓
3. 记录错误日志
  ↓
4. 回滚事务（如果已开始）
  ↓
5. 返回错误响应
```

---

## 7. 性能优化建议

### 7.1 批量操作优化

- **批量插入**：对于大量任务，考虑使用批量插入操作
- **标签去重**：在内存中先对标签去重，减少数据库查询
- **消息批量插入**：使用批量插入而非循环插入

### 7.2 索引优化

确保以下字段已建立索引：
- `projects.project_id`（唯一索引）
- `queues(project_id, queue_id)`（复合唯一索引）
- `tasks(queue_id, task_id)`（复合唯一索引）
- `tags.name`（唯一索引）

### 7.3 事务优化

- **事务范围**：将整个处理流程放在一个事务中，确保原子性
- **事务超时**：设置合理的事务超时时间，避免长时间锁定
- **错误处理**：确保异常时正确回滚事务

---

## 8. 安全建议

### 8.1 API Key 安全

- API Key 值使用单向哈希（bcrypt）存储
- 验证时进行哈希比对，不存储明文
- 支持禁用 API Key（`is_active = false`）

### 8.2 数据验证

- 所有输入数据必须验证
- 防止 NoSQL 注入（Mongoose 自动处理）
- 限制字符串长度，防止过大数据

### 8.3 请求限制

- 考虑添加请求频率限制（Rate Limiting）
- 限制单次请求的任务数量（如最多 100 个任务）
- 限制消息内容长度

---

## 9. 使用示例

### 9.1 基本使用示例

**请求**：
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
        "name": "编写系统基础框架的实现方案",
        "prompt": "请编写系统基础框架的实现方案，包括主要api规范和数据库规范，数据库使用sqlite。",
        "spec_file": [
          ".flow/skills/spcewriter.md",
          "doc/requirement.md"
        ],
        "status": "pending",
        "report": null,
        "messages": [
          {
            "role": "user",
            "content": "请帮我实现用户登录功能"
          },
          {
            "role": "assistant",
            "content": "好的，我来帮你实现用户登录功能。\n\n```javascript\nfunction login(username, password) {\n  // 登录逻辑\n}\n```"
          }
        ],
        "logs": []
      }
    ]
  }'
```

**响应**：
```json
{
  "success": true,
  "data": {
    "project_id": "project_001",
    "queue_id": "queue_001",
    "tasks_count": 1
  },
  "message": "提交成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 9.2 批量任务示例

**请求**：
```json
{
  "project_id": "project_001",
  "project_name": "示例项目",
  "queue_id": "queue_001",
  "queue_name": "任务队列1",
  "tasks": [
    {
      "id": "1",
      "name": "任务1",
      "prompt": "任务提示文本",
      "spec_file": [],
      "status": "pending",
      "report": null,
      "messages": [],
      "logs": []
    },
    {
      "id": "2",
      "name": "任务2",
      "prompt": "任务提示文本",
      "spec_file": [],
      "status": "done",
      "report": ".flow/tasks/report/xxx.md",
      "messages": [
        {"role": "user", "content": "消息1"}
      ],
      "logs": []
    },
    {
      "id": "3",
      "name": "任务3",
      "prompt": "任务提示文本",
      "spec_file": [".flow/skills/spcewriter.md"],
      "status": "error",
      "report": null,
      "messages": [
        {"role": "user", "content": "消息1"},
        {"role": "assistant", "content": "消息2"}
      ],
      "logs": [
        {"content": "执行错误日志"}
      ]
    }
  ]
}
```

### 9.3 错误处理示例

**错误请求**（缺少必填字段）：
```bash
curl -X POST http://localhost:3000/api/v1/submit \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk-xxxxxxxxxxxxxxxx" \
  -d '{
    "project_id": "project_001",
    "queue_id": "queue_001",
    "tasks": []
  }'
```

**错误响应**：
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": {
      "field": "project_name",
      "reason": "project_name 不能为空"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 10. 总结

`POST /api/v1/submit` 接口是 TaskEcho 系统的核心数据提交接口，具有以下特点：

1. **完全幂等**：通过数据库唯一约束和 Upsert 操作确保幂等性
2. **原子性操作**：使用数据库事务确保数据一致性
3. **批量处理**：支持一次提交多个任务
4. **自动创建/更新**：根据外部标识自动判断创建或更新
5. **安全认证**：使用 API Key 进行安全认证
6. **完整验证**：对请求数据进行全面验证

该接口设计遵循 RESTful 规范，使用统一的响应格式，确保系统的一致性和可维护性。
