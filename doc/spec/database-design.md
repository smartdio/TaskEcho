# TaskEcho 数据库设计文档

## 1. 概述

### 1.1 数据库选择
- **数据库类型**：MongoDB（文档数据库）
- **ODM 框架**：Mongoose
- **数据库连接**：通过 MongoDB 连接字符串配置
- **数据库名称**：`taskecho`（开发和生产环境通过环境变量配置）

### 1.2 设计原则
1. **文档结构优化**：充分利用 MongoDB 的文档嵌套特性，将关联紧密的数据嵌入文档
2. **查询性能**：合理设计索引，优化常用查询场景
3. **扩展性**：利用 MongoDB 的灵活 Schema，支持非结构化数据存储
4. **幂等性**：通过唯一索引确保数据一致性，支持重复提交

### 1.3 数据层级结构
```
项目 (Project)
  └── 任务队列 (Queue)
      └── 任务 (Task)
          ├── 对话消息 (Message) [嵌入]
          ├── 执行日志 (Log) [嵌入]
          └── 标签 (Tag) [嵌入或引用]
```

### 1.4 设计策略
- **嵌入策略**：消息和日志嵌入到任务文档中，因为它们总是与任务一起查询，且更新频率高
- **引用策略**：项目、队列、任务使用引用关系，支持独立查询和更新
- **混合策略**：标签可以嵌入到任务中（简化查询），也可以单独维护（支持全局标签管理）

---

## 2. 集合（Collection）设计

### 2.1 项目集合 (projects)

**集合名**：`projects`

**功能说明**：存储项目信息，项目是最高层级的数据单元。

**文档结构**：

```javascript
{
  _id: ObjectId,                    // MongoDB 自动生成的主键
  projectId: String,                // 外部唯一标识（业务主键，唯一索引）
  name: String,                     // 项目显示名称
  lastTaskAt: Date,                 // 最后任务更新时间（用于排序）
  createdAt: Date,                  // 创建时间
  updatedAt: Date                   // 更新时间
}
```

**Mongoose Schema**：
```javascript
const projectSchema = new mongoose.Schema({
  projectId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  lastTaskAt: {
    type: Date,
    default: null,
    index: true
  }
}, {
  timestamps: true  // 自动添加 createdAt 和 updatedAt
});
```

**索引设计**：
- 唯一索引：`projectId`（确保外部标识唯一）
- 普通索引：`lastTaskAt`（用于首页排序）

**字段说明**：
- `_id`：MongoDB 自动生成的 ObjectId，作为内部主键
- `projectId`：外部系统提供的唯一标识，用于幂等性判断
- `name`：项目显示名称，可被更新
- `lastTaskAt`：最后任务更新时间，用于首页项目列表排序
- `createdAt`：创建时间，自动设置
- `updatedAt`：更新时间，自动更新

**业务规则**：
- `projectId` 全局唯一，不允许重复
- 项目名称可以通过 `/api/v1/submit` 接口更新
- `lastTaskAt` 在项目下有任务更新时自动更新

---

### 2.2 任务队列集合 (queues)

**集合名**：`queues`

**功能说明**：存储任务队列信息，任务队列属于项目。任务嵌入在队列文档中，充分利用 MongoDB 的文档嵌套特性。队列结构类似于 `.flow/task.json`，包含一个 `tasks` 数组。

**文档结构**：

```javascript
{
  _id: ObjectId,                    // MongoDB 自动生成的主键
  projectId: ObjectId,              // 关联项目ID（引用）
  queueId: String,                  // 外部唯一标识（在项目内唯一）
  name: String,                     // 队列显示名称
  meta: Object,                     // 元数据信息（JSON 对象，可选，类似 prompts）
  tasks: [                          // 任务数组（嵌入）
    {
      id: String,                   // 任务ID（在队列内唯一）
      name: String,                 // 任务名称
      prompt: String,               // 任务提示文本
      spec_file: [String],          // 规范文件路径数组（文本数组）
      status: String,               // 任务状态（pending/done/error）
      report: String,               // 报告文件路径（可选）
      messages: [                   // 对话消息数组（嵌入，用于记录任务变化）
        {
          role: String,             // 消息角色（USER/ASSISTANT）
          content: String,          // 消息内容（支持 Markdown）
          createdAt: Date          // 创建时间
        }
      ],
      logs: [                       // 执行日志数组（嵌入，用于记录任务变化）
        {
          content: String,         // 日志内容（纯文本）
          createdAt: Date         // 创建时间
        }
      ]
    }
  ],
  lastTaskAt: Date,                 // 最后任务更新时间
  createdAt: Date,                  // 创建时间
  updatedAt: Date                   // 更新时间
}
```

