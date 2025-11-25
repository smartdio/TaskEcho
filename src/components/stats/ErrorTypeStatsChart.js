'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { cn } from '@/lib/utils'

/**
 * 错误类型统计图表组件
 * @param {Object} props
 * @param {Array} props.data - 错误类型统计数据
 * @param {boolean} props.loading - 加载状态
 */
export function ErrorTypeStatsChart({ data = [], loading }) {
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
        暂无错误数据
      </div>
    )
  }
  
  // 格式化数据用于图表显示
  const chartData = data.map(item => ({
    name: item.label || item.type,
    value: item.count || 0,
    percentage: item.percentage || 0
  }))
  
  // 生成颜色数组
  const colors = [
    '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899',
    '#84cc16', '#f97316', '#6366f1', '#6b7280'
  ]
  
  // 自定义标签函数
  const renderLabel = (entry) => {
    return `${entry.name}: ${entry.percentage}%`
  }
  
  return (
    <div className="w-full h-64 md:h-80 lg:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border)',
              borderRadius: '0.5rem'
            }}
            formatter={(value, name, props) => {
              return [
                `${value.toLocaleString()} (${props.payload.percentage}%)`,
                '错误次数'
              ]
            }}
          />
          <Legend
            formatter={(value, entry) => {
              const percent = entry.payload.percentage || 0
              return `${value} (${percent}%)`
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

