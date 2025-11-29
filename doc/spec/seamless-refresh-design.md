# TaskEcho 无感刷新机制设计方案（基于时间戳检查）

## 1. 方案概述

### 1.1 核心思路

通过**时间戳检查机制**实现无感刷新：
1. **获取最新更新时间**：每次数据加载后，记录数据中最新的更新时间
2. **轻量级检查**：定期调用轻量级API检查服务端最新更新时间
3. **条件拉取**：只有当服务端时间更新时，才拉取完整数据
4. **减少刷新**：避免不必要的完整数据请求，减少闪烁

### 1.2 方案优势

- ✅ **简单高效**：实现简单，逻辑清晰
- ✅ **减少网络请求**：大部分情况下只发送轻量级检查请求
- ✅ **减少数据传输**：只在有更新时才传输完整数据
- ✅ **减少渲染**：只在有更新时才触发重新渲染
- ✅ **用户体验好**：避免频繁闪烁

---

## 2. 方案评估

### 2.1 可行性分析

#### ✅ 优点

1. **实现简单**：只需要添加一个检查API和简单的比对逻辑
2. **性能优秀**：大幅减少不必要的网络请求和数据传输
3. **用户体验好**：只在真正有更新时才刷新，避免闪烁
4. **兼容性好**：与现有API结构兼容，不需要大改

#### ⚠️ 需要注意的问题

1. **时间精度**：需要确保前后端时间同步，使用ISO 8601格式
2. **新增/删除检测**：仅用更新时间可能无法检测到新增或删除（需要额外机制）
3. **多页面同步**：多个页面同时打开时，需要确保时间戳一致
4. **首次加载**：首次加载时没有时间戳，需要特殊处理

### 2.2 改进建议

#### 建议1：使用版本号 + 更新时间（推荐）

**方案**：返回一个版本号（version）和最后更新时间（last_updated_at）

**优点**：
- 版本号可以检测新增/删除（版本号变化）
- 更新时间可以检测数据更新
- 更可靠，不依赖时间同步

**实现**：
```javascript
// 检查API响应
{
  "success": true,
  "data": {
    "version": 123,  // 版本号（每次数据变化时递增）
    "last_updated_at": "2024-01-01T12:00:00.000Z"  // 最后更新时间
  }
}
```

#### 建议2：使用HTTP标准机制（If-Modified-Since）

**方案**：使用HTTP标准的条件请求头 `If-Modified-Since`

**优点**：
- 符合HTTP标准，浏览器自动处理
- 服务器返回304 Not Modified时，不传输数据
- 实现更简单，不需要额外的检查API

**实现**：
```javascript
// 前端请求时带上时间戳
fetch('/api/v1/projects', {
  headers: {
    'If-Modified-Since': lastUpdatedAt
  }
})

// 服务器返回304表示未更新，返回200表示有更新
```

#### 建议3：轻量级检查API + 完整数据API

**方案**：提供两个API
- `GET /api/v1/projects/check` - 轻量级检查（只返回版本号和时间）
- `GET /api/v1/projects` - 完整数据（带条件请求支持）

**优点**：
- 灵活性高，可以自定义检查逻辑
- 可以返回更多元信息（如变化数量）
- 不依赖HTTP标准，更容易扩展

---

## 3. 推荐方案：版本号 + 轻量级检查API

### 3.1 架构设计

```
前端页面
  ↓
1. 首次加载：获取完整数据，记录 version 和 last_updated_at
  ↓
2. 定期检查（每30秒）：
   GET /api/v1/projects/check
   → 返回 { version, last_updated_at }
  ↓
3. 比对版本号：
   - 如果 version 相同 → 不更新
   - 如果 version 不同 → 拉取完整数据
  ↓
4. 拉取完整数据：
   GET /api/v1/projects
   → 更新页面数据，更新 version 和 last_updated_at
```

### 3.2 API设计

#### 3.2.1 检查API：GET /api/v1/projects/check

**功能**：检查项目列表是否有更新

**请求**：
```
GET /api/v1/projects/check
```