**Mongoose Schema**：
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
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// 日志子文档 Schema（用于记录任务变化）
const logSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// 任务子文档 Schema
const taskSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  prompt: {
    type: String,
    required: true
  },
  spec_file: {
    type: [String],                  // 文本数组
    default: []
  },
  status: {
    type: String,
    enum: ['pending', 'done', 'error'],
    default: 'pending'
  },
  report: {
    type: String,
    default: null
  },
  messages: [messageSchema],        // 对话消息数组（用于记录任务变化）
  logs: [logSchema]                 // 执行日志数组（用于记录任务变化）
}, { _id: false });

// 队列 Schema
const queueSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  queueId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,  // 支持任意 JSON 结构（类似 prompts）
    default: null
  },
  tasks: [taskSchema],              // 嵌入任务数组
  lastTaskAt: {
    type: Date,
    default: null,
    index: true
  }
}, {
  timestamps: true
});

// 复合唯一索引：项目内队列唯一
queueSchema.index({ projectId: 1, queueId: 1 }, { unique: true });
```

**索引设计**：
- 唯一索引：`(projectId, queueId)`（确保项目内队列唯一）
- 普通索引：`projectId`（关联查询）
- 普通索引：`queueId`（查询优化）
- 普通索引：`lastTaskAt`（排序优化）

**字段说明**：
- `_id`：MongoDB 自动生成的 ObjectId
- `projectId`：关联的项目ID（引用 projects 集合）
- `queueId`：外部系统提供的唯一标识（在项目内唯一）
- `name`：队列显示名称，可被更新
- `meta`：元数据信息，支持任意 JSON 结构（类似 `.flow/task.json` 中的 `prompts`），用于存储队列级别的元数据
- `tasks`：任务数组，嵌入在队列文档中，每个任务包含：
  - `id`：任务ID（在队列内唯一）
  - `name`：任务名称
  - `prompt`：任务提示文本
  - `spec_file`：规范文件路径数组（文本数组）
  - `status`：任务状态（pending/done/error）
  - `report`：报告文件路径（可选）
  - `messages`：对话消息数组，嵌入在任务中，用于记录任务变化（系统运行时动态添加）
  - `logs`：执行日志数组，嵌入在任务中，用于记录任务变化（系统运行时动态添加）
- `lastTaskAt`：最后任务更新时间，用于项目详情页排序
- `createdAt`：创建时间，自动设置
- `updatedAt`：更新时间，自动更新

**业务规则**：
- `(projectId, queueId)` 组合唯一，确保项目内队列不重复
- 队列名称可以通过 `/api/v1/submit` 接口更新
- `meta` 字段用于存储提交接口传递的元数据信息，支持任意结构（类似 `.flow/task.json` 中的 `prompts`）
- `tasks` 数组中的任务通过 `id` 在队列内唯一
- 任务的基本字段（id、name、prompt、spec_file、status、report）在导入时提供，与 `.flow/task.json` 结构一致
- 任务的 `messages` 和 `logs` 字段在导入时为空数组，后续通过增量更新接口（如 `/api/v1/tasks/:projectId/:queueId/:taskId/message` 和 `/api/v1/tasks/:projectId/:queueId/:taskId/log`）动态添加，用于记录任务变化
- **查询优化规则**：
  - **列表查询**：查询队列列表或任务列表时，使用 `select()` 排除 `tasks.messages` 和 `tasks.logs` 字段，只返回基本字段，提高查询性能
  - **详情查询**：查询单个队列或任务详情时，返回完整的任务数据，包括 `messages` 和 `logs` 字段
- 删除项目时，需要手动删除所有关联的任务队列（或使用 MongoDB 的聚合管道）
- `lastTaskAt` 在队列下有任务更新时自动更新

**嵌入设计的优势**：
- **查询性能**：一次查询即可获取队列的所有任务，无需多次关联查询
- **灵活查询**：列表查询时排除 `messages` 和 `logs` 字段，详情查询时包含完整数据，兼顾性能和功能需求
- **原子性**：队列和任务作为一个整体，更新操作更简单
- **灵活性**：任务结构可以灵活变化，不受固定 Schema 限制
- **适合非结构化数据**：充分利用 MongoDB 对非结构化数据的支持
- **符合实际数据结构**：与 `.flow/task.json` 的结构一致，便于数据导入导出

---

### 2.3 API Key 集合 (api_keys)

**集合名**：`api_keys`

**功能说明**：存储 API Key 信息，用于接口认证和项目关联。

**文档结构**：

```javascript
{
  _id: ObjectId,                    // MongoDB 自动生成的主键
  name: String,                     // API Key 名称/标识
  key: String,                      // API Key 哈希值（唯一索引）
  projectId: String,                // 关联的项目ID（可选，用于项目专属 API Key）
  isActive: Boolean,                // 是否激活
  createdAt: Date,                  // 创建时间
  updatedAt: Date                   // 更新时间
}
```

**Mongoose Schema**：
```javascript
const apiKeySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  projectId: {
    type: String,
    default: null,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});
