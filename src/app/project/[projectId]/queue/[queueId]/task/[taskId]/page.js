'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Breadcrumb from '@/components/layout/Breadcrumb'
import { MessageList } from '@/components/task/MessageList'
import { ReplyInput } from '@/components/task/ReplyInput'
import { Button } from '@/components/ui/button'
import { AlertCircle, ClipboardList, FileText, RefreshCw, Info } from 'lucide-react'
import { useToast as useShadcnToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { useIncrementalUpdate } from '@/hooks/useIncrementalUpdate'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useSwipeBack } from '@/hooks/useSwipeBack'
import { AuthGuard } from '@/components/auth/AuthGuard'

const POLLING_INTERVAL = 5000 // 5秒轮询间隔（任务详情页需要更频繁的更新）

/**
 * 格式化时间显示
 */
function formatDateTime(dateString) {
  if (!dateString) return '暂无更新'

  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date

  // 小于1分钟：刚刚
  if (diff < 60000) return '刚刚'

  // 小于1小时：X分钟前
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes}分钟前`
  }

  // 小于24小时：X小时前
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours}小时前`
  }

  // 小于7天：X天前
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000)
    return `${days}天前`
  }

  // 其他：显示具体日期时间
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * 获取状态徽章样式
 */
function getStatusBadgeClass(status) {
  const statusLower = (status || 'pending').toLowerCase()
  switch (statusLower) {
    case 'pending':
      return 'bg-yellow-500 text-white'
    case 'done':
      return 'bg-green-600 text-white dark:bg-green-500'
    case 'error':
      return 'bg-red-500 text-white'
    default:
      return 'bg-gray-500 text-white'
  }
}

/**
 * 获取状态显示文本
 */
function getStatusText(status) {
  const statusLower = (status || 'pending').toLowerCase()
  switch (statusLower) {
    case 'pending':
      return 'Pending'
    case 'done':
      return 'Done'
    case 'error':
      return 'Error'
    default:
      return status || 'Pending'
  }
}

/**
 * 获取任务详情数据（合并项目、队列和任务详情）
 */
