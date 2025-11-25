# TaskEcho 后端 API 实现方案

## 1. 概述

### 1.1 文档目的
本文档详细说明 TaskEcho 系统的后端 API 实现方案，包括主要 API 功能、业务流程、接口规范和实现要点。

### 1.2 API 架构
- **框架**：Next.js API Routes
- **认证方式**：API Key（Header: `X-API-Key`）
- **响应格式**：统一 JSON 格式
- **版本控制**：`/api/v1/` 前缀
- **数据库**：MongoDB + Mongoose ODM

### 1.3 API 分类
1. **数据提交接口**：核心数据推送接口
2. **增量更新接口**：轻量级数据更新接口
3. **数据查询接口**：前端数据展示接口
4. **API Key 管理接口**：API Key 的增删改查

---

## 2. 核心数据提交接口

### 2.1 POST /api/v1/submit

**功能说明**：提交项目、任务队列和批量任务数据，完全幂等操作。

**认证要求**：需要 API Key（Header: `X-API-Key`）

**请求方法**：`POST`

**请求路径**：`/api/v1/submit`

**请求头**：
```
Content-Type: application/json
X-API-Key: <api_key_value>
```

**请求体**：
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
      "prompt": "请编写系统基础框架的实现方案，包括主要api规范和数据库规范，数据库使用sqlite。",
      "spec_file": [
        ".flow/skills/spcewriter.md",
        "doc/requirement.md"
      ],
      "status": "pending",
      "report": null,
      "messages": [],
      "logs": []
    }
  ]
}
```

**请求参数说明**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| project_id | string | 是 | 项目外部唯一标识 |
| project_name | string | 是 | 项目显示名称 |
| queue_id | string | 是 | 任务队列外部唯一标识 |
| queue_name | string | 是 | 任务队列显示名称 |
| meta | object | 否 | 元数据信息（类似 prompts） |
| tasks | array | 是 | 任务数组 |
| tasks[].id | string | 是 | 任务ID（在队列内唯一） |
| tasks[].name | string | 是 | 任务名称 |
| tasks[].prompt | string | 是 | 任务提示文本 |
| tasks[].spec_file | array[string] | 否 | 规范文件路径数组 |
| tasks[].status | string | 是 | 任务状态（pending/done/error） |
| tasks[].report | string | 否 | 报告文件路径（可选） |
| tasks[].messages | array | 否 | 对话消息数组（导入时通常为空） |
| tasks[].messages[].role | string | 是 | 消息角色（user/assistant） |
| tasks[].messages[].content | string | 是 | 消息内容 |
| tasks[].logs | array | 否 | 执行日志数组（导入时通常为空） |
| tasks[].logs[].content | string | 是 | 日志内容 |

**响应格式**：

**成功响应（200）**：
```json
{
  "success": true,
  "data": {
    "project_id": "project_001",
    "queue_id": "queue_001",
    "tasks_count": 1
  },
  "message": "提交成功",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**错误响应（400/401/500）**：
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

**业务流程**：

```
1. 验证 API Key
   ↓
2. 验证请求数据格式
   ↓
3. 处理项目（根据 project_id 判断存在性）
   - 不存在：创建新项目
   - 存在：更新项目名称
   ↓
4. 处理任务队列（根据 project_id + queue_id 判断存在性）
   - 不存在：创建新队列
   - 存在：更新队列名称
   ↓
5. 处理任务列表（批量处理）
   For each task:
     - 根据 queue_id + task_id 判断存在性
     - 不存在：创建新任务（包括标签、消息、日志）
     - 存在：完全替换任务（更新所有字段，包括嵌入的消息和日志）
   ↓
6. 更新项目/队列的 lastTaskAt 时间戳
   ↓
7. 返回成功响应
```

**幂等性保证**：
- 使用唯一索引确保数据唯一性
- 使用 findOneAndUpdate 的 upsert 选项实现幂等性
- 重复调用结果一致

**实现要点**：
```javascript
// 伪代码示例
async function handleSubmit(request) {
  // 1. 验证 API Key
  const apiKey = await authenticateApiKey(request)
  
  // 2. 验证请求数据
  const data = await request.json()
  validateSubmitData(data)
  
  // 3. 处理项目（使用 upsert 实现幂等性）
  const project = await Project.findOneAndUpdate(
    { projectId: data.project_id },
    {
      projectId: data.project_id,
      name: data.project_name,
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true, new: true }
  )
  
  // 4. 处理队列和任务（任务嵌入在队列中）
  const now = new Date()
  
  // 准备任务数组（嵌入在队列中）
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
  
  // 使用 findOneAndUpdate 更新队列（包含嵌入的任务）
  const queue = await Queue.findOneAndUpdate(
    { projectId: project._id, queueId: data.queue_id },
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
  
  // 5. 更新时间戳
  await Project.findByIdAndUpdate(project._id, {
    lastTaskAt: now
  })
  
  return createSuccessResponse({
    project_id: data.project_id,
    queue_id: data.queue_id,
    tasks_count: data.tasks.length
  })
}
```

---

## 3. 增量更新接口

### 3.1 POST /api/v1/tasks/:projectId/:queueId/:taskId/message

**功能说明**：追加单条对话消息到指定任务，不覆盖历史消息。

**认证要求**：需要 API Key

**请求方法**：`POST`

**请求路径**：`/api/v1/tasks/:projectId/:queueId/:taskId/message`

**路径参数**：
- `projectId`：项目外部标识
- `queueId`：任务队列外部标识
- `taskId`：任务外部标识

**请求体**：
```json
{
  "role": "user",
  "content": "新的消息内容"
}
```

**响应格式**：
```json
{
  "success": true,
  "data": {
    "message_id": 123,
    "created_at": "2024-01-01T00:00:00Z"
  },
  "message": "消息追加成功",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**业务流程**：
```
1. 验证 API Key
   ↓
2. 根据 projectId + queueId 查找队列
   ↓
3. 验证队列是否存在
   ↓
4. 在队列的 tasks 数组中查找指定 taskId 的任务
   ↓
5. 验证任务是否存在
   ↓
6. 使用 $push 向任务的 messages 数组追加新消息
   ↓
7. 更新队列的 lastTaskAt 时间戳
   ↓
8. 返回成功响应
```

**实现要点**：
```javascript
async function addMessage(projectId, queueId, taskId, messageData) {
  // 1. 查找项目
  const project = await Project.findOne({ projectId })
  if (!project) {
    throw new Error('项目不存在')
  }
  
  // 2. 查找队列
  const queue = await Queue.findOne({
    projectId: project._id,
    queueId: queueId
  })
  if (!queue) {
    throw new Error('任务队列不存在')
  }
  
  // 3. 使用 $push 向任务的 messages 数组追加新消息
  const result = await Queue.findOneAndUpdate(
    {
      _id: queue._id,
      'tasks.id': taskId  // 定位到特定任务
    },
    {
      $push: {
        'tasks.$.messages': {
          role: messageData.role.toUpperCase(),
          content: messageData.content,
          createdAt: new Date()
        }
      },
      $set: {
        lastTaskAt: new Date()
      }
    },
    { new: true }
  )
  
  if (!result) {
    throw new Error('任务不存在')
  }
  
  return {
    message_id: result.tasks.find(t => t.id === taskId).messages.length - 1,
    created_at: new Date().toISOString()
  }
}
```

### 3.2 POST /api/v1/tasks/:projectId/:queueId/:taskId/log

**功能说明**：追加任务执行日志，自动添加时间戳。

**认证要求**：需要 API Key

**请求方法**：`POST`

**请求路径**：`/api/v1/tasks/:projectId/:queueId/:taskId/log`

**路径参数**：
- `projectId`：项目外部标识
- `queueId`：任务队列外部标识
- `taskId`：任务外部标识

**请求体**：
```json
{
  "content": "日志内容（纯文本）"
}
```

**响应格式**：
```json
{
  "success": true,
  "data": {
    "log_id": 456,
    "created_at": "2024-01-01T00:00:00Z"
  },
  "message": "日志追加成功",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**业务流程**：
```
1. 验证 API Key
   ↓
2. 根据 projectId + queueId 查找队列
   ↓
3. 验证队列是否存在
   ↓
4. 在队列的 tasks 数组中查找指定 taskId 的任务
   ↓
5. 验证任务是否存在
   ↓
6. 使用 $push 向任务的 logs 数组追加新日志
   ↓
7. 更新队列的 lastTaskAt 时间戳
   ↓
8. 返回成功响应
```

**实现要点**：
```javascript
async function addLog(projectId, queueId, taskId, logData) {
  // 1. 查找项目
  const project = await Project.findOne({ projectId })
  if (!project) {
    throw new Error('项目不存在')
  }
  
  // 2. 查找队列
  const queue = await Queue.findOne({
    projectId: project._id,
    queueId: queueId
  })
  if (!queue) {
    throw new Error('任务队列不存在')
  }
  
  // 3. 使用 $push 向任务的 logs 数组追加新日志
  const result = await Queue.findOneAndUpdate(
    {
      _id: queue._id,
      'tasks.id': taskId  // 定位到特定任务
    },
    {
      $push: {
        'tasks.$.logs': {
          content: logData.content,
          createdAt: new Date()
        }
      },
      $set: {
        lastTaskAt: new Date()
      }
    },
    { new: true }
  )
  
  if (!result) {
    throw new Error('任务不存在')
  }
  
  return {
    log_id: result.tasks.find(t => t.id === taskId).logs.length - 1,
    created_at: new Date().toISOString()
  }
}
```

### 3.3 PATCH /api/v1/tasks/:projectId/:queueId/:taskId/status

**功能说明**：修改任务状态。

**认证要求**：需要 API Key

**请求方法**：`PATCH`

**请求路径**：`/api/v1/tasks/:projectId/:queueId/:taskId/status`

**路径参数**：
- `projectId`：项目外部标识
- `queueId`：任务队列外部标识
- `taskId`：任务外部标识

**请求体**：
```json
{
  "status": "done"
}
```

**响应格式**：
```json
{
  "success": true,
  "data": {
    "task_id": "task_001",
    "status": "done",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "message": "状态更新成功",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**业务流程**：
```
1. 验证 API Key
   ↓
2. 根据 projectId + queueId 查找队列
   ↓
3. 验证队列是否存在
   ↓
4. 在队列的 tasks 数组中查找指定 taskId 的任务
   ↓
5. 验证任务是否存在
   ↓
6. 验证状态值是否有效（pending/done/error）
   ↓
7. 使用 $set 更新任务状态
   ↓
8. 更新队列的 lastTaskAt 时间戳
   ↓
9. 返回成功响应
```

**实现要点**：
```javascript
async function updateTaskStatus(projectId, queueId, taskId, status) {
  // 1. 查找项目
  const project = await Project.findOne({ projectId })
  if (!project) {
    throw new Error('项目不存在')
  }
  
  // 2. 查找队列
  const queue = await Queue.findOne({
    projectId: project._id,
    queueId: queueId
  })
  if (!queue) {
    throw new Error('任务队列不存在')
  }
  
  // 3. 验证状态值
  const validStatuses = ['pending', 'done', 'error']
  if (!validStatuses.includes(status.toLowerCase())) {
    throw new Error('无效的状态值')
  }
  
  // 4. 使用 $set 更新任务状态
  const result = await Queue.findOneAndUpdate(
    {
      _id: queue._id,
      'tasks.id': taskId  // 定位到特定任务
    },
    {
      $set: {
        'tasks.$.status': status.toLowerCase(),
        lastTaskAt: new Date()
      }
    },
    { new: true }
  )
  
  if (!result) {
    throw new Error('任务不存在')
  }
  
  const task = result.tasks.find(t => t.id === taskId)
  return {
    task_id: taskId,
    status: task.status,
    updated_at: new Date().toISOString()
  }
}
```

---

## 4. 数据查询接口

### 4.1 GET /api/v1/projects

**功能说明**：获取所有项目列表，按最后任务更新时间倒序排列。

**认证要求**：无需认证（单用户本地应用）

**请求方法**：`GET`

**请求路径**：`/api/v1/projects`

**查询参数**（可选）：
- `page`：页码（默认：1）
- `pageSize`：每页数量（默认：20）

**响应格式**：
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
        "last_task_at": "2024-01-01T00:00:00Z",
        "created_at": "2024-01-01T00:00:00Z"
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
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**业务流程**：
```
1. 查询所有项目（按 lastTaskAt 倒序）
   ↓
2. 对每个项目统计：
   - 队列数量
   - 任务总数
   - Pending/Done/Error 任务数
   ↓
3. 返回项目列表和统计信息
```

### 4.2 GET /api/v1/projects/:projectId

**功能说明**：获取项目详情。

**认证要求**：无需认证

**请求方法**：`GET`

**请求路径**：`/api/v1/projects/:projectId`

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
    "last_task_at": "2024-01-01T00:00:00Z",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "message": "查询成功",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 4.3 GET /api/v1/projects/:projectId/queues

**功能说明**：获取项目下的任务队列列表。

**认证要求**：无需认证

**请求方法**：`GET`

**请求路径**：`/api/v1/projects/:projectId/queues`

**查询参数**（可选）：
- `search`：队列名称搜索关键词

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
        "last_task_at": "2024-01-01T00:00:00Z",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ]
  },
  "message": "查询成功",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 4.4 GET /api/v1/projects/:projectId/queues/:queueId

**功能说明**：获取任务队列详情。

**认证要求**：无需认证

**请求方法**：`GET`

**请求路径**：`/api/v1/projects/:projectId/queues/:queueId`

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
    "last_task_at": "2024-01-01T00:00:00Z",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "message": "查询成功",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 4.5 GET /api/v1/projects/:projectId/queues/:queueId/tasks

**功能说明**：获取任务队列下的任务列表。

**认证要求**：无需认证

**请求方法**：`GET`

**请求路径**：`/api/v1/projects/:projectId/queues/:queueId/tasks`

**查询参数**（可选）：
- `status`：状态过滤（pending/done/error）
- `tags`：标签过滤（多个标签用逗号分隔）
- `page`：页码（默认：1）
- `pageSize`：每页数量（默认：20）

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
        "updated_at": "2024-01-01T00:00:00Z",
        "created_at": "2024-01-01T00:00:00Z"
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
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 4.6 GET /api/v1/projects/:projectId/queues/:queueId/tasks/:taskId

**功能说明**：获取任务详情，包含完整的对话历史和日志。

**认证要求**：无需认证

**请求方法**：`GET`

**请求路径**：`/api/v1/projects/:projectId/queues/:queueId/tasks/:taskId`

**响应格式**：
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
        "id": 1,
        "role": "user",
        "content": "用户消息内容",
        "created_at": "2024-01-01T00:00:00Z"
      },
      {
        "id": 2,
        "role": "assistant",
        "content": "AI 回复内容",
        "created_at": "2024-01-01T00:01:00Z"
      }
    ],
    "logs": [
      {
        "id": 1,
        "content": "日志内容",
        "created_at": "2024-01-01T00:02:00Z"
      }
    ],
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:02:00Z"
  },
  "message": "查询成功",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**业务流程**：
```
1. 根据 projectId + queueId 查找队列
   ↓
2. 在队列的 tasks 数组中查找指定 taskId 的任务
   ↓
3. 验证任务是否存在
   ↓
4. 返回任务完整数据（包含 messages 和 logs）
```

**实现要点**：
```javascript
async function getTaskDetail(projectId, queueId, taskId) {
  // 1. 查找项目
  const project = await Project.findOne({ projectId })
  if (!project) {
    throw new Error('项目不存在')
  }
  
  // 2. 查找队列（包含完整的 tasks 数组）
  const queue = await Queue.findOne({
    projectId: project._id,
    queueId: queueId
  }).lean()
  
  if (!queue) {
    throw new Error('任务队列不存在')
  }
  
  // 3. 在 tasks 数组中查找指定任务
  const task = queue.tasks.find(t => t.id === taskId)
  if (!task) {
    throw new Error('任务不存在')
  }
  
  // 4. 返回任务完整数据（包含 messages 和 logs）
  return {
    id: task.id,
    name: task.name,
    prompt: task.prompt,
    spec_file: task.spec_file,
    status: task.status,
    report: task.report,
    messages: task.messages || [],  // 详情查询包含完整 messages
    logs: task.logs || [],          // 详情查询包含完整 logs
    created_at: task.createdAt?.toISOString(),
    updated_at: task.updatedAt?.toISOString()
  }
}
```

**注意**：详情查询返回完整的任务数据，包括 `messages` 和 `logs` 字段。

### 4.7 GET /api/v1/stats

**功能说明**：获取全局统计信息。

**认证要求**：无需认证

**请求方法**：`GET`

**请求路径**：`/api/v1/stats`

**响应格式**：
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
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

## 5. API Key 管理接口

### 5.1 GET /api/v1/api-keys

**功能说明**：获取所有 API Key 列表。

**认证要求**：无需认证（本地管理）

**请求方法**：`GET`

**请求路径**：`/api/v1/api-keys`

**响应格式**：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "name": "项目1 API Key",
        "key": "sk-****1234",
        "project_id": "project_001",
        "is_active": true,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      }
    ]
  },
  "message": "查询成功",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 5.2 POST /api/v1/api-keys

**功能说明**：创建新的 API Key。

**认证要求**：无需认证

**请求方法**：`POST`

**请求路径**：`/api/v1/api-keys`

**请求体**：
```json
{
  "name": "项目1 API Key",
  "key": "sk-xxxxxxxxxxxxxxxx",
  "project_id": "project_001"
}
```

**响应格式**：
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "项目1 API Key",
    "key": "sk-****1234",
    "project_id": "project_001",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z"
  },
  "message": "API Key 创建成功",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**业务流程**：
```
1. 验证数据格式
   ↓
2. 检查 API Key 值是否已存在
   ↓
3. 加密/哈希存储 API Key
   ↓
4. 创建 API Key 记录
   ↓
5. 返回成功响应（不返回原始 Key 值）
```

### 5.3 PUT /api/v1/api-keys/:id

**功能说明**：更新 API Key。

**认证要求**：无需认证

**请求方法**：`PUT`

**请求路径**：`/api/v1/api-keys/:id`

**请求体**：
```json
{
  "name": "更新后的名称",
  "project_id": "project_002",
  "is_active": true
}
```

**响应格式**：
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "更新后的名称",
    "key": "sk-****1234",
    "project_id": "project_002",
    "is_active": true,
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "message": "API Key 更新成功",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 5.4 DELETE /api/v1/api-keys/:id

**功能说明**：删除 API Key。

**认证要求**：无需认证

**请求方法**：`DELETE`

**请求路径**：`/api/v1/api-keys/:id`

**响应格式**：
```json
{
  "success": true,
  "data": {
    "id": 1
  },
  "message": "API Key 删除成功",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

## 6. API 认证机制

### 6.1 API Key 认证流程

```
1. 从请求头提取 API Key
   Header: X-API-Key: <api_key_value>
   ↓
2. 查询数据库验证 API Key
   - 检查 API Key 是否存在
   - 检查 API Key 是否激活（is_active = true）
   ↓
3. 验证通过则继续处理
   验证失败则返回 401 错误
```

### 6.2 API Key 存储安全

**推荐方案**：使用单向哈希（bcrypt）

```javascript
// 存储时
const hashedKey = await bcrypt.hash(apiKey, 10)

// 验证时
const isValid = await bcrypt.compare(apiKey, hashedKey)
```

**备选方案**：使用加密（AES-256）

```javascript
// 存储时
const encryptedKey = encrypt(apiKey, secretKey)

// 验证时
const decryptedKey = decrypt(encryptedKey, secretKey)
const isValid = decryptedKey === apiKey
```

### 6.3 认证中间件实现

```javascript
async function authenticateApiKey(request) {
  // 从 Header 提取 API Key
  const apiKey = request.headers.get('X-API-Key')
  
  if (!apiKey) {
    throw new Error('缺少 API Key')
  }
  
  // 查询数据库
  const keyRecords = await ApiKey.find({ isActive: true })
  
  // 验证 API Key（哈希比对）
  for (const record of keyRecords) {
    const isValid = await bcrypt.compare(apiKey, record.key)
    if (isValid) {
      return record
    }
  }
  
  throw new Error('无效的 API Key')
}
```

---

## 7. 错误处理

### 7.1 错误码定义

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| INVALID_API_KEY | 401 | API Key 无效或缺失 |
| INVALID_PARAMETER | 400 | 请求参数无效 |
| RESOURCE_NOT_FOUND | 404 | 资源不存在 |
| VALIDATION_ERROR | 400 | 数据验证失败 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

### 7.2 错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "API Key 无效或缺失",
    "details": {}
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 7.3 错误处理中间件

```javascript
function errorHandler(error, request) {
  // 记录错误日志
  console.error('API Error:', error)
  
  // 根据错误类型返回相应响应
  if (error.message === '缺少 API Key') {
    return createErrorResponse(
      'API Key 无效或缺失',
      'INVALID_API_KEY',
      401
    )
  }
  
  if (error.message === '资源不存在') {
    return createErrorResponse(
      '资源不存在',
      'RESOURCE_NOT_FOUND',
      404
    )
  }
  
  // 默认错误
  return createErrorResponse(
    '服务器内部错误',
    'INTERNAL_ERROR',
    500
  )
}
```

---

## 8. 性能优化建议

### 8.1 查询优化
1. **使用索引**：所有常用查询字段都建立了索引
2. **分页查询**：列表接口支持分页，使用 `limit()` 和 `skip()`，避免一次性加载大量数据
3. **字段选择**：使用 `select()` 只查询需要的字段
4. **嵌入查询**：消息和日志嵌入在任务中，一次查询即可获取所有数据，避免 N+1 查询
5. **聚合查询**：使用 MongoDB 的聚合管道进行复杂查询和统计

### 8.2 写入优化
1. **批量操作**：使用 `insertMany()` 批量插入
2. **原子操作**：使用 `$push`、`$set` 等原子操作更新嵌入数组
3. **异步处理**：非关键操作可以异步处理
4. **索引维护**：注意大量写入时的索引维护性能

### 8.3 缓存策略
1. **统计信息缓存**：全局统计信息可以缓存，定期更新
2. **API Key 缓存**：活跃的 API Key 可以缓存，减少数据库查询

---

## 9. 安全建议

### 9.1 API Key 安全
- API Key 值使用单向哈希或加密存储
- 前端显示时只显示部分字符
- 支持禁用 API Key（is_active）

### 9.2 数据验证
- 所有输入数据必须验证
- 使用 Mongoose 的 Schema 验证功能
- 防止 NoSQL 注入（Mongoose 自动处理，避免直接使用用户输入构建查询对象）

### 9.3 请求限制
- 考虑添加请求频率限制（Rate Limiting）
- 防止恶意请求

---

## 10. 总结

本文档详细说明了 TaskEcho 系统的后端 API 实现方案，包括：

1. **核心数据提交接口**：POST /api/v1/submit，完全幂等操作
2. **增量更新接口**：追加消息、追加日志、修改状态
3. **数据查询接口**：项目、队列、任务、统计查询
4. **API Key 管理接口**：增删改查 API Key
5. **认证机制**：API Key 认证和安全存储
6. **错误处理**：统一错误码和错误响应格式
7. **性能优化**：查询优化、写入优化、缓存策略
8. **安全建议**：API Key 安全、数据验证、请求限制

所有 API 遵循 RESTful 设计规范，使用统一的响应格式，确保系统的一致性和可维护性。