```

**索引设计**：
- 唯一索引：`key`（确保 API Key 哈希值唯一）
- 普通索引：`projectId`（关联查询）
- 普通索引：`isActive`（激活状态过滤）

**字段说明**：
- `_id`：MongoDB 自动生成的 ObjectId
- `name`：API Key 名称/标识，用户自定义，用于管理
- `key`：API Key 的哈希值，建议使用 bcrypt 或类似算法进行单向哈希
- `projectId`：关联的项目ID（可选），用于项目专属 API Key
- `isActive`：是否激活，可用于禁用 API Key
- `createdAt`：创建时间，自动设置
- `updatedAt`：更新时间，自动更新

**业务规则**：
- API Key 哈希值全局唯一，不允许重复
- API Key 值建议使用单向哈希（如 bcrypt）存储，提高安全性
- `projectId` 可选，如果设置，则该 API Key 只能用于指定项目
- `isActive` 为 `false` 时，该 API Key 无法通过认证

**安全建议**：
- API Key 存储时使用单向哈希（如 bcrypt）存储
- 查询时进行哈希比对
- 前端显示时，只显示部分字符（如 `sk-****1234`）

---

## 3. 集合关系图

```
┌─────────────┐
│  Project    │
│─────────────│
│ _id (PK)    │
│ projectId   │
│ name        │
│ lastTaskAt  │
└─────────────┘
       │
       │ 引用 (1:N)
       │
       ▼
┌─────────────┐
│   Queue     │
│─────────────│
│ _id (PK)    │
│ projectId   │───┐
│ queueId     │   │
│ name        │   │
│ meta        │   │
│ tasks[]     │   │  ← 嵌入任务数组
│   ├─ taskId │   │
│   ├─ title  │   │
│   ├─ status │   │
│   ├─ tags[] │   │  ← 任务内嵌入标签数组
│   ├─ messages[]│  ← 任务内嵌入消息数组
│   └─ logs[] │   │  ← 任务内嵌入日志数组
│ lastTaskAt  │   │
└─────────────┘   │
       │          │
       │ 引用 (1:N)│
       │          │
       └──────────┘

┌─────────────┐
│   ApiKey    │
│─────────────│
│ _id (PK)    │
│ name        │
│ key         │
│ projectId   │
│ isActive    │
└─────────────┘
```

---

## 4. 索引设计策略

### 4.1 主键索引
所有集合都有主键 `_id`（ObjectId），MongoDB 自动创建主键索引。

### 4.2 唯一索引
- `projects.projectId`：项目外部标识唯一
- `queues(projectId, queueId)`：项目内队列唯一（复合唯一索引）
- `api_keys.key`：API Key 哈希值唯一

**注意**：任务嵌入在队列的 `tasks` 数组中，通过应用层逻辑确保 `taskId` 在队列内唯一，无需数据库唯一索引。

### 4.3 引用索引
- `queues.projectId`：关联项目查询

### 4.4 查询优化索引
- `projects.lastTaskAt`：首页项目排序
- `queues.lastTaskAt`：项目详情页队列排序
- `tasks.status`：任务状态过滤
- `tasks.updatedAt`：任务更新时间排序
- `api_keys.isActive`：API Key 激活状态过滤

### 4.5 索引创建示例

```javascript
// 项目集合索引
db.projects.createIndex({ projectId: 1 }, { unique: true });
db.projects.createIndex({ lastTaskAt: -1 });

