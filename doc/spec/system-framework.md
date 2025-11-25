# TaskEcho 系统基础框架实现方案

## 1. 系统架构概述

### 1.1 技术架构

TaskEcho 采用前后端统一的 Node.js 架构，使用 **Next.js App Router** 作为全栈框架：

```
┌─────────────────────────────────────────┐
│     前端层 (Next.js App Router)         │
│  - React Server Components              │
│  - 首页、项目详情、任务队列、任务详情    │
│  - API Key 管理页面                     │
│  - shadcn/ui + Tailwind CSS            │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│   API 层 (Next.js Route Handlers)       │
│  - App Router API Routes                │
│  - RESTful API 接口                     │
│  - 中间件系统（认证、验证、响应格式化）  │
│  - 业务逻辑处理                         │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│        数据访问层 (Mongoose ODM)       │
│  - Mongoose Client                     │
│  - 数据库查询和操作                    │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│        数据存储层 (MongoDB)            │
│  - MongoDB 文档数据库                  │
│  - 项目、任务队列、任务（含消息、日志） │
└─────────────────────────────────────────┘
```

**Next.js 框架特性**：
- **App Router**：使用 Next.js 13+ 的 App Router 架构，支持 React Server Components
- **Route Handlers**：API 路由使用 Route Handlers（`route.js`），支持标准 HTTP 方法
- **文件系统路由**：基于文件系统的路由，自动生成 API 端点
- **服务端渲染**：支持 SSR、SSG 和 ISR 等渲染策略
- **中间件支持**：内置中间件系统，支持请求拦截和处理

### 1.2 核心设计原则

1. **数据驱动**：100% 数据由外部系统通过 API 推送，前端完全只读
2. **幂等性**：核心提交接口完全幂等，支持重复调用
3. **单用户本地应用**：无需登录系统，启动即用
4. **API Key 认证**：使用项目专属 API Key 进行接口认证
5. **响应式设计**：支持手机、平板、桌面端

### 1.3 项目目录结构（Next.js App Router）

```
TaskEcho/
├── src/
│   ├── app/                   # Next.js App Router 根目录
│   │   ├── api/               # API 路由目录
│   │   │   └── v1/            # API 版本 1
│   │   │       ├── submit/
│   │   │       │   └── route.js        # POST /api/v1/submit
│   │   │       ├── projects/
│   │   │       │   ├── route.js        # GET /api/v1/projects
│   │   │       │   └── [projectId]/
│   │   │       │       ├── route.js    # GET /api/v1/projects/:id
│   │   │       │       └── queues/
│   │   │       │           └── route.js # GET /api/v1/projects/:id/queues
│   │   │       ├── queues/             # 任务队列相关接口
│   │   │       ├── tasks/             # 任务相关接口
│   │   │       ├── stats/
│   │   │       │   └── route.js        # GET /api/v1/stats
│   │   │       └── api-keys/
│   │   │           ├── route.js        # GET/POST /api/v1/api-keys
│   │   │           └── [id]/
│   │   │               └── route.js    # PUT/DELETE /api/v1/api-keys/:id
│   │   ├── (main)/            # 需要认证的页面组（路由组）
│   │   │   ├── page.js        # 首页 (/)
│   │   │   ├── project/
│   │   │   │   └── [projectId]/
│   │   │   │       ├── page.js        # 项目详情页
│   │   │   │       └── queue/
│   │   │   │           └── [queueId]/
│   │   │   │               ├── page.js # 队列详情页
│   │   │   │               └── task/
│   │   │   │                   └── [taskId]/
│   │   │   │                       └── page.js # 任务详情页
│   │   │   └── settings/
│   │   │       └── page.js    # API Key 管理页面
│   │   ├── layout.js          # 根布局组件
│   │   ├── globals.css        # 全局样式
│   │   └── not-found.js       # 404 页面
│   ├── lib/                   # 工具库
│   │   ├── mongoose.js         # Mongoose 连接初始化
│   │   ├── models/            # Mongoose 模型定义
│   │   │   ├── Project.js     # 项目模型
│   │   │   ├── Queue.js       # 队列模型
│   │   │   ├── Task.js        # 任务模型
│   │   │   └── ApiKey.js      # API Key 模型
│   │   ├── api-middleware.js  # API 中间件系统
│   │   ├── api-response.js    # 标准响应格式
│   │   ├── validators.js      # 数据验证工具
│   │   └── auth.js            # API Key 认证
│   └── components/            # React 组件
│       ├── ui/                # shadcn/ui 组件
│       └── ...                # 业务组件
├── doc/                       # 文档目录
│   ├── requirement.md
│   ├── page-structure.md
│   └── spec/
│       └── system-framework.md
├── .env.local                 # 环境变量（本地）
├── next.config.js             # Next.js 配置
├── tailwind.config.js         # Tailwind CSS 配置
└── package.json
```

