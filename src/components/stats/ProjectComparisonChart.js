'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { cn } from '@/lib/utils'

/**
 * 项目对比图表组件（横向柱状图）
 * @param {Object} props
 * @param {Array} props.projects - 项目统计数据列表
 * @param {boolean} props.loading - 加载状态
 */
export function ProjectComparisonChart({ projects = [], loading }) {
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
  
  // 格式化数据用于图表显示（只显示前10个项目）
  const topProjects = projects.slice(0, 10)
  const chartData = topProjects.map(project => ({
    name: project.project_name || '未命名项目',
    execution: project.summary?.total_execution || 0
  }))
  
  // 生成颜色数组
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'
  ]
  
  return (
    <div className="w-full h-64 md:h-80 lg:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            type="number"
            className="text-xs md:text-sm text-gray-600 dark:text-gray-400"
            stroke="currentColor"
          />
          <YAxis
            type="category"
            dataKey="name"
            className="text-xs md:text-sm text-gray-600 dark:text-gray-400"
            stroke="currentColor"
            width={80}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border)',
              borderRadius: '0.5rem'
            }}
            formatter={(value) => [value.toLocaleString(), '执行次数']}
          />
          <Bar
            dataKey="execution"
            fill="#3b82f6"
            radius={[0, 4, 4, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

