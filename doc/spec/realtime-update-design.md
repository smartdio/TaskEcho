# TaskEcho 实时更新机制设计文档

## 1. 概述

### 1.1 文档目的

本文档详细说明 TaskEcho 系统的实时更新机制设计，包括轮询方案、WebSocket 方案（可选）、数据缓存策略、数据一致性保证等，为前端页面提供实时数据更新能力。

### 1.2 设计目标

- **实时性**：确保用户能够及时看到数据更新
- **性能**：最小化服务器负载和网络请求
- **一致性**：保证数据的一致性和准确性
- **用户体验**：提供流畅的更新体验，避免页面闪烁
- **可扩展性**：支持未来扩展更多实时更新场景

### 1.3 适用场景

- 首页项目列表和全局统计的实时更新
- 项目详情页任务队列列表的实时更新
- 任务队列详情页任务列表的实时更新
- 任务详情页对话消息和日志的实时更新
- 任务状态的实时更新

### 1.4 更新数据来源

- **外部系统推送**：通过 `POST /api/v1/submit` 提交数据
- **增量更新**：通过增量更新接口（追加消息、追加日志、修改状态）更新数据
- **用户操作**：任务详情页的本地回复（仅前端，不触发后端更新）

---

## 2. 轮询方案（推荐方案）

### 2.1 方案概述

轮询方案是 TaskEcho 系统的**主要实时更新方案**，通过定时请求后端 API 接口来检查数据更新。该方案实现简单、兼容性好，适合单用户本地应用场景。

### 2.2 轮询策略

#### 2.2.1 不同页面的轮询频率

| 页面 | 轮询接口 | 轮询频率 | 说明 |
|------|---------|---------|------|
| **首页** | `GET /api/v1/projects`<br>`GET /api/v1/stats` | 30 秒 | 项目列表和全局统计更新频率较低 |
| **项目详情页** | `GET /api/v1/projects/:projectId`<br>`GET /api/v1/projects/:projectId/queues` | 30 秒 | 任务队列列表更新频率较低 |
| **任务队列详情页** | `GET /api/v1/projects/:projectId/queues/:queueId`<br>`GET /api/v1/projects/:projectId/queues/:queueId/tasks` | 30 秒 | 任务列表更新频率较低 |
| **任务详情页** | `GET /api/v1/projects/:projectId/queues/:queueId/tasks/:taskId` | 5-10 秒 | 对话消息和日志需要更频繁的更新 |

#### 2.2.2 智能轮询策略

**页面可见性控制**：
- 页面可见时：正常轮询
- 页面隐藏时：暂停轮询（使用 `document.visibilitychange` 事件）
- 页面重新可见时：立即执行一次轮询，然后恢复正常轮询

**用户交互优化**：
- 用户正在搜索/过滤时：延迟轮询（避免打断用户操作）
- 用户正在输入时：暂停轮询
- 用户滚动查看历史消息时：暂停轮询（任务详情页）

**网络状态感知**：
- 网络离线时：暂停轮询
- 网络恢复时：立即执行一次轮询
- 请求失败时：指数退避重试（1秒、2秒、4秒...）

### 2.3 轮询实现方案

#### 2.3.1 基础轮询实现

```javascript
// 基础轮询 Hook
function usePolling(fetchFn, interval = 30000, options = {}) {
  const {
    enabled = true,
    onSuccess,
    onError,
    immediate = true
  } = options
  
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    if (!enabled) return
    
    let timeoutId
    let isMounted = true
    
    const poll = async () => {
      if (!isMounted) return
      
      setIsLoading(true)
      setError(null)
      
      try {
        const result = await fetchFn()
        if (isMounted) {
          setData(result)
          setIsLoading(false)
          onSuccess?.(result)
        }
      } catch (err) {
        if (isMounted) {
          setError(err)
          setIsLoading(false)
          onError?.(err)
        }
      }
      
      // 安排下一次轮询
      if (isMounted && enabled) {
        timeoutId = setTimeout(poll, interval)
      }
    }
    
    // 立即执行一次（如果 immediate 为 true）
    if (immediate) {
      poll()
    } else {
      timeoutId = setTimeout(poll, interval)
    }
    
    return () => {
      isMounted = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [fetchFn, interval, enabled, immediate])
  
  return { data, isLoading, error, refetch: () => poll() }
}
```

#### 2.3.2 页面可见性感知轮询

