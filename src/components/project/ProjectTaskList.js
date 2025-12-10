/**
 * 项目级任务列表组件
 * 显示不属于任何队列的任务
 */
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { TaskPullStatus } from '@/components/pull/TaskPullStatus'
import { ClipboardList, Circle, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

/**
 * 格式化时间显示
 */
function formatDateTime(dateString) {
  if (!dateString) return '暂无更新'
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * 获取状态图标颜色
 */
function getStatusIconColor(status) {
  const statusLower = (status || 'pending').toLowerCase()
  switch (statusLower) {
    case 'pending':
      return 'text-yellow-500'
    case 'running':
      return 'text-blue-500'
    case 'done':
      return 'text-green-600 dark:text-green-500'
    case 'error':
      return 'text-red-500'
    case 'cancelled':
      return 'text-gray-500'
    default:
      return 'text-gray-500'
  }
}

/**
 * 项目级任务列表组件
 */
export function ProjectTaskList({ tasks = [], projectId, loading = false, onCreateTask }) {
  const encodedProjectId = projectId ? encodeURIComponent(projectId) : ''

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">加载中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 标题和创建按钮 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-50">
          项目级任务
        </h2>
        {onCreateTask && (
          <Button
            onClick={onCreateTask}
            size="sm"
            className="h-9 md:h-10"
          >
            <Plus className="h-4 w-4 mr-2" />
            创建任务
          </Button>
        )}
      </div>

      {/* 任务列表 */}
      {tasks.length === 0 ? (
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              暂无项目级任务
            </p>
            {onCreateTask && (
              <Button
                onClick={onCreateTask}
                variant="outline"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                创建第一个任务
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const encodedTaskId = encodeURIComponent(task.task_id || task.id)
            return (
              <Link
                key={task.task_id || task.id}
                href={`/project/${encodedProjectId}/task/${encodedTaskId}`}
              >
                <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Circle
                            className={cn(
                              'h-4 w-4 shrink-0 fill-current',
                              getStatusIconColor(task.status)
                            )}
                          />
                          <ClipboardList className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-50 truncate">
                            {task.name || '未命名任务'}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <TaskPullStatus
                            pulledAt={task.pulled_at}
                            source={task.source}
                          />
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDateTime(task.updated_at || task.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}