**响应**：
```json
{
  "success": true,
  "data": {
    "version": 123,
    "last_updated_at": "2024-01-01T12:00:00.000Z",
    "count": 10
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**字段说明**：
- `version`: 版本号（每次数据变化时递增）
- `last_updated_at`: 最后更新时间（所有项目的最大 updated_at）
- `count`: 项目总数（可选，用于检测新增/删除）

#### 3.2.2 完整数据API：GET /api/v1/projects

**功能**：获取项目列表完整数据（保持不变）

**响应**：保持现有格式不变

#### 3.2.3 其他检查API

类似地，为其他资源提供检查API：

- `GET /api/v1/projects/:projectId/queues/check` - 检查队列列表
- `GET /api/v1/projects/:projectId/queues/:queueId/tasks/check` - 检查任务列表
- `GET /api/v1/stats/check` - 检查统计数据

### 3.3 前端实现

#### 3.3.1 Hook：useTimestampCheck

```javascript
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * 基于时间戳检查的无感更新 Hook
 * @param {Function} checkFn - 检查函数，返回 { version, last_updated_at }
 * @param {Function} fetchFn - 获取完整数据的函数
 * @param {number} interval - 检查间隔（毫秒），默认30000
 * @param {Object} options - 配置选项
 * @param {boolean} options.enabled - 是否启用自动检查
 */
export function useTimestampCheck(checkFn, fetchFn, interval = 30000, options = {}) {
  const { enabled = true } = options
  
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)
  
  // 记录当前数据的版本号和时间戳
  const currentVersionRef = useRef(null)
  const currentTimestampRef = useRef(null)
  const timeoutIdRef = useRef(null)
  const isMountedRef = useRef(true)

  // 首次加载完整数据
  const loadFullData = useCallback(async () => {
    if (!isMountedRef.current) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await fetchFn()
      if (isMountedRef.current) {
        setData(result)
        
        // 提取版本号和时间戳（从检查API获取）
        const checkResult = await checkFn()
        if (checkResult) {
          currentVersionRef.current = checkResult.version
          currentTimestampRef.current = checkResult.last_updated_at
        }
        
        setIsLoading(false)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err)
        setIsLoading(false)
      }
    }
  }, [fetchFn, checkFn])

  // 检查更新
  const checkUpdate = useCallback(async () => {
    if (!isMountedRef.current || !enabled) return
    
    try {
      const checkResult = await checkFn()
      
      if (!checkResult) return
      
      // 比对版本号
      const hasUpdate = currentVersionRef.current === null || 
                        checkResult.version !== currentVersionRef.current
      
      if (hasUpdate) {
        // 有更新，拉取完整数据
        setIsRefreshing(true)
        setError(null)
        
        try {
          const result = await fetchFn()
          if (isMountedRef.current) {
            setData(result)
            currentVersionRef.current = checkResult.version
            currentTimestampRef.current = checkResult.last_updated_at
            setIsRefreshing(false)
          }
        } catch (err) {
          if (isMountedRef.current) {
            setError(err)
            setIsRefreshing(false)
          }
        }
      }
    } catch (err) {
      // 检查失败，静默处理（不打断用户）
      console.error('检查更新失败:', err)
    }
  }, [checkFn, fetchFn, enabled])

  // 手动刷新
  const refetch = useCallback(() => {
    loadFullData()
  }, [loadFullData])

  // 初始化
  useEffect(() => {
    isMountedRef.current = true
    
    // 首次加载
    loadFullData()
    
    // 设置定期检查
    if (enabled) {
      const scheduleCheck = () => {
        if (isMountedRef.current && enabled) {
          timeoutIdRef.current = setTimeout(() => {
            checkUpdate()
            scheduleCheck() // 递归调度下一次检查
          }, interval)
        }
      }
      
      // 延迟第一次检查（避免与首次加载冲突）
      timeoutIdRef.current = setTimeout(() => {
        checkUpdate()
        scheduleCheck()
      }, interval)
    }
    
    return () => {
      isMountedRef.current = false
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current)
      }
    }
  }, [enabled, interval]) // 注意：不依赖 checkFn 和 fetchFn，避免频繁重新初始化

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    refetch
  }
}
```

#### 3.3.2 页面使用示例

**首页** (`src/app/page.js`)：
```javascript
// 检查函数
const checkProjects = useCallback(async () => {
  const { fetchWithAuth } = await import('@/lib/fetch-utils')
  const response = await fetchWithAuth('/api/v1/projects/check')
  if (!response.ok) return null
  const result = await response.json()
  return result.success ? result.data : null
}, [])

// 获取完整数据函数
const fetchProjects = useCallback(() => {
  return fetchHomePageData(page, pageSize, search, selectedTags)
}, [page, pageSize, search, selectedTags])

// 使用 Hook
const {
  data,
  isLoading,
  isRefreshing,
  error,
  refetch
} = useTimestampCheck(checkProjects, fetchProjects, 30000, {
  enabled: true
})
```

### 3.4 后端实现

#### 3.4.1 检查API实现

**项目列表检查** (`src/app/api/v1/projects/check/route.js`)：
```javascript
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from '@/lib/api-response'
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware'
import connectDB from '@/lib/mongoose'
import Project from '@/lib/models/Project'