**Next.js App Router 关键特性**：
- **文件系统路由**：`app/` 目录下的文件结构自动映射为路由
- **Route Handlers**：`route.js` 文件导出 HTTP 方法处理函数（GET、POST、PUT、DELETE 等）
- **动态路由**：使用 `[param]` 文件夹创建动态路由段
- **路由组**：使用 `(group)` 文件夹组织路由，不影响 URL 路径
- **布局组件**：`layout.js` 提供共享布局，支持嵌套布局
- **Server Components**：默认使用 React Server Components，减少客户端 JavaScript

---

## 2. 数据库设计规范

### 2.1 数据库选择

- **数据库类型**：MongoDB（文档数据库）
- **ODM 框架**：Mongoose
- **数据库连接**：通过 MongoDB 连接字符串配置
- **数据库名称**：`taskecho`（开发和生产环境通过环境变量配置）

### 2.2 集合（Collection）设计

详细的数据模型设计请参考 [数据库设计文档](database-design.md)。

**核心集合**：
- `projects`：项目集合
- `queues`：任务队列集合
- `tasks`：任务集合（消息、日志、标签嵌入在任务文档中）
- `api_keys`：API Key 集合

**设计特点**：
- 消息和日志嵌入到任务文档中，充分利用 MongoDB 的文档嵌套特性
- 标签嵌入到任务文档中，简化查询
- 项目、队列、任务使用引用关系，支持独立查询和更新

### 2.3 数据库索引策略

详细索引设计请参考 [数据库设计文档](database-design.md)。

**主要索引**：
- 唯一索引：`projects.projectId`、`queues(projectId, queueId)`、`tasks(queueId, taskId)`、`api_keys.key`
- 查询索引：`projects.lastTaskAt`、`queues.lastTaskAt`、`tasks.status`、`tasks.updatedAt`

### 2.4 Mongoose 连接配置

```javascript
// src/lib/mongoose.js
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

**环境变量配置**：
```bash
MONGODB_URI="mongodb://localhost:27017/taskecho"
# 或使用 MongoDB Atlas
# MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/taskecho"
```

---

## 3. 主要 API 规范

### 3.1 API 设计原则

1. **RESTful 风格**：遵循 REST 设计规范
2. **版本控制**：使用 `/api/v1/` 前缀
3. **统一响应格式**：所有接口返回标准 JSON 格式
4. **错误处理**：统一的错误码和错误消息
5. **认证机制**：使用 API Key 进行认证

### 3.2 API 响应格式规范

#### 3.2.1 成功响应

```json
{
  "success": true,
  "data": {
    // 响应数据
  },
  "message": "操作成功",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### 3.2.2 错误响应

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {}  // 可选，详细错误信息
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### 3.2.3 分页响应

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  },
  "message": "查询成功",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 3.3 核心 API 接口列表

#### 3.3.1 数据提交接口

**POST /api/v1/submit**
- 功能：提交项目、任务队列和批量任务（幂等操作）
- 认证：API Key（Header: `X-API-Key`）
- 详细规范：见 `core-submit-api.md`

#### 3.3.2 增量更新接口

**POST /api/v1/tasks/:projectId/:queueId/:taskId/message**
- 功能：追加单条对话消息
- 认证：API Key
- 详细规范：见 `incremental-update-api.md`

