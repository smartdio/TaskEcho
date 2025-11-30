'use client'

import { useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Breadcrumb from '@/components/layout/Breadcrumb'
import { Button } from '@/components/ui/button'
import { AlertCircle, Info, RefreshCw, FileText } from 'lucide-react'
import { useToast as useShadcnToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { useIncrementalUpdate } from '@/hooks/useIncrementalUpdate'
import { useSwipeBack } from '@/hooks/useSwipeBack'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { AuthGuard } from '@/components/auth/AuthGuard'

const POLLING_INTERVAL = 5000 // 5秒轮询间隔

/**
 * 获取任务详情数据（仅获取任务信息）
 */
async function fetchTaskData(projectId, queueId, taskId) {
  const { fetchWithAuth } = await import('@/lib/fetch-utils')
  const encodedProjectId = encodeURIComponent(projectId)
  const encodedQueueId = encodeURIComponent(queueId)
  const encodedTaskId = encodeURIComponent(taskId)
  
  const taskResponse = await fetchWithAuth(
    `/api/v1/projects/${encodedProjectId}/queues/${encodedQueueId}/tasks/${encodedTaskId}`
  )

  if (!taskResponse.ok) {
    if (taskResponse.status === 404) {
      throw new Error('任务不存在')
    }
    throw new Error(`获取任务详情失败: ${taskResponse.status}`)
  }

  const taskData = await taskResponse.json()

  if (!taskData.success) {
    throw new Error(taskData.error?.message || '获取任务详情失败')
  }

  return {
    task: taskData.data
  }
}

/**
 * 格式化时间显示
 */
function formatDateTime(dateString) {
  if (!dateString) return '暂无'

  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
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

export default function TaskMetadataPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params?.projectId
  const queueId = params?.queueId
  const taskId = params?.taskId
  const encodedProjectId = projectId ? encodeURIComponent(projectId) : ''
  const encodedQueueId = queueId ? encodeURIComponent(queueId) : ''
  const encodedTaskId = taskId ? encodeURIComponent(taskId) : ''
  const { toast } = useShadcnToast()

  // 创建获取数据的函数
  const fetchData = useCallback(() => {
    if (!projectId || !queueId || !taskId) return Promise.resolve(null)
    return fetchTaskData(projectId, queueId, taskId)
  }, [projectId, queueId, taskId])

  // 使用增量更新轮询（已禁用自动刷新，仅保留首次加载和手动刷新）
  const {
    data,
    isLoading,
    error,
    refetch
  } = useIncrementalUpdate(fetchData, POLLING_INTERVAL, {
    enabled: false, // 禁用自动刷新
  })

  // 下拉刷新
  const { isRefreshing, pullDistance, isPulling } = usePullToRefresh(
    () => {
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
    },
    {
      threshold: 80,
      resistance: 0.5,
      enabled: !isLoading
    }
  )

  // 向右滑动返回功能
  useSwipeBack(() => {
    router.push(`/project/${encodedProjectId}/queue/${encodedQueueId}/task/${encodedTaskId}`)
  }, {
    threshold: 80,
    resistance: 0.5,
    enabled: true
  })

  // 提取数据
  const task = data?.task || null

  // 任务不存在错误
  if (error && error.message && error.message.includes('任务不存在')) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <main className="container mx-auto px-4 md:px-5 lg:px-6 py-4 md:py-5 lg:py-6">
          <div className="text-center py-12 md:py-16 lg:py-20">
            <AlertCircle className="h-12 w-12 md:h-16 md:w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold text-gray-900 dark:text-gray-50 mb-2">
              任务不存在
            </h2>
            <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 mb-6">
              {error.message}
            </p>
            <Button
              onClick={() =>
                router.push(`/project/${encodedProjectId}/queue/${encodedQueueId}/task/${encodedTaskId}`)
              }
            >
              返回任务详情页
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

        <main className="flex-1 container mx-auto px-4 md:px-5 lg:px-6 py-4 md:py-5 lg:py-6">
          {/* 面包屑导航 */}
          <Breadcrumb
            items={[
              {
                label: '项目',
                href: `/project/${encodedProjectId}`,
              },
              {
                label: '队列',
                href: `/project/${encodedProjectId}/queue/${encodedQueueId}`,
              },
              {
                label: task?.name || '任务',
                href: `/project/${encodedProjectId}/queue/${encodedQueueId}/task/${encodedTaskId}`,
              },
              {
                label: '元数据',
                href: undefined, // 当前页面，不可点击
              },
            ]}
          />

          {/* 页面头部 */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 mb-4 md:mb-5 lg:mb-6 mt-4 md:mt-5 lg:mt-6">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2 md:gap-3">
                <Info className="h-6 w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
                <span>任务元数据</span>
              </h1>
              {task?.name && (
                <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 mt-2 md:mt-3">
                  {task.name}
                </p>
              )}
            </div>
          </div>

          {/* 错误提示 */}
          {error &&
            !isLoading &&
            !error.message?.includes('任务不存在') && (
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
            <div className="text-center py-12 md:py-16 lg:py-20">
              <RefreshCw className="h-8 w-8 md:h-10 md:w-10 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-base md:text-lg text-gray-600 dark:text-gray-400">
                正在加载任务元数据...
              </p>
            </div>
          )}

          {/* 元数据区域 */}
          {!isLoading && task && (
            <div className="space-y-4 md:space-y-5 lg:space-y-6">
              {/* 基本信息 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg md:rounded-xl p-4 md:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-50 mb-4 md:mb-5 lg:mb-6">
                  基本信息
                </h2>
                <dl className="space-y-3 md:space-y-4">
                  <div>
                    <dt className="text-sm md:text-base font-medium text-gray-500 dark:text-gray-400 mb-1">
                      任务ID
                    </dt>
                    <dd className="text-base md:text-lg text-gray-900 dark:text-gray-50 break-all">
                      {task.id || '暂无'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm md:text-base font-medium text-gray-500 dark:text-gray-400 mb-1">
                      任务名称
                    </dt>
                    <dd className="text-base md:text-lg text-gray-900 dark:text-gray-50">
                      {task.name || '暂无'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm md:text-base font-medium text-gray-500 dark:text-gray-400 mb-1">
                      状态
                    </dt>
                    <dd>
                      {task.status && (
                        <span
                          className={cn(
                            'inline-block px-2 md:px-3 py-1 md:py-1.5 rounded-md text-xs md:text-sm font-medium',
                            getStatusBadgeClass(task.status)
                          )}
                        >
                          {getStatusText(task.status)}
                        </span>
                      )}
                      {!task.status && <span className="text-base md:text-lg text-gray-900 dark:text-gray-50">暂无</span>}
                    </dd>
                  </div>
                  {task.tags && task.tags.length > 0 && (
                    <div>
                      <dt className="text-sm md:text-base font-medium text-gray-500 dark:text-gray-400 mb-1">
                        标签
                      </dt>
                      <dd>
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
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Prompt 内容 */}
              {task.prompt && (
                <div className="bg-white dark:bg-gray-800 rounded-lg md:rounded-xl p-4 md:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-50 mb-4 md:mb-5 lg:mb-6">
                    Prompt
                  </h2>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 md:p-5 lg:p-6">
                    <p className="text-base md:text-lg text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                      {task.prompt}
                    </p>
                  </div>
                </div>
              )}

              {/* 规范文件列表 */}
              {task.spec_file && task.spec_file.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg md:rounded-xl p-4 md:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-50 mb-4 md:mb-5 lg:mb-6">
                    规范文件
                  </h2>
                  <ul className="space-y-2 md:space-y-3">
                    {task.spec_file.map((file, index) => (
                      <li key={index} className="flex items-start gap-2 md:gap-3">
                        <FileText className="h-5 w-5 md:h-6 md:w-6 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
                        <span className="text-base md:text-lg text-gray-700 dark:text-gray-300 break-all">
                          {file}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 报告文件 */}
              {task.report && (
                <div className="bg-white dark:bg-gray-800 rounded-lg md:rounded-xl p-4 md:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-50 mb-4 md:mb-5 lg:mb-6">
                    报告文件
                  </h2>
                  <div className="flex items-start gap-2 md:gap-3">
                    <FileText className="h-5 w-5 md:h-6 md:w-6 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="text-base md:text-lg text-gray-700 dark:text-gray-300 break-all">
                      {task.report}
                    </span>
                  </div>
                </div>
              )}

              {/* 时间信息 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg md:rounded-xl p-4 md:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-50 mb-4 md:mb-5 lg:mb-6">
                  时间信息
                </h2>
                <dl className="space-y-3 md:space-y-4">
                  {task.created_at && (
                    <div>
                      <dt className="text-sm md:text-base font-medium text-gray-500 dark:text-gray-400 mb-1">
                        创建时间
                      </dt>
                      <dd className="text-base md:text-lg text-gray-900 dark:text-gray-50">
                        {formatDateTime(task.created_at)}
                      </dd>
                    </div>
                  )}
                  {task.updated_at && (
                    <div>
                      <dt className="text-sm md:text-base font-medium text-gray-500 dark:text-gray-400 mb-1">
                        更新时间
                      </dt>
                      <dd className="text-base md:text-lg text-gray-900 dark:text-gray-50">
                        {formatDateTime(task.updated_at)}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}



