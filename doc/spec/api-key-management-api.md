# TaskEcho API Key 管理接口设计文档

## 1. 概述

### 1.1 文档目的

本文档详细说明 TaskEcho 系统的 API Key 管理接口设计，包括创建、查询、更新、删除 API Key 等接口的规范、认证机制、业务流程和安全考虑。

### 1.2 API Key 功能定位

API Key 是 TaskEcho 系统的**核心认证机制**，用于：

- **外部系统认证**：外部系统通过 API Key 向 TaskEcho 推送数据
- **项目隔离**：支持项目专属 API Key，实现项目级别的数据隔离
- **访问控制**：通过激活/禁用状态控制 API Key 的有效性
- **安全管理**：API Key 值加密存储，前端显示时部分隐藏

### 1.3 核心特性

- **CRUD 操作**：完整的创建、查询、更新、删除功能
- **安全存储**：API Key 值使用单向哈希（bcrypt）存储
- **项目关联**：支持将 API Key 关联到特定项目（可选）
- **状态管理**：支持激活/禁用 API Key
- **本地管理**：单用户本地应用，管理接口无需额外认证

### 1.4 接口分类

| 接口类型 | 接口路径 | 请求方法 | 功能 |
|---------|---------|---------|------|
| **查询接口** | `/api/v1/api-keys` | `GET` | 获取所有 API Key 列表 |
| **查询接口** | `/api/v1/api-keys/:id` | `GET` | 获取单个 API Key 详情 |
| **创建接口** | `/api/v1/api-keys` | `POST` | 创建新的 API Key |
| **更新接口** | `/api/v1/api-keys/:id` | `PUT` | 更新 API Key 信息 |
| **删除接口** | `/api/v1/api-keys/:id` | `DELETE` | 删除 API Key |

---

## 2. 数据库设计

### 2.1 API Key 表结构

**表名**：`api_keys`

**功能说明**：存储 API Key 信息，用于接口认证和项目关联。

**表结构**：

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | 内部自增主键 |
| name | VARCHAR(255) | NOT NULL | API Key 名称/标识 |
| key | VARCHAR(255) | UNIQUE, NOT NULL | API Key 值（哈希存储） |
| project_id | VARCHAR(255) | NULL | 关联的项目ID（可选） |
| is_active | BOOLEAN | NOT NULL, DEFAULT 1 | 是否激活 |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 更新时间 |

**Prisma Schema**：

```prisma
model ApiKey {
  id          Int       @id @default(autoincrement())
  name        String    @db.VarChar(255)             // API Key 名称/标识
  key         String    @unique @db.VarChar(255)     // API Key 值（哈希存储）
  projectId   String?   @db.VarChar(255)             // 关联的项目ID（可选）
  isActive    Boolean   @default(true)               // 是否激活
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@index([key])
  @@index([projectId])
  @@index([isActive])
  @@map("api_keys")
}
```

**字段说明**：

- `id`：内部自增主键
- `name`：API Key 名称/标识，用户自定义，用于管理
- `key`：API Key 值，使用单向哈希（bcrypt）存储，全局唯一
- `projectId`：关联的项目ID（可选），如果设置，则该 API Key 只能用于指定项目
- `isActive`：是否激活，`false` 时该 API Key 无法通过认证
- `createdAt`：创建时间，自动设置
- `updatedAt`：更新时间，自动更新

**索引设计**：

- 主键索引：`id`
- 唯一索引：`key`（确保 API Key 值唯一）
- 普通索引：`projectId`（关联查询）
- 普通索引：`isActive`（激活状态过滤）

**业务规则**：

- API Key 值全局唯一，不允许重复
- API Key 值使用单向哈希（bcrypt）存储，提高安全性
- `projectId` 可选，如果设置，则该 API Key 只能用于指定项目
- `isActive` 为 `false` 时，该 API Key 无法通过认证

---

## 3. 接口规范

### 3.1 获取 API Key 列表

#### 3.1.1 接口基本信息

| 项目 | 说明 |
|------|------|
| **接口路径** | `/api/v1/api-keys` |
| **请求方法** | `GET` |
| **认证要求** | 无需认证（本地管理） |
| **分页支持** | 可选 |

#### 3.1.2 查询参数

| 参数名 | 类型 | 必填 | 说明 | 默认值 | 示例 |
|--------|------|------|------|--------|------|
| `page` | number | 否 | 页码，从 1 开始 | `1` | `1` |
| `pageSize` | number | 否 | 每页数量 | `20` | `20` |
| `is_active` | boolean | 否 | 过滤激活状态 | 无 | `true` |
| `project_id` | string | 否 | 过滤项目ID | 无 | `"project_001"` |