// 队列集合索引
db.queues.createIndex({ projectId: 1, queueId: 1 }, { unique: true });
db.queues.createIndex({ projectId: 1 });
db.queues.createIndex({ queueId: 1 });
db.queues.createIndex({ lastTaskAt: -1 });

// 注意：任务嵌入在队列中，无需独立的索引

// API Key 集合索引
db.api_keys.createIndex({ key: 1 }, { unique: true });
db.api_keys.createIndex({ projectId: 1 });
db.api_keys.createIndex({ isActive: 1 });
```

---

## 5. 数据操作示例

### 5.1 项目操作

**创建项目**：
```javascript
const project = await Project.create({
  projectId: 'project_001',
  name: '示例项目'
});
```

**查询项目**：
```javascript
// 查询所有项目，按最后任务时间排序
const projects = await Project.find()
  .sort({ lastTaskAt: -1 })
  .limit(20);

// 根据 projectId 查询
const project = await Project.findOne({ projectId: 'project_001' });
```

**更新项目**：
```javascript
await Project.findOneAndUpdate(
  { projectId: 'project_001' },
  { 
    name: '更新后的项目名称',
    lastTaskAt: new Date()
  }
);
```

### 5.2 任务队列操作

**创建队列**：
```javascript
const queue = await Queue.create({
  projectId: project._id,
  queueId: 'queue_001',
  name: '任务队列1',
  meta: { customField: 'value' }  // 支持任意结构
});
```

**查询队列列表（不包含 messages 和 logs）**：
```javascript
// 查询项目的所有队列（列表查询，排除 messages 和 logs）
const queues = await Queue.find({ projectId: project._id })
  .select({
    'tasks.messages': 0,  // 排除 messages 字段
    'tasks.logs': 0       // 排除 logs 字段
  })
  .sort({ lastTaskAt: -1 })
  .lean();

// 使用 populate 关联查询项目信息（详情查询）
const queue = await Queue.findOne({ queueId: 'queue_001' })
  .populate('projectId', 'projectId name')
  .lean();
// 注意：详情查询包含完整的 tasks.messages 和 tasks.logs
```

### 5.3 任务操作

**创建队列（包含任务）**：
```javascript
const queue = await Queue.create({
  projectId: project._id,
  queueId: 'queue_001',
  name: '任务队列1',
  meta: { prompts: ['.flow/skills/spcewriter.md'] },  // 类似 .flow/task.json 的 prompts
  tasks: [
    {
      id: '1',
      name: '编写系统基础框架的实现方案',
      prompt: '请编写系统基础框架的实现方案，包括主要api规范和数据库规范，数据库使用sqlite。',
      spec_file: [
        '.flow/skills/spcewriter.md',
        'doc/requirement.md'
      ],
      status: 'done',
      report: '.flow/tasks/report/编写系统基础框架的实现方案_2025-11-24T14-28-50.md',
      messages: [],  // 导入时为空，后续通过增量更新接口添加
      logs: []       // 导入时为空，后续通过增量更新接口添加
    }
  ]
});
```

**查询队列列表（不包含 messages 和 logs，提高性能）**：
```javascript
// 查询项目的所有队列（列表查询，排除 messages 和 logs）
const queues = await Queue.find({ projectId: project._id })
  .select({
    'tasks.messages': 0,  // 排除 messages 字段
    'tasks.logs': 0       // 排除 logs 字段
  })
  .sort({ lastTaskAt: -1 })
  .lean();

// 只包含任务的基本字段
console.log(queues[0].tasks[0].id);         // 任务ID
console.log(queues[0].tasks[0].name);       // 任务名称
console.log(queues[0].tasks[0].status);     // 任务状态
// queues[0].tasks[0].messages  // undefined（已排除）
// queues[0].tasks[0].logs      // undefined（已排除）
```

**查询队列详情（包含完整的 messages 和 logs）**：
```javascript
// 查询单个队列详情（包含所有字段）
const queue = await Queue.findOne({ 
  projectId: project._id,
  queueId: 'queue_001'
}).lean();

