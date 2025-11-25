# TaskEcho 统计功能增强方案

## 1. 概述

### 1.1 目标

增强 TaskEcho 系统的统计功能，实现：
- **项目级别统计**：累计每个项目每日执行任务的次数、成功次数、失败次数
- **系统级别统计**：累计整个系统每日执行任务的次数、成功次数、失败次数
- **统计信息展示**：提供统计数据和统计图表的前端展示
- **可扩展性**：设计支持未来更多统计维度的架构

### 1.2 核心概念

**任务执行**：任务状态从 `pending` 变为 `done` 或 `error` 的过程，视为一次任务执行。

- **成功执行**：状态变为 `done`
- **失败执行**：状态变为 `error`
- **执行次数**：成功次数 + 失败次数

**统计粒度**：
- **时间粒度**：按日统计（以日期为键，格式：YYYY-MM-DD）
- **维度粒度**：项目级别、系统级别

### 1.3 设计原则

1. **实时累计**：任务状态更新时实时累计统计数据，避免查询时计算
2. **幂等性**：支持重复统计，避免重复累计
3. **性能优先**：使用专门的统计集合，避免影响主业务查询性能
4. **可扩展性**：设计灵活的统计数据结构，支持未来扩展更多维度

---

## 2. 数据库设计

### 2.1 统计集合（Statistics Collection）

**集合名**：`statistics`

**功能说明**：存储每日统计数据，支持项目级别和系统级别的统计。

**文档结构**：

```javascript
{
  _id: ObjectId,                    // MongoDB 自动生成的主键
  date: String,                     // 统计日期（YYYY-MM-DD格式，唯一索引）
  scope: String,                    // 统计范围：'system' | 'project'
  projectId: String,                // 项目ID（当 scope='project' 时必填，当 scope='system' 时为 null）
  projectName: String,              // 项目名称（当 scope='project' 时存储，便于查询）
  
  // 任务执行统计
  execution: {
    total: Number,                  // 总执行次数（done + error）
    success: Number,                 // 成功次数（done）
    failure: Number                  // 失败次数（error）
  },
  
  // 任务状态统计（当前时刻的快照）
  task_status: {
    total: Number,                   // 任务总数
    pending: Number,                 // Pending 状态任务数
    done: Number,                    // Done 状态任务数
    error: Number                    // Error 状态任务数
  },
  
  // 扩展统计字段
  extended: {
    // 按队列统计
    by_queue: {
      // 格式：{ "queue_id": { total: Number, success: Number, failure: Number } }
    },
    
    // 按小时统计（当日）
    by_hour: {
      // 格式：{ "00": { total: Number, success: Number, failure: Number }, ... }
    },
    
    // 执行时长统计
    execution_duration: {
      total_duration: Number,        // 总执行时长（毫秒）
      count: Number,                  // 有执行时长的任务数
      min: Number,                    // 最短执行时长
      max: Number,                    // 最长执行时长
      avg: Number                     // 平均执行时长
    },
    
    // 客户端统计
    by_client: {
      // 格式：{ "hostname": { total: Number, success: Number, failure: Number } }
    },
    
    // API Key 统计
    by_api_key: {
      // 格式：{ "api_key_name": { total: Number, success: Number, failure: Number } }
    },
    
    // 错误类型统计
    error_types: {
      // 格式：{ "error_category": Number }
    }
  },
  
  createdAt: Date,                   // 创建时间
  updatedAt: Date                    // 更新时间
}
```

**Mongoose Schema**：

```javascript
const statisticsSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    index: true
  },
  scope: {
    type: String,
    enum: ['system', 'project'],
    required: true,
    index: true
  },
  projectId: {
    type: String,
    default: null,
    index: true
  },
  projectName: {
    type: String,
    default: null
  },
  execution: {
    total: {
      type: Number,
      default: 0,
      min: 0
    },
    success: {
      type: Number,
      default: 0,
      min: 0
    },
    failure: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  task_status: {
    total: {
      type: Number,
      default: 0,
      min: 0
    },
    pending: {
      type: Number,
      default: 0,
      min: 0
    },
    done: {
      type: Number,
      default: 0,
      min: 0
    },
    error: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  extended: {
    by_queue: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    by_hour: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    execution_duration: {
      total_duration: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
      min: { type: Number, default: null },
      max: { type: Number, default: null },
      avg: { type: Number, default: 0 }
    },
    by_client: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    by_api_key: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    error_types: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }
}, {
  timestamps: true
});

// 复合唯一索引：确保同一日期、同一范围、同一项目只有一条记录
statisticsSchema.index({ date: 1, scope: 1, projectId: 1 }, { unique: true });

// 查询索引：按日期和范围查询
statisticsSchema.index({ date: -1, scope: 1 });

// 查询索引：按项目查询
statisticsSchema.index({ projectId: 1, date: -1 });
```

### 2.2 统计记录集合（Statistics Log Collection）

