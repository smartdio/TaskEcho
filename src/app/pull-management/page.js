/**
 * 拉取管理页面
 * 显示拉取统计信息、未推送任务列表、批量操作
 */
'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Breadcrumb from '@/components/layout/Breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { RefreshCw, AlertCircle, Download, Upload, BarChart3, Clock } from 'lucide-react'
import { useToast as useShadcnToast } from '@/components/ui/use-toast'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { cn } from '@/lib/utils'
import { TaskPullStatus } from '@/components/pull/TaskPullStatus'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

/**
 * 获取拉取统计信息
 */
async function fetchPullStats(projectId) {
  const { fetchWithAuth } = await import('@/lib/fetch-utils')
  const encodedProjectId = encodeURIComponent(projectId)
  const response = await fetchWithAuth(`/api/v1/projects/${encodedProjectId}/tasks/pull/stats`)
  if (!response.ok) return null
  const result = await response.json()
  return result.success ? result.data : null
}

/**
 * 获取未推送任务列表
 */
async function fetchPendingTasks(projectId, timeout = 3600) {
  const { fetchWithAuth } = await import('@/lib/fetch-utils')
  const encodedProjectId = encodeURIComponent(projectId)
  const response = await fetchWithAuth(`/api/v1/projects/${encodedProjectId}/tasks/pull/pending?timeout=${timeout}`)
  if (!response.ok) return []
  const result = await response.json()
  return result.success ? (result.data.tasks || []) : []
}

/**
 * 批量释放拉取锁定
 */
async function batchReleasePulls(projectId, taskIds) {
  const { fetchWithAuth } = await import('@/lib/fetch-utils')
  const encodedProjectId = encodeURIComponent(projectId)
  const response = await fetchWithAuth(`/api/v1/projects/${encodedProjectId}/tasks/pull/release/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskIds })
  })
  if (!response.ok) throw new Error('批量释放失败')
  const result = await response.json()
  return result.success ? result.data : null
}

export default function PullManagementPage() {
  const router = useRouter()
  const { toast } = useShadcnToast()
  
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [projects, setProjects] = useState([])
  const [stats, setStats] = useState(null)
  const [pendingTasks, setPendingTasks] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTasks, setSelectedTasks] = useState(new Set())
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false)
  const [isReleasing, setIsReleasing] = useState(false)

  // 加载项目列表
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const { fetchWithAuth } = await import('@/lib/fetch-utils')
        const response = await fetchWithAuth('/api/v1/projects?pageSize=1000')
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            setProjects(result.data.items || [])
          }
        }
      } catch (error) {
        console.error('加载项目列表失败:', error)
      }
    }
    loadProjects()
  }, [])

  // 加载统计数据
  const loadStats = useCallback(async () => {
    if (!selectedProjectId) {
      setStats(null)
      setPendingTasks([])
      return
    }

    setIsLoading(true)
    try {
      const [statsData, pendingData] = await Promise.all([
        fetchPullStats(selectedProjectId),
        fetchPendingTasks(selectedProjectId)
      ])
      setStats(statsData)
      setPendingTasks(pendingData)
    } catch (error) {
      console.error('加载数据失败:', error)
      toast({
        title: '加载失败',
        description: error.message || '请稍后重试',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }, [selectedProjectId, toast])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  // 批量释放
  const handleBatchRelease = useCallback(async () => {
    if (!selectedProjectId || selectedTasks.size === 0) return

    setIsReleasing(true)
    try {
      const taskIds = Array.from(selectedTasks)
      const result = await batchReleasePulls(selectedProjectId, taskIds)
      
      toast({
        title: '成功',
        description: `成功释放 ${result.released_count} 个任务的拉取锁定`,
        variant: 'default'
      })

      setReleaseDialogOpen(false)
      setSelectedTasks(new Set())
      loadStats() // 重新加载数据
    } catch (error) {
      toast({
        title: '操作失败',
        description: error.message || '请稍后重试',
        variant: 'destructive'
      })
    } finally {
      setIsReleasing(false)
    }
  }, [selectedProjectId, selectedTasks, toast, loadStats])

  const toggleTaskSelection = (taskId) => {
    const newSelected = new Set(selectedTasks)
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId)
    } else {
      newSelected.add(taskId)
    }
    setSelectedTasks(newSelected)
  }

  const selectAll = () => {
    if (selectedTasks.size === pendingTasks.length) {
      setSelectedTasks(new Set())
    } else {
      setSelectedTasks(new Set(pendingTasks.map(t => t.task_id || t.id)))
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <main className="container mx-auto px-4 md:px-5 lg:px-6 py-4 md:py-5 lg:py-6">
          <Breadcrumb
            items={[
              { label: '拉取管理', href: undefined }
            ]}
          />

          <div className="flex items-center justify-between mb-4 md:mb-5 lg:mb-6">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2 md:gap-3">
              <BarChart3 className="h-6 w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 text-blue-600 dark:text-blue-400" />
              <span>拉取管理</span>
            </h1>
          </div>

          {/* 项目选择 */}
          <Card className="mb-4 md:mb-5 lg:mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardContent className="p-4 md:p-5 lg:p-6">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">选择项目:</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="flex h-11 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">请选择项目</option>
                  {projects.map(project => (
                    <option key={project.project_id} value={project.project_id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={loadStats}
                  disabled={!selectedProjectId || isLoading}
                  variant="outline"
                  size="sm"
                  className="h-11"
                >
                  <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
                  刷新
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 统计信息 */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 md:mb-5 lg:mb-6">
              <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">服务端任务总数</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
                    {stats.total_server_tasks || 0}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">未拉取</p>
                  <p className="text-2xl font-semibold text-yellow-600">
                    {stats.not_pulled || 0}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">已拉取</p>
                  <p className="text-2xl font-semibold text-blue-600">
                    {stats.pulled || 0}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">拉取成功率</p>
                  <p className="text-2xl font-semibold text-green-600">
                    {stats.pull_success_rate || 0}%
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 未推送任务列表 */}
          {selectedProjectId && (
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <CardContent className="p-4 md:p-5 lg:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    已拉取但未推送的任务
                  </h2>
                  {pendingTasks.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selectAll}
                        className="h-9"
                      >
                        {selectedTasks.size === pendingTasks.length ? '取消全选' : '全选'}
                      </Button>
                      {selectedTasks.size > 0 && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setReleaseDialogOpen(true)}
                          className="h-9"
                        >
                          批量释放 ({selectedTasks.size})
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {isLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-400">加载中...</p>
                  </div>
                ) : pendingTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-400">暂无未推送的任务</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingTasks.map((task) => (
                      <div
                        key={task.task_id || task.id}
                        className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTasks.has(task.task_id || task.id)}
                          onChange={() => toggleTaskSelection(task.task_id || task.id)}
                          className="h-4 w-4"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
                            {task.name || task.task_id || task.id}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <TaskPullStatus pulledAt={task.pulled_at} source={task.source} />
                            {task.queue_name && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                队列: {task.queue_name}
                              </span>
                            )}
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              超时: {task.timeout_hours}小时
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 批量释放确认对话框 */}
          <AlertDialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>确认批量释放</AlertDialogTitle>
                <AlertDialogDescription>
                  确定要释放 {selectedTasks.size} 个任务的拉取锁定吗？释放后这些任务可以重新被拉取。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isReleasing} className="h-11">取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleBatchRelease}
                  disabled={isReleasing}
                  className="h-11"
                >
                  {isReleasing ? '释放中...' : '确认释放'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </div>
    </AuthGuard>
  )
}