async function fetchTaskDetailData(projectId, queueId, taskId) {
  const { fetchWithAuth } = await import('@/lib/fetch-utils')
  // 对项目ID、队列ID和任务ID进行URL编码，因为ID可能包含特殊字符
  const encodedProjectId = encodeURIComponent(projectId)
  const encodedQueueId = encodeURIComponent(queueId)
  const encodedTaskId = encodeURIComponent(taskId)
  const [projectResponse, queueResponse, taskResponse] = await Promise.all([
    fetchWithAuth(`/api/v1/projects/${encodedProjectId}`),
    fetchWithAuth(`/api/v1/projects/${encodedProjectId}/queues/${encodedQueueId}`),
    fetchWithAuth(`/api/v1/projects/${encodedProjectId}/queues/${encodedQueueId}/tasks/${encodedTaskId}`)
  ])

  if (!projectResponse.ok) {
    if (projectResponse.status === 404) {
      throw new Error('项目不存在')
    }
    throw new Error(`获取项目信息失败: ${projectResponse.status}`)
  }

  if (!queueResponse.ok) {
    if (queueResponse.status === 404) {
      throw new Error('任务队列不存在')
    }
    throw new Error(`获取任务队列信息失败: ${queueResponse.status}`)
  }

  if (!taskResponse.ok) {
    if (taskResponse.status === 404) {
      throw new Error('任务不存在')
    }
    throw new Error(`获取任务详情失败: ${taskResponse.status}`)
  }

  const [projectData, queueData, taskData] = await Promise.all([
    projectResponse.json(),
    queueResponse.json(),
    taskResponse.json()
  ])

  if (!projectData.success) {
    throw new Error(projectData.error?.message || '获取项目信息失败')
  }

  if (!queueData.success) {
    throw new Error(queueData.error?.message || '获取任务队列信息失败')
  }

  if (!taskData.success) {
    throw new Error(taskData.error?.message || '获取任务详情失败')
  }

  return {
    project: projectData.data,
    queue: queueData.data,
    task: taskData.data
  }
}

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params?.projectId
  const queueId = params?.queueId
  const taskId = params?.taskId
  // 对项目ID、队列ID和任务ID进行URL编码，用于构建路由链接
  const encodedProjectId = projectId ? encodeURIComponent(projectId) : ''
  const encodedQueueId = queueId ? encodeURIComponent(queueId) : ''
  const encodedTaskId = taskId ? encodeURIComponent(taskId) : ''
  const { toast } = useShadcnToast()

  const [localMessages, setLocalMessages] = useState([]) // 本地消息（待发送）
  const messagesEndRef = useRef(null)

  // 创建获取数据的函数
  const fetchData = useCallback(() => {
    if (!projectId || !queueId || !taskId) return Promise.resolve(null)
    return fetchTaskDetailData(projectId, queueId, taskId)
  }, [projectId, queueId, taskId])

  // 使用增量更新轮询（已禁用自动刷新，仅保留首次加载和手动刷新）
  const {
    data,
    isLoading,
    error,
    refetch
  } = useIncrementalUpdate(fetchData, POLLING_INTERVAL, {
    enabled: false, // 禁用自动刷新
    onNewMessages: (newMessages) => {
      // 有新消息时，可选：自动滚动到底部
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        } else {
          window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth'
          })
        }
      }, 100)
    },
    onNewLogs: (newLogs) => {
      // 有新日志时的处理（可选）
    },
    onStatusChange: (newStatus, oldStatus) => {
      // 状态变化时的处理（可选）
      if (newStatus === 'done' || newStatus === 'error') {
        toast({
          title: '任务状态已更新',
          description: `任务状态从 ${oldStatus} 变更为 ${newStatus}`,
        })
      }
    }
  })

  // 下拉刷新
  const { isRefreshing: isPullRefreshing, pullDistance, isPulling } = usePullToRefresh(
    () => refetch(),
    {
      threshold: 80,
      resistance: 0.5,
      enabled: !isLoading && !!projectId && !!queueId && !!taskId
    }
  )

  // 处理发送回复
  const handleSendReply = useCallback(
    (localMessage) => {
      // 追加本地消息到消息列表
      setLocalMessages((prev) => [...prev, localMessage])

      // 滚动到底部
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        } else {
          window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth'
          })
        }
      }, 100)
    },
    []
  )

  // 滑动返回功能 - 必须在所有 hooks 之后，但在早期返回之前
  const handleSwipeBack = useCallback(() => {
    router.push(`/project/${encodedProjectId}/queue/${encodedQueueId}`)
  }, [router, encodedProjectId, encodedQueueId])

  useSwipeBack(handleSwipeBack)

  // 提取数据
  const project = data?.project || null
  const queue = data?.queue || null
  const task = data?.task || null
  const messages = task?.messages || []

  // 合并消息（API消息 + 本地消息）
  const allMessages = [...messages, ...localMessages].sort((a, b) => {
    const dateA = new Date(a.created_at || 0)
    const dateB = new Date(b.created_at || 0)
    return dateA - dateB
  })

  // 项目、队列或任务不存在错误
  if (error && error.message && (
    error.message.includes('项目不存在') ||
    error.message.includes('任务队列不存在') ||
    error.message.includes('任务不存在')
  )) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <main className="container mx-auto px-4 md:px-5 lg:px-6 py-4 md:py-5 lg:py-6">
          <div className="text-center py-12 md:py-16 lg:py-20">
            <AlertCircle className="h-12 w-12 md:h-16 md:w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold text-gray-900 dark:text-gray-50 mb-2">
              {error.message.includes('项目不存在')
                ? '项目不存在'
                : error.message.includes('任务队列不存在')
                  ? '任务队列不存在'
                  : '任务不存在'}
            </h2>
            <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 mb-6">
              {error.message}
            </p>
            <Button
              onClick={() =>
                router.push(`/project/${encodedProjectId}/queue/${encodedQueueId}`)
              }
            >
              返回任务队列详情页
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col relative">
        {/* 下拉刷新指示器 */}
        {(isPulling || isPullRefreshing) && (
          <div
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 transition-transform duration-200 ease-out"
            style={{
              transform: `translateY(${Math.min(pullDistance, 80) - 80}px)`,
              height: '80px'
            }}
          >
            <div className="flex flex-col items-center gap-2">
              <RefreshCw
                className={cn(
                  'h-5 w-5 md:h-6 md:w-6 text-blue-600 dark:text-blue-400 transition-transform duration-200',
                  isPullRefreshing && 'animate-spin',
                  !isPullRefreshing && pullDistance >= 80 && 'rotate-180'
                )}
              />
              <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                {isPullRefreshing ? '正在刷新...' : pullDistance >= 80 ? '释放即可刷新' : '下拉刷新'}
              </span>
            </div>
          </div>
        )}

        {/* 固定标题栏 */}
        <header className="sticky top-0 z-40 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="container mx-auto px-4 md:px-5 lg:px-6 py-4 md:py-5 lg:py-6">
            {/* 面包屑导航 */}
            <Breadcrumb
              items={[
                {
                  label: project?.name || '项目',
                  href: project ? `/project/${encodedProjectId}` : undefined,
                },
                {
                  label: queue?.name || '队列',
                  href: queue
                    ? `/project/${encodedProjectId}/queue/${encodedQueueId}`
                    : undefined,
                },
                {
                  label: task?.name || '任务',
                  href: undefined, // 当前页面，不可点击
                },
              ]}
            />

            {/* 页面头部 */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 mt-4 md:mt-5 lg:mt-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                  {/* 状态徽章 */}
                  {task?.status && (
                    <span
                      className={cn(
                        'px-2 md:px-3 py-1 md:py-1.5 rounded-md text-xs md:text-sm font-medium shrink-0',
                        getStatusBadgeClass(task.status)
                      )}
                    >
                      {getStatusText(task.status)}
                    </span>
                  )}
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                    <ClipboardList className="h-6 w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
                    <span className="truncate">{task?.name || '任务详情'}</span>
                  </h1>
                  {/* 元数据按钮 */}
                  {task && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/project/${encodedProjectId}/queue/${encodedQueueId}/task/${encodedTaskId}/metadata`)}
                      className="h-9 md:h-10 px-3 md:px-4 shrink-0"
                      aria-label="查看元数据"
                    >
                      <Info className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                      <span className="hidden sm:inline">元数据</span>
                    </Button>
                  )}
                  {/* 日志按钮 */}
                  {task && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/project/${encodedProjectId}/queue/${encodedQueueId}/task/${encodedTaskId}/logs`)}
                      className="h-9 md:h-10 px-3 md:px-4 shrink-0"
                      aria-label="查看执行日志"
                    >
                      <FileText className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                      <span className="hidden sm:inline">日志</span>
                    </Button>
                  )}
                </div>
                {/* 标签列表 */}
                {task?.tags && task.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 md:gap-3">
                    {task.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 md:px-3 py-1 md:py-1.5 rounded-md text-xs md:text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {/* 时间显示 */}
              {task?.updated_at && (
                <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 shrink-0 whitespace-nowrap">
                  {formatDateTime(task.updated_at)}
                </div>
              )}
            </div>
          </div>
        </header>

        <main 
          className={cn(
            "flex-1 container mx-auto px-4 md:px-5 lg:px-6 py-4 md:py-5 lg:py-6 pb-32 md:pb-40 transition-transform duration-200 ease-out flex flex-col min-h-0"
          )}
          style={{
            transform: (isPulling || isPullRefreshing) 
              ? `translateY(${Math.min(pullDistance, 80)}px)` 
              : undefined
          }}
        >
          {/* 错误提示 */}
          {error &&
            !isLoading &&
            !error.message?.includes('项目不存在') &&
            !error.message?.includes('任务队列不存在') &&
            !error.message?.includes('任务不存在') && (
              <div className="mb-4 md:mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 shrink-0">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm md:text-base text-red-800 dark:text-red-200">
                    {error.message || '加载数据失败'}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    if (refetch) {
                      refetch()
                    } else {
                      fetchData().catch(err => {
                        toast({
                          title: '刷新失败',
                          description: err.message || '请稍后重试',
                          variant: 'destructive'
                        })
                      })
                    }
                  }} 
                  className="h-8 md:h-9"
                >
                  重试
                </Button>
              </div>
            )}

          {/* 加载状态 */}
          {isLoading && !task && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 md:h-10 md:w-10 text-gray-400 mx-auto mb-4 animate-spin" />
                <p className="text-base md:text-lg text-gray-600 dark:text-gray-400">
                  正在加载任务详情...
                </p>
              </div>
            </div>
          )}

          {/* 内容区域 */}
          {!isLoading && task && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* 对话区域 - 占满剩余高度 */}
              <div className="flex-1 overflow-y-auto min-h-0">
                <MessageList messages={allMessages} />
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </main>

        {/* 回复输入区域（固定在底部） */}
        {!isLoading && task && (
          <ReplyInput onSend={handleSendReply} disabled={isLoading} />
        )}
      </div>
    </AuthGuard>
  )
}