#### 3.1.3 响应格式

**成功响应（200）**：

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
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T00:00:00.000Z"
      },
      {
        "id": 2,
        "name": "通用 API Key",
        "key": "sk-****5678",
        "project_id": null,
        "is_active": true,
        "created_at": "2024-01-02T00:00:00.000Z",
        "updated_at": "2024-01-02T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 2,
      "totalPages": 1
    }
  },
  "message": "查询成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**响应字段说明**：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `data.items[].id` | number | API Key 内部ID |
| `data.items[].name` | string | API Key 名称/标识 |
| `data.items[].key` | string | API Key 值（部分隐藏显示，如 `sk-****1234`） |
| `data.items[].project_id` | string\|null | 关联的项目ID（可选） |
| `data.items[].is_active` | boolean | 是否激活 |
| `data.items[].created_at` | string | 创建时间（ISO 8601 格式） |
| `data.items[].updated_at` | string | 更新时间（ISO 8601 格式） |

**安全说明**：

- API Key 值在响应中只显示部分字符（前 3 个字符 + `****` + 后 4 个字符）
- 例如：`sk-xxxxxxxxxxxxxxxx` → `sk-****1234`
- 确保不会泄露完整的 API Key 值

#### 3.1.4 业务流程

```
前端请求
  ↓
1. 解析查询参数
   ├─ page: 页码（默认 1）
   ├─ pageSize: 每页数量（默认 20）
   ├─ is_active: 激活状态过滤（可选）
   └─ project_id: 项目ID过滤（可选）
  ↓
2. 构建查询条件
   ├─ 如果提供了 is_active，添加状态过滤
   └─ 如果提供了 project_id，添加项目过滤
  ↓
3. 查询 API Key 列表（分页）
   ├─ 使用分页查询（LIMIT + OFFSET）
   └─ 按 createdAt DESC 排序
  ↓
4. 处理 API Key 值显示
   ├─ 对每个 API Key 值进行部分隐藏处理
   └─ 格式：前3字符 + "****" + 后4字符
  ↓
5. 组装响应数据
  ↓
6. 返回成功响应
```

#### 3.1.5 数据库查询逻辑

```javascript
// 1. 构建查询条件
const where = {}

if (isActive !== undefined) {
  where.isActive = isActive === 'true' || isActive === true
}

if (projectId) {
  where.projectId = projectId
}

// 2. 查询 API Key 列表
const [apiKeys, total] = await Promise.all([
  prisma.apiKey.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize
  }),
  prisma.apiKey.count({ where })
])

// 3. 处理 API Key 值显示（部分隐藏）
const apiKeysFormatted = apiKeys.map(apiKey => ({
  id: apiKey.id,
  name: apiKey.name,
  key: maskApiKey(apiKey.key),  // 部分隐藏处理
  project_id: apiKey.projectId,
  is_active: apiKey.isActive,
  created_at: apiKey.createdAt.toISOString(),
  updated_at: apiKey.updatedAt.toISOString()
}))

// 4. API Key 值部分隐藏函数
function maskApiKey(key) {
  // 注意：这里 key 是哈希值，我们需要存储原始值的前后部分
  // 实际实现中，应该在创建时保存原始值的前后部分
  // 或者从哈希值中提取部分信息
  if (key.length <= 7) {
    return '****'
  }
  const prefix = key.substring(0, 3)
  const suffix = key.substring(key.length - 4)
  return `${prefix}****${suffix}`
}
```

**注意**：由于 API Key 值使用 bcrypt 哈希存储，无法从哈希值中还原原始值。实际实现中，可以考虑：

1. **方案一**：在创建时保存原始值的前后部分到单独字段
2. **方案二**：使用加密存储（AES-256），可以解密后显示部分字符
3. **方案三**：前端显示时使用固定格式（如 `sk-****` + 后4位ID）

#### 3.1.6 实现示例