// 包含完整的任务数据
console.log(queue.tasks);                    // 任务数组
console.log(queue.tasks[0].name);           // 第一个任务的名称
console.log(queue.tasks[0].prompt);         // 第一个任务的提示
console.log(queue.tasks[0].spec_file);      // 第一个任务的规范文件数组
console.log(queue.tasks[0].messages);       // 第一个任务的消息数组（记录任务变化）
console.log(queue.tasks[0].logs);           // 第一个任务的日志数组（记录任务变化）
```

**查询特定任务详情（包含 messages 和 logs）**：
```javascript
// 查询队列，然后从 tasks 数组中查找特定任务
const queue = await Queue.findOne({
  projectId: project._id,
  queueId: 'queue_001',
  'tasks.id': '1'  // 定位到特定任务
}).lean();

// 查找特定任务
const task = queue.tasks.find(t => t.id === '1');
console.log(task.name);      // 任务名称
console.log(task.messages);  // 消息数组
console.log(task.logs);      // 日志数组
```

**添加任务到队列**：
```javascript
await Queue.findOneAndUpdate(
  { projectId: project._id, queueId: 'queue_001' },
  {
    $push: {
      tasks: {
        id: '2',
        name: '新任务',
        prompt: '任务提示文本',
        spec_file: [],
        status: 'pending',
        report: null,
        messages: [],  // 初始为空，后续通过增量更新接口添加
        logs: []       // 初始为空，后续通过增量更新接口添加
      }
    },
    $set: { lastTaskAt: new Date() }
  }
);
```

**添加消息到任务（记录任务变化）**：
```javascript
await Queue.findOneAndUpdate(
  { 
    projectId: project._id, 
    queueId: 'queue_001',
    'tasks.id': '1'  // 定位到特定任务
  },
  {
    $push: {
      'tasks.$.messages': {
        role: 'USER',
        content: '用户消息内容',
        createdAt: new Date()
      }
    },
    $set: { lastTaskAt: new Date() }
  }
);
```

**添加日志到任务（记录任务变化）**：
```javascript
await Queue.findOneAndUpdate(
  { 
    projectId: project._id, 
    queueId: 'queue_001',
    'tasks.id': '1'
  },
  {
    $push: {
      'tasks.$.logs': {
        content: '任务执行日志',
        createdAt: new Date()
      }
    },
    $set: { lastTaskAt: new Date() }
  }
);
```

**更新任务状态**：
```javascript
await Queue.findOneAndUpdate(
  { 
    projectId: project._id, 
    queueId: 'queue_001',
    'tasks.id': '1'  // 定位到特定任务
  },
  {
    $set: {
      'tasks.$.status': 'done',
      'tasks.$.report': '.flow/tasks/report/任务报告.md',
      lastTaskAt: new Date()
    }
  }
);
```

**更新任务的 spec_file**：
```javascript
await Queue.findOneAndUpdate(
  { 
    projectId: project._id, 
    queueId: 'queue_001',
    'tasks.id': '1'
  },
  {
    $set: {
      'tasks.$.spec_file': [
        '.flow/skills/spcewriter.md',
        'doc/requirement.md',
        'doc/spec/api-implementation.md'
      ],
      lastTaskAt: new Date()
    }
  }
);
```

**完全替换任务（幂等性）**：
```javascript
// 先查找队列
const queue = await Queue.findOne({
  projectId: project._id,
  queueId: 'queue_001'
});

// 查找任务索引
const taskIndex = queue.tasks.findIndex(t => t.id === '1');

if (taskIndex >= 0) {
  // 替换现有任务（保留 messages 和 logs，因为它们记录任务变化）
  const existingTask = queue.tasks[taskIndex];
  queue.tasks[taskIndex] = {
    id: '1',
    name: '更新后的任务名称',
    prompt: '更新后的任务提示',
    spec_file: [
      '.flow/skills/spcewriter.md',
      'doc/requirement.md'
    ],
    status: 'done',
    report: '.flow/tasks/report/更新后的报告.md',
    // 保留原有的 messages 和 logs（记录任务变化）
    messages: existingTask.messages || [],
    logs: existingTask.logs || []
  };
} else {
  // 添加新任务
  queue.tasks.push({
    id: '1',
    name: '新任务',
    prompt: '任务提示文本',
    spec_file: [],
    status: 'pending',
    report: null,
    messages: [],  // 初始为空
    logs: []       // 初始为空
  });
}

queue.lastTaskAt = new Date();
await queue.save();
```

### 5.4 API Key 操作

**创建 API Key**：
```javascript
const bcrypt = require('bcrypt');
const hashedKey = await bcrypt.hash(originalKey, 10);

