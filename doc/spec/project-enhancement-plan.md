# 项目功能增强方案

## 1. 概述

### 1.1 文档目的

本文档详细说明 TaskEcho 系统项目功能的增强方案，包括：
1. Git 信息扩展：在项目中添加 Git 仓库和分支信息
2. 项目元数据管理：用户自定义的项目标题、备注和标签管理
3. 首页搜索和过滤：支持按名称搜索和按标签过滤项目列表

### 1.2 设计原则

- **数据分离**：客户端推送的数据和服务端用户自定义数据分离存储
- **向后兼容**：新增字段均为可选字段，不影响现有功能
- **性能优化**：合理设计索引，支持高效的搜索和过滤查询
- **用户体验**：提供便捷的搜索和过滤功能，提升项目管理效率

---

## 2. Git 信息扩展

### 2.1 需求说明

项目需要保存 Git 相关信息，包括：
- Git 仓库地址（repository）
- 当前分支（branch）

这些信息由客户端在推送数据时提供，不是必填字段。

### 2.2 数据库设计变更

#### 2.2.1 Project 模型扩展

在 `Project` 模型中添加 `gitInfo` 字段：

```javascript
const projectSchema = new mongoose.Schema({
  projectId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  clientInfo: {
    username: {
      type: String,
      default: null
    },
    hostname: {
      type: String,
      default: null
    },
    project_path: {
      type: String,
      default: null
    }
  },
  gitInfo: {
    repository: {
      type: String,
      default: null
    },
    branch: {
      type: String,
      default: null
    }
  },
  lastTaskAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});
```

**字段说明**：
- `gitInfo.repository`：Git 仓库地址（如：`https://github.com/user/repo.git` 或 `git@github.com:user/repo.git`），可选
- `gitInfo.branch`：当前分支名称（如：`main`、`develop`），可选

**索引设计**：
- 为 `gitInfo.repository` 添加普通索引，支持按仓库过滤查询
- 为 `gitInfo.branch` 添加普通索引，支持按分支过滤查询

```javascript
projectSchema.index({ 'gitInfo.repository': 1 });
projectSchema.index({ 'gitInfo.branch': 1 });
```

### 2.3 API 接口变更

#### 2.3.1 POST /api/v1/submit 接口扩展

在请求体中添加可选的 `gitInfo` 字段：

**请求体结构扩展**：

```json
{
  "project_id": "string (必填)",
  "project_name": "string (必填)",
  "gitInfo": {
    "repository": "string (可选)",
    "branch": "string (可选)"
  },
  "queue_id": "string (必填)",
  "queue_name": "string (必填)",
  "meta": {},
  "tasks": []
}
```

**参数说明**：

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `gitInfo` | object | 否 | Git 信息对象 | `{"repository": "...", "branch": "main"}` |
| `gitInfo.repository` | string | 否 | Git 仓库地址 | `"https://github.com/user/repo.git"` |
| `gitInfo.branch` | string | 否 | 当前分支名称 | `"main"` |

**验证规则**：
- `gitInfo.repository`：如果提供，必须是有效的字符串，长度不超过 500 个字符
- `gitInfo.branch`：如果提供，必须是有效的字符串，长度不超过 255 个字符

**处理逻辑**：
- 如果提供了 `gitInfo`，则更新项目的 `gitInfo` 字段
- 如果未提供 `gitInfo`，则不更新该字段（保持现有值或为 null）
- 支持部分更新（只提供 `repository` 或只提供 `branch`）

#### 2.3.2 GET /api/v1/projects 接口响应扩展

