'use client'

import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, XCircle, Activity, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 统计概览卡片组件
 * @param {Object} props
 * @param {Object} props.summary - 汇总统计数据
 * @param {boolean} props.loading - 加载状态
 */
export function StatsOverviewCard({ summary, loading }) {
  const {
    total_execution = 0,
    total_success = 0,
    total_failure = 0,
    success_rate = 0
  } = summary || {}
  
  const statItems = [
    {
      label: '总执行次数',
      value: total_execution,
      icon: Activity,
      color: 'blue',
      format: (val) => val.toLocaleString()
    },
    {
      label: '成功次数',
      value: total_success,
      icon: CheckCircle,
      color: 'green',
      format: (val) => val.toLocaleString()
    },
    {
      label: '失败次数',
      value: total_failure,
      icon: XCircle,
      color: 'red',
      format: (val) => val.toLocaleString()
    },
    {
      label: '成功率',
      value: success_rate,
      icon: TrendingUp,
      color: 'blue',
      format: (val) => `${(val * 100).toFixed(1)}%`
    }
  ]
  
  const colorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-500 dark:text-red-400'
  }
  
  if (loading) {
    return (
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mb-4 md:mb-5 lg:mb-6">
        <CardContent className="p-4 md:p-5 lg:p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 lg:gap-6">
            {statItems.map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2 animate-pulse"></div>
                <div className="h-5 md:h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mb-4 md:mb-5 lg:mb-6">
      <CardContent className="p-4 md:p-5 lg:p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 lg:gap-6">
          {statItems.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.label}
                className="flex flex-col items-center justify-center text-center"
              >
                <div className={cn('mb-2 md:mb-3', colorClasses[item.color])}>
                  <Icon className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7" />
                </div>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1 md:mb-2">
                  {item.label}
                </p>
                <p className={cn(
                  'text-lg md:text-xl lg:text-2xl font-semibold',
                  colorClasses[item.color]
                )}>
                  {item.format(item.value)}
                </p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

