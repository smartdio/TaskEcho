'use client'

import { QueueCard } from './QueueCard'
import { cn } from '@/lib/utils'

/**
 * 任务队列列表组件
 * @param {Object} props
 * @param {Array} props.queues - 队列列表
 * @param {string} props.projectId - 项目ID
 * @param {boolean} props.loading - 加载状态
 */
export function QueueList({ queues = [], projectId, loading = false }) {
  if (loading) {
    return (
      <div className="flex flex-col gap-6 md:gap-8 lg:gap-10">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-gray-200 dark:bg-gray-700 h-32 md:h-36 lg:h-40 rounded-lg md:rounded-xl"
          />
        ))}
      </div>
    )
  }

  if (queues.length === 0) {
    return (
      <div className="text-center py-12 md:py-16 lg:py-20">
        <p className="text-base md:text-lg lg:text-xl text-gray-600 dark:text-gray-400">
          该项目下暂无任务队列
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8 lg:gap-10">
      {queues.map((queue) => (
        <QueueCard key={queue.id || queue.queue_id} queue={queue} projectId={projectId} />
      ))}
    </div>
  )
}
