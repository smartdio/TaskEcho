'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ClipboardList, Circle } from 'lucide-react'

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
 * 获取状态图标颜色
 */
function getStatusIconColor(status) {
  const statusLower = (status || 'pending').toLowerCase()
  switch (statusLower) {
    case 'pending':
      return 'text-yellow-500'
    case 'done':
      return 'text-green-600 dark:text-green-500'
    case 'error':
      return 'text-red-500'
    default:
      return 'text-gray-500'
  }
}

/**
 * 截断文本
 */
function truncateText(text, maxLength = 100) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * 任务卡片组件
 * @param {Object} props
 * @param {Object} props.task - 任务数据
 * @param {string} props.projectId - 项目ID
 * @param {string} props.queueId - 队列ID
 */
export function TaskCard({ task, projectId, queueId }) {
  const { id, name, spec_file = [], status, updated_at, prompt } = task || {}

  // 对项目ID、队列ID和任务ID进行URL编码，因为ID可能包含特殊字符
  const encodedProjectId = encodeURIComponent(projectId || '')
  const encodedQueueId = encodeURIComponent(queueId || '')
  const encodedTaskId = encodeURIComponent(id || '')

  return (
    <Link href={`/project/${encodedProjectId}/queue/${encodedQueueId}/task/${encodedTaskId}`}>
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg md:rounded-xl hover:shadow-md dark:hover:shadow-lg transition-shadow cursor-pointer h-full mb-6 md:mb-8 lg:mb-10">
        <CardContent className="p-4 md:p-5 lg:p-6">
          {/* 任务标题栏 */}
          <div className="flex items-start justify-between gap-2 md:gap-3 mb-3 md:mb-4">
            <h3 className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2 md:gap-3 flex-1 min-w-0">
              {/* 状态图标 */}
              <Circle className={cn(
                'h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 shrink-0 fill-current',
                getStatusIconColor(status)
              )} aria-hidden="true" />
              {/* 任务图标 */}
              <ClipboardList className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
              <span className="truncate">{name || '未命名任务'}</span>
            </h3>
            {/* 最后更新时间 */}
            <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400 shrink-0 whitespace-nowrap">
              {formatDateTime(updated_at)}
            </span>
          </div>

          {/* Prompt内容 */}
          {prompt && (
            <div className="mb-3 md:mb-4">
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-1 md:mb-2">
                Prompt:
              </p>
              <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 line-clamp-2">
                {truncateText(prompt, 150)}
              </p>
            </div>
          )}

          {/* 规范文件列表 */}
          {spec_file && spec_file.length > 0 && (
            <div>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-2">
                规范文件:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm md:text-base text-gray-700 dark:text-gray-300">
                {spec_file.map((file, index) => (
                  <li key={index}>{file}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
