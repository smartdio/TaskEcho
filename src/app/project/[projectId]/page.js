'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Breadcrumb from '@/components/layout/Breadcrumb'
import { SearchSection } from '@/components/project/SearchSection'
import { ProjectStatsSection } from '@/components/project/ProjectStatsSection'
import { QueueList } from '@/components/project/QueueList'
import { Pagination } from '@/components/home/Pagination'
import { Button } from '@/components/ui/button'
import { RefreshCw, AlertCircle, MoreVertical, Edit, Trash2, FolderKanban, User, Folder, GitBranch, Link as LinkIcon, Tag } from 'lucide-react'
import { useToast as useShadcnToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { useTimestampCheck } from '@/hooks/useTimestampCheck'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useSwipeBack } from '@/hooks/useSwipeBack'
import { AuthGuard } from '@/components/auth/AuthGuard'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { TagInput } from '@/components/project/TagInput'

const POLLING_INTERVAL = 20000 // 20秒轮询间隔

/**
 * 获取项目详情页数据（合并项目信息、队列列表和统计数据）
 * @param {string} projectId - 项目ID
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @param {string} search - 搜索关键词（可选）
 */
async function fetchProjectDetailData(projectId, page = 1, pageSize = 100, search = null) {
  const { fetchWithAuth } = await import('@/lib/fetch-utils')
  // 对项目ID进行URL编码，因为项目ID可能包含特殊字符（如路径）
  const encodedProjectId = encodeURIComponent(projectId)
  
  // 计算7天前的日期
  const today = new Date()
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const startDate = sevenDaysAgo.toISOString().split('T')[0]
  const endDate = today.toISOString().split('T')[0]
  
  // 构建队列列表API的查询参数
  const queueParams = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString()
  })
  if (search && search.trim()) {
    queueParams.append('search', search.trim())
  }
  
  const [projectResponse, queuesResponse, statsResponse] = await Promise.all([
    fetchWithAuth(`/api/v1/projects/${encodedProjectId}`),
    fetchWithAuth(`/api/v1/projects/${encodedProjectId}/queues?${queueParams.toString()}`),
    fetchWithAuth(`/api/v1/stats/project/${encodedProjectId}?startDate=${startDate}&endDate=${endDate}`).catch(() => null)
  ])

  if (!projectResponse.ok) {
    if (projectResponse.status === 404) {
      throw new Error('项目不存在')
    }
    throw new Error(`获取项目信息失败: ${projectResponse.status}`)
  }

  if (!queuesResponse.ok) {
    throw new Error(`获取任务队列列表失败: ${queuesResponse.status}`)
  }

  const [projectData, queuesData, statsData] = await Promise.all([
    projectResponse.json(),
    queuesResponse.json(),
    statsResponse?.ok ? statsResponse.json() : Promise.resolve({ success: true, data: { daily_stats: [] } })
  ])

  if (!projectData.success) {
    throw new Error(projectData.error?.message || '获取项目信息失败')
  }

  if (!queuesData.success) {
    throw new Error(queuesData.error?.message || '获取任务队列列表失败')
  }

  return {
    project: projectData.data,
    queues: queuesData.data.items || [],
    pagination: queuesData.data.pagination || {
      page: 1,
      pageSize: 100,
      total: 0,
      totalPages: 1
    },
    trendData: statsData.success ? (statsData.data.daily_stats || []) : []
  }
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params?.projectId
  // 对项目ID进行URL编码，用于构建路由链接
  const encodedProjectId = projectId ? encodeURIComponent(projectId) : ''
  const { toast } = useShadcnToast()

  const [searchKeyword, setSearchKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(100)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  
  // 元数据编辑相关状态
  const [metadataDialogOpen, setMetadataDialogOpen] = useState(false)
  const [customTitle, setCustomTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState([])
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false)
  const [isSavingMetadata, setIsSavingMetadata] = useState(false)

  // 创建检查函数（轻量级检查API）
  const checkQueues = useCallback(async () => {
    if (!projectId) return null
    const { fetchWithAuth } = await import('@/lib/fetch-utils')
    const encodedProjectId = encodeURIComponent(projectId)
    const response = await fetchWithAuth(`/api/v1/projects/${encodedProjectId}/queues/check`)
    if (!response.ok) return null
    const result = await response.json()
    return result.success ? result.data : null
  }, [projectId])

  // 创建获取完整数据的函数
  const fetchData = useCallback(() => {
    if (!projectId) return Promise.resolve(null)
    return fetchProjectDetailData(projectId, page, pageSize, searchKeyword)
  }, [projectId, page, pageSize, searchKeyword])

  // 使用基于时间戳检查的无感更新Hook
  const {
    data,
    isLoading: isInitialLoading,
    isRefreshing,
    error,
    refetch
  } = useTimestampCheck(checkQueues, fetchData, POLLING_INTERVAL, {
    enabled: true, // 启用自动检查
    onError: (err) => {
      toast({
        title: '加载失败',
        description: err.message || '请稍后重试',
        variant: 'destructive'
      })
    }
  })

  // 下拉刷新
  const { isRefreshing: isPullRefreshing, pullDistance, isPulling } = usePullToRefresh(
    () => refetch(),
    {
      threshold: 80,
      resistance: 0.5,
      enabled: !isInitialLoading && !!projectId
    }
  )

  // 滑动返回
  useSwipeBack(
    () => router.push('/'),
    {
      threshold: 80,
      resistance: 0.5,
      enabled: true
    }
  )

  // 跟踪是否是首次加载，避免首次加载时重复请求
  const isFirstLoadRef = useRef(true)

  // 当搜索或页码改变时，自动重新请求API
  useEffect(() => {
    // 跳过首次加载（首次加载由 useVisibilityAwarePolling 自动处理）
    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false
      return
    }

    // 只有在有 projectId 时才请求
    if (projectId) {
      refetch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKeyword, page])

  // 页码改变处理
  const handlePageChange = useCallback((newPage) => {
    setPage(newPage)
    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // 搜索关键词改变处理（切换搜索时重置到第一页）
  const handleSearchChange = useCallback((newSearch) => {
    setSearchKeyword(newSearch)
    setPage(1) // 重置到第一页
  }, [])

  // 提取数据
  const project = data?.project || null
  const trendData = data?.trendData || []
  const queues = data?.queues || []
  const pagination = data?.pagination || {
    page: 1,
    pageSize: 100,
    total: 0,
    totalPages: 1
  }
  
  // 获取显示标题：优先使用 displayTitle，否则使用 name
  const displayTitle = project?.displayTitle || project?.name || '项目详情'
  
  // 准备项目统计数据
  const projectStats = project ? {
    queue_count: project.queue_count || 0,
    task_stats: project.task_stats || {
      total: 0,
      pending: 0,
      done: 0,
      error: 0
    }
  } : {
    queue_count: 0,
    task_stats: {
      total: 0,
      pending: 0,
      done: 0,
      error: 0
    }
  }

  // 打开编辑对话框
  const handleOpenEditDialog = useCallback(() => {
    if (project) {
      setEditName(project.name)
      setEditDialogOpen(true)
    }
  }, [project])

  // 打开删除确认对话框
  const handleOpenDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(true)
  }, [])

  // 更新项目名称
  const handleUpdateProject = useCallback(async () => {
    if (!projectId || !editName.trim()) {
      toast({
        title: '错误',
        description: '项目名称不能为空',
        variant: 'destructive'
      })
      return
    }

    setIsUpdating(true)
    try {
      const { fetchWithAuth } = await import('@/lib/fetch-utils')
      const encodedProjectId = encodeURIComponent(projectId)
      const response = await fetchWithAuth(`/api/v1/projects/${encodedProjectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: editName.trim() })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || '更新项目失败')
      }

      toast({
        title: '成功',
        description: '项目更新成功',
        variant: 'default'
      })

      setEditDialogOpen(false)
      refetch() // 刷新数据
    } catch (error) {
      toast({
        title: '更新失败',
        description: error.message || '请稍后重试',
        variant: 'destructive'
      })
    } finally {
      setIsUpdating(false)
    }
  }, [projectId, editName, toast, refetch])

  // 打开元数据编辑对话框
  const handleOpenMetadataDialog = useCallback(async () => {
    if (!projectId) return
    
    setMetadataDialogOpen(true)
    setIsLoadingMetadata(true)
    
    try {
      const { fetchWithAuth } = await import('@/lib/fetch-utils')
      const encodedProjectId = encodeURIComponent(projectId)
      const response = await fetchWithAuth(`/api/v1/projects/${encodedProjectId}/metadata`)
      
      if (!response.ok) {
        throw new Error(`获取元数据失败: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success && result.data) {
        setCustomTitle(result.data.customTitle || '')
        setNotes(result.data.notes || '')
        setTags(result.data.tags || [])
      } else {
        // 如果元数据不存在，使用默认值
        setCustomTitle('')
        setNotes('')
        setTags([])
      }
    } catch (error) {
      console.error('加载元数据失败:', error)
      toast({
        title: '加载失败',
        description: error.message || '请稍后重试',
        variant: 'destructive'
      })
      // 使用默认值
      setCustomTitle('')
      setNotes('')
      setTags([])
    } finally {
      setIsLoadingMetadata(false)
    }
  }, [projectId, toast])

  // 保存元数据
  const handleSaveMetadata = useCallback(async () => {
    if (!projectId) return

    // 验证数据
    if (customTitle.length > 200) {
      toast({
        title: '错误',
        description: '自定义标题不能超过200个字符',
        variant: 'destructive'
      })
      return
    }

    if (notes.length > 5000) {
      toast({
        title: '错误',
        description: '备注不能超过5000个字符',
        variant: 'destructive'
      })
      return
    }

    if (tags.length > 20) {
      toast({
        title: '错误',
        description: '标签数量不能超过20个',
        variant: 'destructive'
      })
      return
    }

    // 处理标签：去重、转小写、过滤空字符串（后端也会处理，但前端先处理一下）
    const processedTags = [...new Set(
      tags
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0 && tag.length <= 50)
    )]

    setIsSavingMetadata(true)
    try {
      const { fetchWithAuth } = await import('@/lib/fetch-utils')
      const encodedProjectId = encodeURIComponent(projectId)
      const response = await fetchWithAuth(`/api/v1/projects/${encodedProjectId}/metadata`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customTitle: customTitle.trim() || null,
          notes: notes.trim() || null,
          tags: processedTags
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || '保存失败')
      }

      toast({
        title: '成功',
        description: '项目信息已保存',
        variant: 'default'
      })

      // 关闭对话框
      setMetadataDialogOpen(false)

      // 刷新项目数据
      refetch()
    } catch (error) {
      toast({
        title: '保存失败',
        description: error.message || '请稍后重试',
        variant: 'destructive'
      })
    } finally {
      setIsSavingMetadata(false)
    }
  }, [projectId, customTitle, notes, tags, toast, refetch])

  // 删除项目
  const handleDeleteProject = useCallback(async () => {
    if (!projectId) return

    setIsDeleting(true)
    try {
      const { fetchWithAuth } = await import('@/lib/fetch-utils')
      const encodedProjectId = encodeURIComponent(projectId)
      const response = await fetchWithAuth(`/api/v1/projects/${encodedProjectId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || '删除项目失败')
      }

      toast({
        title: '成功',
        description: '项目删除成功',
        variant: 'default'
      })

      setDeleteDialogOpen(false)
      // 删除成功后跳转到首页
      router.push('/')
    } catch (error) {
      toast({
        title: '删除失败',
        description: error.message || '请稍后重试',
        variant: 'destructive'
      })
      setIsDeleting(false)
    }
  }, [projectId, toast, router])


  // 项目不存在错误
  if (error && error.message && error.message.includes('项目不存在')) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <main className="container mx-auto px-4 md:px-5 lg:px-6 py-4 md:py-5 lg:py-6">
          <div className="text-center py-12 md:py-16 lg:py-20">
            <AlertCircle className="h-12 w-12 md:h-16 md:w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold text-gray-900 dark:text-gray-50 mb-2">
              项目不存在
            </h2>
            <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 mb-6">
              {error.message}
            </p>
            <Button onClick={() => router.push('/')}>
              返回首页
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <main 
          className={cn(
            "container mx-auto px-4 md:px-5 lg:px-6 py-4 md:py-5 lg:py-6 transition-transform duration-200 ease-out"
          )}
          style={{
            transform: (isPulling || isPullRefreshing) 
              ? `translateY(${Math.min(pullDistance, 80)}px)` 
              : undefined
          }}
        >
          {/* 面包屑导航 */}
          <Breadcrumb
            items={[
              {
                label: displayTitle,
                href: project ? `/project/${encodedProjectId}` : undefined
              }
            ]}
          />

          {/* 下拉刷新指示器 */}
          {(isPulling || isPullRefreshing) && (
            <div
              className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 transition-transform duration-200 ease-out"
              style={{
                transform: `translateY(${Math.min(pullDistance, 80) - 80}px)`,
                height: '80px'
              }}
            >
              <div className="flex flex-col items-center gap-2">
                <RefreshCw
                  className={cn(
                    'h-5 w-5 md:h-6 md:w-6 text-blue-600 dark:text-blue-400 transition-transform duration-200',
                    isPullRefreshing && 'animate-spin',
                    !isPullRefreshing && pullDistance >= 80 && 'rotate-180'
                  )}
                />
                <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                  {isPullRefreshing ? '正在刷新...' : pullDistance >= 80 ? '释放即可刷新' : '下拉刷新'}
                </span>
              </div>
            </div>
          )}

          {/* 后台更新提示 */}
          {isRefreshing && !isInitialLoading && (
            <div className="mb-4 md:mb-6 p-2 md:p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-2">
              <RefreshCw className="h-4 w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400 animate-spin" />
              <span className="text-xs md:text-sm text-blue-700 dark:text-blue-300">正在更新数据...</span>
            </div>
          )}

          {/* 页面头部 */}
          <div className="flex items-center justify-between mb-4 md:mb-5 lg:mb-6">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2 md:gap-3">
              <FolderKanban className="h-6 w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
              <span>{displayTitle}</span>
            </h1>
            {project && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenMetadataDialog}
                  className="h-9 md:h-10 px-3 md:px-4"
                  aria-label="编辑项目信息"
                >
                  <Tag className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 md:h-10 px-3 md:px-4"
                      aria-label="管理菜单"
                    >
                      <MoreVertical className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleOpenEditDialog}>
                      <Edit className="mr-2 h-4 w-4" />
                      <span>编辑</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleOpenDeleteDialog}
                      className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>删除</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* 错误提示 */}
          {error && !isInitialLoading && !error.message?.includes('项目不存在') && (
            <div className="mb-4 md:mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm md:text-base text-red-800 dark:text-red-200">
                  {error.message || '加载数据失败'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="h-8 md:h-9"
              >
                重试
              </Button>
            </div>
          )}

          {/* 客户端信息卡片 */}
          {!isInitialLoading && !error && project?.clientInfo && (
            <Card className="mb-4 md:mb-5 lg:mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <CardContent className="p-4 md:p-5 lg:p-6">
                <h2 className="text-lg md:text-xl lg:text-xl font-semibold text-gray-900 dark:text-gray-50 mb-3 md:mb-4">
                  客户端信息
                </h2>
                <div className="space-y-3 md:space-y-4">
                  {(project.clientInfo.username || project.clientInfo.hostname) && (
                    <div className="flex items-start gap-3 md:gap-4">
                      <User className="h-5 w-5 md:h-5 md:w-5 lg:h-6 lg:w-6 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1">
                          用户信息
                        </p>
                        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                          {project.clientInfo.username && (
                            <p className="text-sm md:text-base text-gray-900 dark:text-gray-50 wrap-break-word">
                              {project.clientInfo.username}
                            </p>
                          )}
                          {project.clientInfo.username && project.clientInfo.hostname && (
                            <span className="text-gray-400 dark:text-gray-500">·</span>
                          )}
                          {project.clientInfo.hostname && (
                            <p className="text-sm md:text-base text-gray-900 dark:text-gray-50 wrap-break-word">
                              {project.clientInfo.hostname}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {project.clientInfo.project_path && (
                    <div className="flex items-start gap-3 md:gap-4">
                      <Folder className="h-5 w-5 md:h-5 md:w-5 lg:h-6 lg:w-6 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1">
                          项目路径
                        </p>
                        <p className="text-sm md:text-base text-gray-900 dark:text-gray-50 wrap-break-word font-mono">
                          {project.clientInfo.project_path}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Git 信息卡片 */}
          {!isInitialLoading && !error && project?.gitInfo && (project.gitInfo.repository || project.gitInfo.branch) && (
            <Card className="mb-4 md:mb-5 lg:mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <CardContent className="p-4 md:p-5 lg:p-6">
                <h2 className="text-lg md:text-xl lg:text-xl font-semibold text-gray-900 dark:text-gray-50 mb-3 md:mb-4">
                  Git 信息
                </h2>
                <div className="space-y-3 md:space-y-4">
                  {project.gitInfo.repository && (
                    <div className="flex items-start gap-3 md:gap-4">
                      <LinkIcon className="h-5 w-5 md:h-5 md:w-5 lg:h-6 lg:w-6 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1">
                          仓库地址
                        </p>
                        <p className="text-sm md:text-base text-gray-900 dark:text-gray-50 wrap-break-word font-mono">
                          {project.gitInfo.repository}
                        </p>
                      </div>
                    </div>
                  )}
                  {project.gitInfo.branch && (
                    <div className="flex items-start gap-3 md:gap-4">
                      <GitBranch className="h-5 w-5 md:h-5 md:w-5 lg:h-6 lg:w-6 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1">
                          分支
                        </p>
                        <p className="text-sm md:text-base text-gray-900 dark:text-gray-50 wrap-break-word">
                          {project.gitInfo.branch}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 项目统计和趋势图 */}
          <ProjectStatsSection stats={projectStats} trendData={trendData} loading={isInitialLoading} />

          {/* 搜索区域 */}
          {!isInitialLoading && !error && (
            <SearchSection
              value={searchKeyword}
              onChange={handleSearchChange}
              placeholder="输入队列名称进行搜索..."
            />
          )}

          {/* 搜索无结果 */}
          {!isInitialLoading && !error && queues.length === 0 && searchKeyword && (
            <div className="text-center py-12 md:py-16 lg:py-20">
              <p className="text-base md:text-lg lg:text-xl text-gray-600 dark:text-gray-400">
                未找到匹配的任务队列
              </p>
              <Button
                variant="outline"
                onClick={() => handleSearchChange('')}
                className="mt-4"
              >
                清除搜索
              </Button>
            </div>
          )}

          {/* 队列列表 */}
          <QueueList
            queues={queues}
            projectId={projectId}
            loading={isInitialLoading}
          />

          {/* 分页控件 */}
          {!isInitialLoading && !error && queues.length > 0 && pagination.totalPages > 1 && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          )}

          {/* 编辑项目对话框 */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>编辑项目</DialogTitle>
                <DialogDescription>
                  修改项目名称
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="project-name">项目名称</Label>
                  <Input
                    id="project-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="请输入项目名称"
                    disabled={isUpdating}
                    className="h-11"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isUpdating) {
                        handleUpdateProject()
                      }
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  disabled={isUpdating}
                  className="h-11"
                >
                  取消
                </Button>
                <Button
                  onClick={handleUpdateProject}
                  disabled={isUpdating || !editName.trim()}
                  className="h-11"
                >
                  {isUpdating ? '更新中...' : '保存'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* 删除确认对话框 */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <AlertDialogTitle>确认删除</AlertDialogTitle>
                </div>
                <div className="text-base text-muted-foreground">
                  <div className="mb-2">
                    确定要删除项目「<strong>{displayTitle}</strong>」吗？
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    删除后，该项目下的所有任务队列和任务将被永久删除。此操作不可恢复。
                  </div>
                </div>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2 sm:gap-0">
                <AlertDialogCancel
                  onClick={() => setDeleteDialogOpen(false)}
                  disabled={isDeleting}
                  className="h-11"
                >
                  取消
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteProject}
                  disabled={isDeleting}
                  className="h-11 bg-red-600 hover:bg-red-700 text-white focus:ring-red-500"
                >
                  {isDeleting ? '删除中...' : '确认删除'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* 元数据编辑对话框 */}
          <Dialog open={metadataDialogOpen} onOpenChange={setMetadataDialogOpen}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>编辑项目信息</DialogTitle>
                <DialogDescription>
                  自定义项目标题、备注和标签
                </DialogDescription>
              </DialogHeader>
              {isLoadingMetadata ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600 dark:text-gray-400">加载中...</span>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  {/* 自定义标题输入框 */}
                  <div className="space-y-2">
                    <Label htmlFor="custom-title">自定义标题</Label>
                    <Input
                      id="custom-title"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="留空则使用项目名称"
                      disabled={isSavingMetadata}
                      className="h-11"
                      maxLength={200}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      已输入 {customTitle.length} / 200 字符
                    </p>
                  </div>

                  {/* 备注输入框 */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">备注</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="添加项目备注信息..."
                      disabled={isSavingMetadata}
                      className="min-h-[120px] resize-y"
                      maxLength={5000}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      已输入 {notes.length} / 5000 字符
                    </p>
                  </div>

                  {/* 标签管理 */}
                  <div className="space-y-2">
                    <Label>标签</Label>
                    <TagInput
                      tags={tags}
                      onTagsChange={setTags}
                      maxTags={20}
                      maxTagLength={50}
                    />
                  </div>
                </div>
              )}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setMetadataDialogOpen(false)}
                  disabled={isSavingMetadata || isLoadingMetadata}
                  className="h-11"
                >
                  取消
                </Button>
                <Button
                  onClick={handleSaveMetadata}
                  disabled={isSavingMetadata || isLoadingMetadata}
                  className="h-11"
                >
                  {isSavingMetadata ? '保存中...' : '保存'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </AuthGuard>
  )
}
