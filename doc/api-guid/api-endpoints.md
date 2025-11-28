# TaskEcho API 端点说明文档

本文档列出 TaskEcho 系统的所有 API 端点，包括请求和响应数据结构，供前端开发使用。

## 基础信息

- **Base URL**: `http://localhost:3000` (开发环境)
- **API 版本**: `v1`
- **API 前缀**: `/api/v1`
- **认证方式**: API Key（通过 `X-API-Key` header，大部分接口需要认证）
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

### 分页响应

```json
{
  "success": true,
  "data": {
    "items": [ ... ],
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

---

## 1. 项目相关接口

### 1.1 获取项目列表

**端点**: `GET /api/v1/projects`

**功能**: 获取项目列表（支持分页）

**认证**: 需要 API Key (`X-API-Key` header)

**查询参数**:

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| `page` | number | 否 | 页码，从 1 开始 | `1` |
| `pageSize` | number | 否 | 每页数量，最大 100 | `20` |
| `search` | string | 否 | 搜索关键词，匹配项目名称或自定义标题（不区分大小写） | - |
| `tags` | string | 否 | 标签过滤，多个标签用逗号分隔（AND逻辑：项目必须包含所有指定标签） | - |

**查询逻辑说明**:
- **名称搜索** (`search` 参数): 在项目名称 (`name`) 和自定义标题 (`metadata.customTitle`) 中搜索，不区分大小写
- **标签过滤** (`tags` 参数): 多个标签用逗号分隔，使用 AND 逻辑（项目必须包含所有指定的标签）
- **组合查询**: 支持同时使用 `search` 和 `tags` 参数，使用 AND 逻辑组合

**性能优化说明**:
- 查询使用聚合操作一次性获取所有数据，避免 N+1 查询问题
- 使用索引优化：`Project.lastTaskAt`、`ProjectMetadata.tags`、`ProjectMetadata.projectId` 等字段已建立索引
- 统计信息（`queue_count`、`task_count`、`task_stats`）在聚合管道中一次性计算，无需额外查询
- 分页查询限制每页最大数量为 100，避免一次性加载过多数据

**请求示例**:
```bash
# 基本查询
GET /api/v1/projects?page=1&pageSize=20
X-API-Key: <api_key>

# 搜索项目名称或自定义标题
GET /api/v1/projects?search=React&page=1&pageSize=20
X-API-Key: <api_key>

# 标签过滤（单个标签）
GET /api/v1/projects?tags=前端&page=1&pageSize=20
X-API-Key: <api_key>

# 标签过滤（多个标签，AND逻辑）
GET /api/v1/projects?tags=前端,React,重要&page=1&pageSize=20
X-API-Key: <api_key>

# 组合查询（搜索+标签过滤）
GET /api/v1/projects?search=React&tags=前端,重要&page=1&pageSize=20
X-API-Key: <api_key>
```

**响应数据结构**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "507f1f77bcf86cd799439011",
        "project_id": "project_001",
        "name": "示例项目",
        "displayTitle": "我的自定义标题",
        "metadata": {
          "customTitle": "我的自定义标题",
          "notes": "项目备注信息",
          "tags": ["前端", "react", "重要"]
        },
        "clientInfo": {
          "username": "user",
          "hostname": "hostname",
          "project_path": "/path/to/project"
        },
        "gitInfo": {
          "repository": "https://github.com/user/repo.git",
          "branch": "main"
        },
        "queue_count": 5,
        "task_count": 100,
        "task_stats": {
          "total": 100,
          "pending": 20,
          "done": 70,
          "error": 10
        },
        "last_task_at": "2024-01-01T12:00:00.000Z",
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  },
  "message": "查询成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**响应字段说明**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `displayTitle` | string | 显示标题，优先使用 `metadata.customTitle`，否则使用 `name` |
| `metadata` | object \| null | 项目元数据，包含 `customTitle`、`notes`、`tags` |
| `metadata.customTitle` | string \| null | 自定义标题 |
| `metadata.notes` | string \| null | 备注信息 |
| `metadata.tags` | string[] | 标签列表 |
| `clientInfo` | object \| null | 客户端信息对象（可能为 null） |
| `clientInfo.username` | string \| null | 用户名（可能为 null） |
| `clientInfo.hostname` | string \| null | 主机名（可能为 null） |
| `clientInfo.project_path` | string \| null | 项目路径（可能为 null） |
| `gitInfo` | object \| null | Git 信息对象（可能为 null） |
| `gitInfo.repository` | string \| null | Git 仓库地址（可能为 null） |
| `gitInfo.branch` | string \| null | Git 分支名称（可能为 null） |

**HTTP 状态码**:
- `200`: 成功
- `400`: 参数验证失败
- `401`: 未授权（缺少或无效的 API Key）

---

### 1.2 获取常用标签列表

**端点**: `GET /api/v1/projects/tags`

**功能**: 获取所有项目的常用标签列表，按使用次数降序排列

**认证**: 需要登录认证（Session）

**查询参数**:

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| `limit` | number | 否 | 返回标签数量限制，最大 100 | `50` |

**请求示例**:
```bash
# 获取常用标签列表（默认返回50个）
GET /api/v1/projects/tags