**集合名**：`statistics_logs`

**功能说明**：记录每次任务状态变更的详细信息，用于审计和回溯，支持更详细的统计分析。

**文档结构**：

```javascript
{
  _id: ObjectId,
  date: String,                     // 日期（YYYY-MM-DD）
  hour: Number,                     // 小时（0-23），用于按小时统计
  projectId: String,                // 项目ID
  projectName: String,              // 项目名称
  queueId: String,                  // 队列ID
  queueName: String,                // 队列名称
  taskId: String,                   // 任务ID
  previousStatus: String,           // 之前的状态
  newStatus: String,                // 新状态
  isExecution: Boolean,              // 是否为执行（pending -> done/error）
  executionResult: String,           // 执行结果：'success' | 'failure' | null
  executionDuration: Number,         // 执行时长（毫秒），从 pending 到 done/error 的时间
  clientInfo: {                     // 客户端信息
    username: String,
    hostname: String,
    project_path: String
  },
  apiKeyName: String,                // API Key 名称（如果可用）
  errorMessage: String,              // 错误信息（如果失败）
  createdAt: Date                    // 记录时间
}
```

**Mongoose Schema**：

```javascript
const statisticsLogSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    index: true
  },
  hour: {
    type: Number,
    required: true,
    min: 0,
    max: 23,
    index: true
  },
  projectId: {
    type: String,
    required: true,
    index: true
  },
  projectName: {
    type: String,
    default: null
  },
  queueId: {
    type: String,
    required: true,
    index: true
  },
  queueName: {
    type: String,
    default: null
  },
  taskId: {
    type: String,
    required: true
  },
  previousStatus: {
    type: String,
    required: true
  },
  newStatus: {
    type: String,
    required: true
  },
  isExecution: {
    type: Boolean,
    default: false,
    index: true
  },
  executionResult: {
    type: String,
    enum: ['success', 'failure', null],
    default: null
  },
  executionDuration: {
    type: Number,
    default: null
  },
  clientInfo: {
    username: { type: String, default: null },
    hostname: { type: String, default: null, index: true },
    project_path: { type: String, default: null }
  },
  apiKeyName: {
    type: String,
    default: null,
    index: true
  },
  errorMessage: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// 复合索引：用于按日期和项目查询
statisticsLogSchema.index({ date: -1, projectId: 1 });
// 复合索引：用于按队列统计
statisticsLogSchema.index({ date: -1, queueId: 1 });
// 复合索引：用于按小时统计
statisticsLogSchema.index({ date: -1, hour: 1 });
```

**说明**：此集合用于：
- 审计和回溯
- 支持更复杂的统计分析（如按队列统计、按小时统计）
- 数据修复和校验
- 计算执行时长等扩展统计

---

## 3. 数据累计机制

### 3.1 累计触发点

**主要触发点**：任务状态更新接口（`PATCH /api/v1/tasks/status`）

**累计逻辑**：
1. 当任务状态从 `pending` 变为 `done` 或 `error` 时，视为一次任务执行
2. 实时更新当日的统计数据（项目级别和系统级别）
3. 使用 MongoDB 的 `$inc` 操作符进行原子性累加

### 3.2 累计实现流程

```
任务状态更新请求
  ↓
1. 验证并更新任务状态
  ↓
2. 判断是否为执行（previousStatus='pending' && newStatus in ['done', 'error']）
  ↓
3. 如果是执行，获取当前日期（YYYY-MM-DD）
  ↓
4. 更新项目级别统计（使用 upsert）
   - 查找或创建：{ date: today, scope: 'project', projectId: projectId }
   - $inc: { 'execution.total': 1, 'execution.success': 1 } 或 { 'execution.failure': 1 }
  ↓
5. 更新系统级别统计（使用 upsert）
   - 查找或创建：{ date: today, scope: 'system', projectId: null }
   - $inc: { 'execution.total': 1, 'execution.success': 1 } 或 { 'execution.failure': 1 }
  ↓
6. 返回更新结果
```

### 3.3 累计代码示例

