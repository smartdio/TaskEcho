'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { cn } from '@/lib/utils'

/**
 * 项目执行占比饼图组件
 * @param {Object} props
 * @param {Array} props.projects - 项目统计数据列表
 * @param {boolean} props.loading - 加载状态
 */
export function ProjectDistributionChart({ projects = [], loading }) {
  if (loading) {
    return (
      <div className="h-64 md:h-80 lg:h-96 flex items-center justify-center">
        <div className="animate-pulse text-gray-400 dark:text-gray-600">
          加载中...
        </div>
      </div>
    )
  }
  
  if (!projects || projects.length === 0) {
    return (
      <div className="h-64 md:h-80 lg:h-96 flex items-center justify-center text-gray-500 dark:text-gray-400">
        暂无数据
      </div>
    )
  }
  
  // 格式化数据用于图表显示（只显示前8个项目，其他归为"其他"）
  const topProjects = projects.slice(0, 8)
  const otherProjects = projects.slice(8)
  const otherTotal = otherProjects.reduce((sum, p) => sum + (p.summary?.total_execution || 0), 0)
  
  const chartData = [
    ...topProjects.map(project => ({
      name: project.project_name || '未命名项目',
      value: project.summary?.total_execution || 0
    })),
    ...(otherTotal > 0 ? [{
      name: '其他',
      value: otherTotal
    }] : [])
  ]
  
  // 生成颜色数组
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#ec4899', '#84cc16', '#6b7280'
  ]
  
  // 自定义标签函数
  const renderLabel = (entry) => {
    const percent = ((entry.value / chartData.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(1)
    return `${entry.name}: ${percent}%`
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
            formatter={(value) => [value.toLocaleString(), '执行次数']}
          />
          <Legend
            formatter={(value, entry) => {
              const percent = ((entry.payload.value / chartData.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(1)
              return `${value} (${percent}%)`
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