const apiKey = await ApiKey.create({
  name: '测试 API Key',
  key: hashedKey,
  projectId: 'project_001',  // 可选
  isActive: true
});
```

**验证 API Key**：
```javascript
const apiKey = await ApiKey.findOne({ isActive: true });
const isValid = await bcrypt.compare(inputKey, apiKey.key);
```

---

## 6. 数据完整性约束

### 6.1 唯一性约束
- `projects.projectId`：全局唯一
- `queues(projectId, queueId)`：项目内唯一
- `api_keys.key`：全局唯一
- `queues.tasks[].id`：在队列内唯一（应用层保证）

### 6.2 引用完整性
MongoDB 不强制外键约束，需要在应用层保证：
- `queues.projectId` 必须引用有效的 `projects._id`

### 6.3 级联删除
MongoDB 不支持级联删除，需要在应用层实现：
- 删除项目时，删除所有关联的队列（任务已嵌入在队列中，会自动删除）

**级联删除示例**：
```javascript
// 删除项目及其关联数据
async function deleteProject(projectId) {
  const project = await Project.findOne({ projectId });
  if (!project) return;

  // 删除所有关联的队列（任务已嵌入在队列中，会自动删除）
  await Queue.deleteMany({ projectId: project._id });

  // 删除项目
  await Project.deleteOne({ _id: project._id });
}
```

---

## 7. 性能优化建议

### 7.1 查询优化

#### 7.1.1 列表查询 vs 详情查询（重要）

**核心规则**：
- **列表查询**（如获取队列列表、任务列表）：必须排除 `tasks.messages` 和 `tasks.logs` 字段
- **详情查询**（如获取单个队列详情、任务详情）：返回完整字段，包括 `messages` 和 `logs`

**原因**：
- `messages` 和 `logs` 字段可能包含大量数据，在列表查询时返回会严重影响性能
- 列表查询通常只需要显示任务的基本信息（id、name、status 等）
- 详情查询需要完整数据，包括对话历史和执行日志

**示例**：
```javascript
// ✅ 正确：列表查询排除大字段
const queues = await Queue.find({ projectId })
  .select({ 'tasks.messages': 0, 'tasks.logs': 0 })
  .sort({ lastTaskAt: -1 })
  .lean();

// ✅ 正确：详情查询包含完整字段
const queue = await Queue.findOne({ 
  projectId: project._id,
  queueId: 'queue_001'
}).lean();
// 包含完整的 tasks.messages 和 tasks.logs

// ❌ 错误：列表查询包含大字段（严重影响性能）
const queues = await Queue.find({ projectId }).lean();
// 这会返回所有 messages 和 logs，数据量可能非常大
```

#### 7.1.2 其他查询优化策略

1. **使用索引**：所有常用查询字段都建立了索引
2. **避免全集合扫描**：使用查询条件过滤，利用索引
3. **限制结果集**：使用 `limit()` 和 `skip()` 进行分页
4. **投影查询**：使用 `select()` 只查询需要的字段
5. **利用嵌入**：消息和日志嵌入在任务中，减少查询次数

### 7.2 写入优化
1. **批量操作**：使用 `insertMany()` 批量插入
2. **原子操作**：使用 `$push`、`$set` 等原子操作更新嵌入数组
3. **索引维护**：合理设计索引，避免过多索引影响写入性能

### 7.3 存储优化
1. **文档大小**：单个文档不超过 16MB（MongoDB 限制）
2. **嵌入 vs 引用**：根据查询模式选择嵌入或引用
3. **数组大小**：如果消息或日志数量非常大，考虑分页或归档策略

### 7.4 查询性能示例

**列表查询优化**：
```javascript
// ✅ 优化后：列表查询排除大字段
const queues = await Queue.find({ projectId })
  .select({ 'tasks.messages': 0, 'tasks.logs': 0 })
  .sort({ lastTaskAt: -1 })
  .lean();
// 只返回任务的基本字段，性能最优

