'use client'

import { useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Breadcrumb from '@/components/layout/Breadcrumb'
import { StatusFilter } from '@/components/queue/StatusFilter'
import { TaskList } from '@/components/queue/TaskList'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RefreshCw, AlertCircle, Layers, MoreVertical, Edit, Trash2 } from 'lucide-react'
import { useToast as useShadcnToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { useVisibilityAwarePolling } from '@/hooks/useVisibilityAwarePolling'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useSwipeBack } from '@/hooks/useSwipeBack'
import { AuthGuard } from '@/components/auth/AuthGuard'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const POLLING_INTERVAL = 30000 // 30秒轮询间隔

/**
 * 状态过滤函数
 */
function filterByStatus(tasks, selectedStatus) {
  if (selectedStatus === 'all') {
    return tasks
  }
  
  return tasks.filter(task => 
    (task.status || 'pending').toLowerCase() === selectedStatus.toLowerCase()
  )
}

/**
 * 获取任务队列详情页数据（合并项目、队列和任务列表）
 */
async function fetchQueueDetailData(projectId, queueId) {
  const { fetchWithAuth } = await import('@/lib/fetch-utils')
  // 对项目ID和队列ID进行URL编码，因为ID可能包含特殊字符
  const encodedProjectId = encodeURIComponent(projectId)
  const encodedQueueId = encodeURIComponent(queueId)
  const [projectResponse, queueResponse, tasksResponse] = await Promise.all([
    fetchWithAuth(`/api/v1/projects/${encodedProjectId}`),
    fetchWithAuth(`/api/v1/projects/${encodedProjectId}/queues/${encodedQueueId}`),
    fetchWithAuth(`/api/v1/projects/${encodedProjectId}/queues/${encodedQueueId}/tasks`)
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

  if (!tasksResponse.ok) {
    throw new Error(`获取任务列表失败: ${tasksResponse.status}`)
  }

  const [projectData, queueData, tasksData] = await Promise.all([
    projectResponse.json(),
    queueResponse.json(),
    tasksResponse.json()
  ])

  if (!projectData.success) {
    throw new Error(projectData.error?.message || '获取项目信息失败')
  }

  if (!queueData.success) {
    throw new Error(queueData.error?.message || '获取任务队列信息失败')
  }

  if (!tasksData.success) {
    throw new Error(tasksData.error?.message || '获取任务列表失败')
  }

  return {
    project: projectData.data,
    queue: queueData.data,
    tasks: tasksData.data.items || []
  }
}

export default function QueueDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params?.projectId
  const queueId = params?.queueId
  // 对项目ID和队列ID进行URL编码，用于构建路由链接
  const encodedProjectId = projectId ? encodeURIComponent(projectId) : ''
  const encodedQueueId = queueId ? encodeURIComponent(queueId) : ''
  const { toast } = useShadcnToast()

  const [selectedStatus, setSelectedStatus] = useState('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 创建获取数据的函数
  const fetchData = useCallback(() => {
    if (!projectId || !queueId) return Promise.resolve(null)
    return fetchQueueDetailData(projectId, queueId)
  }, [projectId, queueId])

  // 使用页面可见性感知轮询（已禁用自动刷新，仅保留首次加载和手动刷新）
  const {
    data,
    isLoading,
    error,
    refetch
  } = useVisibilityAwarePolling(fetchData, POLLING_INTERVAL, {
    enabled: false, // 禁用自动刷新
    onError: (err) => {
      toast({
        title: '加载失败',
        description: err.message || '请稍后重试',
        variant: 'destructive'
      })
    }
  })

  // 下拉刷新
  const { isRefreshing, pullDistance, isPulling } = usePullToRefresh(
    () => refetch(),
    {
      threshold: 80,
      resistance: 0.5,
      enabled: !isLoading && !!projectId && !!queueId
    }
  )

  // 滑动返回
  useSwipeBack(
    () => router.push(`/project/${encodedProjectId}`),
    {
      threshold: 80,
      resistance: 0.5,
      enabled: true
    }
  )

  // 状态过滤处理
  const handleStatusChange = useCallback((status) => {
    setSelectedStatus(status)
  }, [])

  // 清除过滤
  const handleClearFilters = useCallback(() => {
    setSelectedStatus('all')
  }, [])

  // 删除队列
  const handleDeleteQueue = useCallback(async () => {
    if (!projectId || !queueId) return

    setIsDeleting(true)
    try {
      const { fetchWithAuth } = await import('@/lib/fetch-utils')
      const encodedProjectId = encodeURIComponent(projectId)
      const encodedQueueId = encodeURIComponent(queueId)
      const response = await fetchWithAuth(
        `/api/v1/projects/${encodedProjectId}/queues/${encodedQueueId}`,
        {
          method: 'DELETE'
        }
      )

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || '删除队列失败')
      }

      toast({
        title: '成功',
        description: '队列删除成功',
        variant: 'default'
      })

      setDeleteDialogOpen(false)
      // 删除成功后跳转到项目详情页
      router.push(`/project/${encodedProjectId}`)
    } catch (error) {
      toast({
        title: '删除失败',
        description: error.message || '请稍后重试',
        variant: 'destructive'
      })
      setIsDeleting(false)
    }
  }, [projectId, queueId, toast, router])

  // 提取数据
  const project = data?.project || null
  const queue = data?.queue || null
  const tasks = data?.tasks || []

  // 过滤后的任务列表
  const filteredTasks = useMemo(() => {
    return filterByStatus(tasks, selectedStatus)
  }, [tasks, selectedStatus])

  // 项目或队列不存在错误
  if (error && error.message && (
    error.message.includes('项目不存在') || 
    error.message.includes('任务队列不存在')
  )) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <main className="container mx-auto px-4 md:px-5 lg:px-6 py-4 md:py-5 lg:py-6">
          <div className="text-center py-12 md:py-16 lg:py-20">
            <AlertCircle className="h-12 w-12 md:h-16 md:w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold text-gray-900 dark:text-gray-50 mb-2">
              {error.message.includes('项目不存在') ? '项目不存在' : '任务队列不存在'}
            </h2>
            <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 mb-6">
              {error.message}
            </p>
            <Button onClick={() => router.push(`/project/${encodedProjectId}`)}>
              返回项目详情页
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <main 
          className={cn(
            "container mx-auto px-4 md:px-5 lg:px-6 py-4 md:py-5 lg:py-6 transition-transform duration-200 ease-out"
          )}
          style={{
            transform: (isPulling || isRefreshing) 
              ? `translateY(${Math.min(pullDistance, 80)}px)` 
              : undefined
          }}
        >
          {/* 面包屑导航 */}
          <Breadcrumb
            items={[
              {
                label: project?.name || '项目',
                href: project ? `/project/${encodedProjectId}` : undefined
              },
              {
                label: queue?.name || '队列',
                href: undefined // 当前页面，不可点击
              }
            ]}
          />

          {/* 下拉刷新指示器 */}
          {(isPulling || isRefreshing) && (
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
                    isRefreshing && 'animate-spin',
                    !isRefreshing && pullDistance >= 80 && 'rotate-180'
                  )}
                />
                <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                  {isRefreshing ? '正在刷新...' : pullDistance >= 80 ? '释放即可刷新' : '下拉刷新'}
                </span>
              </div>
            </div>
          )}

          {/* 页面头部 */}
          <div className="flex items-center justify-between mb-4 md:mb-5 lg:mb-6">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2 md:gap-3">
              <Layers className="h-6 w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
              <span>{queue?.name || '任务队列详情'}</span>
            </h1>
            {queue && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 md:h-10 px-3 md:px-4"
                    aria-label="管理菜单"
                  >
                    <MoreVertical className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    toast({
                      title: '提示',
                      description: '队列编辑功能开发中',
                      variant: 'default'
                    })
                  }}>
                    <Edit className="mr-2 h-4 w-4" />
                    <span>编辑</span>
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

          {/* 错误提示 */}
          {error && !isLoading && !error.message?.includes('项目不存在') && !error.message?.includes('任务队列不存在') && (
            <div className="mb-4 md:mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm md:text-base text-red-800 dark:text-red-200">
                  {error.message || '加载数据失败'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="h-8 md:h-9"
              >
                重试
              </Button>
            </div>
          )}

          {/* 过滤区域 */}
          {!isLoading && !error && (
            <div className="mb-4 md:mb-5 lg:mb-6">
              <StatusFilter
                selectedStatus={selectedStatus}
                onStatusChange={handleStatusChange}
                onClear={handleClearFilters}
              />
            </div>
          )}

          {/* 过滤无结果 */}
          {!isLoading && !error && filteredTasks.length === 0 && selectedStatus !== 'all' && (
            <div className="text-center py-12 md:py-16 lg:py-20">
              <p className="text-base md:text-lg lg:text-xl text-gray-600 dark:text-gray-400 mb-4">
                未找到匹配的任务
              </p>
              <Button
                variant="outline"
                onClick={handleClearFilters}
              >
                清除过滤
              </Button>
            </div>
          )}

          {/* 任务列表 */}
          <TaskList
            tasks={filteredTasks}
            projectId={projectId}
            queueId={queueId}
            loading={isLoading}
          />

          {/* 删除确认对话框 */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <AlertDialogTitle>确认删除</AlertDialogTitle>
                </div>
                <div className="text-base text-muted-foreground">
                  <div className="mb-2">
                    确定要删除队列「<strong>{queue?.name || ''}</strong>」吗？
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    删除后，该队列下的所有任务将被永久删除。此操作不可恢复。
                  </div>
                </div>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2 sm:gap-0">
                <AlertDialogCancel
                  onClick={() => setDeleteDialogOpen(false)}
                  disabled={isDeleting}
                  className="h-11"
                >
                  取消
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteQueue}
                  disabled={isDeleting}
                  className="h-11 bg-red-600 hover:bg-red-700 text-white focus:ring-red-500"
                >
                  {isDeleting ? '删除中...' : '确认删除'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </div>
    </AuthGuard>
  )
}
