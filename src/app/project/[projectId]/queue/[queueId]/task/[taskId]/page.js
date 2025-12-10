'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Breadcrumb from '@/components/layout/Breadcrumb'
import { MessageList } from '@/components/task/MessageList'
import { ReplyInput } from '@/components/task/ReplyInput'
import { Button } from '@/components/ui/button'
import { AlertCircle, ClipboardList, FileText, RefreshCw, Info, Edit, Trash2, Move, History } from 'lucide-react'
import { TaskPullStatus } from '@/components/pull/TaskPullStatus'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card, CardContent } from '@/components/ui/card'
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
  
  // 删除/移动相关状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [pullHistoryDialogOpen, setPullHistoryDialogOpen] = useState(false)
  const [pullHistory, setPullHistory] = useState([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [isLoadingPullHistory, setIsLoadingPullHistory] = useState(false)

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

  // 加载拉取历史
  const loadPullHistory = useCallback(async () => {
    if (!projectId || !taskId) return
    
    setIsLoadingPullHistory(true)
    try {
      const { fetchWithAuth } = await import('@/lib/fetch-utils')
      const encodedProjectId = encodeURIComponent(projectId)
      const encodedTaskId = encodeURIComponent(taskId)
      
      // 如果是队列中的任务，需要从队列API获取
      if (queueId) {
        const encodedQueueId = encodeURIComponent(queueId)
        const response = await fetchWithAuth(`/api/v1/projects/${encodedProjectId}/queues/${encodedQueueId}/tasks/${encodedTaskId}`)
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data.pull_history) {
            setPullHistory(result.data.pull_history)
          }
        }
      } else {
        // 项目级任务
        const response = await fetchWithAuth(`/api/v1/projects/${encodedProjectId}/tasks/${encodedTaskId}/pull/history`)
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data.pull_history) {
            setPullHistory(result.data.pull_history)
          }
        }
      }
    } catch (error) {
      console.error('加载拉取历史失败:', error)
    } finally {
      setIsLoadingPullHistory(false)
    }
  }, [projectId, queueId, taskId])

  // 跳转到编辑任务页面
  const handleEditTask = useCallback(() => {
    if (!projectId || !taskId) return
    if (queueId) {
      router.push(`/project/${encodeURIComponent(projectId)}/queue/${encodeURIComponent(queueId)}/task/${encodeURIComponent(taskId)}/edit`)
    } else {
      router.push(`/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(taskId)}/edit`)
    }
  }, [projectId, queueId, taskId, router])

  // 删除任务
  const handleDeleteTask = useCallback(async () => {
    if (!projectId || !taskId) return

    setIsDeleting(true)
    try {
      const { fetchWithAuth } = await import('@/lib/fetch-utils')
      const encodedProjectId = encodeURIComponent(projectId)
      
      let response
      if (queueId) {
        const encodedQueueId = encodeURIComponent(queueId)
        const encodedTaskId = encodeURIComponent(taskId)
        response = await fetchWithAuth(`/api/v1/projects/${encodedProjectId}/queues/${encodedQueueId}/tasks/${encodedTaskId}`, {
          method: 'DELETE'
        })
      } else {
        const encodedTaskId = encodeURIComponent(taskId)
        response = await fetchWithAuth(`/api/v1/projects/${encodedProjectId}/tasks/${encodedTaskId}`, {
          method: 'DELETE'
        })
      }

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || '删除任务失败')
      }

      toast({
        title: '成功',
        description: '任务删除成功',
        variant: 'default'
      })

      setDeleteDialogOpen(false)
      // 删除成功后返回
      if (queueId) {
        router.push(`/project/${encodedProjectId}/queue/${encodedQueueId}`)
      } else {
        router.push(`/project/${encodedProjectId}`)
      }
    } catch (error) {
      toast({
        title: '删除失败',
        description: error.message || '请稍后重试',
        variant: 'destructive'
      })
      setIsDeleting(false)
    }
  }, [projectId, queueId, taskId, toast, router, encodedProjectId])

  // 移动任务
  const handleMoveTask = useCallback(async (targetQueueId) => {
    if (!projectId || !taskId) return

    setIsMoving(true)
    try {
      const { fetchWithAuth } = await import('@/lib/fetch-utils')
      const encodedProjectId = encodeURIComponent(projectId)
      const encodedTaskId = encodeURIComponent(taskId)
      
      const response = await fetchWithAuth(`/api/v1/projects/${encodedProjectId}/tasks/${encodedTaskId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue_id: targetQueueId || null })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || '移动任务失败')
      }

      toast({
        title: '成功',
        description: '任务移动成功',
        variant: 'default'
      })

      setMoveDialogOpen(false)
      // 移动成功后返回
      if (targetQueueId) {
        const encodedTargetQueueId = encodeURIComponent(targetQueueId)
        router.push(`/project/${encodedProjectId}/queue/${encodedTargetQueueId}`)
      } else {
        router.push(`/project/${encodedProjectId}`)
      }
    } catch (error) {
      toast({
        title: '移动失败',
        description: error.message || '请稍后重试',
        variant: 'destructive'
      })
      setIsMoving(false)
    }
  }, [projectId, taskId, toast, router, encodedProjectId])

  // 打开拉取历史对话框
  const handleOpenPullHistory = useCallback(() => {
    setPullHistoryDialogOpen(true)
    loadPullHistory()
  }, [loadPullHistory])

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
                  {/* 任务来源和拉取状态 */}
                  {task && (
                    <div className="flex items-center gap-2">
                      <TaskPullStatus pulledAt={task.pulled_at} source={task.source} />
                      {task.pulled_at && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleOpenPullHistory}
                          className="h-9 md:h-10 px-3 md:px-4 shrink-0"
                          aria-label="查看拉取历史"
                        >
                          <History className="h-4 w-4 md:h-5 md:w-5" />
                        </Button>
                      )}
                    </div>
                  )}
                  {/* 操作菜单 */}
                  {task && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 md:h-10 px-3 md:px-4 shrink-0"
                          aria-label="任务操作"
                        >
                          <Info className="h-4 w-4 md:h-5 md:w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/project/${encodedProjectId}/queue/${encodedQueueId}/task/${encodedTaskId}/metadata`)}>
                          <Info className="mr-2 h-4 w-4" />
                          <span>元数据</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/project/${encodedProjectId}/queue/${encodedQueueId}/task/${encodedTaskId}/logs`)}>
                          <FileText className="mr-2 h-4 w-4" />
                          <span>日志</span>
                        </DropdownMenuItem>
                        {task.pulled_at && (
                          <DropdownMenuItem onClick={handleOpenPullHistory}>
                            <History className="mr-2 h-4 w-4" />
                            <span>拉取历史</span>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleEditTask}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>编辑</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setMoveDialogOpen(true)}>
                          <Move className="mr-2 h-4 w-4" />
                          <span>移动</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteDialogOpen(true)}
                          className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>删除</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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


        {/* 删除确认对话框 */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除任务「{task?.name}」吗？此操作不可恢复。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting} className="h-11">取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteTask}
                disabled={isDeleting}
                className="h-11 bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? '删除中...' : '确认删除'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 移动任务对话框 */}
        <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>移动任务</DialogTitle>
              <DialogDescription>
                将任务移动到其他队列或项目级
              </DialogDescription>
            </DialogHeader>
            <MoveTaskDialog
              projectId={projectId}
              currentQueueId={queueId}
              onMove={handleMoveTask}
              onCancel={() => setMoveDialogOpen(false)}
              isMoving={isMoving}
            />
          </DialogContent>
        </Dialog>

        {/* 拉取历史对话框 */}
        <Dialog open={pullHistoryDialogOpen} onOpenChange={setPullHistoryDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>拉取历史</DialogTitle>
              <DialogDescription>
                任务的拉取历史记录
              </DialogDescription>
            </DialogHeader>
            {isLoadingPullHistory ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">加载中...</span>
              </div>
            ) : (
              <PullHistoryList 
                history={pullHistory} 
                currentPull={task?.pulled_at ? { pulled_at: task.pulled_at, pulled_by: task.pulled_by } : null}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  )
}

/**
 * 移动任务对话框组件
 */
function MoveTaskDialog({ projectId, currentQueueId, onMove, onCancel, isMoving }) {
  const [targetQueueId, setTargetQueueId] = useState('')
  const [queues, setQueues] = useState([])
  const [isLoadingQueues, setIsLoadingQueues] = useState(false)

  useEffect(() => {
    if (!projectId) return
    
    setIsLoadingQueues(true)
    const loadQueues = async () => {
      try {
        const { fetchWithAuth } = await import('@/lib/fetch-utils')
        const encodedProjectId = encodeURIComponent(projectId)
        const response = await fetchWithAuth(`/api/v1/projects/${encodedProjectId}/queues?pageSize=100`)
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            setQueues(result.data.items || [])
          }
        }
      } catch (error) {
        console.error('加载队列列表失败:', error)
      } finally {
        setIsLoadingQueues(false)
      }
    }
    
    loadQueues()
  }, [projectId])

  const handleMove = () => {
    onMove(targetQueueId || null)
  }

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">目标位置</label>
        <select
          value={targetQueueId}
          onChange={(e) => setTargetQueueId(e.target.value)}
          className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          disabled={isMoving || isLoadingQueues}
        >
          <option value="">项目级（不属于任何队列）</option>
          {queues
            .filter(q => q.queue_id !== currentQueueId)
            .map(queue => (
              <option key={queue.queue_id} value={queue.queue_id}>
                {queue.name}
              </option>
            ))}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isMoving}
          className="h-11"
        >
          取消
        </Button>
        <Button
          onClick={handleMove}
          disabled={isMoving || isLoadingQueues}
          className="h-11"
        >
          {isMoving ? '移动中...' : '确认移动'}
        </Button>
      </div>
    </div>
  )
}

/**
 * 拉取历史列表组件
 */
function PullHistoryList({ history = [], currentPull = null }) {
  if (history.length === 0 && !currentPull) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">暂无拉取历史</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {currentPull && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">当前拉取</p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  拉取时间: {new Date(currentPull.pulled_at).toLocaleString('zh-CN')}
                </p>
                {currentPull.pulled_by && (
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    拉取者: {currentPull.pulled_by}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {history.map((item, index) => (
        <Card key={index} className="bg-white dark:bg-gray-800">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">拉取 #{history.length - index}</p>
                {item.released_at ? (
                  <span className="text-xs text-gray-500">已释放</span>
                ) : (
                  <span className="text-xs text-blue-600">进行中</span>
                )}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <p>拉取时间: {new Date(item.pulled_at).toLocaleString('zh-CN')}</p>
                {item.pulled_by && <p>拉取者: {item.pulled_by}</p>}
                {item.released_at && (
                  <>
                    <p>释放时间: {new Date(item.released_at).toLocaleString('zh-CN')}</p>
                    {item.released_by && <p>释放者: {item.released_by}</p>}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
