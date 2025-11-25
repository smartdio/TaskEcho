'use client'

import { ProjectCard } from './ProjectCard'

/**
 * 项目列表组件
 * @param {Object} props
 * @param {Array} props.projects - 项目列表
 * @param {boolean} props.loading - 加载状态
 */
export function ProjectList({ projects = [], loading }) {
  if (loading) {
    return (
      <div className="space-y-4 md:space-y-5 lg:space-y-6">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg md:rounded-xl p-4 md:p-5 lg:p-6 animate-pulse"
          >
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mt-4"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12 md:py-16 lg:py-20">
        <p className="text-gray-600 dark:text-gray-400 text-base md:text-lg">
          暂无项目数据
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-5 lg:space-y-6">
      {projects.map((project) => (
        <ProjectCard key={project.id || project.project_id} project={project} />
      ))}
    </div>
  )
}