**POST /api/v1/tasks/:projectId/:queueId/:taskId/log**
- 功能：追加任务执行日志
- 认证：API Key
- 详细规范：见 `incremental-update-api.md`

**PATCH /api/v1/tasks/:projectId/:queueId/:taskId/status**
- 功能：修改任务状态
- 认证：API Key
- 详细规范：见 `incremental-update-api.md`

#### 3.3.3 数据查询接口

**GET /api/v1/projects**
- 功能：获取所有项目列表
- 认证：无需认证（单用户本地应用）
- 详细规范：见 `query-api.md`

**GET /api/v1/projects/:projectId**
- 功能：获取项目详情
- 认证：无需认证

**GET /api/v1/projects/:projectId/queues**
- 功能：获取项目下的任务队列列表
- 认证：无需认证

**GET /api/v1/projects/:projectId/queues/:queueId**
- 功能：获取任务队列详情
- 认证：无需认证

**GET /api/v1/projects/:projectId/queues/:queueId/tasks**
- 功能：获取任务队列下的任务列表
- 认证：无需认证

**GET /api/v1/projects/:projectId/queues/:queueId/tasks/:taskId**
- 功能：获取任务详情（包含消息和日志）
- 认证：无需认证

**GET /api/v1/stats**
- 功能：获取全局统计信息
- 认证：无需认证

#### 3.3.4 API Key 管理接口

**GET /api/v1/api-keys**
- 功能：获取所有 API Key 列表
- 认证：无需认证（本地管理）

**POST /api/v1/api-keys**
- 功能：创建新的 API Key
- 认证：无需认证

**PUT /api/v1/api-keys/:id**
- 功能：更新 API Key
- 认证：无需认证

**DELETE /api/v1/api-keys/:id**
- 功能：删除 API Key
- 认证：无需认证

### 3.4 API 中间件系统

#### 3.4.1 中间件类型

1. **认证中间件**：验证 API Key
2. **验证中间件**：验证请求参数
3. **响应格式化中间件**：统一响应格式
4. **错误处理中间件**：统一错误处理

#### 3.4.2 中间件执行顺序

```
请求 → 认证中间件 → 验证中间件 → 业务处理 → 响应格式化 → 错误处理 → 响应
```

### 3.5 API Key 认证机制

#### 3.5.1 认证方式

- **Header 方式**：`X-API-Key: <api_key_value>`
- **查询参数方式**（可选）：`?api_key=<api_key_value>`

#### 3.5.2 认证流程

1. 从请求中提取 API Key
2. 查询数据库验证 API Key 是否存在且激活
3. 验证通过则继续处理，否则返回 401 错误

#### 3.5.3 API Key 存储安全

- API Key 值建议使用哈希存储（如 bcrypt）
- 或使用加密存储（如 AES）
- 查询时进行哈希/加密比对

---

## 4. 业务流程说明

### 4.1 核心数据提交流程（POST /api/v1/submit）

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
  ↓
4. 验证请求数据格式
  ↓
5. 开始数据库事务
  ↓
6. 处理项目（根据 project_id 判断存在性）
   - 不存在：创建新项目
   - 存在：更新项目名称
  ↓
7. 处理任务队列（根据 project_id + queue_id 判断存在性）
   - 不存在：创建新队列
   - 存在：更新队列名称
  ↓
8. 处理任务列表（批量处理）
   For each task:
     - 根据 project_id + queue_id + task_id 判断存在性
     - 不存在：创建新任务（包括标签、消息）
     - 存在：完全替换任务（删除旧标签和消息，创建新的）
  ↓
9. 更新项目/队列的 lastTaskAt 时间戳
  ↓
10. 提交事务
  ↓
11. 返回成功响应
```

**幂等性保证**：
- 使用唯一约束确保数据唯一性
- 使用事务确保原子性
- 重复调用结果一致

### 4.2 增量更新流程

#### 4.2.1 追加消息流程

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
  ↓
4. 验证任务是否存在
  ↓
5. 创建新消息记录
  ↓
6. 更新任务的 updatedAt 时间戳
  ↓
7. 返回成功响应
```

#### 4.2.2 追加日志流程

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
  ↓
