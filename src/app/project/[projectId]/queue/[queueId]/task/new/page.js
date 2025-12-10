'use client'

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { TaskForm } from '@/components/task/TaskForm'
import { useToast as useShadcnToast } from '@/components/ui/use-toast'
import Breadcrumb from '@/components/layout/Breadcrumb'
import PageContainer from '@/components/layout/PageContainer'
import { AuthGuard } from '@/components/auth/AuthGuard'

export default function CreateQueueTaskPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params?.projectId
  const queueId = params?.queueId
  const { toast } = useShadcnToast()
  const [isCreatingTask, setIsCreatingTask] = useState(false)

  const handleCreateTask = useCallback(async (taskData) => {
    if (!projectId || !queueId) return

    setIsCreatingTask(true)
    try {
      const { fetchWithAuth } = await import('@/lib/fetch-utils')
      const encodedProjectId = encodeURIComponent(projectId)
      const encodedQueueId = encodeURIComponent(queueId)
      const response = await fetchWithAuth(`/api/v1/projects/${encodedProjectId}/queues/${encodedQueueId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData)
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || '创建任务失败')
      }

      toast({
        title: '成功',
        description: '任务创建成功',
        variant: 'default'
      })

      // 返回队列详情页
      router.push(`/project/${encodeURIComponent(projectId)}/queue/${encodeURIComponent(queueId)}`)
    } catch (error) {
      toast({
        title: '创建失败',
        description: error.message || '请稍后重试',
        variant: 'destructive'
      })
    } finally {
      setIsCreatingTask(false)
    }
  }, [projectId, queueId, router, toast])

  const handleCancel = useCallback(() => {
    router.back()
  }, [router])

  const encodedProjectId = projectId ? encodeURIComponent(projectId) : ''
  const encodedQueueId = queueId ? encodeURIComponent(queueId) : ''

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
              { label: '创建任务', href: '#' }
            ]}
          />
        </PageContainer>

        {/* 页面内容 */}
        <PageContainer className="py-4 md:py-6 lg:py-8">
          <div className="max-w-2xl mx-auto">
            {/* 任务表单 */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 md:p-5 lg:p-6">
              <TaskForm
                onSubmit={handleCreateTask}
                onCancel={handleCancel}
                isSubmitting={isCreatingTask}
              />
            </div>
          </div>
        </PageContainer>
      </div>
    </AuthGuard>
  )
}