```javascript
// GET /api/v1/api-keys
export async function GET(request) {
  try {
    // 1. 解析查询参数
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100)
    const isActive = searchParams.get('is_active')
    const projectId = searchParams.get('project_id')?.trim()
    
    // 2. 验证参数
    if (page < 1 || pageSize < 1) {
      return createErrorResponse(
        '页码和每页数量必须大于 0',
        'VALIDATION_ERROR',
        400
      )
    }
    
    // 3. 构建查询条件
    const where = {}
    
    if (isActive !== undefined && isActive !== null) {
      where.isActive = isActive === 'true' || isActive === true
    }
    
    if (projectId) {
      where.projectId = projectId
    }
    
    // 4. 查询 API Key 列表
    const [apiKeys, total] = await Promise.all([
      prisma.apiKey.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.apiKey.count({ where })
    ])
    
    // 5. 处理 API Key 值显示（部分隐藏）
    const apiKeysFormatted = apiKeys.map(apiKey => ({
      id: apiKey.id,
      name: apiKey.name,
      key: maskApiKey(apiKey.id),  // 使用ID生成显示格式
      project_id: apiKey.projectId,
      is_active: apiKey.isActive,
      created_at: apiKey.createdAt.toISOString(),
      updated_at: apiKey.updatedAt.toISOString()
    }))
    
    // 6. 返回成功响应
    return createPaginatedResponse(
      apiKeysFormatted,
      {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      },
      '查询成功'
    )
    
  } catch (error) {
    return handleError(error)
  }
}

// API Key 值部分隐藏函数
function maskApiKey(id) {
  // 使用ID生成显示格式：sk-**** + 后4位ID
  const suffix = String(id).padStart(4, '0').slice(-4)
  return `sk-****${suffix}`
}
```

---

### 3.2 获取单个 API Key 详情

#### 3.2.1 接口基本信息

| 项目 | 说明 |
|------|------|
| **接口路径** | `/api/v1/api-keys/:id` |
| **请求方法** | `GET` |
| **认证要求** | 无需认证 |
| **路径参数** | `id`（API Key 内部ID） |

#### 3.2.2 路径参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `id` | number | 是 | API Key 内部ID | `1` |

#### 3.2.3 响应格式