```javascript
// 页面可见性感知轮询 Hook
function useVisibilityAwarePolling(fetchFn, interval = 30000, options = {}) {
  const [isVisible, setIsVisible] = useState(true)
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden)
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    setIsVisible(!document.hidden)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
  
  return usePolling(fetchFn, interval, {
    ...options,
    enabled: options.enabled && isVisible
  })
}
```

#### 2.3.3 增量更新检测

```javascript
// 增量更新检测 Hook（用于任务详情页）
function useIncrementalUpdate(fetchFn, interval = 5000) {
  const [data, setData] = useState(null)
  const [lastMessageId, setLastMessageId] = useState(null)
  const [lastLogId, setLastLogId] = useState(null)
  
  const { data: newData, isLoading } = useVisibilityAwarePolling(
    fetchFn,
    interval,
    {
      onSuccess: (result) => {
        if (!data) {
          // 首次加载
          setData(result)
          if (result.messages?.length > 0) {
            setLastMessageId(result.messages[result.messages.length - 1].id)
          }
          if (result.logs?.length > 0) {
            setLastLogId(result.logs[0].id)
          }
          return
        }
        
        // 检测新消息
        const newMessages = result.messages.filter(
          msg => !data.messages.some(m => m.id === msg.id)
        )
        
        // 检测新日志
        const newLogs = result.logs.filter(
          log => !data.logs.some(l => l.id === log.id)
        )
        
        // 检测状态变化
        const statusChanged = result.status !== data.status
        
        // 如果有更新，合并数据
        if (newMessages.length > 0 || newLogs.length > 0 || statusChanged) {
          setData({
            ...result,
            messages: [...data.messages, ...newMessages],
            logs: [...newLogs, ...data.logs] // 日志倒序，新日志在前面
          })
          
          // 更新最后的消息和日志 ID
          if (newMessages.length > 0) {
            setLastMessageId(newMessages[newMessages.length - 1].id)
          }
          if (newLogs.length > 0) {
            setLastLogId(newLogs[0].id)
          }
          
          // 可选：自动滚动到底部（显示新消息）
          if (newMessages.length > 0) {
            setTimeout(() => {
              window.scrollTo({ bottom: 0, behavior: 'smooth' })
            }, 100)
          }
        }
      }
    }
  )
  
  return { data, isLoading }
}
```

### 2.4 轮询性能优化

#### 2.4.1 请求去重

```javascript
// 防止并发请求
let pendingRequest = null

async function fetchWithDeduplication(url) {
  if (pendingRequest) {
    return pendingRequest
  }
  
  pendingRequest = fetch(url)
    .then(res => res.json())
    .finally(() => {
      pendingRequest = null
    })
  
  return pendingRequest
}
```

#### 2.4.2 条件请求（ETag/Last-Modified）

```javascript
// 使用条件请求减少数据传输
async function fetchWithConditionalRequest(url, lastModified) {
  const headers = {}
  if (lastModified) {
    headers['If-Modified-Since'] = lastModified
  }
  
  const response = await fetch(url, { headers })
  
  if (response.status === 304) {
    // 数据未更新，使用缓存
    return null
  }
  
  return response.json()
}
```

#### 2.4.3 请求合并

```javascript
// 合并多个请求（如首页的项目列表和统计）
async function fetchHomePageData() {
  const [projects, stats] = await Promise.all([
    fetch('/api/v1/projects').then(res => res.json()),
    fetch('/api/v1/stats').then(res => res.json())
  ])
  
  return { projects, stats }
}
```

### 2.5 轮询方案优缺点

**优点**：
- ✅ 实现简单，兼容性好
- ✅ 不需要额外的服务器资源（WebSocket 连接）
- ✅ 适合单用户本地应用场景
- ✅ 易于调试和监控
- ✅ 支持条件请求优化

**缺点**：
- ❌ 存在延迟（轮询间隔）
- ❌ 可能产生不必要的请求（数据未更新时）
- ❌ 服务器负载随轮询频率增加而增加

---

## 3. WebSocket 方案（可选）

### 3.1 方案概述

WebSocket 方案是 TaskEcho 系统的**可选实时更新方案**，通过建立 WebSocket 连接实现服务器主动推送数据更新。该方案实时性更好，但实现复杂度较高。

### 3.2 WebSocket 架构设计

#### 3.2.1 连接建立