4. 验证任务是否存在
  ↓
5. 创建新日志记录（自动添加时间戳）
  ↓
6. 返回成功响应
```

#### 4.2.3 修改状态流程

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
  ↓
4. 验证任务是否存在
  ↓
5. 验证状态值是否有效
  ↓
6. 更新任务状态
  ↓
7. 更新任务的 updatedAt 时间戳
  ↓
8. 返回成功响应
```

### 4.3 数据查询流程

#### 4.3.1 首页数据加载流程

```
前端页面
  ↓
1. 发送 GET /api/v1/projects
  ↓
后端 API
  ↓
2. 查询所有项目（按 lastTaskAt 倒序）
  ↓
3. 对每个项目统计：
   - 队列数量
   - 任务总数
   - Pending/Done/Error 任务数
  ↓
4. 发送 GET /api/v1/stats
  ↓
5. 返回全局统计
  ↓
前端展示
```

#### 4.3.2 任务详情页数据加载流程

```
前端页面
  ↓
1. 发送 GET /api/v1/projects/:projectId/queues/:queueId/tasks/:taskId
  ↓
后端 API
  ↓
2. 查询任务基本信息
  ↓
3. 查询任务标签（关联查询）
  ↓
4. 查询任务消息（按 createdAt 正序）
  ↓
5. 查询任务日志（按 createdAt 倒序）
  ↓
6. 组装返回数据
  ↓
前端展示
```

### 4.4 API Key 管理流程

#### 4.4.1 创建 API Key 流程

```
用户操作
  ↓
1. 在设置页面填写 API Key 信息
   - 名称
   - API Key 值
   - 关联项目ID（可选）
  ↓
2. 发送 POST /api/v1/api-keys
  ↓
后端 API
  ↓
3. 验证数据格式
  ↓
4. 检查 API Key 值是否已存在
  ↓
5. 加密/哈希存储 API Key
  ↓
6. 创建 API Key 记录
  ↓
7. 返回成功响应（不返回原始 Key 值）
  ↓
前端刷新列表
```

#### 4.4.2 删除 API Key 流程

```
用户操作
  ↓
1. 点击删除按钮
  ↓
2. 确认删除操作
  ↓
3. 发送 DELETE /api/v1/api-keys/:id
  ↓
后端 API
  ↓
4. 验证 API Key 是否存在
  ↓
5. 删除 API Key 记录
  ↓
6. 返回成功响应
  ↓
前端刷新列表
```

---

## 5. 技术实现要点

### 5.1 Mongoose 连接初始化

```javascript
// src/lib/mongoose.js
import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error('请设置 MONGODB_URI 环境变量')
}

// 使用全局变量缓存连接（Next.js 开发环境会热重载）
let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    }

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

export default connectDB
```

### 5.2 Next.js App Router API 路由处理

#### 5.2.1 Route Handler 标准结构

```javascript
// src/app/api/v1/projects/route.js
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import connectDB from '@/lib/mongoose'
import { Project } from '@/lib/models/Project'
import { Queue } from '@/lib/models/Queue'

// GET 请求处理函数
async function handleGET(request, context) {
  await connectDB()
  
  const projects = await Project.find()
    .sort({ lastTaskAt: -1 })
    .lean()
  
  // 为每个项目添加队列数量统计
  const projectsWithStats = await Promise.all(
    projects.map(async (project) => {
      const queueCount = await Queue.countDocuments({ projectId: project._id })
      return {
        ...project,
        queueCount
      }
    })
  )
  
  return createSuccessResponse(projectsWithStats, '查询成功')
}

// 导出 Route Handler（Next.js App Router 标准格式）
export const GET = createApiHandler(handleGET, [
  // 中间件列表（可选）
  // MiddlewarePresets.authenticated
])
```

#### 5.2.2 动态路由处理

