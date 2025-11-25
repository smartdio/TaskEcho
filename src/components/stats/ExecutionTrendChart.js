'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

/**
 * 执行趋势图表组件
 * @param {Object} props
 * @param {Array} props.data - 每日统计数据
 * @param {boolean} props.loading - 加载状态
 */
export function ExecutionTrendChart({ data = [], loading }) {
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
  
  return (
    <div className="w-full h-64 md:h-80 lg:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
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
            labelFormatter={(value) => `日期: ${value}`}
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
          <Line
            type="monotone"
            dataKey="total"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3 }}
            name="total"
          />
          <Line
            type="monotone"
            dataKey="success"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 3 }}
            name="success"
          />
          <Line
            type="monotone"
            dataKey="failure"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ r: 3 }}
            name="failure"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

