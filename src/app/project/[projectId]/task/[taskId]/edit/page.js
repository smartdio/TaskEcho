'use client'

import { useState, useCallback, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { TaskForm } from '@/components/task/TaskForm'
import { useToast as useShadcnToast } from '@/components/ui/use-toast'
import Breadcrumb from '@/components/layout/Breadcrumb'
import PageContainer from '@/components/layout/PageContainer'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { RefreshCw } from 'lucide-react'

/**
 * 获取项目级任务详情数据
 */
async function fetchProjectTaskData(projectId, taskId) {
  const { fetchWithAuth } = await import('@/lib/fetch-utils')
  const encodedProjectId = encodeURIComponent(projectId)
  const encodedTaskId = encodeURIComponent(taskId)
  
  const taskResponse = await fetchWithAuth(
    `/api/v1/projects/${encodedProjectId}/tasks/${encodedTaskId}`
  )

  if (!taskResponse.ok) {
    if (taskResponse.status === 404) {
      throw new Error('任务不存在')
    }
    throw new Error(`获取任务详情失败: ${taskResponse.status}`)
  }

  const taskData = await taskResponse.json()

  if (!taskData.success) {
    throw new Error(taskData.error?.message || '获取任务详情失败')
  }

  return {
    task: taskData.data
  }
}

export default function EditProjectTaskPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params?.projectId
  const taskId = params?.taskId
  const { toast } = useShadcnToast()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [task, setTask] = useState(null)
  const [error, setError] = useState(null)

  // 加载任务数据
  useEffect(() => {
    const loadTask = async () => {
      if (!projectId || !taskId) return
      
      setIsLoading(true)
      setError(null)
      try {
        const data = await fetchProjectTaskData(projectId, taskId)
        setTask(data.task)
      } catch (err) {
        setError(err.message || '加载任务失败')
        toast({
          title: '加载失败',
          description: err.message || '请稍后重试',
          variant: 'destructive'
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadTask()
  }, [projectId, taskId, toast])

  const handleEditTask = useCallback(async (taskData) => {
    if (!projectId || !taskId) return

    setIsEditing(true)
    try {
      const { fetchWithAuth } = await import('@/lib/fetch-utils')
      const encodedProjectId = encodeURIComponent(projectId)
      const encodedTaskId = encodeURIComponent(taskId)
      
      const response = await fetchWithAuth(
        `/api/v1/projects/${encodedProjectId}/tasks/${encodedTaskId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData)
        }
      )

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || '更新任务失败')
      }

      toast({
        title: '成功',
        description: '任务更新成功',
        variant: 'default'
      })

      // 返回项目详情页
      router.push(`/project/${encodeURIComponent(projectId)}`)
    } catch (error) {
      toast({
        title: '更新失败',
        description: error.message || '请稍后重试',
        variant: 'destructive'
      })
    } finally {
      setIsEditing(false)
    }
  }, [projectId, taskId, router, toast])

  const handleCancel = useCallback(() => {
    router.back()
  }, [router])

  const encodedProjectId = projectId ? encodeURIComponent(projectId) : ''
  const encodedTaskId = taskId ? encodeURIComponent(taskId) : ''

  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        {/* 面包屑导航 */}
        <PageContainer className="pt-4 pb-2">
          <Breadcrumb
            items={[
              { label: '首页', href: '/' },
              { label: '项目详情', href: `/project/${encodedProjectId}` },
              { label: '编辑任务', href: '#' }
            ]}
          />
        </PageContainer>

        {/* 页面内容 */}
        <PageContainer className="py-4 md:py-6 lg:py-8">
          <div className="max-w-2xl mx-auto">
            {/* 加载状态 */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 md:h-10 md:w-10 text-gray-400 mx-auto mb-4 animate-spin" />
                </div>
              </div>
            )}

            {/* 错误状态 */}
            {error && !isLoading && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 md:p-5">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* 任务表单 */}
            {!isLoading && !error && task && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 md:p-5 lg:p-6">
                <TaskForm
                  task={task}
                  onSubmit={handleEditTask}
                  onCancel={handleCancel}
                  isSubmitting={isEditing}
                />
              </div>
            )}
          </div>
        </PageContainer>
      </div>
    </AuthGuard>
  )
}

