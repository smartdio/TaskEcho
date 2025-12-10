'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Clock, FolderKanban, AlertCircle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

/**
 * 项目级别统计区域组件（包含统计信息和趋势图）
 * @param {Object} props
 * @param {Object} props.stats - 项目统计数据
 * @param {Array} props.trendData - 趋势数据
 * @param {boolean} props.loading - 加载状态
 */
export function ProjectStatsSection({ stats, trendData = [], loading }) {
  const { task_stats = {}, queue_count = 0 } = stats || {}

  const statItems = [
    {
      label: '队列',
      value: queue_count || 0,
      icon: FolderKanban,
      color: 'blue'
    },
    {
      label: 'Pending',
      value: task_stats.pending || 0,
      icon: Clock,
      color: 'yellow'
    },
    {
      label: 'Error',
      value: task_stats.error || 0,
      icon: AlertCircle,
      color: 'red'
    }
  ]

  const colorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    yellow: 'text-yellow-500 dark:text-yellow-400',
    red: 'text-red-500 dark:text-red-400'
  }

  // 格式化趋势数据用于图表显示
  const chartData = trendData.map(item => ({
    date: item.date,
    total: item.execution?.total || 0,
    success: item.execution?.success || 0,
    failure: item.execution?.failure || 0
  }))
  
  // 格式化日期显示（只显示月-日）
  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  if (loading) {
    return (
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mb-4">
        <CardContent className="p-2 md:p-3 lg:p-4">
          {/* 统计信息加载状态 */}
          <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-700 mb-4">
            {statItems.map((_, i) => (
              <div key={i} className={cn(
                'p-2 md:p-3 lg:p-4',
                i === 0 && 'pl-0',
                i === statItems.length - 1 && 'pr-0'
              )}>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2 animate-pulse"></div>
                <div className="h-5 md:h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
              </div>
            ))}
          </div>
          {/* 趋势图加载状态 */}
          <div className="h-24 md:h-32 flex items-center justify-center">
            <div className="animate-pulse text-gray-400 dark:text-gray-600 text-xs">
              加载中...
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mb-4">
      <CardContent className="p-2 md:p-3 lg:p-4">
        {/* 统计信息 */}
        <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-700 mb-4">
          {statItems.map((item, i) => {
            const Icon = item.icon
            return (
              <div
                key={item.label}
                className={cn(
                  'flex flex-col items-center justify-center text-center p-2 md:p-3 lg:p-4',
                  i === 0 && 'pl-0',
                  i === statItems.length - 1 && 'pr-0'
                )}
              >
                <div className={cn('mb-1.5 md:mb-2', colorClasses[item.color])}>
                  <Icon className="h-3.5 w-3.5 md:h-4 md:w-4 lg:h-5 lg:w-5" />
                </div>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1">
                  {item.label}
                </p>
                <p className={cn(
                  'text-base md:text-lg lg:text-xl font-semibold',
                  colorClasses[item.color]
                )}>
                  {item.value.toLocaleString()}
                </p>
              </div>
            )
          })}
        </div>
        
        {/* 趋势图 */}
        {chartData && chartData.length > 0 ? (
          <div className="w-full h-24 md:h-32 border-t border-gray-200 dark:border-gray-700 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  className="text-[10px] text-gray-500 dark:text-gray-500"
                  stroke="currentColor"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  className="text-[10px] text-gray-500 dark:text-gray-500"
                  stroke="currentColor"
                  tickLine={false}
                  axisLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.375rem',
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.5rem'
                  }}
                  labelFormatter={(value) => value}
                  formatter={(value, name) => {
                    const labels = {
                      total: '总数',
                      success: '成功',
                      failure: '失败'
                    }
                    return [value, labels[name] || name]
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  dot={false}
                  name="total"
                />
                <Line
                  type="monotone"
                  dataKey="success"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  dot={false}
                  name="success"
                />
                <Line
                  type="monotone"
                  dataKey="failure"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  dot={false}
                  name="failure"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}