在项目列表响应中添加 `gitInfo` 字段：

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "project_id": "...",
      "name": "...",
      "gitInfo": {
        "repository": "https://github.com/user/repo.git",
        "branch": "main"
      },
      "clientInfo": {...},
      "queue_count": 3,
      "task_count": 15,
      ...
    }
  ],
  ...
}
```

---

## 3. 项目元数据管理

### 3.1 需求说明

用户可以在服务端自定义项目的以下信息：
- **自定义标题**（customTitle）：用户可以修改项目显示标题
- **备注**（notes）：项目的备注信息
- **标签**（tags）：项目的标签列表，用于分类和过滤

这些信息：
- 只在服务端管理，不需要和客户端同步
- 通过项目 ID（projectId）与项目关联
- 存储在独立的集合中，便于管理和查询

### 3.2 数据库设计

#### 3.2.1 创建 ProjectMetadata 集合

**集合名**：`projectmetadatas`

**功能说明**：存储用户自定义的项目元数据信息，与 `Project` 集合通过 `projectId` 关联。

**文档结构**：

```javascript
{
  _id: ObjectId,                    // MongoDB 自动生成的主键
  projectId: String,                // 项目外部唯一标识（关联 Project.projectId，唯一索引）
  customTitle: String,              // 自定义标题（可选）
  notes: String,                    // 备注信息（可选）
  tags: [String],                   // 标签列表（可选）
  createdAt: Date,                  // 创建时间
  updatedAt: Date                   // 更新时间
}
```

**Mongoose Schema**：

```javascript
const projectMetadataSchema = new mongoose.Schema({
  projectId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  customTitle: {
    type: String,
    default: null,
    maxlength: 200
  },
  notes: {
    type: String,
    default: null,
    maxlength: 5000
  },
  tags: {
    type: [String],
    default: [],
    validate: {
      validator: function(tags) {
        // 标签数量限制
        return tags.length <= 20;
      },
      message: '标签数量不能超过 20 个'
    }
  }
}, {
  timestamps: true
});
```

**索引设计**：

```javascript
// 唯一索引：projectId（确保一个项目只有一条元数据记录）
projectMetadataSchema.index({ projectId: 1 }, { unique: true });

// 普通索引：tags（支持按标签过滤查询）
projectMetadataSchema.index({ tags: 1 });

