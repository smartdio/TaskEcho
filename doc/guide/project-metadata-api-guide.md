# 项目元数据 API 接口说明文档

本文档说明项目元数据（ProjectMetadata）相关的 API 接口，供前端开发使用。

## 基础信息

- **Base URL**: `http://localhost:3000` (开发环境)
- **API 版本**: `v1`
- **API 前缀**: `/api/v1`
- **认证方式**: 需要登录认证（Session）
- **响应格式**: JSON

## 数据模型

### ProjectMetadata 模型

项目元数据模型用于存储用户自定义的项目信息，与 `Project` 集合通过 `projectId` 关联。

**字段说明**：

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `projectId` | String | 是 | 项目外部唯一标识（关联 Project.projectId） | `"project_001"` |
| `customTitle` | String | 否 | 自定义标题，最大长度 200 字符 | `"我的自定义标题"` |
| `notes` | String | 否 | 备注信息，最大长度 5000 字符 | `"这是项目的备注信息"` |
| `tags` | Array[String] | 否 | 标签列表，最多 20 个标签，每个标签最长 50 字符 | `["前端", "React", "重要"]` |
| `createdAt` | Date | 自动 | 创建时间 | `"2024-01-01T00:00:00.000Z"` |
| `updatedAt` | Date | 自动 | 更新时间 | `"2024-01-01T12:00:00.000Z"` |

**业务规则**：
- 一个项目只能有一条元数据记录（通过 `projectId` 唯一索引保证）
- 标签自动去重、转换为小写、过滤空字符串
- 标签数量限制：最多 20 个
- 标签长度限制：每个标签不超过 50 个字符

**索引**：
- `projectId`: 唯一索引
- `tags`: 普通索引（支持按标签过滤查询）
- `customTitle` 和 `notes`: 文本索引（支持全文搜索）

## API 接口

### 1. 获取项目元数据

**接口**: `GET /api/v1/projects/[projectId]/metadata`

**功能说明**: 获取指定项目的元数据信息。

**认证要求**: 需要登录认证（Token 或 API Key）

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `projectId` | String | 是 | 项目ID |

**响应格式**:

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

**错误响应**:
- 项目不存在：返回 404
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

**示例请求**:

```bash
# 使用 Token 认证
curl -X GET "http://localhost:3000/api/v1/projects/project_001/metadata" \
  -H "Authorization: Bearer <token>"

# 使用 API Key 认证
curl -X GET "http://localhost:3000/api/v1/projects/project_001/metadata" \
  -H "X-API-Key: <api-key>"
```

---

### 2. 创建或更新项目元数据

**接口**: `PUT /api/v1/projects/[projectId]/metadata`

**功能说明**: 创建或更新项目的元数据信息（幂等操作）。

**认证要求**: 需要登录认证

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `projectId` | String | 是 | 项目ID |

**请求体**:

```json
{
  "customTitle": "我的自定义标题",
  "notes": "这是项目的备注信息",
  "tags": ["前端", "React", "重要"]
}
```

**参数说明**:

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `customTitle` | string | 否 | 自定义标题，最大长度 200 字符 | `"我的自定义标题"` |
| `notes` | string | 否 | 备注信息，最大长度 5000 字符 | `"这是项目的备注信息"` |
| `tags` | array[string] | 否 | 标签列表，最多 20 个标签，每个标签最长 50 字符 | `["前端", "React"]` |

**验证规则**:
- `customTitle`: 如果提供，必须是字符串，长度不超过 200 个字符
- `notes`: 如果提供，必须是字符串，长度不超过 5000 个字符
- `tags`: 如果提供，必须是字符串数组，最多 20 个标签，每个标签长度不超过 50 个字符
- 标签自动去重和转换为小写

**响应格式**:

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
  }
}
```

**处理逻辑**:
- 如果项目不存在，返回 404 错误
- 如果元数据不存在，则创建新记录
- 如果元数据已存在，则更新现有记录
- 标签处理：自动去重、转换为小写、过滤空字符串

**错误响应**:
- 项目不存在：返回 404
- 验证错误：返回 400
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

**示例请求**:

```bash
# 使用 Token 认证
curl -X PUT "http://localhost:3000/api/v1/projects/project_001/metadata" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "customTitle": "我的自定义标题",
    "notes": "这是项目的备注信息",
    "tags": ["前端", "React", "重要"]
  }'