```
前端
  ↓
1. 建立 WebSocket 连接
   ws://localhost:3000/ws
  ↓
2. 发送订阅消息
   {
     "type": "subscribe",
     "channels": ["projects", "stats"]
   }
  ↓
后端
  ↓
3. 验证订阅请求
  ↓
4. 返回订阅确认
   {
     "type": "subscribed",
     "channels": ["projects", "stats"]
   }
```

#### 3.2.2 消息格式

**订阅消息**：
```json
{
  "type": "subscribe",
  "channels": ["projects", "stats", "project:project_001", "task:project_001:queue_001:task_001"]
}
```

**取消订阅消息**：
```json
{
  "type": "unsubscribe",
  "channels": ["projects"]
}
```

**数据更新推送**：
```json
{
  "type": "update",
  "channel": "projects",
  "data": {
    "action": "updated",
    "project_id": "project_001",
    "changes": {
      "last_task_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

**错误消息**：
```json
{
  "type": "error",
  "code": "INVALID_CHANNEL",
  "message": "无效的频道"
}
```

#### 3.2.3 频道设计

| 频道名称 | 说明 | 触发时机 |
|---------|------|---------|
| `projects` | 项目列表更新 | 项目创建/更新/删除 |
| `stats` | 全局统计更新 | 任何数据变更 |
| `project:{projectId}` | 项目详情更新 | 项目信息变更 |
| `queue:{projectId}:{queueId}` | 任务队列更新 | 队列信息或任务变更 |
| `task:{projectId}:{queueId}:{taskId}` | 任务详情更新 | 任务信息、消息或日志变更 |

### 3.3 WebSocket 实现方案

#### 3.3.1 后端实现（Next.js API Route）

```javascript
// app/api/ws/route.js
import { Server } from 'ws'

let wss = null

export async function GET(request) {
  if (!wss) {
    // 初始化 WebSocket 服务器
    wss = new WebSocketServer({ noServer: true })
    
    wss.on('connection', (ws) => {
      const subscriptions = new Set()
      
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString())
          
          switch (data.type) {
            case 'subscribe':
              // 验证频道
              const validChannels = validateChannels(data.channels)
              validChannels.forEach(channel => subscriptions.add(channel))
              
              ws.send(JSON.stringify({
                type: 'subscribed',
                channels: Array.from(subscriptions)
              }))
              break
              
            case 'unsubscribe':
              data.channels.forEach(channel => subscriptions.delete(channel))
              ws.send(JSON.stringify({
                type: 'unsubscribed',
                channels: Array.from(subscriptions)
              }))
              break
              
            default:
              ws.send(JSON.stringify({
                type: 'error',
                code: 'INVALID_MESSAGE_TYPE',
                message: '无效的消息类型'
              }))
          }
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'error',
            code: 'PARSE_ERROR',
            message: '消息解析失败'
          }))
        }
      })
      
      ws.on('close', () => {
        subscriptions.clear()
      })
    })
  }
  
  // 返回 WebSocket 升级响应
  // 注意：Next.js 需要特殊处理 WebSocket 升级
  // 实际实现可能需要使用自定义服务器或中间件
}
```

#### 3.3.2 前端实现

```javascript
// WebSocket Hook
function useWebSocket(url, options = {}) {
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [subscriptions, setSubscriptions] = useState(new Set())
  
  useEffect(() => {
    const ws = new WebSocket(url)
    
    ws.onopen = () => {
      setIsConnected(true)
      setSocket(ws)
    }
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      options.onMessage?.(message)
    }
    
    ws.onerror = (error) => {
      options.onError?.(error)
    }
    
    ws.onclose = () => {
      setIsConnected(false)
      setSocket(null)
      // 自动重连
      if (options.autoReconnect) {
        setTimeout(() => {
          // 重新建立连接
        }, 1000)
      }
    }
    
    return () => {
      ws.close()
    }
  }, [url])
  
  const subscribe = (channels) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify({
        type: 'subscribe',
        channels: Array.isArray(channels) ? channels : [channels]
      }))
      setSubscriptions(prev => {
        const next = new Set(prev)
        channels.forEach(ch => next.add(ch))
        return next
      })
    }
  }
  
  const unsubscribe = (channels) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify({
        type: 'unsubscribe',
        channels: Array.isArray(channels) ? channels : [channels]
      }))
      setSubscriptions(prev => {
        const next = new Set(prev)
        channels.forEach(ch => next.delete(ch))
        return next
      })
    }
  }
  
  return { socket, isConnected, subscribe, unsubscribe }
}
```

### 3.4 WebSocket 数据推送触发

#### 3.4.1 后端数据变更时推送

```javascript
// 在数据更新接口中触发推送
async function updateTaskStatus(projectId, queueId, taskId, status) {
  // 更新数据库
  const task = await prisma.task.update({
    where: { /* ... */ },
    data: { status }
  })
  
  // 推送更新通知
  broadcastUpdate({
    channel: `task:${projectId}:${queueId}:${taskId}`,
    data: {
      action: 'status_updated',
      task_id: taskId,
      status: status
    }
  })
  
  // 推送项目列表更新
  broadcastUpdate({
    channel: 'projects',
    data: {
      action: 'task_updated',
      project_id: projectId
    }
  })
  
  // 推送统计更新
  broadcastUpdate({
    channel: 'stats',
    data: {
      action: 'stats_changed'
    }
  })
}
```

### 3.5 WebSocket 方案优缺点

**优点**：
- ✅ 实时性好，延迟低
- ✅ 服务器可以主动推送，减少不必要的请求
- ✅ 适合高频更新场景（如任务详情页）

**缺点**：
- ❌ 实现复杂度较高
- ❌ 需要维护 WebSocket 连接，增加服务器资源消耗
- ❌ Next.js 对 WebSocket 支持有限，可能需要自定义服务器
- ❌ 连接断开需要处理重连逻辑
- ❌ 对于单用户本地应用，可能过度设计

### 3.6 推荐使用场景

WebSocket 方案推荐在以下场景使用：
- 任务详情页的实时对话更新（高频更新）
- 需要极低延迟的场景
- 未来扩展多用户或实时协作功能时

---

## 4. 数据缓存策略

### 4.1 缓存层级

#### 4.1.1 浏览器缓存（HTTP Cache）

**适用数据**：
- 静态资源（CSS、JS、图片）
- 不经常变更的数据（如项目列表，可缓存 30 秒）

**实现方式**：
```javascript
// 后端设置 Cache-Control 头
export async function GET(request) {
  const response = await fetchData()
  
  return Response.json(response, {
    headers: {
      'Cache-Control': 'private, max-age=30' // 缓存 30 秒
    }
  })
}
```

#### 4.1.2 内存缓存（React Query / SWR）

**适用数据**：
- 所有 API 响应数据
- 组件状态数据

**实现方式**（使用 React Query）：
```javascript
import { useQuery } from '@tanstack/react-query'

