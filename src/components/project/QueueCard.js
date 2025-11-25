'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Layers } from 'lucide-react'

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
 * 任务队列卡片组件
 * @param {Object} props
 * @param {Object} props.queue - 队列数据
 * @param {string} props.projectId - 项目ID
 */
export function QueueCard({ queue, projectId }) {
  const { queue_id, name, task_count = 0, task_stats = {}, last_task_at } = queue || {}

  // 对项目ID和队列ID进行URL编码，因为ID可能包含特殊字符
  const encodedProjectId = encodeURIComponent(projectId || '')
  const encodedQueueId = encodeURIComponent(queue_id || '')

  // 计算进度条数据
  const pending = task_stats.pending || 0
  const done = task_stats.done || 0
  const error = task_stats.error || 0
  const total = task_count || 0

  // 计算百分比（如果总数为0，则都为0）
  const donePercent = total > 0 ? (done / total) * 100 : 0
  const errorPercent = total > 0 ? (error / total) * 100 : 0
  const pendingPercent = total > 0 ? (pending / total) * 100 : 0

  return (
    <Link href={`/project/${encodedProjectId}/queue/${encodedQueueId}`} className="block">
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg md:rounded-xl hover:shadow-md dark:hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardContent className="p-4 md:p-5 lg:p-6">
          {/* 标题栏：名称和最后更新时间 */}
          <div className="flex items-start justify-between mb-3 md:mb-4">
            <h3 className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-50 flex-1 pr-2 flex items-center gap-2 md:gap-3">
              <Layers className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
              <span>{name || '未命名队列'}</span>
            </h3>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 shrink-0 whitespace-nowrap">
              {formatDateTime(last_task_at)}
            </p>
          </div>

          {/* 进度条 */}
          {total > 0 && (
            <div className="mb-3 md:mb-4">
              <div className="h-2 md:h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                {/* 已完成部分 - 绿色 */}
                {donePercent > 0 && (
                  <div
                    className="bg-green-600 dark:bg-green-500 h-full transition-all duration-300"
                    style={{ width: `${donePercent}%` }}
                    aria-label={`已完成 ${done} 个任务`}
                  />
                )}
                {/* 错误部分 - 红色 */}
                {errorPercent > 0 && (
                  <div
                    className="bg-red-500 dark:bg-red-400 h-full transition-all duration-300"
                    style={{ width: `${errorPercent}%` }}
                    aria-label={`错误 ${error} 个任务`}
                  />
                )}
                {/* 等待部分 - 黄色 */}
                {pendingPercent > 0 && (
                  <div
                    className="bg-yellow-500 dark:bg-yellow-400 h-full transition-all duration-300"
                    style={{ width: `${pendingPercent}%` }}
                    aria-label={`等待中 ${pending} 个任务`}
                  />
                )}
              </div>
            </div>
          )}

          {/* 统计信息：任务数和状态统计在同一行 */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3 text-sm md:text-base">
            <span className="text-gray-600 dark:text-gray-400">
              任务数: <span className="font-semibold text-gray-900 dark:text-gray-50">{task_count}</span>
            </span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span className="text-gray-600 dark:text-gray-400">
              Pending: <span className="font-semibold text-yellow-500">{pending}</span>
            </span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span className="text-gray-600 dark:text-gray-400">
              Done: <span className="font-semibold text-green-600 dark:text-green-400">{done}</span>
            </span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span className="text-gray-600 dark:text-gray-400">
              Error: <span className="font-semibold text-red-500 dark:text-red-400">{error}</span>
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