**成功响应（200）**：

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "项目1 API Key",
    "key": "sk-****1234",
    "project_id": "project_001",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "查询成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**API Key 不存在（404）**：

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "API Key 不存在",
    "details": {
      "id": 1
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 3.2.4 业务流程

```
前端请求
  ↓
1. 解析路径参数
   └─ id: API Key 内部ID
  ↓
2. 查询 API Key
   └─ 根据 id 查找 API Key
  ↓
3. 验证 API Key 是否存在
   ├─ 如果不存在 → 返回 404 错误
   └─ 如果存在 → 继续处理
  ↓
4. 处理 API Key 值显示（部分隐藏）
  ↓
5. 组装响应数据
  ↓
6. 返回成功响应
```

#### 3.2.5 实现示例

```javascript
// GET /api/v1/api-keys/:id
export async function GET(request, { params }) {
  try {
    // 1. 解析路径参数
    const { id } = await params
    const apiKeyId = parseInt(id, 10)
    
    if (isNaN(apiKeyId)) {
      return createErrorResponse(
        'API Key ID 无效',
        'VALIDATION_ERROR',
        400
      )
    }
    
    // 2. 查询 API Key
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: apiKeyId }
    })
    
    if (!apiKey) {
      return createErrorResponse(
        'API Key 不存在',
        'RESOURCE_NOT_FOUND',
        404,
        { id: apiKeyId }
      )
    }
    
    // 3. 处理 API Key 值显示（部分隐藏）
    const apiKeyFormatted = {
      id: apiKey.id,
      name: apiKey.name,
      key: maskApiKey(apiKey.id),
      project_id: apiKey.projectId,
      is_active: apiKey.isActive,
      created_at: apiKey.createdAt.toISOString(),
      updated_at: apiKey.updatedAt.toISOString()
    }
    
    // 4. 返回成功响应
    return createSuccessResponse(apiKeyFormatted, '查询成功')
    
  } catch (error) {
    return handleError(error)
  }
}
```

---

### 3.3 创建 API Key

#### 3.3.1 接口基本信息

| 项目 | 说明 |
|------|------|
| **接口路径** | `/api/v1/api-keys` |
| **请求方法** | `POST` |
| **认证要求** | 无需认证 |
| **Content-Type** | `application/json` |

#### 3.3.2 请求体

```json
{
  "name": "项目1 API Key",
  "key": "sk-xxxxxxxxxxxxxxxx",
  "project_id": "project_001"
}
```

**请求参数说明**：

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `name` | string | 是 | API Key 名称/标识 | `"项目1 API Key"` |
| `key` | string | 是 | API Key 值（原始值） | `"sk-xxxxxxxxxxxxxxxx"` |
| `project_id` | string | 否 | 关联的项目ID（可选） | `"project_001"` |

#### 3.3.3 响应格式

**成功响应（201）**：

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "项目1 API Key",
    "key": "sk-****1234",
    "project_id": "project_001",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "API Key 创建成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**错误响应（400）**：

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": {
      "field": "key",
      "reason": "API Key 值已存在"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 3.3.4 业务流程

```
前端请求
  ↓
1. 解析请求体
   ├─ name: API Key 名称
   ├─ key: API Key 值（原始值）
   └─ project_id: 关联的项目ID（可选）
  ↓
2. 验证请求数据
   ├─ 验证必填字段（name, key）
   ├─ 验证字段格式
   └─ 验证业务规则（key 是否已存在）
  ↓
3. 验证项目是否存在（如果提供了 project_id）
   ├─ 如果项目不存在 → 返回 400 错误
   └─ 如果项目存在或未提供 → 继续处理
  ↓
4. 哈希存储 API Key 值
   ├─ 使用 bcrypt 对 key 进行哈希
   └─ 存储哈希值到数据库
  ↓
5. 创建 API Key 记录
   ├─ name: 用户提供的名称
   ├─ key: 哈希后的值
   ├─ projectId: 关联的项目ID（可选）
   └─ isActive: 默认 true
  ↓
6. 处理 API Key 值显示（部分隐藏）
  ↓
7. 返回成功响应（不返回原始 key 值）
```

#### 3.3.5 数据验证规则

**必填字段验证**：

- `name`：不能为空，长度 1-255 字符
- `key`：不能为空，长度 1-255 字符

**格式验证**：

- `name`：字符串，不能包含特殊字符（可选限制）
- `key`：字符串，建议格式为 `sk-` 开头（可选）
- `project_id`：字符串，如果提供，必须是有效的项目ID

**业务规则验证**：

- `key` 值不能与现有 API Key 重复（需要先查询数据库）
- 如果提供了 `project_id`，必须验证项目是否存在

#### 3.3.6 实现示例

```javascript
// POST /api/v1/api-keys
export async function POST(request) {
  try {
    // 1. 解析请求体
    const data = await request.json()
    const { name, key, project_id } = data
    
    // 2. 验证必填字段
    if (!name || !name.trim()) {
      return createErrorResponse(
        'API Key 名称不能为空',
        'VALIDATION_ERROR',
        400,
        { field: 'name' }
      )
    }
    
    if (!key || !key.trim()) {
      return createErrorResponse(
        'API Key 值不能为空',
        'VALIDATION_ERROR',
        400,
        { field: 'key' }
      )
    }
    
    // 3. 验证字段格式
    if (name.length > 255) {
      return createErrorResponse(
        'API Key 名称长度不能超过 255 字符',
        'VALIDATION_ERROR',
        400,
        { field: 'name' }
      )
    }
    
    if (key.length > 255) {
      return createErrorResponse(
        'API Key 值长度不能超过 255 字符',
        'VALIDATION_ERROR',
        400,
        { field: 'key' }
      )
    }
    
    // 4. 验证项目是否存在（如果提供了 project_id）
    if (project_id) {
      const project = await prisma.project.findUnique({
        where: { projectId: project_id }
      })
      
      if (!project) {
        return createErrorResponse(
          '关联的项目不存在',
          'VALIDATION_ERROR',
          400,
          { field: 'project_id', project_id }
        )
      }
    }
    
    // 5. 检查 API Key 值是否已存在（需要比对所有现有 key 的哈希值）
    const existingKeys = await prisma.apiKey.findMany({
      where: { isActive: true }
    })
    
    for (const existingKey of existingKeys) {
      const isValid = await bcrypt.compare(key, existingKey.key)
      if (isValid) {
        return createErrorResponse(
          'API Key 值已存在',
          'VALIDATION_ERROR',
          400,
          { field: 'key' }
        )
      }
    }
    
    // 6. 哈希存储 API Key 值
    const hashedKey = await bcrypt.hash(key, 10)
    
    // 7. 创建 API Key 记录
    const apiKey = await prisma.apiKey.create({
      data: {
        name: name.trim(),
        key: hashedKey,
        projectId: project_id || null,
        isActive: true
      }
    })
    
    // 8. 处理 API Key 值显示（部分隐藏）
    const apiKeyFormatted = {
      id: apiKey.id,
      name: apiKey.name,
      key: maskApiKey(apiKey.id),
      project_id: apiKey.projectId,
      is_active: apiKey.isActive,
      created_at: apiKey.createdAt.toISOString()
    }
    
    // 9. 返回成功响应
    return createSuccessResponse(
      apiKeyFormatted,
      'API Key 创建成功',
      201
    )
    
  } catch (error) {
    // 处理数据库唯一约束错误
    if (error.code === 'P2002') {
      return createErrorResponse(
        'API Key 值已存在',
        'VALIDATION_ERROR',
        400,
        { field: 'key' }
      )
    }
    
    return handleError(error)
  }
}
```

**性能优化建议**：

- 检查 API Key 是否已存在时，可以考虑先查询数据库是否有相同的哈希值（虽然概率很低）
- 或者使用唯一约束让数据库自动处理重复问题

---

### 3.4 更新 API Key

#### 3.4.1 接口基本信息

| 项目 | 说明 |
|------|------|
| **接口路径** | `/api/v1/api-keys/:id` |
| **请求方法** | `PUT` |
| **认证要求** | 无需认证 |
| **Content-Type** | `application/json` |
| **路径参数** | `id`（API Key 内部ID） |

#### 3.4.2 路径参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `id` | number | 是 | API Key 内部ID | `1` |

#### 3.4.3 请求体

```json
{
  "name": "更新后的名称",
  "project_id": "project_002",
  "is_active": true
}
```

**请求参数说明**：

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `name` | string | 否 | API Key 名称/标识 | `"更新后的名称"` |
| `project_id` | string | 否 | 关联的项目ID（设置为 `null` 可取消关联） | `"project_002"` |
| `is_active` | boolean | 否 | 是否激活 | `true` |

**注意**：

- API Key 值（`key`）**不支持更新**，如需更换 key，应删除旧 key 并创建新 key
- 所有字段都是可选的，只更新提供的字段

#### 3.4.4 响应格式

**成功响应（200）**：

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "更新后的名称",
    "key": "sk-****1234",
    "project_id": "project_002",
    "is_active": true,
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "API Key 更新成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**API Key 不存在（404）**：

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "API Key 不存在",
    "details": {
      "id": 1
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 3.4.5 业务流程

```
前端请求
  ↓
1. 解析路径参数和请求体
   ├─ id: API Key 内部ID
   ├─ name: API Key 名称（可选）
   ├─ project_id: 关联的项目ID（可选）
   └─ is_active: 是否激活（可选）
  ↓
2. 验证路径参数
   └─ id 必须是有效的数字
  ↓
3. 查询 API Key
   └─ 根据 id 查找 API Key
  ↓
4. 验证 API Key 是否存在
   ├─ 如果不存在 → 返回 404 错误
   └─ 如果存在 → 继续处理
  ↓
5. 验证请求数据
   ├─ 如果提供了 name，验证格式
   ├─ 如果提供了 project_id，验证项目是否存在
   └─ 如果提供了 is_active，验证格式
  ↓
6. 构建更新数据对象
   ├─ 只包含提供的字段
   └─ 如果 project_id 为 null，设置为 null
  ↓
7. 更新 API Key 记录
  ↓
8. 处理 API Key 值显示（部分隐藏）
  ↓
9. 返回成功响应
```

#### 3.4.6 实现示例

```javascript
// PUT /api/v1/api-keys/:id
export async function PUT(request, { params }) {
  try {
    // 1. 解析路径参数
    const { id } = await params
    const apiKeyId = parseInt(id, 10)
    
    if (isNaN(apiKeyId)) {
      return createErrorResponse(
        'API Key ID 无效',
        'VALIDATION_ERROR',
        400
      )
    }
    
    // 2. 解析请求体
    const data = await request.json()
    const { name, project_id, is_active } = data
    
    // 3. 查询 API Key
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: apiKeyId }
    })
    
    if (!apiKey) {
      return createErrorResponse(
        'API Key 不存在',
        'RESOURCE_NOT_FOUND',
        404,
        { id: apiKeyId }
      )
    }
    
    // 4. 构建更新数据对象
    const updateData = {}
    
    if (name !== undefined) {
      if (!name || !name.trim()) {
        return createErrorResponse(
          'API Key 名称不能为空',
          'VALIDATION_ERROR',
          400,
          { field: 'name' }
        )
      }
      if (name.length > 255) {
        return createErrorResponse(
          'API Key 名称长度不能超过 255 字符',
          'VALIDATION_ERROR',
          400,
          { field: 'name' }
        )
      }
      updateData.name = name.trim()
    }
    
    if (project_id !== undefined) {
      if (project_id === null || project_id === '') {
        updateData.projectId = null
      } else {
        // 验证项目是否存在
        const project = await prisma.project.findUnique({
          where: { projectId: project_id }
        })
        
        if (!project) {
          return createErrorResponse(
            '关联的项目不存在',
            'VALIDATION_ERROR',
            400,
            { field: 'project_id', project_id }
          )
        }
        updateData.projectId = project_id
      }
    }
    
    if (is_active !== undefined) {
      if (typeof is_active !== 'boolean') {
        return createErrorResponse(
          'is_active 必须是布尔值',
          'VALIDATION_ERROR',
          400,
          { field: 'is_active' }
        )
      }
      updateData.isActive = is_active
    }
    
    // 5. 如果没有提供任何更新字段
    if (Object.keys(updateData).length === 0) {
      return createErrorResponse(
        '请提供至少一个更新字段',
        'VALIDATION_ERROR',
        400
      )
    }
    
    // 6. 更新 API Key 记录
    const updatedApiKey = await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: updateData
    })
    
    // 7. 处理 API Key 值显示（部分隐藏）
    const apiKeyFormatted = {
      id: updatedApiKey.id,
      name: updatedApiKey.name,
      key: maskApiKey(updatedApiKey.id),
      project_id: updatedApiKey.projectId,
      is_active: updatedApiKey.isActive,
      created_at: updatedApiKey.createdAt.toISOString(),
      updated_at: updatedApiKey.updatedAt.toISOString()
    }
    
    // 8. 返回成功响应
    return createSuccessResponse(
      apiKeyFormatted,
      'API Key 更新成功'
    )
    
  } catch (error) {
    return handleError(error)
  }
}
```

---

### 3.5 删除 API Key

#### 3.5.1 接口基本信息

| 项目 | 说明 |
|------|------|
| **接口路径** | `/api/v1/api-keys/:id` |
| **请求方法** | `DELETE` |
| **认证要求** | 无需认证 |
| **路径参数** | `id`（API Key 内部ID） |

#### 3.5.2 路径参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `id` | number | 是 | API Key 内部ID | `1` |

#### 3.5.3 响应格式

**成功响应（200）**：

```json
{
  "success": true,
  "data": {
    "id": 1
  },
  "message": "API Key 删除成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**API Key 不存在（404）**：

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "API Key 不存在",
    "details": {
      "id": 1
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 3.5.4 业务流程

```
前端请求
  ↓
1. 解析路径参数
   └─ id: API Key 内部ID
  ↓
2. 验证路径参数
   └─ id 必须是有效的数字
  ↓
3. 查询 API Key
   └─ 根据 id 查找 API Key
  ↓
4. 验证 API Key 是否存在
   ├─ 如果不存在 → 返回 404 错误
   └─ 如果存在 → 继续处理
  ↓
5. 删除 API Key 记录
   └─ 硬删除（永久删除）
  ↓
6. 返回成功响应
```

#### 3.5.5 实现示例

```javascript
// DELETE /api/v1/api-keys/:id
export async function DELETE(request, { params }) {
  try {
    // 1. 解析路径参数
    const { id } = await params
    const apiKeyId = parseInt(id, 10)
    
    if (isNaN(apiKeyId)) {
      return createErrorResponse(
        'API Key ID 无效',
        'VALIDATION_ERROR',
        400
      )
    }
    
    // 2. 查询 API Key
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: apiKeyId }
    })
    
    if (!apiKey) {
      return createErrorResponse(
        'API Key 不存在',
        'RESOURCE_NOT_FOUND',
        404,
        { id: apiKeyId }
      )
    }
    
    // 3. 删除 API Key 记录
    await prisma.apiKey.delete({
      where: { id: apiKeyId }
    })
    
    // 4. 返回成功响应
    return createSuccessResponse(
      { id: apiKeyId },
      'API Key 删除成功'
    )
    
  } catch (error) {
    return handleError(error)
  }
}
```

**安全考虑**：

- 删除操作是**硬删除**（永久删除），无法恢复
- 删除后，使用该 API Key 的请求将无法通过认证
- 建议在前端添加确认对话框，防止误删

---

## 4. API Key 认证机制

### 4.1 认证流程

API Key 认证用于保护数据提交接口（如 `POST /api/v1/submit`），认证流程如下：

```
外部系统请求
  ↓
