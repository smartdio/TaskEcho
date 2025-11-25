'use client'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * 统计卡片组件
 * @param {Object} props
 * @param {string} props.label - 标签文本
 * @param {number} props.value - 数值
 * @param {React.ReactNode} props.icon - 图标组件
 * @param {string} props.color - 颜色主题（blue/yellow/green/red）
 */
export function StatCard({ label, value, icon, color = 'blue' }) {
  const colorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    yellow: 'text-yellow-500 dark:text-yellow-400',
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-500 dark:text-red-400'
  }

  return (
    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <CardContent className="p-3 md:p-3 lg:p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1">
              {label}
            </p>
            <p className={cn(
              'text-xl md:text-2xl lg:text-2xl font-semibold',
              colorClasses[color]
            )}>
              {value.toLocaleString()}
            </p>
          </div>
          {icon && (
            <div className={cn('ml-3', colorClasses[color])}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