```javascript
/**
 * 累计任务执行统计（包含扩展维度）
 * @param {Object} params - 参数对象
 * @param {String} params.projectId - 项目ID
 * @param {String} params.projectName - 项目名称
 * @param {String} params.queueId - 队列ID
 * @param {String} params.queueName - 队列名称
 * @param {String} params.taskId - 任务ID
 * @param {String} params.previousStatus - 之前的状态
 * @param {String} params.newStatus - 新状态
 * @param {Number} params.executionDuration - 执行时长（毫秒）
 * @param {Object} params.clientInfo - 客户端信息
 * @param {String} params.apiKeyName - API Key 名称
 * @param {String} params.errorMessage - 错误信息（如果失败）
 */
async function incrementExecutionStats({
  projectId,
  projectName,
  queueId,
  queueName,
  taskId,
  previousStatus,
  newStatus,
  executionDuration = null,
  clientInfo = null,
  apiKeyName = null,
  errorMessage = null
}) {
  // 判断是否为执行（pending -> done/error）
  const isExecution = previousStatus.toLowerCase() === 'pending' && 
                      ['done', 'error'].includes(newStatus.toLowerCase());
  
  if (!isExecution) {
    return; // 不是执行，不累计
  }
  
  const now = new Date();
  const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const hour = now.getUTCHours(); // 0-23
  const isSuccess = newStatus.toLowerCase() === 'done';
  
  // 记录统计日志
  await StatisticsLog.create({
    date: today,
    hour: hour,
    projectId: projectId,
    projectName: projectName,
    queueId: queueId,
    queueName: queueName,
    taskId: taskId,
    previousStatus: previousStatus,
    newStatus: newStatus,
    isExecution: true,
    executionResult: isSuccess ? 'success' : 'failure',
    executionDuration: executionDuration,
    clientInfo: clientInfo,
    apiKeyName: apiKeyName,
    errorMessage: errorMessage
  });
  
  // 准备扩展统计更新操作
  const extendedUpdates = {};
  
  // 按队列统计
  extendedUpdates[`extended.by_queue.${queueId}.total`] = 1;
  extendedUpdates[`extended.by_queue.${queueId}.${isSuccess ? 'success' : 'failure'}`] = 1;
  
  // 按小时统计
  extendedUpdates[`extended.by_hour.${String(hour).padStart(2, '0')}.total`] = 1;
  extendedUpdates[`extended.by_hour.${String(hour).padStart(2, '0')}.${isSuccess ? 'success' : 'failure'}`] = 1;
  
  // 执行时长统计
  if (executionDuration !== null && executionDuration > 0) {
    extendedUpdates['extended.execution_duration.total_duration'] = executionDuration;
    extendedUpdates['extended.execution_duration.count'] = 1;
  }
  
  // 按客户端统计
  if (clientInfo && clientInfo.hostname) {
    extendedUpdates[`extended.by_client.${clientInfo.hostname}.total`] = 1;
    extendedUpdates[`extended.by_client.${clientInfo.hostname}.${isSuccess ? 'success' : 'failure'}`] = 1;
  }
  
  // 按 API Key 统计
  if (apiKeyName) {
    extendedUpdates[`extended.by_api_key.${apiKeyName}.total`] = 1;
    extendedUpdates[`extended.by_api_key.${apiKeyName}.${isSuccess ? 'success' : 'failure'}`] = 1;
  }
  
  // 错误类型统计
  if (!isSuccess && errorMessage) {
    const errorCategory = categorizeError(errorMessage);
    extendedUpdates[`extended.error_types.${errorCategory}`] = 1;
  }
  
  // 更新项目级别统计
  const projectUpdate = {
    $setOnInsert: {
      date: today,
      scope: 'project',
      projectId: projectId,
      projectName: projectName,
      execution: { total: 0, success: 0, failure: 0 },
      task_status: { total: 0, pending: 0, done: 0, error: 0 },
      extended: {
        by_queue: {},
        by_hour: {},
        execution_duration: { total_duration: 0, count: 0, min: null, max: null, avg: 0 },
        by_client: {},
        by_api_key: {},
        error_types: {}
      }
    },
    $inc: {
      'execution.total': 1,
      [`execution.${isSuccess ? 'success' : 'failure'}`]: 1,
      ...extendedUpdates
    }
  };
  
  // 更新执行时长的 min/max
  if (executionDuration !== null && executionDuration > 0) {
    const stats = await Statistics.findOne({
      date: today,
      scope: 'project',
      projectId: projectId
    });
    
    if (stats && stats.extended.execution_duration) {
      const current = stats.extended.execution_duration;
      projectUpdate.$set = projectUpdate.$set || {};
      if (current.min === null || executionDuration < current.min) {
        projectUpdate.$set['extended.execution_duration.min'] = executionDuration;
      }
      if (current.max === null || executionDuration > current.max) {
        projectUpdate.$set['extended.execution_duration.max'] = executionDuration;
      }
    } else {
      projectUpdate.$set = projectUpdate.$set || {};
      projectUpdate.$set['extended.execution_duration.min'] = executionDuration;
      projectUpdate.$set['extended.execution_duration.max'] = executionDuration;
    }
  }
  
  await Statistics.findOneAndUpdate(
    {
      date: today,
      scope: 'project',
      projectId: projectId
    },
    projectUpdate,
    { upsert: true, new: true }
  );
  
  // 更新系统级别统计（类似逻辑，但不需要项目相关信息）
  const systemExtendedUpdates = {};
  systemExtendedUpdates[`extended.by_hour.${String(hour).padStart(2, '0')}.total`] = 1;
  systemExtendedUpdates[`extended.by_hour.${String(hour).padStart(2, '0')}.${isSuccess ? 'success' : 'failure'}`] = 1;
  
  if (executionDuration !== null && executionDuration > 0) {
    systemExtendedUpdates['extended.execution_duration.total_duration'] = executionDuration;
    systemExtendedUpdates['extended.execution_duration.count'] = 1;
  }
  
  if (clientInfo && clientInfo.hostname) {
    systemExtendedUpdates[`extended.by_client.${clientInfo.hostname}.total`] = 1;
    systemExtendedUpdates[`extended.by_client.${clientInfo.hostname}.${isSuccess ? 'success' : 'failure'}`] = 1;
  }
  
  if (apiKeyName) {
    systemExtendedUpdates[`extended.by_api_key.${apiKeyName}.total`] = 1;
    systemExtendedUpdates[`extended.by_api_key.${apiKeyName}.${isSuccess ? 'success' : 'failure'}`] = 1;
  }
  
  if (!isSuccess && errorMessage) {
    const errorCategory = categorizeError(errorMessage);
    systemExtendedUpdates[`extended.error_types.${errorCategory}`] = 1;
  }
  
  await Statistics.findOneAndUpdate(
    {
      date: today,
      scope: 'system',
      projectId: null
    },
    {
      $setOnInsert: {
        date: today,
        scope: 'system',
        projectId: null,
        projectName: null,
        execution: { total: 0, success: 0, failure: 0 },
        task_status: { total: 0, pending: 0, done: 0, error: 0 },
        extended: {
          by_queue: {},
          by_hour: {},
          execution_duration: { total_duration: 0, count: 0, min: null, max: null, avg: 0 },
          by_client: {},
          by_api_key: {},
          error_types: {}
        }
      },
      $inc: {
        'execution.total': 1,
        [`execution.${isSuccess ? 'success' : 'failure'}`]: 1,
        ...systemExtendedUpdates
      }
    },
    { upsert: true, new: true }
  );
}

/**
 * 错误分类函数
 * @param {String} errorMessage - 错误信息
 * @returns {String} 错误类别
 */
function categorizeError(errorMessage) {
  if (!errorMessage) return 'unknown';
  
  const msg = errorMessage.toLowerCase();
  if (msg.includes('timeout') || msg.includes('超时')) return 'timeout';
  if (msg.includes('network') || msg.includes('网络')) return 'network';
  if (msg.includes('validation') || msg.includes('验证')) return 'validation';
  if (msg.includes('permission') || msg.includes('权限')) return 'permission';
  if (msg.includes('not found') || msg.includes('未找到')) return 'not_found';
  
  return 'other';
}
```