# 使用 API Key 认证
curl -X PUT "http://localhost:3000/api/v1/projects/project_001/metadata" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <api-key>" \
  -d '{
    "customTitle": "我的自定义标题",
    "notes": "这是项目的备注信息",
    "tags": ["前端", "React", "重要"]
  }'
```

---

### 3. 删除项目元数据

**接口**: `DELETE /api/v1/projects/[projectId]/metadata`

**功能说明**: 删除项目的元数据信息。

**认证要求**: 需要登录认证

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `projectId` | String | 是 | 项目ID |

**响应格式**:

```json
{
  "success": true,
  "message": "删除成功",
  "data": null
}
```

**处理逻辑**:
- 如果项目不存在，返回 404 错误
- 如果元数据不存在，返回成功（幂等操作）

**错误响应**:
- 项目不存在：返回 404
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

**示例请求**:

```bash
# 使用 Token 认证
curl -X DELETE "http://localhost:3000/api/v1/projects/project_001/metadata" \
  -H "Authorization: Bearer <token>"

# 使用 API Key 认证
curl -X DELETE "http://localhost:3000/api/v1/projects/project_001/metadata" \
  -H "X-API-Key: <api-key>"
```

---

### 4. 项目列表接口扩展

**接口**: `GET /api/v1/projects`

**功能说明**: 获取项目列表，响应中包含元数据信息。

**响应格式扩展**:

在项目列表响应中，每个项目对象包含以下字段：

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "project_id": "...",
      "name": "...",
      "displayTitle": "我的自定义标题",  // 优先使用 customTitle，否则使用 name
      "metadata": {
        "customTitle": "我的自定义标题",
        "notes": "这是项目的备注信息",
        "tags": ["前端", "React"]
      },
      "gitInfo": {...},
      "clientInfo": {...},
      ...
    }
  ],
  ...
}
```

**字段说明**:
- `displayTitle`: 显示标题，优先使用 `metadata.customTitle`，如果为空则使用 `name`
- `metadata`: 项目元数据对象，如果不存在元数据则为 `null`

**查询参数扩展**（后续实现）:

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `search` | string | 否 | 搜索关键词，匹配项目名称或自定义标题 | `"React"` |
| `tags` | string | 否 | 标签过滤，多个标签用逗号分隔 | `"前端,React"` |
| `page` | number | 否 | 页码，默认 1 | `1` |
| `pageSize` | number | 否 | 每页数量，默认 20，最大 100 | `20` |

---

## 实现状态

### 已完成
- ✅ ProjectMetadata 模型已创建
- ✅ 模型字段和索引已定义
- ✅ 标签自动处理逻辑已实现
- ✅ GET /api/v1/projects/[projectId]/metadata 接口
- ✅ PUT /api/v1/projects/[projectId]/metadata 接口
- ✅ DELETE /api/v1/projects/[projectId]/metadata 接口

### 待实现
- ⏳ GET /api/v1/projects 接口扩展（关联元数据）
- ⏳ GET /api/v1/projects 接口扩展（搜索和过滤功能）

---

## 注意事项

1. **数据分离**: 项目元数据存储在独立的集合中，与客户端推送的数据分离
2. **向后兼容**: 元数据字段均为可选字段，不影响现有功能
3. **性能优化**: 使用索引支持高效的搜索和过滤查询
4. **标签处理**: 标签会自动去重、转换为小写、过滤空字符串
5. **唯一性**: 一个项目只能有一条元数据记录（通过 `projectId` 唯一索引保证）

---

## 参考文档

- 项目功能增强方案: [doc/spec/project-enhancement-plan.md](../../spec/project-enhancement-plan.md)
- 数据库设计: [doc/spec/database-design.md](../../spec/database-design.md)
