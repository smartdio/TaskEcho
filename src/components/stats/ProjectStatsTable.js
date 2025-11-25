'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 项目统计表格组件
 * @param {Object} props
 * @param {Array} props.projects - 项目统计数据列表
 * @param {boolean} props.loading - 加载状态
 */
export function ProjectStatsTable({ projects = [], loading }) {
  const router = useRouter()
  const [sortField, setSortField] = useState('total_execution')
  const [sortOrder, setSortOrder] = useState('desc')
  
  // 排序逻辑
  const sortedProjects = useMemo(() => {
    if (!projects || projects.length === 0) return []
    
    const sorted = [...projects].sort((a, b) => {
      const aValue = a.summary?.[sortField] || 0
      const bValue = b.summary?.[sortField] || 0
      
      if (sortOrder === 'asc') {
        return aValue - bValue
      } else {
        return bValue - aValue
      }
    })
    
    return sorted
  }, [projects, sortField, sortOrder])
  
  // 处理排序
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }
  
  // 跳转到项目详情
  const handleProjectClick = (projectId) => {
    const encodedProjectId = encodeURIComponent(projectId)
    router.push(`/project/${encodedProjectId}`)
  }
  
  // 获取排序图标
  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      : <ArrowDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
  }
  
  if (loading) {
    return (
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-50">
            项目统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }
  
  if (!projects || projects.length === 0) {
    return (
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-50">
            项目统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            暂无项目统计数据
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-50">
          项目统计
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm md:text-base font-semibold text-gray-900 dark:text-gray-50">
                  项目名称
                </th>
                <th className="text-right py-3 px-4 text-sm md:text-base font-semibold text-gray-900 dark:text-gray-50">
                  <button
                    onClick={() => handleSort('total_execution')}
                    className="flex items-center gap-1 ml-auto hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    执行次数
                    {getSortIcon('total_execution')}
                  </button>
                </th>
                <th className="text-right py-3 px-4 text-sm md:text-base font-semibold text-gray-900 dark:text-gray-50">
                  <button
                    onClick={() => handleSort('total_success')}
                    className="flex items-center gap-1 ml-auto hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    成功次数
                    {getSortIcon('total_success')}
                  </button>
                </th>
                <th className="text-right py-3 px-4 text-sm md:text-base font-semibold text-gray-900 dark:text-gray-50">
                  <button
                    onClick={() => handleSort('total_failure')}
                    className="flex items-center gap-1 ml-auto hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    失败次数
                    {getSortIcon('total_failure')}
                  </button>
                </th>
                <th className="text-right py-3 px-4 text-sm md:text-base font-semibold text-gray-900 dark:text-gray-50">
                  <button
                    onClick={() => handleSort('success_rate')}
                    className="flex items-center gap-1 ml-auto hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    成功率
                    {getSortIcon('success_rate')}
                  </button>
                </th>
                <th className="text-center py-3 px-4 text-sm md:text-base font-semibold text-gray-900 dark:text-gray-50">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedProjects.map((project, index) => {
                const { project_id, project_name, summary = {} } = project
                const { total_execution = 0, total_success = 0, total_failure = 0, success_rate = 0 } = summary
                
                return (
                  <tr
                    key={project_id}
                    className={cn(
                      "border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors",
                      index % 2 === 0 && "bg-gray-50/50 dark:bg-gray-800/50"
                    )}
                  >
                    <td className="py-3 px-4">
                      <span className="text-sm md:text-base text-gray-900 dark:text-gray-50 font-medium">
                        {project_name || '未命名项目'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-sm md:text-base text-gray-900 dark:text-gray-50">
                      {total_execution.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-sm md:text-base text-green-600 dark:text-green-400">
                      {total_success.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-sm md:text-base text-red-500 dark:text-red-400">
                      {total_failure.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-sm md:text-base text-gray-900 dark:text-gray-50">
                      {(success_rate * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleProjectClick(project_id)}
                        className="text-xs md:text-sm"
                      >
                        <ExternalLink className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                        查看
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