### 3.4 任务状态快照更新

除了累计执行统计，还可以定期更新任务状态快照（可选功能）：

```javascript
/**
 * 更新任务状态快照
 * @param {String} date - 日期（YYYY-MM-DD）
 * @param {String} scope - 统计范围
 * @param {String} projectId - 项目ID（可选）
 */
async function updateTaskStatusSnapshot(date, scope, projectId = null) {
  // 查询符合条件的任务
  let matchCondition = {};
  if (scope === 'project') {
    const project = await Project.findOne({ projectId });
    if (!project) return;
    matchCondition = { projectId: project._id };
  }
  
  const queues = await Queue.find(matchCondition).select({
    'tasks.messages': 0,
    'tasks.logs': 0
  }).lean();
  
  // 统计任务状态
  let total = 0, pending = 0, done = 0, error = 0;
  queues.forEach(queue => {
    const tasks = queue.tasks || [];
    total += tasks.length;
    tasks.forEach(task => {
      const status = (task.status || 'pending').toLowerCase();
      if (status === 'pending') pending++;
      else if (status === 'done') done++;
      else if (status === 'error') error++;
    });
  });
  
  // 更新统计记录
  await Statistics.findOneAndUpdate(
    {
      date: date,
      scope: scope,
      projectId: projectId || null
    },
    {
      $set: {
        'task_status.total': total,
        'task_status.pending': pending,
        'task_status.done': done,
        'task_status.error': error
      }
    },
    { upsert: true }
  );
}
```

---

## 4. API 设计

### 4.1 获取系统级别统计

**接口路径**：`GET /api/v1/stats/system`

**功能说明**：获取系统级别的统计数据，支持按日期范围查询。

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `startDate` | string | 否 | 开始日期（YYYY-MM-DD），默认：30天前 | `"2024-01-01"` |
| `endDate` | string | 否 | 结束日期（YYYY-MM-DD），默认：今天 | `"2024-01-31"` |
| `groupBy` | string | 否 | 分组方式，`day`（按日）或 `month`（按月），默认：`day` | `"day"` |

**响应格式**：

```json
{
  "success": true,
  "data": {
    "summary": {
      "total_execution": 1500,
      "total_success": 1200,
      "total_failure": 300,
      "success_rate": 0.8
    },
    "daily_stats": [
      {
        "date": "2024-01-31",
        "execution": {
          "total": 50,
          "success": 40,
          "failure": 10
        },
        "task_status": {
          "total": 200,
          "pending": 30,
          "done": 150,
          "error": 20
        }
      }
    ]
  },
  "message": "查询成功",
  "timestamp": "2024-01-31T12:00:00.000Z"
}
```