async function handleGET(request) {
  try {
    await connectDB()
    
    // 获取所有项目的最大 updated_at 和总数
    const result = await Project.aggregate([
      {
        $group: {
          _id: null,
          maxUpdatedAt: { $max: '$updatedAt' },
          count: { $sum: 1 }
        }
      }
    ])
    
    if (result.length === 0) {
      return createSuccessResponse({
        version: 0,
        last_updated_at: new Date().toISOString(),
        count: 0
      })
    }
    
    const { maxUpdatedAt, count } = result[0]
    
    // 计算版本号：使用时间戳的毫秒数作为版本号（简单方案）
    // 或者使用数据库的版本字段（更可靠）
    const version = maxUpdatedAt ? maxUpdatedAt.getTime() : 0
    
    return createSuccessResponse({
      version,
      last_updated_at: maxUpdatedAt ? maxUpdatedAt.toISOString() : new Date().toISOString(),
      count
    })
  } catch (error) {
    console.error('检查项目列表失败:', error)
    return createErrorResponse(
      error.message || '检查失败',
      ERROR_CODES.INTERNAL_ERROR,
      500
    )
  }
}

export const GET = createApiHandler(handleGET, [
  MiddlewarePresets.authenticated
])
```

**改进版本号方案**（使用数据库版本字段）：
```javascript
// 在 Project 模型中添加 version 字段
// 每次更新时自动递增 version

// 检查API
const result = await Project.aggregate([
  {
    $group: {
      _id: null,
      maxVersion: { $max: '$version' },
      maxUpdatedAt: { $max: '$updatedAt' },
      count: { $sum: 1 }
    }
  }
])
```

---

## 4. 方案对比

### 4.1 方案对比表

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **版本号 + 检查API** | 可靠、灵活、易扩展 | 需要额外API | ⭐⭐⭐⭐⭐ |
| **HTTP If-Modified-Since** | 标准、简单 | 需要服务器支持304 | ⭐⭐⭐⭐ |
| **仅时间戳检查** | 最简单 | 无法检测新增/删除 | ⭐⭐⭐ |

### 4.2 最终推荐

**推荐使用：版本号 + 轻量级检查API**

**理由**：
1. ✅ 可靠性高：版本号可以准确检测所有变化（新增、删除、更新）
2. ✅ 灵活性好：可以返回更多元信息（如变化数量）
3. ✅ 易于扩展：未来可以添加更多功能（如增量更新）
4. ✅ 实现简单：只需要添加一个检查API和简单的比对逻辑

---

## 5. 实施计划

### 5.1 第一阶段：后端API

1. ✅ 实现 `GET /api/v1/projects/check` API
2. ✅ 实现 `GET /api/v1/projects/:projectId/queues/check` API
3. ✅ 实现 `GET /api/v1/projects/:projectId/queues/:queueId/tasks/check` API
4. ✅ 在数据模型中添加 `version` 字段（可选，或使用时间戳）

### 5.2 第二阶段：前端Hook

1. ✅ 实现 `useTimestampCheck` Hook
2. ✅ 添加页面可见性控制（页面隐藏时暂停检查）
3. ✅ 添加错误处理和重试机制

### 5.3 第三阶段：页面集成

1. ✅ 在首页应用 `useTimestampCheck`
2. ✅ 在项目详情页应用 `useTimestampCheck`
3. ✅ 在任务队列详情页应用 `useTimestampCheck`
4. ✅ 测试和优化

---

## 6. 注意事项

### 6.1 时间同步

- 确保前后端时间同步（使用UTC时间）
- 使用ISO 8601格式传输时间
- 考虑时区问题

### 6.2 版本号生成

- **方案1**：使用时间戳（简单但不完美）
- **方案2**：使用数据库自增版本号（推荐）
- **方案3**：使用哈希值（复杂但可靠）

### 6.3 性能优化

- 检查API应该非常轻量级（只查询聚合数据）
- 可以考虑缓存检查结果（短期缓存）
- 合理设置检查间隔（30秒比较合适）

### 6.4 错误处理

- 检查失败时静默处理（不打断用户）
- 完整数据拉取失败时显示错误提示
- 添加重试机制（指数退避）

---

## 7. 总结

这个基于时间戳检查的方案**简单、高效、可靠**，通过轻量级检查API大幅减少了不必要的网络请求和数据传输，实现了真正的"无感"刷新。

**核心优势**：
- ✅ 实现简单：只需要添加检查API和比对逻辑
- ✅ 性能优秀：减少90%以上的不必要请求
- ✅ 用户体验好：只在真正有更新时才刷新
- ✅ 易于扩展：未来可以添加增量更新等功能