1. 从请求头提取 API Key
   Header: X-API-Key: <api_key_value>
  ↓
2. 验证 API Key 是否存在
   ├─ 查询数据库中的所有激活的 API Key
   └─ 使用 bcrypt.compare 比对哈希值
  ↓
3. 验证 API Key 状态
   ├─ 检查 is_active 是否为 true
   └─ 如果为 false → 返回 401 错误
  ↓
4. 验证项目关联（如果 API Key 关联了项目）
   ├─ 如果 API Key 关联了 project_id
   ├─ 验证请求中的 project_id 是否匹配
   └─ 如果不匹配 → 返回 401 错误
  ↓
5. 认证通过，继续处理请求
```

### 4.2 认证中间件实现

```javascript
// 认证中间件
async function authenticateApiKey(request) {
  // 1. 从请求头提取 API Key
  const apiKey = request.headers.get('X-API-Key')
  
  if (!apiKey) {
    throw new Error('缺少 API Key')
  }
  
  // 2. 查询所有激活的 API Key
  const keyRecords = await prisma.apiKey.findMany({
    where: { isActive: true }
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
    // 注意：这里需要先读取请求体，但可能会消耗请求流
    // 实际实现中，可以考虑在业务逻辑中验证
    const requestData = await request.json()
    if (requestData.project_id !== validKey.projectId) {
      throw new Error('API Key 只能用于指定项目')
    }
  }
  
  return validKey
}

// 使用示例（在 API 路由中）
export async function POST(request) {
  try {
    // 1. 认证 API Key
    const apiKey = await authenticateApiKey(request)
    
    // 2. 处理业务逻辑
    const data = await request.json()
    // ...
    
  } catch (error) {
    if (error.message === '缺少 API Key' || 
        error.message === '无效的 API Key' ||
        error.message === 'API Key 只能用于指定项目') {
      return createErrorResponse(
        error.message,
        'INVALID_API_KEY',
        401
      )
    }
    return handleError(error)
  }
}
```

### 4.3 认证错误响应

**缺少 API Key（401）**：

```json
{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "缺少 API Key",
    "details": {}
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**无效的 API Key（401）**：

```json
{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "无效的 API Key",
    "details": {}
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**API Key 未激活（401）**：

```json
{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "API Key 未激活",
    "details": {}
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**项目不匹配（401）**：

```json
{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "API Key 只能用于指定项目",
    "details": {
      "project_id": "project_001"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 5. 安全考虑

### 5.1 API Key 存储安全

**推荐方案**：使用单向哈希（bcrypt）

```javascript
// 存储时
const bcrypt = require('bcrypt')
const hashedKey = await bcrypt.hash(apiKey, 10)

// 验证时
const isValid = await bcrypt.compare(apiKey, hashedKey)
```

**优势**：

- 单向哈希，无法还原原始值
- 即使数据库泄露，也无法获取原始 API Key
- bcrypt 自动处理盐值，提高安全性

**备选方案**：使用加密（AES-256）

```javascript
// 存储时
const crypto = require('crypto')
const algorithm = 'aes-256-cbc'
const secretKey = process.env.ENCRYPTION_KEY  // 32 字节密钥
const iv = crypto.randomBytes(16)

const cipher = crypto.createCipheriv(algorithm, secretKey, iv)
const encrypted = Buffer.concat([cipher.update(apiKey), cipher.final()])

// 存储 encrypted.toString('hex') 和 iv.toString('hex')

// 验证时
const decipher = crypto.createDecipheriv(algorithm, secretKey, Buffer.from(iv, 'hex'))
const decrypted = Buffer.concat([decipher.update(Buffer.from(encrypted, 'hex')), decipher.final()])
const isValid = decrypted.toString() === apiKey
```

**优势**：

- 可以还原原始值（用于显示部分字符）
- 适合需要显示部分 API Key 的场景

**建议**：

- 优先使用 bcrypt 单向哈希
- 如果需要显示部分字符，可以考虑在创建时保存前后部分到单独字段

### 5.2 API Key 显示安全

**部分隐藏策略**：

- 前端显示时，只显示部分字符
- 格式：`sk-****1234`（前3字符 + `****` + 后4字符）
- 确保不会泄露完整的 API Key 值

**实现方式**：

```javascript
function maskApiKey(id) {
  // 使用ID生成显示格式
  const suffix = String(id).padStart(4, '0').slice(-4)
  return `sk-****${suffix}`
}
```

### 5.3 请求安全

**请求头要求**：

- API Key 必须通过请求头传递：`X-API-Key: <api_key_value>`
- 不要在 URL 参数或请求体中传递 API Key（避免日志记录）

**HTTPS 建议**：

- 生产环境建议使用 HTTPS，确保 API Key 传输安全
- 本地开发环境可以使用 HTTP

### 5.4 访问控制

**项目隔离**：

- 支持项目专属 API Key（`project_id` 不为空）
- 项目专属 API Key 只能用于指定项目的数据提交
- 通用 API Key（`project_id` 为空）可以用于所有项目

**状态控制**：

- 通过 `is_active` 字段控制 API Key 的有效性
- 禁用 API Key 后，立即无法通过认证
- 无需删除 API Key，只需设置为 `is_active = false`

---

## 6. 错误处理

### 6.1 错误码定义

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `INVALID_API_KEY` | 401 | API Key 无效或缺失 |
| `RESOURCE_NOT_FOUND` | 404 | API Key 不存在 |
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 |
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

#### 6.3.1 API Key 不存在

**场景**：查询、更新、删除不存在的 API Key

**处理**：
- 返回 404 错误
- 错误码：`RESOURCE_NOT_FOUND`
- 在 `details` 中提供 API Key ID

#### 6.3.2 参数验证失败

**场景**：请求参数格式不正确或不符合业务规则

**处理**：
- 返回 400 错误
- 错误码：`VALIDATION_ERROR`
- 在 `details` 中提供字段和原因

#### 6.3.3 API Key 值重复

**场景**：创建 API Key 时，提供的 key 值已存在

**处理**：
- 返回 400 错误
- 错误码：`VALIDATION_ERROR`
- 在 `details` 中提供字段信息

#### 6.3.4 项目不存在

**场景**：创建或更新 API Key 时，提供的 `project_id` 不存在

**处理**：
- 返回 400 错误
- 错误码：`VALIDATION_ERROR`
- 在 `details` 中提供 `project_id` 信息

---

## 7. 性能优化建议

### 7.1 查询优化

1. **使用索引**：确保常用查询字段都建立了索引
   - `api_keys.key`（唯一索引）
   - `api_keys.projectId`（关联查询）
   - `api_keys.isActive`（状态过滤）

2. **分页查询**：列表接口使用分页，避免一次性加载大量数据

3. **字段选择**：使用 `select` 只查询需要的字段

### 7.2 认证优化

1. **API Key 缓存**：活跃的 API Key 可以缓存，减少数据库查询
   - 缓存时间：5-10 分钟
   - 缓存失效：API Key 更新或删除时立即失效

2. **批量验证**：如果可能，批量验证多个 API Key

3. **早期返回**：如果 API Key 未激活，早期返回错误，避免不必要的哈希比对

### 7.3 哈希比对优化

1. **早期退出**：找到匹配的 API Key 后立即退出循环

2. **并行比对**：如果 API Key 数量很多，可以考虑并行比对（但要注意性能）

3. **索引优化**：虽然无法直接索引哈希值，但可以通过其他方式优化查询

---

## 8. 使用示例

### 8.1 创建 API Key

**请求**：

```bash
curl -X POST http://localhost:3000/api/v1/api-keys \
  -H "Content-Type: application/json" \
  -d '{
    "name": "项目1 API Key",
    "key": "sk-xxxxxxxxxxxxxxxx",
    "project_id": "project_001"
  }'
```

**响应**：

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "项目1 API Key",
    "key": "sk-****0001",
    "project_id": "project_001",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "API Key 创建成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 8.2 查询 API Key 列表

**请求**：

```bash
curl http://localhost:3000/api/v1/api-keys?page=1&pageSize=20
```

**响应**：

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "name": "项目1 API Key",
        "key": "sk-****0001",
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

### 8.3 更新 API Key

**请求**：

```bash
curl -X PUT http://localhost:3000/api/v1/api-keys/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "更新后的名称",
    "is_active": false
  }'
```

**响应**：

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "更新后的名称",
    "key": "sk-****0001",
    "project_id": "project_001",
    "is_active": false,
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "API Key 更新成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 8.4 删除 API Key

**请求**：

```bash
curl -X DELETE http://localhost:3000/api/v1/api-keys/1
```

**响应**：

```json
{
  "success": true,
  "data": {
    "id": 1
  },
  "message": "API Key 删除成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 8.5 使用 API Key 认证

**请求**（提交数据）：

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

---

## 9. 总结

本文档详细说明了 TaskEcho 系统的 API Key 管理接口设计，包括：

1. **完整的 CRUD 接口**：
   - `GET /api/v1/api-keys` - 获取 API Key 列表
   - `GET /api/v1/api-keys/:id` - 获取单个 API Key 详情
   - `POST /api/v1/api-keys` - 创建 API Key
   - `PUT /api/v1/api-keys/:id` - 更新 API Key
   - `DELETE /api/v1/api-keys/:id` - 删除 API Key

2. **认证机制**：
   - API Key 通过请求头 `X-API-Key` 传递
   - 使用 bcrypt 单向哈希存储
   - 支持项目专属 API Key
   - 支持激活/禁用状态控制

3. **安全考虑**：
   - API Key 值加密/哈希存储
   - 前端显示时部分隐藏
   - 项目隔离和访问控制
   - 请求安全建议

4. **业务流程**：
   - 完整的创建、查询、更新、删除流程
   - 数据验证和错误处理
   - 性能优化建议

5. **数据库设计**：
   - API Key 表结构
   - 索引设计
   - 业务规则

所有接口遵循 RESTful 设计规范，使用统一的响应格式，确保系统的一致性和可维护性。API Key 管理功能为 TaskEcho 系统提供了安全、灵活的认证机制，支持项目级别的数据隔离和访问控制。
