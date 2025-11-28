# 项目元数据 API 端点说明

本文档列出项目元数据相关的所有 API 端点，包括请求和响应数据结构，供前端开发使用。

## 基础信息

- **Base URL**: `http://localhost:3000` (开发环境)
- **API 版本**: `v1`
- **API 前缀**: `/api/v1`
- **认证方式**: 需要登录认证（Session Token）
- **响应格式**: JSON

## API 端点列表

### 1. 获取项目元数据

**端点**: `GET /api/v1/projects/[projectId]/metadata`

**功能**: 获取指定项目的元数据信息

**认证**: 需要登录认证

**路径参数**:
- `projectId` (String, 必填): 项目ID

**请求示例**:
```bash
GET /api/v1/projects/project_001/metadata
Authorization: Bearer <token>
```

**响应数据结构**:

成功响应（元数据存在）:
```json
{
  "success": true,
  "message": "查询成功",
  "data": {
    "projectId": "project_001",
    "customTitle": "我的自定义标题",
    "notes": "这是项目的备注信息",
    "tags": ["前端", "react", "重要"],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

成功响应（元数据不存在）:
```json
{
  "success": true,
  "message": "查询成功",
  "data": {
    "projectId": "project_001",
    "customTitle": null,
    "notes": null,
    "tags": []
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

错误响应（项目不存在）:
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "项目不存在"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**HTTP 状态码**:
- `200`: 成功
- `404`: 项目不存在

---

### 2. 创建或更新项目元数据

**端点**: `PUT /api/v1/projects/[projectId]/metadata`

**功能**: 创建或更新项目的元数据信息（幂等操作）

**认证**: 需要登录认证

**路径参数**:
- `projectId` (String, 必填): 项目ID

**请求体数据结构**:
```json
{
  "customTitle": "我的自定义标题",
  "notes": "这是项目的备注信息",
  "tags": ["前端", "React", "重要"]
}
```

**请求体字段说明**:

| 字段名 | 类型 | 必填 | 说明 | 限制 |
|--------|------|------|------|------|
| `customTitle` | String | 否 | 自定义标题 | 最大长度 200 字符 |
| `notes` | String | 否 | 备注信息 | 最大长度 5000 字符 |
| `tags` | Array[String] | 否 | 标签列表 | 最多 20 个标签，每个标签最长 50 字符 |

**请求示例**:
```bash
PUT /api/v1/projects/project_001/metadata
Content-Type: application/json
Authorization: Bearer <token>

{
  "customTitle": "我的自定义标题",
  "notes": "这是项目的备注信息",
  "tags": ["前端", "React", "重要"]
}
```

**响应数据结构**:

成功响应:
```json
{
  "success": true,
  "message": "更新成功",
  "data": {
    "projectId": "project_001",
    "customTitle": "我的自定义标题",
    "notes": "这是项目的备注信息",
    "tags": ["前端", "react", "重要"],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

错误响应（验证错误）:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "customTitle 长度不能超过 200 个字符",
    "details": {
      "field": "customTitle",
      "maxLength": 200
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

错误响应（项目不存在）:
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "项目不存在"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**HTTP 状态码**:
- `200`: 成功
- `400`: 验证错误
- `404`: 项目不存在

**业务规则**:
- 如果元数据不存在，则创建新记录
- 如果元数据已存在，则更新现有记录
- 标签自动去重、转换为小写、过滤空字符串
- 支持部分更新（只提供部分字段）

---

### 3. 删除项目元数据

**端点**: `DELETE /api/v1/projects/[projectId]/metadata`

**功能**: 删除项目的元数据信息

**认证**: 需要登录认证

**路径参数**:
- `projectId` (String, 必填): 项目ID

**请求示例**:
```bash
DELETE /api/v1/projects/project_001/metadata
Authorization: Bearer <token>
```

**响应数据结构**:

成功响应:
```json
{
  "success": true,
  "message": "删除成功",
  "data": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

错误响应（项目不存在）:
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "项目不存在"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**HTTP 状态码**:
- `200`: 成功（如果元数据不存在也返回成功，幂等操作）
- `404`: 项目不存在

**业务规则**:
- 如果元数据不存在，返回成功（幂等操作）

---

## 数据模型

### ProjectMetadata 数据结构

```typescript
interface ProjectMetadata {
  projectId: string;           // 项目外部唯一标识（关联 Project.projectId）
  customTitle: string | null;   // 自定义标题，最大长度 200 字符
  notes: string | null;         // 备注信息，最大长度 5000 字符
  tags: string[];               // 标签列表，最多 20 个标签，每个标签最长 50 字符
  createdAt: string;            // 创建时间（ISO 8601 格式）
  updatedAt: string;            // 更新时间（ISO 8601 格式）
}
```

### 字段限制

| 字段 | 限制 |
|------|------|
| `customTitle` | 最大长度 200 字符 |
| `notes` | 最大长度 5000 字符 |
| `tags` | 最多 20 个标签 |
| `tags[]` | 每个标签最长 50 字符 |

### 标签处理规则

1. **自动去重**: 重复的标签会被自动去除
2. **自动转小写**: 所有标签会自动转换为小写
3. **过滤空字符串**: 空字符串和只包含空格的标签会被过滤
4. **长度限制**: 超过 50 字符的标签会被拒绝

---

## 错误码说明

| 错误码 | HTTP 状态码 | 说明 |
|--------|-------------|------|
| `RESOURCE_NOT_FOUND` | 404 | 项目不存在 |
| `VALIDATION_ERROR` | 400 | 数据验证失败 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

---

## 注意事项

1. **数据分离**: 项目元数据存储在独立的集合中，与客户端推送的数据分离
2. **向后兼容**: 元数据字段均为可选字段，不影响现有功能
3. **唯一性**: 一个项目只能有一条元数据记录（通过 `projectId` 唯一索引保证）
4. **标签处理**: 标签会自动去重、转换为小写、过滤空字符串
5. **部分更新**: PUT 接口支持部分更新，只提供需要更新的字段即可

---

## 参考文档

- 详细 API 文档: [doc/guide/project-metadata-api-guide.md](../guide/project-metadata-api-guide.md)
- 项目功能增强方案: [doc/spec/project-enhancement-plan.md](../spec/project-enhancement-plan.md)
