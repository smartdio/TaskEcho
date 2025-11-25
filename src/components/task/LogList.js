'use client'

import { LogCard } from './LogCard'

/**
 * 日志列表组件
 */
export function LogList({ logs = [] }) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-8 md:py-10 lg:py-12">
        <p className="text-base md:text-lg text-gray-600 dark:text-gray-400">
          暂无执行日志
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {logs.map((log, index) => (
        <LogCard key={index} log={log} />
      ))}
    </div>
  )
}
