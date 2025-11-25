# TaskEcho API Key 管理接口说明文档

本文档详细说明 TaskEcho 系统的 API Key 管理接口，包括所有端点的请求和响应数据结构，供前端开发使用。

## 基础信息

- **Base URL**: `http://localhost:3000` (开发环境)
- **API 版本**: `v1`
- **API 前缀**: `/api/v1/api-keys`
- **认证要求**: 无需认证（本地管理）
- **响应格式**: JSON

## 统一响应格式

### 成功响应

```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
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
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## API 端点列表

### 1. GET /api/v1/api-keys

获取 API Key 列表。

**请求方法**: `GET`

**认证要求**: 不需要

**查询参数**:

| 参数名 | 类型 | 必填 | 说明 | 默认值 | 示例 |
|--------|------|------|------|--------|------|
| `page` | number | 否 | 页码，从 1 开始 | `1` | `1` |
| `pageSize` | number | 否 | 每页数量 | `20` | `20` |
| `is_active` | boolean | 否 | 过滤激活状态 | 无 | `true` |
| `project_id` | string | 否 | 过滤项目ID | 无 | `"project_001"` |

**请求示例**:
```bash
GET /api/v1/api-keys?page=1&pageSize=20
GET /api/v1/api-keys?is_active=true
GET /api/v1/api-keys?project_id=project_001
```

**成功响应** (200):
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
      },
      {
        "id": "507f1f77bcf86cd799439012",
        "name": "通用 API Key",
        "key": "sk-****a012",
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

**响应字段说明**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `data.items` | array | API Key 列表数组 |
| `data.items[].id` | string | API Key 内部ID（MongoDB ObjectId） |
| `data.items[].name` | string | API Key 名称/标识 |
| `data.items[].key` | string | API Key 值（部分隐藏格式，如 `sk-****a011`） |
| `data.items[].project_id` | string \| null | 关联的项目ID，`null` 表示未关联 |
| `data.items[].is_active` | boolean | 是否激活 |
| `data.items[].created_at` | string | 创建时间（ISO 8601 格式） |
| `data.items[].updated_at` | string | 更新时间（ISO 8601 格式） |
| `data.pagination.page` | number | 当前页码 |
| `data.pagination.pageSize` | number | 每页数量 |
| `data.pagination.total` | number | 总记录数 |
| `data.pagination.totalPages` | number | 总页数 |

**错误响应** (400):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "页码和每页数量必须大于 0",
    "details": {}
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### 2. GET /api/v1/api-keys/:id

获取单个 API Key 详情。

**请求方法**: `GET`

**认证要求**: 不需要

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `id` | string | 是 | API Key 内部ID（MongoDB ObjectId） | `"507f1f77bcf86cd799439011"` |

**请求示例**:
```bash
GET /api/v1/api-keys/507f1f77bcf86cd799439011
```

**成功响应** (200):
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

**错误响应** (400 - ID 格式无效):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "API Key ID 格式无效",
    "details": {}
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**错误响应** (404 - 资源不存在):
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

---

### 3. POST /api/v1/api-keys

创建新的 API Key。

**请求方法**: `POST`

**认证要求**: 不需要

**请求头**:
```
Content-Type: application/json
```

**请求体**:
```json
{
  "name": "项目1 API Key",
  "key": "sk-xxxxxxxxxxxxxxxx",
  "project_id": "project_001"
}
```

**请求参数说明**:

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `name` | string | 是 | API Key 名称/标识，1-255 字符，不能为空或仅空格 | `"项目1 API Key"` |
| `key` | string | 是 | API Key 值（原始值），1-255 字符，不能为空或仅空格 | `"sk-xxxxxxxxxxxxxxxx"` |
| `project_id` | string \| null | 否 | 关联的项目ID，`null` 或不传表示不关联 | `"project_001"` |

**请求示例**:
```bash
curl -X POST http://localhost:3000/api/v1/api-keys \
  -H "Content-Type: application/json" \
  -d '{
    "name": "项目1 API Key",
    "key": "sk-xxxxxxxxxxxxxxxx",
    "project_id": "project_001"
  }'
```

**成功响应** (201):
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

**注意**: 响应中的 `key` 字段是部分隐藏格式（`sk-****` + 后4位ID），不会返回原始 Key 值。

**错误响应** (400 - 验证失败):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "API Key 名称不能为空",
    "details": {
      "field": "name"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**错误响应** (400 - Key 值已存在):
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

**错误响应** (400 - 项目不存在):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "关联的项目不存在",
    "details": {
      "field": "project_id",
      "project_id": "project_001"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### 4. PUT /api/v1/api-keys/:id

更新 API Key 信息。

**请求方法**: `PUT`

**认证要求**: 不需要

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `id` | string | 是 | API Key 内部ID | `"507f1f77bcf86cd799439011"` |

**请求头**:
```
Content-Type: application/json
```

**请求体**:
```json
{
  "name": "更新后的名称",
  "project_id": "project_002",
  "is_active": true
}
```

**请求参数说明**:

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `name` | string | 否 | API Key 名称，1-255 字符，不能为空或仅空格 | `"更新后的名称"` |
| `project_id` | string \| null | 否 | 关联的项目ID，设置为 `null` 或空字符串可取消关联 | `"project_002"` 或 `null` |
| `is_active` | boolean | 否 | 是否激活 | `true` |

**注意**: 
- API Key 值（`key`）不支持更新，如需更换 key，应删除旧 key 并创建新 key
- 至少需要提供一个更新字段

**请求示例**:
```bash
curl -X PUT http://localhost:3000/api/v1/api-keys/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "更新后的名称",
    "project_id": "project_002",
    "is_active": true
  }'
```

**成功响应** (200):
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
    "updated_at": "2024-01-01T12:00:00.000Z"
  },
  "message": "API Key 更新成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**错误响应** (400 - 验证失败):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "API Key 名称长度不能超过 255 字符",
    "details": {
      "field": "name"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**错误响应** (400 - 未提供更新字段):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请提供至少一个更新字段",
    "details": {}
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**错误响应** (404 - 资源不存在):
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

---

### 5. DELETE /api/v1/api-keys/:id

删除 API Key。

**请求方法**: `DELETE`

**认证要求**: 不需要

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `id` | string | 是 | API Key 内部ID | `"507f1f77bcf86cd799439011"` |

**请求示例**:
```bash
curl -X DELETE http://localhost:3000/api/v1/api-keys/507f1f77bcf86cd799439011
```

**成功响应** (200):
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

**错误响应** (400 - ID 格式无效):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "API Key ID 格式无效",
    "details": {}
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**错误响应** (404 - 资源不存在):
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

---

## 错误码说明

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 |
| `RESOURCE_NOT_FOUND` | 404 | API Key 不存在 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

## 重要说明

1. **API Key 存储**: API Key 值使用 bcrypt 单向哈希存储，无法还原原始值
2. **API Key 显示**: 前端显示时只显示部分字符（`sk-****` + 后4位ID），确保不会泄露完整的 API Key 值
3. **项目隔离**: 支持项目专属 API Key（`project_id` 不为空），项目专属 API Key 只能用于指定项目的数据提交
4. **状态控制**: 通过 `is_active` 字段控制 API Key 的有效性，禁用后立即无法通过认证
5. **本地管理**: API Key 管理接口无需认证，因为这是单用户本地应用的管理功能

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

### 获取单个 API Key 详情

```bash
curl http://localhost:3000/api/v1/api-keys/507f1f77bcf86cd799439011
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