// 文本索引：customTitle 和 notes（支持全文搜索）
projectMetadataSchema.index({ 
  customTitle: 'text', 
  notes: 'text' 
});
```

**字段说明**：
- `projectId`：项目外部唯一标识，与 `Project.projectId` 关联，唯一索引确保一对一关系
- `customTitle`：用户自定义的项目标题，如果为空则使用 `Project.name`
- `notes`：项目的备注信息，支持多行文本
- `tags`：标签数组，每个标签为字符串，最多 20 个标签

**业务规则**：
- 一个项目只能有一条元数据记录（通过 `projectId` 唯一索引保证）
- 标签自动去重（在保存时处理）
- 标签不区分大小写（统一转换为小写存储）
- 标签长度限制：每个标签不超过 50 个字符

### 3.3 API 接口设计

#### 3.3.1 GET /api/v1/projects/[projectId]/metadata

**功能说明**：获取指定项目的元数据信息。

**请求方法**：`GET`

**请求路径**：`/api/v1/projects/[projectId]/metadata`

**认证要求**：需要登录认证

**响应格式**：

```json
{
  "success": true,
  "message": "查询成功",
  "data": {
    "projectId": "project_001",
    "customTitle": "我的自定义标题",
    "notes": "这是项目的备注信息",
    "tags": ["前端", "React", "重要"],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**错误响应**：
- 项目不存在：返回 404
- 元数据不存在：返回空数据（`customTitle: null, notes: null, tags: []`）

#### 3.3.2 PUT /api/v1/projects/[projectId]/metadata

**功能说明**：创建或更新项目的元数据信息。

**请求方法**：`PUT`

**请求路径**：`/api/v1/projects/[projectId]/metadata`

**认证要求**：需要登录认证

**请求体**：

```json
{
  "customTitle": "我的自定义标题",
  "notes": "这是项目的备注信息",
  "tags": ["前端", "React", "重要"]
}
```

**参数说明**：

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `customTitle` | string | 否 | 自定义标题，最大长度 200 字符 | `"我的自定义标题"` |
| `notes` | string | 否 | 备注信息，最大长度 5000 字符 | `"这是项目的备注信息"` |
| `tags` | array[string] | 否 | 标签列表，最多 20 个标签，每个标签最长 50 字符 | `["前端", "React"]` |

**验证规则**：
- `customTitle`：如果提供，必须是字符串，长度不超过 200 个字符
- `notes`：如果提供，必须是字符串，长度不超过 5000 个字符
- `tags`：如果提供，必须是字符串数组，最多 20 个标签，每个标签长度不超过 50 个字符
- 标签自动去重和转换为小写

**响应格式**：

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

**处理逻辑**：
- 如果项目不存在，返回 404 错误
- 如果元数据不存在，则创建新记录
- 如果元数据已存在，则更新现有记录
- 标签处理：自动去重、转换为小写、过滤空字符串

#### 3.3.3 DELETE /api/v1/projects/[projectId]/metadata

**功能说明**：删除项目的元数据信息。

**请求方法**：`DELETE`

**请求路径**：`/api/v1/projects/[projectId]/metadata`

**认证要求**：需要登录认证

**响应格式**：

```json
{
  "success": true,
  "message": "删除成功",
  "data": null
}
```

**处理逻辑**：
- 如果元数据不存在，返回成功（幂等操作）

#### 3.3.4 GET /api/v1/projects 接口响应扩展

在项目列表响应中合并元数据信息：

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

**字段说明**：
- `displayTitle`：显示标题，优先使用 `metadata.customTitle`，如果为空则使用 `name`
- `metadata`：项目元数据对象，如果不存在元数据则为 `null`

**查询优化**：
- 使用 `$lookup` 聚合操作关联 `ProjectMetadata` 集合
- 或者先查询项目列表，再批量查询元数据（根据性能测试选择）

### 3.4 前端界面实现方案

#### 3.4.1 元数据编辑入口

**位置 1：项目详情页**

在项目详情页的页面头部添加"编辑元数据"按钮：

- **位置**：页面头部右侧，与现有的"管理菜单"（MoreVertical）按钮并列
- **按钮样式**：使用图标按钮，显示"编辑"图标（Edit）或"标签"图标（Tag）
- **交互**：点击后打开元数据编辑对话框

**位置 2：项目卡片**

在项目卡片中添加编辑入口（可选）：

- **位置**：项目卡片右上角，使用下拉菜单或图标按钮
- **交互**：点击后跳转到项目详情页，并自动打开元数据编辑对话框

**推荐方案**：优先在项目详情页提供编辑入口，项目卡片保持简洁，避免过多操作按钮。

#### 3.4.2 元数据编辑对话框设计

**对话框布局**：

```
┌─────────────────────────────────────────┐
│  编辑项目信息                    [×]    │
├─────────────────────────────────────────┤
│                                         │
│  自定义标题                              │
│  ┌───────────────────────────────────┐  │
│  │ [输入框]                           │  │
│  └───────────────────────────────────┘  │
│  <提示：留空则使用项目名称>              │
│                                         │
│  备注                                    │
│  ┌───────────────────────────────────┐  │
│  │ [多行文本输入框]                   │  │
│  │                                   │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│  <提示：最多5000个字符>                  │
│                                         │
│  标签                                    │
│  ┌───────────────────────────────────┐  │
│  │ [标签输入区域]                     │  │
│  │ [标签1] [标签2] [+ 添加标签]        │  │
│  └───────────────────────────────────┘  │
│  <提示：最多20个标签，每个标签最多50字符>│
│                                         │
│                    [取消]  [保存]        │
└─────────────────────────────────────────┘
```

**组件设计**：

1. **自定义标题输入框**：
   - 单行文本输入框
   - 占位符：`"留空则使用项目名称"`
   - 最大长度：200 字符
   - 实时显示字符计数（可选）

2. **备注输入框**：
   - 多行文本输入框（Textarea）
   - 占位符：`"添加项目备注信息..."`
   - 最大长度：5000 字符
   - 显示字符计数：`已输入 X / 5000 字符`
   - 支持自动调整高度（根据内容）

3. **标签管理区域**：
   - **已添加标签显示**：以徽章形式显示已添加的标签
   - **标签输入框**：支持输入新标签，按 Enter 或逗号添加
   - **标签删除**：每个标签右上角有删除按钮（×）
   - **标签验证**：
     - 自动去重（不区分大小写）
     - 自动转换为小写
     - 过滤空字符串
     - 限制标签数量（最多 20 个）
     - 限制标签长度（每个标签最多 50 字符）

**标签输入交互**：

- **方式 1：输入框 + Enter**：
  - 输入标签名称，按 Enter 键添加
  - 支持逗号分隔多个标签（如：`前端,React,重要`）

- **方式 2：输入框 + 按钮**：
  - 输入标签名称，点击"添加"按钮

- **方式 3：下拉选择**（可选）：
  - 显示常用标签列表（从所有项目的标签中统计）
  - 支持快速选择常用标签

**推荐方案**：使用方式 1（输入框 + Enter），支持逗号分隔，提供最佳用户体验。

#### 3.4.3 数据加载和保存流程

**初始数据加载**：

```javascript
// 1. 打开对话框时，加载项目元数据
const fetchMetadata = async (projectId) => {
  try {
    const response = await fetchWithAuth(`/api/v1/projects/${projectId}/metadata`)
    const result = await response.json()
    
    if (result.success) {
      // 如果元数据存在，填充表单
      if (result.data) {
        setCustomTitle(result.data.customTitle || '')
        setNotes(result.data.notes || '')
        setTags(result.data.tags || [])
      } else {
        // 如果元数据不存在，使用默认值
        setCustomTitle('')
        setNotes('')
        setTags([])
      }
    }
  } catch (error) {
    console.error('加载元数据失败:', error)
    // 使用默认值
    setCustomTitle('')
    setNotes('')
    setTags([])
  }
}
```

**保存数据**：

```javascript
// 2. 保存元数据
const handleSaveMetadata = async () => {
  // 验证数据
  if (customTitle.length > 200) {
    toast({
      title: '错误',
      description: '自定义标题不能超过200个字符',
      variant: 'destructive'
    })
    return
  }
  
  if (notes.length > 5000) {
    toast({
      title: '错误',
      description: '备注不能超过5000个字符',
      variant: 'destructive'
    })
    return
  }
  
  if (tags.length > 20) {
    toast({
      title: '错误',
      description: '标签数量不能超过20个',
      variant: 'destructive'
    })
    return
  }
  
  // 处理标签：去重、转小写、过滤空字符串
  const processedTags = [...new Set(tags.map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0))]
  
  setIsSaving(true)
  try {
    const response = await fetchWithAuth(`/api/v1/projects/${projectId}/metadata`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customTitle: customTitle.trim() || null,
        notes: notes.trim() || null,
        tags: processedTags
      })
    })
    
    const result = await response.json()
    
    if (!response.ok || !result.success) {
      throw new Error(result.error?.message || '保存失败')
    }
    
    toast({
      title: '成功',
      description: '项目信息已保存',
      variant: 'default'
    })
    
    // 关闭对话框
    setDialogOpen(false)
    
    // 刷新项目数据
    refetch()
  } catch (error) {
    toast({
      title: '保存失败',
      description: error.message || '请稍后重试',
      variant: 'destructive'
    })
  } finally {
    setIsSaving(false)
  }
}
```

#### 3.4.4 标签管理组件实现

**标签输入组件**：

```javascript
const TagInput = ({ tags, onTagsChange, maxTags = 20, maxTagLength = 50 }) => {
  const [inputValue, setInputValue] = useState('')
  
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    }
  }
  
  const addTag = (value) => {
    const trimmedValue = value.trim().toLowerCase()
    
    // 验证标签
    if (!trimmedValue) return
    if (tags.length >= maxTags) {
      toast({
        title: '提示',
        description: `最多只能添加${maxTags}个标签`,
        variant: 'default'
      })
      return
    }
    if (trimmedValue.length > maxTagLength) {
      toast({
        title: '提示',
        description: `标签长度不能超过${maxTagLength}个字符`,
        variant: 'default'
      })
      return
    }
    
    // 检查是否已存在（不区分大小写）
    if (tags.some(tag => tag.toLowerCase() === trimmedValue)) {
      toast({
        title: '提示',
        description: '标签已存在',
        variant: 'default'
      })
      return
    }
    
    // 添加标签
    onTagsChange([...tags, trimmedValue])
    setInputValue('')
  }
  
  const removeTag = (index) => {
    onTagsChange(tags.filter((_, i) => i !== index))
  }
  
  return (
    <div className="space-y-2">
      {/* 已添加的标签 */}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-md text-sm"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="ml-1 hover:text-blue-600 dark:hover:text-blue-400"
              aria-label={`删除标签 ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      
      {/* 标签输入框 */}
      {tags.length < maxTags && (
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="输入标签，按 Enter 或逗号添加"
          className="w-full"
        />
      )}
      
      {/* 提示信息 */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        已添加 {tags.length} / {maxTags} 个标签，每个标签最多 {maxTagLength} 个字符
      </p>
    </div>
  )
}
```

#### 3.4.5 项目卡片和详情页显示优化

**项目卡片显示**：

- **标题显示**：优先显示 `displayTitle`（自定义标题或项目名称）
- **标签显示**：在项目卡片底部显示标签（如果有）
  - 标签样式：小号徽章，不同颜色区分
  - 最多显示 3-5 个标签，超出部分显示"..."
  - 点击标签可以快速应用该标签的过滤（跳转到首页并应用过滤）

**项目详情页显示**：

- **页面标题**：使用 `displayTitle` 显示
- **元数据信息区域**（可选）：
  - 在页面头部下方添加元数据信息卡片
  - 显示自定义标题、备注、标签
  - 提供编辑按钮

#### 3.4.6 响应式设计

**移动端**（< 768px）：
- 对话框全屏显示或接近全屏
- 标签输入框和标签列表垂直排列
- 备注输入框高度适中（4-6 行）

**平板端**（768px - 1024px）：
- 对话框居中显示，宽度适中（600-700px）
- 标签可以横向排列

**桌面端**（> 1024px）：
- 对话框居中显示，宽度适中（700-800px）
- 所有元素横向排列，充分利用空间

#### 3.4.7 用户体验优化

**表单验证**：
- 实时验证字符长度限制
- 标签添加时立即验证重复和长度
- 保存前进行最终验证

**加载状态**：
- 打开对话框时显示加载状态（加载元数据）
- 保存时显示保存状态，禁用保存按钮

**错误处理**：
- 网络错误：显示错误提示，提供重试按钮
- 验证错误：在对应字段下方显示错误信息
- 保存失败：显示错误提示，保留表单数据

**快捷键支持**（可选）：
- `Esc` 键：关闭对话框
- `Ctrl/Cmd + Enter`：保存并关闭

**自动保存**（可选）：
- 支持草稿自动保存到 localStorage
- 下次打开对话框时自动恢复草稿

---

## 4. 首页搜索和过滤功能

### 4.1 需求说明

在首页添加以下功能：
1. **名称搜索**：支持按项目名称或自定义标题搜索项目
2. **标签过滤**：支持按标签过滤项目列表
3. **组合查询**：支持同时使用搜索和过滤

### 4.2 API 接口变更

#### 4.2.1 GET /api/v1/projects 接口扩展

**查询参数扩展**：

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `search` | string | 否 | 搜索关键词，匹配项目名称或自定义标题 | `"React"` |
| `tags` | string | 否 | 标签过滤，多个标签用逗号分隔 | `"前端,React"` |
| `page` | number | 否 | 页码，默认 1 | `1` |
| `pageSize` | number | 否 | 每页数量，默认 20，最大 100 | `20` |

**查询逻辑**：

1. **名称搜索**（`search` 参数）：
   - 如果提供了 `search` 参数，在以下字段中搜索：
     - `Project.name`（项目名称）
     - `ProjectMetadata.customTitle`（自定义标题）
   - 使用 MongoDB 的文本搜索或正则表达式匹配
   - 不区分大小写

2. **标签过滤**（`tags` 参数）：
   - 如果提供了 `tags` 参数，解析为标签数组（逗号分隔）
   - 在 `ProjectMetadata.tags` 字段中匹配
   - 支持多标签过滤（AND 逻辑：项目必须包含所有指定的标签）

3. **组合查询**：
   - 同时支持 `search` 和 `tags` 参数
   - 使用 AND 逻辑组合（项目必须同时满足搜索条件和标签过滤）

**查询示例**：

```
GET /api/v1/projects?search=React&tags=前端,重要&page=1&pageSize=20
```

**响应格式**：保持不变，但返回的项目列表已根据搜索和过滤条件筛选。

### 4.3 前端 UI 设计

#### 4.3.1 搜索和过滤区域

**位置**：首页项目列表上方，全局统计区域下方

**布局**：
- **移动端**：垂直布局，搜索框和标签过滤器上下排列
- **平板端**：搜索框和标签过滤器可以横向排列
- **桌面端**：搜索框和标签过滤器横向排列，右侧对齐

**组件设计**：

1. **搜索框**：
   - 输入框样式，带搜索图标
   - 支持实时搜索（防抖处理，延迟 300ms）
   - 显示清除按钮（当有输入时）
   - 占位符文本：`"搜索项目名称..."`

2. **标签过滤器**：
   - 下拉选择器或多选标签组件
   - 显示常用标签列表（从所有项目的标签中统计）
   - 支持多选
   - 显示已选标签数量
   - 支持清除所有标签

3. **清除按钮**：
   - 当有搜索条件或标签过滤时显示
   - 点击清除所有搜索和过滤条件

**交互设计**：
- 搜索和过滤条件改变时，自动刷新项目列表
- 显示当前搜索和过滤状态（如："搜索：React，标签：前端、重要"）
- 显示匹配结果数量（如："找到 5 个项目"）

#### 4.3.2 项目卡片显示优化

**标题显示**：
- 优先显示 `displayTitle`（自定义标题或项目名称）
- 如果搜索关键词匹配，高亮显示匹配部分

**标签显示**：
- 在项目卡片中显示标签（如果有）
- 标签样式：小号徽章，不同颜色区分
- 点击标签可以快速应用该标签的过滤

---

## 5. 数据库迁移方案

### 5.1 迁移步骤

1. **添加 Git 信息字段**：
   - 在 `Project` 模型中添加 `gitInfo` 字段
   - 添加相关索引
   - 现有项目该字段为 `null`，不影响现有功能

2. **创建 ProjectMetadata 集合**：
   - 创建 `ProjectMetadata` 模型
   - 创建相关索引
   - 现有项目没有元数据记录，查询时返回 `null`

3. **数据迁移**（可选）：
   - 如果需要为现有项目初始化元数据，可以编写迁移脚本
   - 默认情况下，元数据为空，用户可以在前端手动添加

### 5.2 向后兼容性

- 所有新增字段均为可选字段
- 现有 API 接口保持兼容，新增字段不影响现有调用
- 前端可以逐步适配新功能，不影响现有功能使用

---

## 6. 实现优先级

### 6.1 第一阶段：Git 信息扩展

1. 更新 `Project` 模型，添加 `gitInfo` 字段
2. 更新 `POST /api/v1/submit` 接口，支持接收和保存 Git 信息
3. 更新 `GET /api/v1/projects` 接口，返回 Git 信息
4. 前端显示 Git 信息（可选，在项目详情页显示）

### 6.2 第二阶段：项目元数据管理

1. 创建 `ProjectMetadata` 模型
2. 实现元数据 CRUD API 接口
3. 更新 `GET /api/v1/projects` 接口，关联元数据
4. 前端实现元数据管理页面（编辑项目标题、备注、标签）

### 6.3 第三阶段：首页搜索和过滤

1. 更新 `GET /api/v1/projects` 接口，支持搜索和过滤参数
2. 前端实现搜索框和标签过滤器组件
3. 优化查询性能（索引优化、查询优化）

---

## 7. 性能考虑

### 7.1 索引优化

- `Project.gitInfo.repository` 和 `gitInfo.branch` 索引：支持按 Git 信息过滤
- `ProjectMetadata.projectId` 唯一索引：快速查找项目元数据
- `ProjectMetadata.tags` 索引：支持按标签过滤
- `ProjectMetadata` 文本索引：支持全文搜索

### 7.2 查询优化

- 项目列表查询时，使用聚合操作关联元数据，避免 N+1 查询
- 搜索和过滤使用索引，确保查询性能
- 分页查询限制每页最大数量，避免一次性加载过多数据

### 7.3 缓存策略

- 常用标签列表可以缓存（从所有项目的标签中统计）
- 项目列表可以适当缓存，但需要考虑实时性

---

## 8. 测试计划

### 8.1 单元测试

- `Project` 模型：测试 Git 信息字段的保存和查询
- `ProjectMetadata` 模型：测试元数据的 CRUD 操作
- API 接口：测试请求参数验证、数据处理、错误处理

### 8.2 集成测试

- 测试 `POST /api/v1/submit` 接口的 Git 信息保存
- 测试项目元数据的创建、更新、删除
- 测试项目列表查询的搜索和过滤功能

### 8.3 性能测试

- 测试大量项目下的搜索和过滤性能
- 测试标签过滤的查询性能
- 测试项目列表关联元数据的查询性能

---

## 9. 总结

本方案通过以下方式增强项目功能：

1. **Git 信息扩展**：在项目中添加 Git 仓库和分支信息，由客户端推送
2. **项目元数据管理**：通过独立的集合管理用户自定义的项目信息，实现数据分离
3. **搜索和过滤功能**：在首页提供便捷的搜索和标签过滤功能，提升用户体验

所有变更均向后兼容，不影响现有功能，可以分阶段实施。