function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => fetch('/api/v1/projects').then(res => res.json()),
    staleTime: 30000, // 30 秒内认为数据是新鲜的
    cacheTime: 300000, // 5 分钟内保留缓存
    refetchInterval: 30000 // 每 30 秒自动刷新
  })
}
```

#### 4.1.3 本地存储缓存（localStorage / sessionStorage）

**适用数据**：
- 用户偏好设置（主题模式）
- 临时数据（如任务详情页的本地回复）

**实现方式**：
```javascript
// 保存用户偏好
localStorage.setItem('theme', 'dark')

// 保存临时数据
sessionStorage.setItem('task_reply_draft', JSON.stringify(draft))
```

### 4.2 缓存策略设计

#### 4.2.1 不同数据的缓存时间

| 数据类型 | 缓存时间 | 说明 |
|---------|---------|------|
| **项目列表** | 30 秒 | 更新频率较低 |
| **项目详情** | 30 秒 | 更新频率较低 |
| **任务队列列表** | 30 秒 | 更新频率较低 |
| **任务列表** | 30 秒 | 更新频率较低 |
| **任务详情** | 5-10 秒 | 更新频率较高 |
| **全局统计** | 30 秒 | 更新频率较低 |

#### 4.2.2 缓存失效策略

**时间失效**：
- 数据超过缓存时间后自动失效
- 下次请求时重新获取数据

**事件失效**：
- 用户操作触发数据更新时，立即失效相关缓存
- 例如：用户发送回复后，失效任务详情缓存

**手动失效**：
- 提供手动刷新按钮
- 下拉刷新（移动端）

### 4.3 缓存实现示例

#### 4.3.1 React Query 缓存配置

```javascript
// 全局 React Query 配置
import { QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 秒
      cacheTime: 300000, // 5 分钟
      refetchOnWindowFocus: true, // 窗口聚焦时重新获取
      refetchOnReconnect: true, // 网络重连时重新获取
      retry: 3, // 失败重试 3 次
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
    }
  }
})
```

#### 4.3.2 自定义缓存 Hook

```javascript
// 自定义缓存 Hook（带增量更新检测）
function useCachedQuery(queryKey, queryFn, options = {}) {
  const {
    staleTime = 30000,
    refetchInterval,
    enableIncrementalUpdate = false
  } = options
  
  const [cache, setCache] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  
  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await queryFn()
      
      if (enableIncrementalUpdate && cache) {
        // 增量更新逻辑
        return mergeIncrementalData(cache, result)
      }
      
      return result
    },
    staleTime,
    refetchInterval,
    onSuccess: (data) => {
      setCache(data)
      setLastUpdate(Date.now())
    }
  })
  
  return { data, isLoading, error, lastUpdate }
}
```

### 4.4 缓存一致性保证

#### 4.4.1 乐观更新

```javascript
// 乐观更新示例（任务详情页发送回复）
function useOptimisticMessage(taskId) {
  const queryClient = useQueryClient()
  
  const addMessage = useMutation({
    mutationFn: async (message) => {
      // 本地立即添加消息（不调用 API）
      const queryKey = ['task', taskId]
      const previousData = queryClient.getQueryData(queryKey)
      
      queryClient.setQueryData(queryKey, (old) => ({
        ...old,
        messages: [
          ...old.messages,
          {
            id: `local_${Date.now()}`,
            role: 'user',
            content: message,
            created_at: new Date().toISOString(),
            isLocal: true // 标记为本地消息
          }
        ]
      }))
      
      return previousData
    },
    onError: (err, message, context) => {
      // 回滚乐观更新
      queryClient.setQueryData(['task', taskId], context.previousData)
    }
  })
  
  return { addMessage }
}
```

#### 4.4.2 缓存失效和重新获取

```javascript
// 数据更新后失效缓存
function useInvalidateCache() {
  const queryClient = useQueryClient()
  
  const invalidateProjects = () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] })
  }
  
  const invalidateProject = (projectId) => {
    queryClient.invalidateQueries({ queryKey: ['project', projectId] })
  }
  
  const invalidateTask = (projectId, queueId, taskId) => {
    queryClient.invalidateQueries({
      queryKey: ['task', projectId, queueId, taskId]
    })
  }
  
  return { invalidateProjects, invalidateProject, invalidateTask }
}
```

---

## 5. 数据一致性保证

### 5.1 一致性级别

#### 5.1.1 最终一致性

**说明**：数据更新后，经过一定时间（轮询间隔）后，所有客户端都能看到最新数据。

**适用场景**：
- 项目列表更新
- 任务队列列表更新
- 任务列表更新
- 全局统计更新

**保证机制**：
- 轮询机制确保数据最终会更新
- 缓存时间设置合理，避免数据过旧

#### 5.1.2 强一致性（关键数据）

**说明**：数据更新后立即反映到用户界面。

**适用场景**：
- 任务详情页的消息和日志更新
- 用户操作后的数据更新（如发送回复）

**保证机制**：
- 更频繁的轮询（5-10 秒）
- 乐观更新
- WebSocket 实时推送（如果使用）

### 5.2 数据更新检测

#### 5.2.1 基于时间戳的检测

```javascript
// 使用 updatedAt 时间戳检测更新
async function checkForUpdates(resourceId, lastUpdateTime) {
  const response = await fetch(`/api/v1/resource/${resourceId}`, {
    headers: {
      'If-Modified-Since': lastUpdateTime
    }
  })
  
  if (response.status === 304) {
    // 数据未更新
    return null
  }
  
  return response.json()
}
```

#### 5.2.2 基于版本号的检测

```javascript
// 使用版本号检测更新（如果后端支持）
async function checkForUpdates(resourceId, currentVersion) {
  const response = await fetch(`/api/v1/resource/${resourceId}?version=${currentVersion}`)
  
  if (response.status === 304) {
    // 数据未更新
    return null
  }
  
  const data = await response.json()
  return {
    data: data.data,
    version: data.version
  }
}
```

#### 5.2.3 基于数据哈希的检测

```javascript
// 使用数据哈希检测更新
function calculateDataHash(data) {
  return btoa(JSON.stringify(data)).substring(0, 16)
}

