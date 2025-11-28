# 标签相关 API 接口说明文档

本文档说明标签相关的 API 接口，供前端开发使用。

## 基础信息

- **Base URL**: `http://localhost:3000` (开发环境)
- **API 版本**: `v1`
- **API 前缀**: `/api/v1`
- **认证方式**: 需要登录认证（Session）
- **响应格式**: JSON

---

## 1. 获取常用标签列表

**端点**: `GET /api/v1/projects/tags`

**功能说明**: 获取所有项目的常用标签列表，按使用次数降序排列。

**认证要求**: 需要登录认证

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

**响应格式**:

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
| `success` | boolean | 请求是否成功 |
| `message` | string | 响应消息 |
| `data` | object | 响应数据 |
| `data.tags` | array[string] | 标签列表，按使用次数降序排列 |
| `data.count` | number | 返回的标签数量 |
| `timestamp` | string | 响应时间戳 |

**业务规则**:

- 标签按使用次数降序排列（使用次数越多的标签排在前面）
- 只返回有标签的项目中的标签
- 标签自动去重（每个标签只出现一次）
- `limit` 参数最大值为 100，超过 100 会被限制为 100

**错误响应**:

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "获取常用标签失败"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 2. 项目列表接口中的标签过滤

**端点**: `GET /api/v1/projects`

**功能说明**: 在获取项目列表时，支持通过 `tags` 参数进行标签过滤。

**查询参数**:

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `tags` | string | 否 | 标签过滤，多个标签用逗号分隔（AND逻辑：项目必须包含所有指定标签） | `"前端,React"` |

**查询逻辑**:

- **标签过滤** (`tags` 参数): 多个标签用逗号分隔，使用 AND 逻辑（项目必须包含所有指定的标签）
- 标签不区分大小写（统一转换为小写进行匹配）
- 支持与 `search` 参数组合使用（AND 逻辑）

**请求示例**:

```bash
# 单个标签过滤
GET /api/v1/projects?tags=前端&page=1&pageSize=20

# 多个标签过滤（AND逻辑）
GET /api/v1/projects?tags=前端,React,重要&page=1&pageSize=20

# 组合查询（搜索 + 标签过滤）
GET /api/v1/projects?search=项目&tags=前端,React&page=1&pageSize=20
```

**响应格式**: 与项目列表接口相同，返回的项目列表已根据标签过滤条件筛选。

**注意事项**:

- 只有设置了元数据（ProjectMetadata）且包含标签的项目才会被过滤
- 如果项目没有元数据或没有标签，不会被包含在标签过滤结果中
- 标签过滤使用 AND 逻辑，即项目必须同时包含所有指定的标签

---

## 3. 标签数据结构

标签在项目元数据（ProjectMetadata）中的存储格式：

```json
{
  "projectId": "project_001",
  "tags": ["前端", "React", "重要"],
  ...
}
```

**标签规则**:

- 标签数量限制：每个项目最多 20 个标签
- 标签长度限制：每个标签最多 50 个字符
- 标签存储：统一转换为小写存储
- 标签去重：自动去重，不区分大小写
- 空标签过滤：自动过滤空字符串

---

## 4. 使用场景

### 4.1 首页标签过滤器

在首页实现标签过滤器组件时：

1. **加载常用标签**: 调用 `GET /api/v1/projects/tags` 获取常用标签列表
2. **显示标签**: 以按钮或标签形式展示常用标签
3. **多选过滤**: 用户点击标签后，将选中的标签传递给 `GET /api/v1/projects?tags=...` 接口
4. **清除过滤**: 清空选中的标签，重新调用 `GET /api/v1/projects` 接口

### 4.2 项目卡片标签显示

在项目卡片中显示标签时：

- 从项目列表接口的 `metadata.tags` 字段获取标签
- 以徽章形式展示标签
- 点击标签可以快速应用该标签的过滤（跳转到首页并应用过滤）

---

## 5. 前端实现示例

### 5.1 获取常用标签

```javascript
async function fetchPopularTags(limit = 50) {
  try {
    const response = await fetchWithAuth(`/api/v1/projects/tags?limit=${limit}`)
    const result = await response.json()
    
    if (result.success) {
      return result.data.tags || []
    }
    return []
  } catch (error) {
    console.error('获取常用标签失败:', error)
    return []
  }
}
```

### 5.2 使用标签过滤项目列表

```javascript
async function fetchProjectsWithTags(selectedTags = [], page = 1, pageSize = 20) {
  let url = `/api/v1/projects?page=${page}&pageSize=${pageSize}`
  
  if (selectedTags.length > 0) {
    url += `&tags=${encodeURIComponent(selectedTags.join(','))}`
  }
  
  try {
    const response = await fetchWithAuth(url)
    const result = await response.json()
    
    if (result.success) {
      return result.data
    }
    return { items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }
  } catch (error) {
    console.error('获取项目列表失败:', error)
    return { items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }
  }
}
```

---

## 6. 错误处理

### 6.1 常见错误码

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |
| `VALIDATION_ERROR` | 400 | 参数验证错误 |

### 6.2 错误处理示例

```javascript
try {
  const response = await fetchWithAuth('/api/v1/projects/tags')
  const result = await response.json()
  
  if (!result.success) {
    console.error('获取常用标签失败:', result.error?.message)
    // 显示错误提示给用户
    toast({
      title: '错误',
      description: result.error?.message || '获取常用标签失败',
      variant: 'destructive'
    })
    return []
  }
  
  return result.data.tags || []
} catch (error) {
  console.error('网络错误:', error)
  // 显示网络错误提示
  return []
}
```

---

## 7. 性能优化建议

1. **缓存常用标签**: 常用标签列表变化频率较低，可以适当缓存（如 5-10 分钟）
2. **防抖处理**: 标签过滤改变时，使用防抖处理避免频繁请求
3. **分页加载**: 标签数量较多时，考虑分页或虚拟滚动
4. **预加载**: 在首页加载时，可以并行加载常用标签和项目列表

---

## 8. 更新日志

- **2024-01-01**: 初始版本，支持获取常用标签列表和标签过滤功能