```javascript
// src/app/api/v1/projects/[projectId]/route.js
import { createApiHandler } from '@/lib/api-middleware'
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from '@/lib/api-response'
import connectDB from '@/lib/mongoose'
import { Project } from '@/lib/models/Project'
import { Queue } from '@/lib/models/Queue'

async function handleGET(request, context) {
  await connectDB()
  
  // Next.js 15+ 要求：params 必须通过 context 获取并 await
  const { params } = context
  const projectId = params.projectId  // ✅ 已通过中间件 await 处理
  
  const project = await Project.findOne({ projectId }).lean()
  
  if (!project) {
    return createErrorResponse('项目不存在', ERROR_CODES.RESOURCE_NOT_FOUND, 404)
  }
  
  const queues = await Queue.find({ projectId: project._id })
    .sort({ lastTaskAt: -1 })
    .lean()
  
  const projectWithQueues = {
    ...project,
    queues
  }
  
  if (!project) {
    return createErrorResponse(
      '项目不存在',
      ERROR_CODES.RESOURCE_NOT_FOUND,
      404
    )
  }
  
  return createSuccessResponse(project, '查询成功')
}

export const GET = createApiHandler(handleGET)
```

#### 5.2.3 API 中间件系统

```javascript
// src/lib/api-middleware.js
export function createApiHandler(handler, middlewares = []) {
  return async (request, routeContext = {}) => {
    const runner = new MiddlewareRunner(request)
    
    // ⚠️ Next.js 15+ 关键：动态路由参数必须 await
    // routeContext.params 在 Next.js 15 中是 Promise
    runner.context.params = routeContext.params 
      ? await routeContext.params 
      : {}
    
    // 执行中间件链
    middlewares.forEach(middleware => runner.use(middleware))
    
    // 执行业务处理函数
    return await runner.run(handler)
  }
}
```

**Next.js 15+ 重要注意事项**：
- 动态路由参数 `params` 在 Next.js 15 中是 Promise，必须 `await`
- Route Handler 必须导出命名函数（GET、POST、PUT、DELETE 等）
- 使用 `Response.json()` 或自定义响应函数返回数据
- 支持 `async/await` 语法处理异步操作

### 5.3 标准响应格式

```javascript
// src/lib/api-response.js
export function createSuccessResponse(data, message = '操作成功', statusCode = 200) {
  return Response.json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  }, { status: statusCode })
}

export function createErrorResponse(message, code, statusCode = 400) {
  return Response.json({
    success: false,
    error: {
      code,
      message
    },
    timestamp: new Date().toISOString()
  }, { status: statusCode })
}
```

### 5.4 API Key 认证中间件

```javascript
// src/lib/auth.js
export async function authenticateApiKey(request) {
  const apiKey = request.headers.get('X-API-Key') 
    || new URL(request.url).searchParams.get('api_key')
  
  if (!apiKey) {
    throw new Error('缺少 API Key')
  }
  
  const ApiKey = require('@/lib/models/ApiKey').ApiKey
  await connectDB()
  
  const keyRecord = await ApiKey.findOne({ 
    key: hashApiKey(apiKey) 
  }).select('_id isActive projectId').lean()
  
  if (!keyRecord || !keyRecord.isActive) {
    throw new Error('无效的 API Key')
  }
  
  return keyRecord
}
```

### 5.5 MongoDB 操作示例