### 4.2 获取项目级别统计

**接口路径**：`GET /api/v1/stats/project/:projectId`

**功能说明**：获取指定项目的统计数据，支持按日期范围查询。

**路径参数**：
- `projectId`：项目外部标识

**请求参数**：同系统级别统计接口

**响应格式**：同系统级别统计接口

### 4.3 获取项目列表统计

**接口路径**：`GET /api/v1/stats/projects`

**功能说明**：获取所有项目的统计数据汇总，用于对比展示。

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `startDate` | string | 否 | 开始日期（YYYY-MM-DD），默认：30天前 | `"2024-01-01"` |
| `endDate` | string | 否 | 结束日期（YYYY-MM-DD），默认：今天 | `"2024-01-31"` |

**响应格式**：

```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "project_id": "project_001",
        "project_name": "项目1",
        "summary": {
          "total_execution": 500,
          "total_success": 400,
          "total_failure": 100,
          "success_rate": 0.8
        }
      }
    ]
  },
  "message": "查询成功",
  "timestamp": "2024-01-31T12:00:00.000Z"
}
```

### 4.4 获取扩展维度统计

#### 4.4.1 按队列统计

**接口路径**：`GET /api/v1/stats/by-queue`

**功能说明**：获取按队列分组的统计数据。

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `startDate` | string | 否 | 开始日期（YYYY-MM-DD），默认：30天前 | `"2024-01-01"` |
| `endDate` | string | 否 | 结束日期（YYYY-MM-DD），默认：今天 | `"2024-01-31"` |
| `projectId` | string | 否 | 项目ID，不提供则查询系统级别 | `"project_001"` |

**响应格式**：

```json
{
  "success": true,
  "data": {
    "queues": [
      {
        "queue_id": "queue_001",
        "queue_name": "任务队列1",
        "summary": {
          "total_execution": 500,
          "total_success": 400,
          "total_failure": 100,
          "success_rate": 0.8
        }
      }
    ]
  },
  "message": "查询成功",
  "timestamp": "2024-01-31T12:00:00.000Z"
}
```

#### 4.4.2 按小时统计

**接口路径**：`GET /api/v1/stats/by-hour`

**功能说明**：获取按小时分组的统计数据（当日或指定日期）。

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `date` | string | 否 | 日期（YYYY-MM-DD），默认：今天 | `"2024-01-31"` |
| `projectId` | string | 否 | 项目ID，不提供则查询系统级别 | `"project_001"` |

**响应格式**：

```json
{
  "success": true,
  "data": {
    "date": "2024-01-31",
    "hourly_stats": [
      {
        "hour": 0,
        "execution": {
          "total": 10,
          "success": 8,
          "failure": 2
        }
      }
    ]
  },
  "message": "查询成功",
  "timestamp": "2024-01-31T12:00:00.000Z"
}
```

#### 4.4.3 执行时长统计

**接口路径**：`GET /api/v1/stats/execution-duration`

**功能说明**：获取执行时长统计数据。

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `startDate` | string | 否 | 开始日期（YYYY-MM-DD），默认：30天前 | `"2024-01-01"` |
| `endDate` | string | 否 | 结束日期（YYYY-MM-DD），默认：今天 | `"2024-01-31"` |
| `projectId` | string | 否 | 项目ID，不提供则查询系统级别 | `"project_001"` |

**响应格式**：

```json
{
  "success": true,
  "data": {
    "summary": {
      "avg_duration": 125000,
      "min_duration": 5000,
      "max_duration": 300000,
      "total_count": 1000
    },
    "distribution": [
      {
        "range": "0-1分钟",
        "count": 200
      },
      {
        "range": "1-5分钟",
        "count": 500
      },
      {
        "range": "5-10分钟",
        "count": 250
      },
      {
        "range": "10分钟以上",
        "count": 50
      }
    ]
  },
  "message": "查询成功",
  "timestamp": "2024-01-31T12:00:00.000Z"
}
```

#### 4.4.4 按客户端统计

**接口路径**：`GET /api/v1/stats/by-client`

**功能说明**：获取按客户端分组的统计数据。

**请求参数**：同按队列统计接口

**响应格式**：类似按队列统计接口，但按客户端分组

#### 4.4.5 错误类型统计

**接口路径**：`GET /api/v1/stats/error-types`

**功能说明**：获取错误类型统计数据。

**请求参数**：同执行时长统计接口

**响应格式**：

```json
{
  "success": true,
  "data": {
    "error_types": [
      {
        "type": "timeout",
        "count": 50,
        "percentage": 0.5
      },
      {
        "type": "network",
        "count": 30,
        "percentage": 0.3
      }
    ]
  },
  "message": "查询成功",
  "timestamp": "2024-01-31T12:00:00.000Z"
}
```

