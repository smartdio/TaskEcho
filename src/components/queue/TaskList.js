'use client'

import { TaskCard } from './TaskCard'
import { cn } from '@/lib/utils'

/**
 * 任务列表组件
 * @param {Object} props
 * @param {Array} props.tasks - 任务列表
 * @param {string} props.projectId - 项目ID
 * @param {string} props.queueId - 队列ID
 * @param {boolean} props.loading - 加载状态
 */
export function TaskList({ tasks = [], projectId, queueId, loading = false }) {
  if (loading) {
    return (
      <div className="space-y-4 md:space-y-5 lg:space-y-6">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-gray-200 dark:bg-gray-700 h-32 md:h-36 lg:h-40 rounded-lg md:rounded-xl"
          />
        ))}
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 md:py-16 lg:py-20">
        <p className="text-base md:text-lg lg:text-xl text-gray-600 dark:text-gray-400">
          该任务队列下暂无任务
        </p>
      </div>
    )
  }

  return (
    <div>
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} projectId={projectId} queueId={queueId} />
      ))}
    </div>
  )
}