```javascript
// 核心提交接口的操作示例（MongoDB 使用原子操作，无需显式事务）
const Project = require('@/lib/models/Project').Project
const Queue = require('@/lib/models/Queue').Queue
const Task = require('@/lib/models/Task').Task

await connectDB()

// 1. 处理项目（使用 findOneAndUpdate 的 upsert 实现幂等性）
const project = await Project.findOneAndUpdate(
  { projectId: data.project_id },
  {
    projectId: data.project_id,
    name: data.project_name,
    $setOnInsert: { createdAt: new Date() }
  },
  { upsert: true, new: true }
)

// 2. 处理队列（使用 findOneAndUpdate 的 upsert 实现幂等性）
const queue = await Queue.findOneAndUpdate(
  { projectId: project._id, queueId: data.queue_id },
  {
    projectId: project._id,
    queueId: data.queue_id,
    name: data.queue_name,
    $setOnInsert: { createdAt: new Date() }
  },
  { upsert: true, new: true }
)

// 3. 处理任务（批量处理，消息和日志嵌入在任务中）
const now = new Date()
for (const taskData of data.tasks) {
  // 准备嵌入的消息数组
  const messages = (taskData.messages || []).map(msg => ({
    role: msg.role.toUpperCase(),
    content: msg.content,
    createdAt: now
  }))
  
  // 准备嵌入的标签数组
  const tags = (taskData.tags || []).map(tagName => ({
    name: tagName,
    color: null
  }))
  
  // 使用 findOneAndUpdate 的 upsert 完全替换任务
  await Task.findOneAndUpdate(
    { queueId: queue._id, taskId: taskData.task_id },
    {
      queueId: queue._id,
      taskId: taskData.task_id,
      title: taskData.title,
      status: taskData.status.toUpperCase(),
      tags: tags,
      messages: messages,
      logs: [],
      $setOnInsert: { createdAt: now }
    },
    { upsert: true, new: true }
  )
}

// 4. 更新时间戳
await Project.findByIdAndUpdate(project._id, {
  lastTaskAt: now
})

await Queue.findByIdAndUpdate(queue._id, {
  lastTaskAt: now
})
```

---

## 6. 开发规范

### 6.1 代码规范

- 使用 JavaScript（不使用 TypeScript）
- 遵循 ESLint 规范
- 使用 Prettier 格式化代码
- 函数和变量使用驼峰命名

### 6.2 Next.js API 开发规范

- **Route Handler 规范**：
  - 所有 API 路由文件必须命名为 `route.js`
  - 必须导出命名函数（GET、POST、PUT、DELETE 等）
  - 使用 `createApiHandler` 包装处理函数
  - 动态路由参数必须通过 `context.params` 获取（已 await 处理）

- **中间件系统**：
  - 所有 API 必须使用中间件系统
  - 认证中间件：`MiddlewarePresets.authenticated`
  - 验证中间件：使用 `validators.js` 进行数据验证

- **响应格式**：
  - 所有响应必须使用标准格式（`createSuccessResponse`、`createErrorResponse`）
  - 所有错误必须使用统一错误码（`ERROR_CODES`）

- **数据库操作**：
  - 所有数据库操作必须使用 Mongoose
  - 必须先调用 `await connectDB()` 确保数据库连接
  - 使用 `findOneAndUpdate` 的 `upsert` 选项实现幂等性
  - 消息和日志嵌入在任务文档中，使用 `$push` 原子操作更新

- **Next.js 15+ 兼容性**：
  - 正确处理动态路由参数（await params）
  - 使用 Server Components 默认特性
  - 遵循 App Router 文件系统路由规范

### 6.3 数据库开发规范

- 所有模型定义必须使用 Mongoose Schema
- 所有查询必须使用 Mongoose 模型方法
- 使用 `findOneAndUpdate` 的 `upsert` 选项实现幂等性
- 必须添加必要的索引（在 Schema 中定义）
- 消息和日志嵌入在任务文档中，充分利用 MongoDB 的文档特性

### 6.4 测试规范

- 单元测试：测试业务逻辑函数
- 集成测试：测试 API 接口
- 数据库测试：测试数据库操作

---

## 7. 部署和运维

### 7.1 开发环境

#### 7.1.1 环境要求
- **Node.js**：18.17 或更高版本（推荐 20.x LTS）
- **npm**：9.x 或更高版本
- **Next.js**：15.x（使用 App Router）

#### 7.1.2 初始化步骤

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，设置 MONGODB_URI="mongodb://localhost:27017/taskecho"

# 3. 启动 MongoDB（如果使用本地 MongoDB）
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod
# 或使用 Docker: docker run -d -p 27017:27017 mongo

# 4. 启动 Next.js 开发服务器
npm run dev
```

开发服务器将在 `http://localhost:3000` 启动。

#### 7.1.3 Next.js 配置文件

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router 配置
  experimental: {
    // 如果需要使用实验性功能
  },
  
  // 环境变量配置
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
  },
}

module.exports = nextConfig
```

#### 7.1.4 环境变量配置

```bash
# .env.local
# MongoDB 连接字符串
MONGODB_URI="mongodb://localhost:27017/taskecho"
# 或使用 MongoDB Atlas
# MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/taskecho"