### 4.5 获取实时统计（兼容现有接口）

**接口路径**：`GET /api/v1/stats`

**功能说明**：获取当前时刻的实时统计信息（兼容现有接口，保持向后兼容）。

**响应格式**：保持现有格式不变，可选择性增加历史统计字段。

---

## 5. 前端展示设计

### 5.1 统计页面布局

**页面路径**：`/stats` 或 `/statistics`

**布局结构**：

```
┌─────────────────────────────────────────┐
│  统计概览卡片（系统级别）                │
│  - 今日执行次数、成功、失败              │
│  - 成功率                                │
│  - 与昨日对比                            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  执行趋势图表（系统级别）                │
│  - 折线图：每日执行次数趋势              │
│  - 柱状图：成功/失败对比                 │
│  - 时间范围选择器（7天/30天/90天）      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  项目统计列表                            │
│  - 表格：项目名称、执行次数、成功率      │
│  - 排序：按执行次数、成功率              │
│  - 点击进入项目详情统计                  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  项目对比图表                            │
│  - 横向柱状图：各项目执行次数对比        │
│  - 饼图：各项目执行占比                  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  扩展统计维度                            │
│  - 按队列统计：队列执行情况对比          │
│  - 按小时统计：24小时执行趋势图          │
│  - 执行时长：平均时长、时长分布          │
│  - 按客户端统计：客户端执行情况          │
│  - 错误类型：错误类型分布饼图            │
└─────────────────────────────────────────┘
```

### 5.2 统计图表类型

1. **折线图**：展示每日执行次数趋势（支持多系列：总数、成功、失败）
2. **柱状图**：展示每日成功/失败对比
3. **饼图**：展示各项目执行占比、错误类型分布
4. **横向柱状图**：展示项目执行次数排名、队列执行对比
5. **仪表盘**：展示成功率等关键指标
6. **24小时热力图**：展示一天内各时段的执行情况
7. **时长分布直方图**：展示执行时长分布情况
8. **堆叠柱状图**：展示按客户端/API Key 的执行情况

### 5.3 图表库选择

推荐使用：
- **Recharts**：React 图表库，与项目技术栈匹配
- **Chart.js**：功能强大，支持多种图表类型
- **ECharts**：功能最全面，但体积较大

### 5.4 组件设计

**统计卡片组件**（`StatsCard`）：
- 显示关键指标（执行次数、成功率等）
- 支持对比显示（与昨日/上周对比）
- 响应式设计，适配移动端

**统计图表组件**（`StatsChart`）：
- 封装图表库，提供统一接口
- 支持时间范围选择
- 支持数据导出（可选）

**项目统计表格组件**（`ProjectStatsTable`）：
- 表格展示项目统计数据
- 支持排序、筛选
- 点击进入项目详情统计页面

**扩展统计组件**：
- **队列统计组件**（`QueueStatsChart`）：展示各队列的执行情况
- **小时统计组件**（`HourlyStatsChart`）：展示24小时执行趋势
- **执行时长组件**（`DurationStatsChart`）：展示执行时长统计和分布
- **客户端统计组件**（`ClientStatsChart`）：展示各客户端的执行情况
- **错误类型组件**（`ErrorTypeStatsChart`）：展示错误类型分布

---

## 6. 扩展统计维度实现

### 6.1 时间维度扩展

#### 6.1.1 按小时统计

**实现方式**：
- 在 `extended.by_hour` 字段中存储24小时的统计数据
- 格式：`{ "00": { total: 10, success: 8, failure: 2 }, ... }`
- 在任务状态更新时，根据当前小时更新对应数据

**使用场景**：
- 识别执行高峰期
- 分析执行时段分布
- 优化资源分配

#### 6.1.2 按周/月/年统计

**实现方式**：
- 通过聚合查询，将日统计数据按周/月/年分组
- 或创建专门的周/月/年统计集合（可选）

**使用场景**：
- 长期趋势分析
- 周期性模式识别

### 6.2 业务维度扩展

#### 6.2.1 按队列统计

**实现方式**：
- 在 `extended.by_queue` 字段中存储各队列的统计数据
- 格式：`{ "queue_id": { total: 100, success: 80, failure: 20 }, ... }`
- 在任务状态更新时，根据队列ID更新对应数据

**使用场景**：
- 识别高活跃队列
- 队列性能对比
- 队列资源分配优化

#### 6.2.2 按客户端统计

**实现方式**：
- 在 `extended.by_client` 字段中存储各客户端的统计数据
- 格式：`{ "hostname": { total: 50, success: 40, failure: 10 }, ... }`
- 从 `clientInfo.hostname` 获取客户端标识

**使用场景**：
- 识别活跃客户端
- 客户端使用情况分析
- 客户端问题排查

#### 6.2.3 按 API Key 统计