async function checkForUpdates(resourceId, currentHash) {
  const response = await fetch(`/api/v1/resource/${resourceId}`)
  const data = await response.json()
  const newHash = calculateDataHash(data)
  
  if (newHash === currentHash) {
    // 数据未更新
    return null
  }
  
  return { data, hash: newHash }
}
```

### 5.3 冲突处理

#### 5.3.1 乐观锁机制

```javascript
// 使用版本号实现乐观锁
async function updateTask(taskId, updates, currentVersion) {
  const response = await fetch(`/api/v1/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'If-Match': currentVersion // 版本号
    },
    body: JSON.stringify(updates)
  })
  
  if (response.status === 412) {
    // 版本冲突，需要重新获取数据
    throw new Error('数据已被其他操作修改，请刷新后重试')
  }
  
  return response.json()
}
```

#### 5.3.2 最后写入获胜（LWW）

**说明**：对于 TaskEcho 系统，由于是单用户本地应用，且数据主要由外部系统推送，采用"最后写入获胜"策略即可。

**实现**：
- 后端使用 `updatedAt` 时间戳判断最新数据
- 前端轮询时总是获取最新数据
- 本地操作（如回复）立即更新，等待后端同步

### 5.4 数据同步流程

#### 5.4.1 正常同步流程

```
1. 外部系统推送数据更新
   POST /api/v1/submit
   ↓
2. 后端更新数据库
   ↓
3. 前端轮询检测到更新
   GET /api/v1/projects
   ↓
4. 前端更新缓存和 UI
   ↓
5. 用户看到最新数据
```

#### 5.4.2 增量更新流程

```
1. 外部系统追加消息
   POST /api/v1/tasks/:projectId/:queueId/:taskId/message
   ↓
2. 后端更新数据库
   ↓
3. 前端轮询检测到新消息（通过消息 ID 或数量）
   GET /api/v1/projects/:projectId/queues/:queueId/tasks/:taskId
   ↓
4. 前端增量更新 UI（只添加新消息，不重新渲染所有消息）
   ↓
5. 用户看到新消息
```

---

## 6. 业务流程说明

### 6.1 首页数据更新流程

```
用户打开首页
  ↓
1. 初始加载
   ├─ GET /api/v1/projects
   └─ GET /api/v1/stats
  ↓
2. 渲染页面内容
  ↓
3. 启动轮询（30 秒间隔）
   ├─ 页面可见时：正常轮询
   ├─ 页面隐藏时：暂停轮询
   └─ 页面重新可见时：立即轮询一次
  ↓
4. 每次轮询
   ├─ 检查数据是否有更新（比较时间戳或数据哈希）
   ├─ 如果有更新：更新缓存和 UI
   └─ 如果无更新：不更新 UI（避免闪烁）
  ↓
5. 用户离开页面时：停止轮询
```

### 6.2 任务详情页数据更新流程

```
用户打开任务详情页
  ↓
1. 初始加载
   GET /api/v1/projects/:projectId/queues/:queueId/tasks/:taskId
  ↓
2. 渲染页面内容
   ├─ 对话消息列表（按时间正序）
   └─ 日志列表（按时间倒序）
  ↓
3. 启动轮询（5-10 秒间隔）
   ├─ 页面可见时：正常轮询
   ├─ 页面隐藏时：暂停轮询
   └─ 用户正在输入时：暂停轮询
  ↓
4. 每次轮询
   ├─ 检测新消息（比较消息 ID 或数量）
   ├─ 检测新日志（比较日志 ID 或数量）
   ├─ 检测状态变化
   └─ 如果有更新：
       ├─ 增量更新 UI（只添加新内容）
       ├─ 不重新渲染所有内容（性能优化）
       └─ 可选：自动滚动到底部（显示新消息）
  ↓
5. 用户发送回复
   ├─ 立即添加本地消息（乐观更新）
   ├─ 不调用后端 API
   └─ 等待外部系统轮询发现并处理
  ↓
6. 用户离开页面时：停止轮询
```

### 6.3 数据更新触发流程

```
外部系统推送数据
  ↓
1. 调用提交接口
   POST /api/v1/submit
   或
   POST /api/v1/tasks/:projectId/:queueId/:taskId/message
   POST /api/v1/tasks/:projectId/:queueId/:taskId/log
   PATCH /api/v1/tasks/:projectId/:queueId/:taskId/status
  ↓
2. 后端更新数据库
   ├─ 更新项目/队列/任务数据
   ├─ 更新时间戳（updatedAt, lastTaskAt）
   └─ 如果使用 WebSocket：推送更新通知
  ↓
3. 前端轮询检测到更新
   ├─ 比较时间戳或数据哈希
   └─ 如果有更新：获取最新数据
  ↓
4. 前端更新 UI
   ├─ 更新缓存
   ├─ 增量更新 UI（避免全量重新渲染）
   └─ 显示更新提示（可选）
```

---

## 7. 性能优化建议

### 7.1 减少不必要的请求

1. **条件请求**：使用 `If-Modified-Since` 或 `ETag` 头
2. **请求去重**：防止并发请求
3. **智能轮询**：页面隐藏时暂停轮询
4. **增量更新**：只获取变化的数据

### 7.2 优化数据传输

1. **字段选择**：只请求需要的字段
2. **数据压缩**：启用 gzip 压缩
3. **分页查询**：避免一次性加载大量数据
4. **增量更新接口**：使用增量更新接口而非全量查询

### 7.3 优化 UI 更新

1. **增量渲染**：只更新变化的部分
2. **虚拟滚动**：长列表使用虚拟滚动
3. **防抖节流**：避免频繁更新 UI
4. **乐观更新**：用户操作立即反馈

### 7.4 监控和调试

1. **请求日志**：记录轮询请求和响应
2. **性能监控**：监控轮询频率和响应时间
3. **错误处理**：网络错误时指数退避重试
4. **用户反馈**：显示数据更新时间（可选）

---

## 8. 实现建议

### 8.1 推荐方案组合

**基础方案**（推荐）：
- 首页、项目详情页、任务队列详情页：30 秒轮询
- 任务详情页：5-10 秒轮询
- 使用 React Query 进行缓存管理
- 页面可见性感知轮询

**增强方案**（可选）：
- 任务详情页使用 WebSocket 实时推送
- 其他页面保持轮询方案
- 混合使用轮询和 WebSocket

### 8.2 实施步骤

1. **第一阶段**：实现基础轮询方案
   - 实现轮询 Hook
   - 实现页面可见性感知
   - 集成 React Query 缓存

2. **第二阶段**：优化轮询性能
   - 实现增量更新检测
   - 实现请求去重
   - 实现条件请求

3. **第三阶段**（可选）：实现 WebSocket 方案
   - 实现 WebSocket 服务器
   - 实现前端 WebSocket 客户端
   - 实现频道订阅机制

### 8.3 配置建议

```javascript
// 轮询配置
const POLLING_CONFIG = {
  // 首页
  homePage: {
    interval: 30000, // 30 秒
    enabled: true
  },
  
  // 项目详情页
  projectDetail: {
    interval: 30000, // 30 秒
    enabled: true
  },
  
  // 任务队列详情页
  queueDetail: {
    interval: 30000, // 30 秒
    enabled: true
  },
  
  // 任务详情页
  taskDetail: {
    interval: 5000, // 5 秒
    enabled: true,
    incrementalUpdate: true // 启用增量更新
  }
}

// 缓存配置
const CACHE_CONFIG = {
  staleTime: 30000, // 30 秒
  cacheTime: 300000, // 5 分钟
  refetchOnWindowFocus: true,
  refetchOnReconnect: true
}
```

---

## 9. 总结

本文档详细说明了 TaskEcho 系统的实时更新机制设计，包括：

1. **轮询方案**（推荐）：
   - 不同页面使用不同的轮询频率
   - 智能轮询策略（页面可见性、用户交互优化）
   - 增量更新检测和性能优化

2. **WebSocket 方案**（可选）：
   - 实时推送架构设计
   - 频道订阅机制
   - 适用于高频更新场景

3. **数据缓存策略**：
   - 多层级缓存（浏览器缓存、内存缓存、本地存储）
   - 缓存失效策略
   - 缓存一致性保证

4. **数据一致性保证**：
   - 最终一致性和强一致性
   - 数据更新检测机制
   - 冲突处理和同步流程

5. **业务流程说明**：
   - 各页面的数据更新流程
   - 数据更新触发流程

6. **性能优化建议**：
   - 减少不必要的请求
   - 优化数据传输和 UI 更新
   - 监控和调试

推荐采用**轮询方案 + React Query 缓存**的基础方案，该方案实现简单、性能良好，完全满足单用户本地应用的需求。如果未来需要更低的延迟或扩展多用户功能，可以考虑引入 WebSocket 方案。