# Next.js 环境
NODE_ENV=development
```

### 7.2 生产环境

#### 7.2.1 构建和部署

```bash
# 1. 安装生产依赖
npm ci

# 2. 配置环境变量
# 设置 MONGODB_URI 环境变量（生产环境的 MongoDB 连接字符串）

# 3. 构建 Next.js 应用
npm run build

# 4. 启动生产服务器
npm start
```

#### 7.2.2 Next.js 生产优化

- **自动代码分割**：Next.js 自动分割代码，按需加载
- **静态资源优化**：自动优化图片、字体等静态资源
- **服务端渲染**：默认使用 Server Components，减少客户端负担
- **API 路由优化**：Route Handlers 自动优化，支持边缘计算

#### 7.2.3 部署选项

1. **Vercel 部署**（推荐）：
   ```bash
   # 安装 Vercel CLI
   npm i -g vercel
   
   # 部署
   vercel
   ```

2. **Docker 部署**：
   ```dockerfile
   # Dockerfile
   FROM node:20-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build
   CMD ["npm", "start"]
   ```

3. **自托管部署**：
   - 使用 `npm start` 启动 Node.js 服务器
   - 配置反向代理（Nginx、Caddy 等）
   - 设置环境变量和 MongoDB 连接字符串

### 7.3 数据库备份

- MongoDB 支持多种备份方式：mongodump、副本集、云服务备份
- 建议定期备份数据库
- 备份频率：根据数据更新频率决定

### 7.4 监控和日志

- API 请求日志
- 数据库查询日志（开发环境）
- 错误日志记录

---

## 8. Next.js 框架优势

### 8.1 全栈一体化
- **前后端统一**：使用同一套代码库，减少上下文切换
- **类型安全**：可选的 TypeScript 支持（本项目使用 JavaScript）
- **开发体验**：热重载、快速刷新、错误提示

### 8.2 App Router 优势
- **文件系统路由**：直观的路由组织方式，无需额外配置
- **Server Components**：默认服务端渲染，减少客户端 JavaScript 体积
- **嵌套布局**：支持共享布局和嵌套路由
- **流式渲染**：支持 Suspense 和流式数据传输

### 8.3 API 路由优势
- **Route Handlers**：标准 HTTP 方法支持，符合 RESTful 规范
- **中间件支持**：内置中间件系统，易于扩展
- **类型安全**：Request/Response 类型推断
- **性能优化**：自动代码分割和优化

### 8.4 部署优势
- **Vercel 优化**：针对 Vercel 平台优化，一键部署
- **边缘计算**：支持边缘函数部署
- **静态导出**：支持静态站点生成（SSG）
- **增量静态再生**：支持 ISR，平衡性能和实时性

---

## 9. 总结

本文档定义了 TaskEcho 系统的基础框架实现方案，基于 **Next.js App Router** 架构：

1. **系统架构**：前后端统一的 Next.js App Router 架构
   - 使用 App Router 文件系统路由
   - Route Handlers 处理 API 请求
   - Server Components 默认服务端渲染

2. **数据库设计**：MongoDB + Mongoose ODM，4 个核心集合
   - Mongoose 连接 Next.js 15 兼容初始化
   - 消息和日志嵌入在任务文档中，充分利用文档数据库特性
   - 完整的索引策略和引用关系设计

3. **API 规范**：RESTful API 设计，统一响应格式
   - 标准 Route Handler 结构
   - 中间件系统支持认证和验证
   - Next.js 15+ 动态路由参数处理

4. **业务流程**：核心提交、增量更新、数据查询、API Key 管理
   - 幂等性保证的原子操作（使用 findOneAndUpdate 的 upsert）
   - 完整的错误处理机制

5. **技术实现**：Mongoose 连接初始化、中间件系统、认证机制
   - 符合 Next.js 最佳实践
   - 支持生产环境部署
   - 充分利用 MongoDB 的文档嵌套特性

后续将基于此方案编写详细的 API 接口设计文档和数据库设计文档。
