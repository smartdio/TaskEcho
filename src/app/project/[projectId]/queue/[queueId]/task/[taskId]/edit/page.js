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
 * 获取任务详情数据
 */
async function fetchTaskDetailData(projectId, queueId, taskId) {
  const { fetchWithAuth } = await import('@/lib/fetch-utils')
  const encodedProjectId = encodeURIComponent(projectId)
  const encodedQueueId = encodeURIComponent(queueId)
  const encodedTaskId = encodeURIComponent(taskId)
  
  const taskResponse = await fetchWithAuth(
    `/api/v1/projects/${encodedProjectId}/queues/${encodedQueueId}/tasks/${encodedTaskId}`
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

export default function EditTaskPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params?.projectId
  const queueId = params?.queueId
  const taskId = params?.taskId
  const { toast } = useShadcnToast()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [task, setTask] = useState(null)
  const [error, setError] = useState(null)

  // 加载任务数据
  useEffect(() => {
    const loadTask = async () => {
      if (!projectId || !queueId || !taskId) return
      
      setIsLoading(true)
      setError(null)
      try {
        const data = await fetchTaskDetailData(projectId, queueId, taskId)
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
  }, [projectId, queueId, taskId, toast])

  const handleEditTask = useCallback(async (taskData) => {
    if (!projectId || !queueId || !taskId) return

    setIsEditing(true)
    try {
      const { fetchWithAuth } = await import('@/lib/fetch-utils')
      const encodedProjectId = encodeURIComponent(projectId)
      const encodedQueueId = encodeURIComponent(queueId)
      const encodedTaskId = encodeURIComponent(taskId)
      
      const response = await fetchWithAuth(
        `/api/v1/projects/${encodedProjectId}/queues/${encodedQueueId}/tasks/${encodedTaskId}`,
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

      // 返回任务详情页
      router.push(`/project/${encodeURIComponent(projectId)}/queue/${encodeURIComponent(queueId)}/task/${encodeURIComponent(taskId)}`)
    } catch (error) {
      toast({
        title: '更新失败',
        description: error.message || '请稍后重试',
        variant: 'destructive'
      })
    } finally {
      setIsEditing(false)
    }
  }, [projectId, queueId, taskId, router, toast])

  const handleCancel = useCallback(() => {
    router.back()
  }, [router])

  const encodedProjectId = projectId ? encodeURIComponent(projectId) : ''
  const encodedQueueId = queueId ? encodeURIComponent(queueId) : ''
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
              { label: '队列详情', href: `/project/${encodedProjectId}/queue/${encodedQueueId}` },
              { label: '任务详情', href: `/project/${encodedProjectId}/queue/${encodedQueueId}/task/${encodedTaskId}` },
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

