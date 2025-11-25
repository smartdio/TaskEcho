'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { FolderKanban, User, Monitor, FolderOpen } from 'lucide-react'

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
 * 项目卡片组件
 * @param {Object} props
 * @param {Object} props.project - 项目数据
 */
export function ProjectCard({ project }) {
  const { 
    project_id, 
    name, 
    queue_count = 0, 
    task_count = 0, 
    task_stats = {}, 
    last_task_at,
    clientInfo = {}
  } = project || {}

  // 对项目ID进行URL编码，因为项目ID可能包含路径等特殊字符
  const encodedProjectId = encodeURIComponent(project_id || '')

  const { username, hostname, project_path } = clientInfo || {}

  return (
    <Link href={`/project/${encodedProjectId}`} className="block">
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg md:rounded-xl hover:shadow-md dark:hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardContent className="p-4 md:p-5 lg:p-6">
          {/* 标题栏：项目名称和最后更新时间 */}
          <div className="flex items-start justify-between mb-3 md:mb-4">
            <h3 className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-50 flex-1 pr-2 flex items-center gap-2 md:gap-3">
              <FolderKanban className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
              <span className="truncate">{name || '未命名项目'}</span>
            </h3>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 shrink-0 whitespace-nowrap">
              {formatDateTime(last_task_at)}
            </p>
          </div>

          {/* 主机信息和项目路径 */}
          {(username || hostname || project_path) && (
            <div className="mb-3 md:mb-4 space-y-2 md:space-y-2.5">
              {/* 主机用户名和主机名称 */}
              {(username || hostname) && (
                <div className="flex flex-wrap items-center gap-2 md:gap-3 text-sm md:text-base">
                  {username && (
                    <div className="flex items-center gap-1.5 md:gap-2 text-gray-700 dark:text-gray-300">
                      <User className="h-4 w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
                      <span className="font-medium">{username}</span>
                    </div>
                  )}
                  {username && hostname && (
                    <span className="text-gray-300 dark:text-gray-600">@</span>
                  )}
                  {hostname && (
                    <div className="flex items-center gap-1.5 md:gap-2 text-gray-700 dark:text-gray-300">
                      <Monitor className="h-4 w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
                      <span className="font-medium">{hostname}</span>
                    </div>
                  )}
                </div>
              )}
              {/* 项目路径 */}
              {project_path && (
                <div className="flex items-start gap-1.5 md:gap-2 text-sm md:text-base text-gray-600 dark:text-gray-400">
                  <FolderOpen className="h-4 w-4 md:h-5 md:w-5 text-gray-500 dark:text-gray-500 shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="break-all">{project_path}</span>
                </div>
              )}
            </div>
          )}

          {/* 统计信息 */}
          <div className="space-y-2 md:space-y-3">
            <div className="flex flex-wrap items-center gap-2 md:gap-3 text-sm md:text-base text-gray-600 dark:text-gray-400">
              <span>队列数: <span className="font-semibold text-gray-900 dark:text-gray-50">{queue_count}</span></span>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span>任务数: <span className="font-semibold text-gray-900 dark:text-gray-50">{task_count}</span></span>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:gap-3 text-sm md:text-base">
              <span className="text-gray-600 dark:text-gray-400">
                Pending: <span className="font-semibold text-yellow-500">{task_stats.pending || 0}</span>
              </span>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span className="text-gray-600 dark:text-gray-400">
                Done: <span className="font-semibold text-green-600 dark:text-green-400">{task_stats.done || 0}</span>
              </span>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span className="text-gray-600 dark:text-gray-400">
                Error: <span className="font-semibold text-red-500 dark:text-red-400">{task_stats.error || 0}</span>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
