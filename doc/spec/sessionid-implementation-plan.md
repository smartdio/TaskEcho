# SessionID 实现方案规划

## 1. 概述

### 1.1 目标
为消息（Message）添加 `sessionId`（对话ID）字段，用于标识消息所属的对话会话。一个任务可能包含多个对话会话，每条消息属于一个特定的会话。

### 1.2 应用场景
- **多轮对话管理**：一个任务可能包含多个独立的对话会话
- **对话分组**：通过 sessionId 可以将消息按会话分组显示
- **对话追踪**：便于追踪和查询特定会话的所有消息
- **对话上下文**：支持按会话恢复对话上下文

### 1.3 设计原则
- **向后兼容**：sessionId 为可选字段，不影响现有功能
- **客户端提供**：sessionId 由客户端（cursor-agent）提供并传递，服务端原样存储
- **无需校验**：服务端不进行任何格式、长度、类型校验，直接存储
- **原样保存**：服务端不做任何处理（不 trim、不转换），原样保存客户端传递的值

---

## 2. 数据库设计

### 2.1 消息 Schema 修改

**文件**：`src/lib/models/Queue.js`

**修改内容**：在 `messageSchema` 中添加 `sessionId` 字段

```javascript
// 消息子文档 Schema（用于记录任务变化）
const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['USER', 'ASSISTANT'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  sessionId: {
    type: String,
    default: null,  // 可选字段，默认为 null（向后兼容）
    index: false    // 不需要索引（消息嵌入在任务中）
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });
```

**字段说明**：
- `sessionId`：对话会话ID，字符串类型，可选（默认 null）
- 来源：由客户端（cursor-agent）提供，标识客户端与 cursor-agent 交互时的对话会话
- 存储：服务端原样存储，不做任何校验、转换或处理
- 索引：不需要索引（消息嵌入在任务文档中，查询通过任务ID即可）

### 2.2 数据库迁移考虑

**向后兼容性**：
- 现有消息的 `sessionId` 字段为 `null` 或不存在，不影响查询
- 新消息可以包含 `sessionId`，也可以不包含（向后兼容）

**数据迁移**：
- 不需要数据迁移脚本（字段为可选）
- 现有消息保持原样，新消息可以包含 sessionId

---

## 3. API 接口修改

### 3.1 追加消息接口（POST /api/v1/tasks/message）

**文件**：`src/app/api/v1/tasks/message/route.js`

#### 3.1.1 请求体修改

**当前请求体**：
```json
{
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "queue_id": ".flow/task-test.json",
  "task_id": "1",
  "role": "user",
  "content": "请帮我实现登录功能"
}
```

**修改后请求体**：
```json
{
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "queue_id": ".flow/task-test.json",
  "task_id": "1",
  "role": "user",
  "content": "请帮我实现登录功能",
  "session_id": "session-12345-abcde"  // 新增字段，可选
}
```

#### 3.1.2 验证逻辑修改

**说明**：`session_id` 字段**不需要验证**，服务端直接接收和存储，不做任何校验。

#### 3.1.3 消息创建逻辑修改

**位置**：`handlePOST()` 函数中创建新消息的部分

**修改内容**：在创建消息时包含 `sessionId`，原样保存客户端传递的值

```javascript
// 9. 准备新消息
const now = new Date();
const newMessage = {
  role: body.role.toUpperCase(),
  content: body.content.trim(),
  sessionId: body.session_id || null,  // 新增，原样保存，不做任何处理
  createdAt: now
};
```

#### 3.1.4 响应格式修改

