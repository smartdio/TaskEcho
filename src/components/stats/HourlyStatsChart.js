'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

/**
 * 24小时执行趋势图表组件
 * @param {Object} props
 * @param {Array} props.data - 每小时统计数据
 * @param {boolean} props.loading - 加载状态
 */
export function HourlyStatsChart({ data = [], loading }) {
  if (loading) {
    return (
      <div className="h-64 md:h-80 lg:h-96 flex items-center justify-center">
        <div className="animate-pulse text-gray-400 dark:text-gray-600">
          加载中...
        </div>
      </div>
    )
  }
  
  if (!data || data.length === 0) {
    return (
      <div className="h-64 md:h-80 lg:h-96 flex items-center justify-center text-gray-500 dark:text-gray-400">
        暂无数据
      </div>
    )
  }
  
  // 格式化数据用于图表显示
  const chartData = data.map(item => ({
    hour: `${item.hour}:00`,
    total: item.execution?.total || 0,
    success: item.execution?.success || 0,
    failure: item.execution?.failure || 0
  }))
  
  return (
    <div className="w-full h-64 md:h-80 lg:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            dataKey="hour"
            className="text-xs md:text-sm text-gray-600 dark:text-gray-400"
            stroke="currentColor"
            angle={-45}
            textAnchor="end"
            height={60}
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
            formatter={(value, name) => {
              const labels = {
                total: '总数',
                success: '成功',
                failure: '失败'
              }
              return [value, labels[name] || name]
            }}
          />
          <Legend
            formatter={(value) => {
              const labels = {
                total: '总数',
                success: '成功',
                failure: '失败'
              }
              return labels[value] || value
            }}
          />
          <Bar
            dataKey="total"
            fill="#3b82f6"
            name="total"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="success"
            fill="#10b981"
            name="success"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="failure"
            fill="#ef4444"
            name="failure"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

