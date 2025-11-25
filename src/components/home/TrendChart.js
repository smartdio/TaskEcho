'use client'

import { Card, CardContent } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

/**
 * 7日趋势图组件（首页使用，简约样式）
 * @param {Object} props
 * @param {Array} props.data - 每日统计数据
 * @param {boolean} props.loading - 加载状态
 */
export function TrendChart({ data = [], loading }) {
  if (loading) {
    return (
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mb-4">
        <CardContent className="p-4">
          <div className="h-24 md:h-32 flex items-center justify-center">
            <div className="animate-pulse text-gray-400 dark:text-gray-600 text-xs">
              加载中...
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  if (!data || data.length === 0) {
    return (
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mb-4">
        <CardContent className="p-4">
          <div className="h-24 md:h-32 flex items-center justify-center text-gray-500 dark:text-gray-400 text-xs">
            暂无数据
          </div>
        </CardContent>
      </Card>
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
    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mb-4">
      <CardContent className="p-4">
        <div className="w-full h-24 md:h-32">
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
      </CardContent>
    </Card>
  )
}
