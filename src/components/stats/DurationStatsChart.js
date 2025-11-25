'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * 执行时长统计组件
 * @param {Object} props
 * @param {Object} props.summary - 汇总统计数据
 * @param {Array} props.distribution - 时长分布数据
 * @param {boolean} props.loading - 加载状态
 */
export function DurationStatsChart({ summary = {}, distribution = [], loading }) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>
    )
  }
  
  const { avg_duration = 0, min_duration = 0, max_duration = 0, total_count = 0 } = summary
  
  // 格式化时长（毫秒转分钟）
  const formatDuration = (ms) => {
    if (ms === 0) return '0分钟'
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    if (minutes > 0) {
      return seconds > 0 ? `${minutes}分${seconds}秒` : `${minutes}分钟`
    }
    return `${seconds}秒`
  }
  
  // 格式化时长分布数据
  const chartData = distribution.map(item => ({
    range: item.range,
    count: item.count || 0
  }))
  
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
  
  return (
    <div className="space-y-4 md:space-y-5 lg:space-y-6">
      {/* 汇总信息 */}
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <CardContent className="p-4 md:p-5 lg:p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 lg:gap-6">
            <div className="text-center">
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1 md:mb-2">
                平均时长
              </p>
              <p className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-50">
                {formatDuration(avg_duration)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1 md:mb-2">
                最短时长
              </p>
              <p className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-50">
                {formatDuration(min_duration)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1 md:mb-2">
                最长时长
              </p>
              <p className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-50">
                {formatDuration(max_duration)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1 md:mb-2">
                任务数量
              </p>
              <p className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-50">
                {total_count.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 时长分布图表 */}
      {chartData.length > 0 ? (
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardContent className="p-4 md:p-5 lg:p-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
              执行时长分布
            </h3>
            <div className="w-full h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis
                    dataKey="range"
                    className="text-xs md:text-sm text-gray-600 dark:text-gray-400"
                    stroke="currentColor"
                  />
                  <YAxis
                    className="text-xs md:text-sm text-gray-600 dark:text-gray-400"
                    stroke="currentColor"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem'
                    }}
                    formatter={(value) => [value.toLocaleString(), '任务数']}
                  />
                  <Bar
                    dataKey="count"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardContent className="p-4 md:p-5 lg:p-6">
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              暂无时长分布数据
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