**实现方式**：
- 在 `extended.by_api_key` 字段中存储各 API Key 的统计数据
- 格式：`{ "api_key_name": { total: 200, success: 160, failure: 40 }, ... }`
- 从 API Key 认证信息中获取名称

**使用场景**：
- API Key 使用情况监控
- 使用量统计和计费
- 异常使用检测

### 6.3 性能维度扩展

#### 6.3.1 执行时长统计

**实现方式**：
- 在 `extended.execution_duration` 字段中存储时长统计
- 记录任务从 `pending` 到 `done/error` 的时间差
- 计算平均值、最小值、最大值
- 使用 `statistics_logs` 集合记录每次执行的详细时长

**数据结构**：
```javascript
execution_duration: {
  total_duration: Number,  // 总时长（毫秒）
  count: Number,            // 有时长记录的任务数
  min: Number,              // 最短时长
  max: Number,              // 最长时长
  avg: Number               // 平均时长（通过定时任务计算）
}
```

**使用场景**：
- 性能监控和优化
- 识别慢任务
- SLA 监控

#### 6.3.2 执行时长分布

**实现方式**：
- 通过查询 `statistics_logs` 集合，按时长区间分组统计
- 区间划分：0-1分钟、1-5分钟、5-10分钟、10分钟以上

**使用场景**：
- 时长分布可视化
- 性能瓶颈识别

### 6.4 质量维度扩展

#### 6.4.1 错误类型统计

**实现方式**：
- 在 `extended.error_types` 字段中存储错误类型统计
- 格式：`{ "timeout": 50, "network": 30, "validation": 20, ... }`
- 通过错误信息分类函数将错误归类

**错误分类**：
- `timeout`：超时错误
- `network`：网络错误
- `validation`：验证错误
- `permission`：权限错误
- `not_found`：资源未找到
- `other`：其他错误

**使用场景**：
- 错误趋势分析
- 问题定位和优化
- 质量监控

#### 6.4.2 成功率趋势

**实现方式**：
- 通过查询历史统计数据，计算每日成功率
- 使用折线图展示成功率变化趋势

**使用场景**：
- 质量监控
- 改进效果评估

### 6.5 扩展统计的定时任务

对于需要聚合计算的统计（如平均执行时长），可以使用定时任务定期计算：

```javascript
/**
 * 计算平均执行时长（每日执行）
 */
async function calculateAvgExecutionDuration() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = yesterday.toISOString().split('T')[0];
  
  // 查询所有统计记录
  const stats = await Statistics.find({
    date: date,
    'extended.execution_duration.count': { $gt: 0 }
  });
  
  for (const stat of stats) {
    const duration = stat.extended.execution_duration;
    if (duration.count > 0) {
      const avg = duration.total_duration / duration.count;
      await Statistics.findByIdAndUpdate(stat._id, {
        $set: {
          'extended.execution_duration.avg': Math.round(avg)
        }
      });
    }
  }
}
```

---

## 7. 实施计划

### 7.1 第一阶段：基础统计功能

**目标**：实现项目级别和系统级别的每日执行统计

**任务清单**：
1. ✅ 创建 Statistics 模型（Mongoose Schema）
2. ✅ 在任务状态更新接口中集成统计累计逻辑
3. ✅ 实现系统级别统计 API（`GET /api/v1/stats/system`）
4. ✅ 实现项目级别统计 API（`GET /api/v1/stats/project/:projectId`）
5. ✅ 创建统计页面路由和基础布局
6. ✅ 实现统计概览卡片组件
7. ✅ 实现基础统计图表（折线图、柱状图）

**预计时间**：3-5 个工作日

### 7.2 第二阶段：统计展示增强

**目标**：完善前端展示，增加更多图表和交互功能

**任务清单**：
1. ✅ 实现项目统计列表和对比图表
2. ✅ 实现时间范围选择器
3. ✅ 实现数据导出功能（可选）
4. ✅ 优化移动端适配
5. ✅ 添加加载状态和错误处理

**预计时间**：2-3 个工作日

### 7.3 第三阶段：扩展统计维度 - 基础扩展

**目标**：实现核心扩展统计维度

**任务清单**：
1. ✅ 创建 StatisticsLog 模型（Mongoose Schema）
2. ✅ 在任务状态更新接口中记录统计日志
3. ✅ 实现按队列统计的累计逻辑
4. ✅ 实现按小时统计的累计逻辑
5. ✅ 实现执行时长统计的累计逻辑
6. ✅ 实现按客户端统计的累计逻辑
7. ✅ 实现错误类型统计的累计逻辑
8. ✅ 实现扩展统计的查询 API
9. ✅ 实现扩展统计的前端展示组件

**预计时间**：5-7 个工作日

### 7.4 第四阶段：扩展统计维度 - 高级功能

**目标**：实现高级统计功能和优化