// ❌ 优化前：列表查询包含所有字段
const queues = await Queue.find({ projectId }).lean();
// 返回所有 messages 和 logs，数据量大，性能差
```

**详情查询**：
```javascript
// 详情查询包含完整数据
const queue = await Queue.findOne({ 
  projectId: project._id,
  queueId: 'queue_001'
}).lean();
// 包含完整的 tasks.messages 和 tasks.logs，满足详情页需求
```

---

## 8. 数据安全建议

### 8.1 API Key 安全
- API Key 值使用单向哈希（bcrypt）存储
- 查询时进行哈希比对
- 前端显示时只显示部分字符

### 8.2 数据备份
- MongoDB 支持多种备份方式：mongodump、副本集、云服务备份
- 建议定期备份数据库
- 备份频率：根据数据更新频率决定

### 8.3 数据清理
- 软删除：重要数据可以考虑软删除标记（添加 `deletedAt` 字段）
- 日志清理：定期清理过期的日志数据（可选）
- 归档策略：对于历史数据，可以考虑归档到其他集合或数据库

---

## 9. Mongoose 模型定义示例

### 9.1 完整的模型定义

```javascript
const mongoose = require('mongoose');

// 消息子文档 Schema
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
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// 日志子文档 Schema
const logSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// 任务子文档 Schema
const taskSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  prompt: {
    type: String,
    required: true
  },
  spec_file: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['pending', 'done', 'error'],
    default: 'pending'
  },
  report: {
    type: String,
    default: null
  },
  messages: [messageSchema],        // 对话消息数组（用于记录任务变化）
  logs: [logSchema]                 // 执行日志数组（用于记录任务变化）
}, { _id: false });

// 项目模型
const projectSchema = new mongoose.Schema({
  projectId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  lastTaskAt: {
    type: Date,
    default: null,
    index: true
  }
}, {
  timestamps: true
});

// 队列模型
const queueSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  queueId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  tasks: [taskSchema],              // 嵌入任务数组
  lastTaskAt: {
    type: Date,
    default: null,
    index: true
  }
}, {
  timestamps: true
});

queueSchema.index({ projectId: 1, queueId: 1 }, { unique: true });

// API Key 模型
const apiKeySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  projectId: {
    type: String,
    default: null,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

// 导出模型
const Project = mongoose.model('Project', projectSchema);
const Queue = mongoose.model('Queue', queueSchema);
const ApiKey = mongoose.model('ApiKey', apiKeySchema);

module.exports = {
  Project,
  Queue,
  ApiKey
};
```

---

## 10. 环境配置

### 10.1 连接字符串格式

```
mongodb://[username:password@]host[:port][/database][?options]
```

### 10.2 环境变量配置

```bash
# .env.local
MONGODB_URI=mongodb://localhost:27017/taskecho
# 或使用 MongoDB Atlas
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/taskecho
```

### 10.3 Mongoose 连接示例

```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB 连接成功');
  } catch (error) {
    console.error('MongoDB 连接失败:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
```

---

## 11. 总结

本文档详细定义了 TaskEcho 系统的 MongoDB 数据库设计，包括：

1. **3 个核心集合**：项目、任务队列（包含嵌入的任务）、API Key
2. **嵌套嵌入设计**：
   - 任务嵌入到队列文档的 `tasks` 数组中
   - 任务基本字段：`id`、`name`、`prompt`、`spec_file`（文本数组）、`status`、`report`（与 `.flow/task.json` 一致）
   - 任务变化记录字段：`messages`（对话消息数组）、`logs`（执行日志数组），用于记录任务变化（系统运行时动态添加）
   - 充分利用 MongoDB 的文档嵌套特性，完全符合 `.flow/task.json` 的数据结构，同时支持任务变化记录
3. **完整的索引设计**：主键索引、唯一索引、引用索引、查询优化索引
4. **数据关系设计**：使用引用关系连接项目和队列，使用嵌入关系存储任务数据
5. **性能优化策略**：查询优化、写入优化、存储优化
6. **安全建议**：API Key 安全、数据备份、数据清理

数据库设计充分利用 MongoDB 的文档数据库特性，特别适合存储非结构化的任务数据。任务嵌入在队列中，基本字段结构与 `.flow/task.json` 完全一致（id、name、prompt、spec_file、status、report），同时包含 `messages` 和 `logs` 字段用于记录任务变化。

**重要性能优化规则**：
- **列表查询**：必须排除 `tasks.messages` 和 `tasks.logs` 字段，只返回基本字段，避免传输大量数据
- **详情查询**：返回完整字段，包括 `messages` 和 `logs`，满足详情页展示需求

这种设计兼顾了查询性能和功能完整性，提高了系统效率，便于数据导入导出和任务变化追踪。