# 获取常用标签列表（指定返回数量）
GET /api/v1/projects/tags?limit=20
```

**响应数据结构**:

```json
{
  "success": true,
  "message": "获取常用标签成功",
  "data": {
    "tags": [
      "前端",
      "React",
      "重要",
      "后端",
      "Python"
    ],
    "count": 5
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**响应字段说明**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `data.tags` | array[string] | 标签列表，按使用次数降序排列 |
| `data.count` | number | 返回的标签数量 |

**HTTP 状态码**:
- `200`: 成功
- `500`: 服务器内部错误

**详细文档**: 参见 [标签API文档](./tags-api.md)

---

### 1.3 获取项目详情

**端点**: `GET /api/v1/projects/[projectId]`

**功能**: 获取指定项目的详细信息

**认证**: 需要 API Key (`X-API-Key` header)

**路径参数**:
- `projectId` (String, 必填): 项目ID

**请求示例**:
```bash
GET /api/v1/projects/project_001
X-API-Key: <api_key>
```

**响应数据结构**:

```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "project_id": "project_001",
    "name": "示例项目",
    "displayTitle": "我的自定义标题",
    "metadata": {
      "customTitle": "我的自定义标题",
      "notes": "项目备注信息",
      "tags": ["前端", "react", "重要"]
    },
    "clientInfo": {
      "username": "user",
      "hostname": "hostname",
      "project_path": "/path/to/project"
    },
    "gitInfo": {
      "repository": "https://github.com/user/repo.git",
      "branch": "main"
    },
    "queue_count": 5,
    "task_count": 100,
    "task_stats": {
      "total": 100,
      "pending": 20,
      "done": 70,
      "error": 10
    },
    "last_task_at": "2024-01-01T12:00:00.000Z",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T12:00:00.000Z"
  },
  "message": "查询成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**响应字段说明**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `displayTitle` | string | 显示标题，优先使用 `metadata.customTitle`，否则使用 `name` |
| `metadata` | object \| null | 项目元数据，如果不存在则为 `null` |

**HTTP 状态码**:
- `200`: 成功
- `404`: 项目不存在
- `401`: 未授权（缺少或无效的 API Key）

---

### 1.3 更新项目信息

**端点**: `PUT /api/v1/projects/[projectId]`

**功能**: 更新项目名称

**认证**: 需要 API Key (`X-API-Key` header)

**路径参数**:
- `projectId` (String, 必填): 项目ID

**请求体**:
```json
{
  "name": "更新后的项目名称"
}
```

**请求字段说明**:

| 字段名 | 类型 | 必填 | 说明 | 限制 |
|--------|------|------|------|------|
| `name` | string | 是 | 项目名称 | 最大长度 255 字符 |

**响应数据结构**:

```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "project_id": "project_001",
    "name": "更新后的项目名称",
    "updated_at": "2024-01-01T12:00:00.000Z"
  },
  "message": "项目更新成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**HTTP 状态码**:
- `200`: 成功
- `400`: 验证错误
- `404`: 项目不存在
- `401`: 未授权

---

### 1.4 删除项目

**端点**: `DELETE /api/v1/projects/[projectId]`

**功能**: 删除项目（级联删除所有关联的队列和任务）

**认证**: 需要 API Key (`X-API-Key` header)

**路径参数**:
- `projectId` (String, 必填): 项目ID

**响应数据结构**:

```json
{
  "success": true,
  "data": {
    "project_id": "project_001"
  },
  "message": "项目删除成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**HTTP 状态码**:
- `200`: 成功
- `404`: 项目不存在
- `401`: 未授权

---

### 1.5 获取项目元数据

**端点**: `GET /api/v1/projects/[projectId]/metadata`

**功能**: 获取指定项目的元数据信息

**认证**: 需要登录认证（Session Token）

**路径参数**:
- `projectId` (String, 必填): 项目ID

**响应数据结构**:

```json
{
  "success": true,
  "data": {
    "projectId": "project_001",
    "customTitle": "我的自定义标题",
    "notes": "项目备注信息",
    "tags": ["前端", "react", "重要"],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  },
  "message": "查询成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**HTTP 状态码**:
- `200`: 成功
- `404`: 项目不存在

**详细说明**: 参考 [项目元数据 API 文档](./project-metadata-api.md)

---

### 1.6 创建或更新项目元数据

**端点**: `PUT /api/v1/projects/[projectId]/metadata`

**功能**: 创建或更新项目的元数据信息（幂等操作）

**认证**: 需要登录认证（Session Token）

**路径参数**:
- `projectId` (String, 必填): 项目ID

**请求体**:
```json
{
  "customTitle": "我的自定义标题",
  "notes": "项目备注信息",
  "tags": ["前端", "React", "重要"]
}
```

**请求字段说明**:

| 字段名 | 类型 | 必填 | 说明 | 限制 |
|--------|------|------|------|------|
| `customTitle` | string | 否 | 自定义标题 | 最大长度 200 字符 |
| `notes` | string | 否 | 备注信息 | 最大长度 5000 字符 |
| `tags` | array[string] | 否 | 标签列表 | 最多 20 个标签，每个标签最长 50 字符 |

**响应数据结构**:

```json
{
  "success": true,
  "data": {
    "projectId": "project_001",
    "customTitle": "我的自定义标题",
    "notes": "项目备注信息",
    "tags": ["前端", "react", "重要"],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  },
  "message": "更新成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**HTTP 状态码**:
- `200`: 成功
- `400`: 验证错误
- `404`: 项目不存在

**详细说明**: 参考 [项目元数据 API 文档](./project-metadata-api.md)

---

### 1.7 删除项目元数据

**端点**: `DELETE /api/v1/projects/[projectId]/metadata`

**功能**: 删除项目的元数据信息

**认证**: 需要登录认证（Session Token）

**路径参数**:
- `projectId` (String, 必填): 项目ID

**响应数据结构**:

```json
{
  "success": true,
  "data": null,
  "message": "删除成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**HTTP 状态码**:
- `200`: 成功（如果元数据不存在也返回成功，幂等操作）
- `404`: 项目不存在

**详细说明**: 参考 [项目元数据 API 文档](./project-metadata-api.md)

---

### 1.8 获取项目任务队列列表

**端点**: `GET /api/v1/projects/[projectId]/queues`

**功能**: 获取指定项目的任务队列列表

**认证**: 需要 API Key (`X-API-Key` header)

**路径参数**:
- `projectId` (String, 必填): 项目ID

**查询参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `search` | string | 否 | 搜索关键词（匹配队列名称） |

**响应数据结构**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "507f1f77bcf86cd799439012",
        "queue_id": "queue_001",
        "name": "任务队列1",
        "task_count": 20,
        "task_stats": {
          "total": 20,
          "pending": 5,
          "done": 12,
          "error": 3
        },
        "last_task_at": "2024-01-01T12:00:00.000Z",
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T12:00:00.000Z"
      }
    ]
  },
  "message": "查询成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**HTTP 状态码**:
- `200`: 成功
- `404`: 项目不存在
- `401`: 未授权

---

## 2. 数据提交接口

### 2.1 提交项目、队列和任务数据

**端点**: `POST /api/v1/submit`

**功能**: 提交项目、任务队列和批量任务数据（完全幂等操作）

**认证**: 需要 API Key (`X-API-Key` header)

**请求体**:
```json
{
  "project_id": "project_001",
  "project_name": "示例项目",
  "clientInfo": {
    "username": "user",
    "hostname": "hostname",
    "project_path": "/path/to/project"
  },
  "gitInfo": {
    "repository": "https://github.com/user/repo.git",
    "branch": "main"
  },
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

**详细说明**: 参考 [完整 API 文档](../guide/api-guide.md#1-数据提交接口)

---

## 3. 统计接口

### 3.1 获取全局统计信息

**端点**: `GET /api/v1/stats`

**功能**: 获取全局统计信息

**认证**: 需要 API Key (`X-API-Key` header)

**响应数据结构**:

```json
{
  "success": true,
  "data": {
    "project_count": 10,
    "queue_count": 50,
    "task_count": 500,
    "task_stats": {
      "total": 500,
      "pending": 100,
      "done": 350,
      "error": 50
    }
  },
  "message": "查询成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**HTTP 状态码**:
- `200`: 成功
- `401`: 未授权

---

### 3.2 获取项目统计信息

**端点**: `GET /api/v1/stats/project/[projectId]`

**功能**: 获取指定项目的统计信息

**认证**: 需要 API Key (`X-API-Key` header)

**路径参数**:
- `projectId` (String, 必填): 项目ID

**响应数据结构**:

```json
{
  "success": true,
  "data": {
    "project_id": "project_001",
    "queue_count": 5,
    "task_count": 100,
    "task_stats": {
      "total": 100,
      "pending": 20,
      "done": 70,
      "error": 10
    }
  },
  "message": "查询成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**HTTP 状态码**:
- `200`: 成功
- `404`: 项目不存在
- `401`: 未授权

---

## 4. 认证相关接口

### 4.1 用户登录

**端点**: `POST /api/v1/auth/login`

**功能**: 用户登录

**认证**: 不需要

**请求体**:
```json
{
  "username": "admin",
  "password": "password"
}
```

**响应数据结构**:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "username": "admin"
    }
  },
  "message": "登录成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**HTTP 状态码**:
- `200`: 成功
- `401`: 用户名或密码错误

---

### 4.2 初始化系统

**端点**: `POST /api/v1/auth/init`

**功能**: 初始化系统（创建第一个管理员用户）

**认证**: 不需要

**请求体**:
```json
{
  "username": "admin",
  "password": "password"
}
```

**响应数据结构**:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "username": "admin"
    }
  },
  "message": "初始化成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**HTTP 状态码**:
- `200`: 成功
- `400`: 系统已初始化

---

## 5. API Key 管理接口

### 5.1 获取 API Key 列表

**端点**: `GET /api/v1/api-keys`

**功能**: 获取 API Key 列表（支持分页和筛选）

**认证**: 需要登录认证（Session Token）

**查询参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `page` | number | 否 | 页码，从 1 开始 | `1` |
| `pageSize` | number | 否 | 每页数量，最大 100 | `20` |
| `is_active` | boolean | 否 | 筛选激活状态 |
| `project_id` | string | 否 | 筛选项目ID |

**响应数据结构**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "507f1f77bcf86cd799439011",
        "name": "API Key 1",
        "key": "sk-****************************abcd",
        "project_id": "project_001",
        "is_active": true,
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

**HTTP 状态码**:
- `200`: 成功
- `401`: 未授权

**详细说明**: 参考 [API Key 管理 API 文档](../guide/api-key-management-api-guide.md)

---

## 重要字段说明

### displayTitle 字段

`displayTitle` 是一个计算字段，用于在 UI 中显示项目的标题。其逻辑如下：

1. 如果项目存在元数据（`metadata`）且 `metadata.customTitle` 不为空，则使用 `metadata.customTitle`
2. 否则，使用项目的 `name` 字段

**示例**:
- 如果项目有 `customTitle`：`displayTitle = "我的自定义标题"`
- 如果项目没有 `customTitle`：`displayTitle = "示例项目"`（使用 `name`）

**前端使用建议**:
- 在项目卡片和项目详情页中，优先使用 `displayTitle` 字段显示项目标题
- 支持搜索关键词高亮显示：当用户搜索时，可以在 `displayTitle` 中高亮匹配的搜索关键词

### metadata 字段

`metadata` 字段包含项目的用户自定义信息：

- `customTitle` (string | null): 自定义标题，最大长度 200 字符
- `notes` (string | null): 备注信息，最大长度 5000 字符
- `tags` (string[]): 标签列表，最多 20 个标签，每个标签最长 50 字符

如果项目没有元数据，`metadata` 字段为 `null`。

**前端使用建议**:
- 在项目卡片中显示标签（`metadata.tags`），支持点击标签快速过滤
- 标签应支持点击交互，点击后应用该标签的过滤条件
- 标签显示建议：最多显示 5 个标签，超出部分显示 "+N" 提示

### gitInfo 字段

`gitInfo` 字段包含项目的 Git 仓库信息：

- `repository` (string | null): Git 仓库地址，最大长度 500 字符
- `branch` (string | null): Git 分支名称，最大长度 255 字符

如果项目没有 Git 信息，`gitInfo` 字段为 `null`。

**前端使用建议**:
- 在项目详情页中显示 Git 信息（如果存在）
- 可以添加链接，点击后跳转到 Git 仓库
- 显示格式建议：`repository` 显示为链接，`branch` 显示为徽章或标签

---

## 错误码说明

| 错误码 | HTTP 状态码 | 说明 |
|--------|-------------|------|
| `VALIDATION_ERROR` | 400 | 数据验证失败 |
| `UNAUTHORIZED` | 401 | 未授权（缺少或无效的认证信息） |
| `INVALID_API_KEY` | 401 | API Key 无效或已禁用 |
| `RESOURCE_NOT_FOUND` | 404 | 资源不存在 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

---

## 注意事项

1. **认证方式**:
   - 大部分查询接口需要 API Key（通过 `X-API-Key` header）
   - 用户管理相关接口需要登录认证（Session Token）
   - 提交接口需要 API Key

2. **displayTitle 和 metadata**:
   - `displayTitle` 字段在项目列表和项目详情接口中都会返回
   - `metadata` 字段可能为 `null`（如果项目没有元数据）
   - 前端应优先使用 `displayTitle` 显示项目标题
   - 支持搜索关键词高亮：在项目卡片中高亮显示匹配的搜索关键词
   - 标签点击过滤：项目卡片中的标签应支持点击，点击后应用该标签的过滤条件

3. **分页**:
   - 列表接口支持分页，默认每页 20 条，最大 100 条
   - 分页从 1 开始

4. **幂等性**:
   - 提交接口（`POST /api/v1/submit`）是完全幂等的
   - 更新元数据接口（`PUT /api/v1/projects/[projectId]/metadata`）是幂等的

---

## 参考文档

- [完整 API 文档](../guide/api-guide.md)
- [项目元数据 API 文档](./project-metadata-api.md)
- [API Key 管理 API 文档](../guide/api-key-management-api-guide.md)
- [项目功能增强方案](../spec/project-enhancement-plan.md)