**任务清单**：
1. ✅ 实现执行时长分布统计
2. ✅ 实现按周/月/年统计（聚合查询）
3. ✅ 实现定时任务计算平均执行时长
4. ✅ 实现统计数据的缓存机制
5. ✅ 优化扩展统计查询性能
6. ✅ 实现统计数据的导出功能
7. ✅ 实现统计数据的告警功能

**预计时间**：3-5 个工作日

### 7.5 数据迁移（如需要）

如果系统已有历史数据，需要考虑：

1. **历史数据回填**：编写脚本，根据历史任务状态变更记录回填统计数据
2. **数据校验**：对比回填后的统计数据与实时查询结果，确保一致性
3. **性能测试**：测试统计查询性能，必要时优化索引

---

## 8. 技术细节

### 8.1 日期处理

- **时区处理**：统一使用 UTC 时区，前端展示时转换为本地时区
- **日期格式**：统一使用 `YYYY-MM-DD` 格式存储和查询
- **日期计算**：使用 JavaScript 的 Date 对象或 dayjs 库

### 8.2 性能优化

1. **索引优化**：
   - `{ date: -1, scope: 1 }`：用于按日期和范围查询
   - `{ projectId: 1, date: -1 }`：用于按项目查询
   - `{ date: 1, scope: 1, projectId: 1 }`：唯一索引

2. **查询优化**：
   - 使用 `lean()` 查询提高性能
   - 限制查询日期范围，避免查询过多数据
   - 使用聚合管道进行复杂统计

3. **缓存策略**：
   - 对于历史统计数据，可以使用 Redis 缓存
   - 缓存过期时间：1 小时（当日数据）或 24 小时（历史数据）

### 8.3 错误处理

1. **累计失败处理**：
   - 统计累计失败不应影响主业务流程
   - 使用 try-catch 捕获错误，记录日志
   - 可以考虑异步处理统计累计，避免阻塞主流程

2. **数据一致性**：
   - 使用 MongoDB 事务确保统计累计的原子性
   - 定期校验统计数据的一致性

### 8.4 监控和告警

1. **统计累计监控**：
   - 监控统计累计的成功率和延迟
   - 设置告警，当累计失败率过高时通知

2. **查询性能监控**：
   - 监控统计查询的响应时间
   - 设置告警，当查询时间过长时通知

---

## 9. 测试计划

### 9.1 单元测试

1. **统计累计逻辑测试**：
   - 测试任务状态更新时的统计累计
   - 测试非执行状态变更不累计
   - 测试并发更新时的数据一致性

2. **统计查询逻辑测试**：
   - 测试按日期范围查询
   - 测试按项目查询
   - 测试空数据查询

### 9.2 集成测试

1. **API 集成测试**：
   - 测试统计 API 的完整流程
   - 测试错误处理和边界情况

2. **前端集成测试**：
   - 测试统计页面的数据加载和展示
   - 测试图表交互功能

### 9.3 性能测试

1. **统计累计性能**：
   - 测试高并发下的统计累计性能
   - 测试统计累计对主业务流程的影响

2. **统计查询性能**：
   - 测试大量历史数据下的查询性能
   - 测试不同日期范围的查询性能

---

## 10. 总结

本方案设计了一个完整的统计功能增强系统，包括：

1. **数据库设计**：
   - 使用专门的统计集合（`statistics`）存储统计数据，支持项目级别和系统级别统计
   - 使用统计日志集合（`statistics_logs`）记录详细执行信息，支持复杂统计分析
   - 设计灵活的扩展字段结构，支持多维度统计

2. **数据累计机制**：
   - 在任务状态更新时实时累计基础统计数据
   - 同时累计扩展维度统计（队列、小时、客户端、API Key、错误类型等）
   - 记录执行时长等性能指标

3. **API 设计**：
   - 提供基础统计查询接口（系统级别、项目级别）
   - 提供扩展维度统计接口（按队列、按小时、执行时长、错误类型等）
   - 支持灵活的查询参数和日期范围

4. **前端展示**：
   - 设计统计页面和多种图表组件
   - 支持基础统计和扩展统计的可视化展示
   - 提供交互式图表和数据分析功能

5. **扩展性**：
   - 实现了核心扩展统计维度（队列、小时、客户端、API Key、错误类型、执行时长）
   - 预留了进一步扩展的空间（按周/月/年统计、更多业务维度等）
   - 支持通过定时任务和聚合查询实现复杂统计

该方案遵循了系统的设计原则，保持了与现有架构的一致性，同时实现了丰富的统计功能，为系统监控、性能优化和质量提升提供了数据支持。

### 10.1 实施优先级建议

**高优先级**（第一阶段 + 第三阶段基础）：
- 基础统计功能（项目级别、系统级别）
- 按队列统计
- 按小时统计
- 执行时长统计

**中优先级**（第三阶段完整）：
- 按客户端统计
- 按 API Key 统计
- 错误类型统计

**低优先级**（第四阶段）：
- 执行时长分布
- 按周/月/年统计
- 缓存和性能优化
- 数据导出和告警