**当前响应**：
```json
{
  "success": true,
  "data": {
    "message_id": 0,
    "role": "USER",
    "content": "请帮我实现登录功能",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "消息追加成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**修改后响应**：
```json
{
  "success": true,
  "data": {
    "message_id": 0,
    "role": "USER",
    "content": "请帮我实现登录功能",
    "session_id": "session-12345-abcde",  // 新增字段
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "消息追加成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**代码修改**：
```javascript
// 13. 返回成功响应
return createSuccessResponse(
  {
    message_id: messages.length - 1,
    role: addedMessage.role,
    content: addedMessage.content,
    session_id: addedMessage.sessionId || null,  // 新增
    created_at: addedMessage.createdAt.toISOString()
  },
  '消息追加成功',
  200
);
```

---

### 3.2 提交任务接口（POST /api/v1/submit）

**文件**：`src/app/api/v1/submit/route.js`

#### 3.2.1 请求体修改

**当前任务消息格式**：
```json
{
  "tasks": [
    {
      "id": "1",
      "name": "任务名称",
      "prompt": "任务提示文本",
      "status": "pending",
      "messages": [
        {
          "role": "user",
          "content": "消息内容"
        }
      ]
    }
  ]
}
```

**修改后任务消息格式**：
```json
{
  "tasks": [
    {
      "id": "1",
      "name": "任务名称",
      "prompt": "任务提示文本",
      "status": "pending",
      "messages": [
        {
          "role": "user",
          "content": "消息内容",
          "session_id": "session-12345-abcde"  // 新增字段，可选
        }
      ]
    }
  ]
}
```

#### 3.2.2 验证逻辑修改

**说明**：`session_id` 字段**不需要验证**，服务端直接接收和存储，不做任何校验。

#### 3.2.3 消息处理逻辑修改

**位置**：`handlePOST()` 函数中处理任务消息的部分

**修改内容**：在映射消息时包含 `sessionId`，原样保存客户端传递的值

```javascript
// 使用客户端提交的 messages 和 logs
messages = (taskData.messages || []).map(msg => ({
  role: msg.role.toUpperCase(),
  content: msg.content,
  sessionId: msg.session_id || null,  // 新增，原样保存，不做任何处理
  createdAt: msg.createdAt ? new Date(msg.createdAt) : now
}));
```

---

## 4. 查询接口修改

### 4.1 任务详情查询接口

**接口**：`GET /api/v1/projects/[projectId]/queues/[queueId]/tasks/[taskId]`

**修改内容**：响应中的消息包含 `session_id` 字段

**当前响应格式**：
```json
{
  "success": true,
  "data": {
    "id": "1",
    "name": "任务名称",
    "messages": [
      {
        "role": "USER",
        "content": "消息内容",
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

**修改后响应格式**：
```json
{
  "success": true,
  "data": {
    "id": "1",
    "name": "任务名称",
    "messages": [
      {
        "role": "USER",
        "content": "消息内容",
        "session_id": "session-12345-abcde",  // 新增字段
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

**需要修改的文件**：
- `src/app/api/v1/projects/[projectId]/queues/[queueId]/tasks/[taskId]/route.js`

**修改内容**：在返回消息数据时包含 `sessionId`

```javascript
// 返回消息时包含 sessionId
messages: task.messages.map(msg => ({
  role: msg.role,
  content: msg.content,
  session_id: msg.sessionId || null,  // 新增
  created_at: msg.createdAt.toISOString()
}))
```

---

## 5. 文档更新

### 5.1 客户端实现指引更新

**文件**：`doc/guide/client-implementation-guide.md`

#### 5.1.1 任务文件格式更新

**当前格式**：
```json
{
  "tasks": [
    {
      "id": "1",
      "name": "任务名称",
      "messages": [
        {
          "role": "user",
          "content": "消息内容"
        }
      ]
    }
  ]
}
```

**更新后格式**：
```json
{
  "tasks": [
    {
      "id": "1",
      "name": "任务名称",
      "messages": [
        {
          "role": "user",
          "content": "消息内容",
          "session_id": "session-12345-abcde"  // 可选字段
        }
      ]
    }
  ]
}
```

#### 5.1.2 API 接口文档更新

**追加消息接口（5.2 节）**：

**请求体字段说明更新**：
| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `session_id` | string | 否 | 对话会话ID，客户端与 cursor-agent 交互时的对话会话ID，服务端原样存储，不做校验 | `"session-12345-abcde"` |

**响应字段说明更新**：
| 字段名 | 类型 | 说明 |
|--------|------|------|
| `data.session_id` | string\|null | 消息所属的会话ID，如果未提供则为 null |

**提交任务接口（5.1 节）**：

**任务消息字段说明更新**：
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `session_id` | string | 否 | 对话会话ID，客户端与 cursor-agent 交互时的对话会话ID，服务端原样存储，不做校验 |

#### 5.1.3 使用示例更新

**Bash 脚本示例**：
```bash
# 追加消息时包含 session_id
add_message() {
    local role=$1
    local content=$2
    local session_id=$3  # 新增参数
    
    local request_body=$(jq -n \
        --arg project_id "$PROJECT_ID" \
        --arg queue_id "$QUEUE_ID" \
        --arg task_id "$TASK_ID" \
        --arg role "$role" \
        --arg content "$content" \
        --arg session_id "${session_id:-}" \  # 新增
        '{
            project_id: $project_id,
            queue_id: $queue_id,
            task_id: $task_id,
            role: $role,
            content: $content,
            session_id: (if $session_id == "" then null else $session_id end)  # 可选字段
        }')
    
    # ... 发送请求 ...
}

# 使用示例
add_message "user" "请帮我实现登录功能" "session-12345-abcde"
```

**Python 示例**：
```python
def add_message(role, content, session_id=None):
    """追加对话消息到指定任务"""
    payload = {
        "project_id": PROJECT_ID,
        "queue_id": QUEUE_ID,
        "task_id": TASK_ID,
        "role": role,
        "content": content
    }
    
    # 如果提供了 session_id，则添加到请求中
    if session_id:
        payload["session_id"] = session_id
    
    # ... 发送请求 ...
```

### 5.2 数据库设计文档更新

**文件**：`doc/spec/database-design.md`

**更新内容**：在消息子文档 Schema 中添加 `sessionId` 字段说明

```javascript
// 消息子文档 Schema（用于记录任务变化）
const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['USER', 'ASSISTANT'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  sessionId: {
    type: String,
    default: null  // 可选字段，对话会话ID
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });
```

---

## 6. 实施步骤

### 6.1 第一阶段：数据库模型修改
1. ✅ 修改 `src/lib/models/Queue.js` 中的 `messageSchema`，添加 `sessionId` 字段
2. ✅ 验证 Schema 修改不影响现有数据

### 6.2 第二阶段：API 接口修改
1. ✅ 修改 `src/app/api/v1/tasks/message/route.js`
   - 修改消息创建逻辑（接收 `session_id`，不做校验）
   - 修改响应格式
2. ✅ 修改 `src/app/api/v1/submit/route.js`
   - 修改消息处理逻辑（接收 `session_id`，不做校验）
3. ✅ 修改任务详情查询接口
   - 在响应中包含 `session_id` 字段

### 6.3 第三阶段：文档更新
1. ✅ 更新 `doc/guide/client-implementation-guide.md`
   - 更新任务文件格式说明
   - 更新 API 接口文档
   - 更新使用示例
2. ✅ 更新 `doc/spec/database-design.md`
   - 更新数据库 Schema 说明

### 6.4 第四阶段：测试验证
1. ✅ 测试向后兼容性（不提供 session_id 的消息）
2. ✅ 测试新功能（提供 session_id 的消息）
3. ✅ 测试数据查询和显示
4. ✅ 测试原样存储（验证服务端是否正确保存客户端传递的值，不做任何处理）

---

## 7. 注意事项

### 7.1 向后兼容性
- `sessionId` 为可选字段，现有代码和客户端不受影响
- 不提供 `session_id` 的消息，`sessionId` 字段为 `null`
- 查询和显示逻辑需要处理 `sessionId` 为 `null` 的情况

### 7.2 数据一致性
- 客户端（cursor-agent）负责提供和管理 `sessionId`
- 同一会话的所有消息应使用相同的 `sessionId`
- **服务端不做任何校验**：不验证类型、长度、格式、唯一性等，原样存储

### 7.3 性能考虑
- `sessionId` 字段不需要索引（消息嵌入在任务文档中）
- 查询消息时通过任务ID即可，不需要额外的索引

### 7.4 客户端实现说明
- **sessionId 来源**：由客户端（cursor-agent）提供，标识客户端与 cursor-agent 交互时的对话会话
- **服务端处理**：服务端不做任何处理，原样存储客户端传递的值
- **会话管理**：客户端负责维护会话ID与任务的映射关系
- **消息分组**：前端可以根据 `sessionId` 对消息进行分组显示

---

## 8. 总结

本方案通过添加可选的 `sessionId` 字段，实现了消息的会话标识功能，同时保持了向后兼容性。主要修改包括：

1. **数据库模型**：在 `messageSchema` 中添加 `sessionId` 字段
2. **API 接口**：更新追加消息和提交任务接口，支持接收和返回 `session_id`
3. **查询接口**：在响应中包含 `session_id` 字段
4. **文档更新**：更新客户端实现指引和数据库设计文档

实施过程中需要注意向后兼容性和数据一致性，确保现有功能不受影响。

