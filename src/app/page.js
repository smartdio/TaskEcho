'use client'

import { useState, useCallback } from 'react'
import { StatsSection } from '@/components/home/StatsSection'
import { ProjectList } from '@/components/home/ProjectList'
import { Pagination } from '@/components/home/Pagination'
import { Button } from '@/components/ui/button'
import { RefreshCw, AlertCircle } from 'lucide-react'
import { useToast as useShadcnToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { useVisibilityAwarePolling } from '@/hooks/useVisibilityAwarePolling'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { fetchWithAuth } from '@/lib/fetch-utils'

const POLLING_INTERVAL = 30000 // 30秒轮询间隔
const EMPTY_DATA_INTERVAL = 300000 // 5分钟（当没有数据时的轮询间隔）

/**
 * 获取首页数据（合并项目列表、统计和7日趋势）
 */
async function fetchHomePageData(page = 1, pageSize = 20) {
  // 计算7天前的日期
  const today = new Date()
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const startDate = sevenDaysAgo.toISOString().split('T')[0]
  const endDate = today.toISOString().split('T')[0]
  
  const [projectsResponse, statsResponse, trendResponse] = await Promise.all([
    fetchWithAuth(`/api/v1/projects?page=${page}&pageSize=${pageSize}`),
    fetchWithAuth('/api/v1/stats'),
    fetchWithAuth(`/api/v1/stats/system?startDate=${startDate}&endDate=${endDate}`)
  ])

  if (!projectsResponse.ok) {
    throw new Error(`获取项目列表失败: ${projectsResponse.status}`)
  }

  if (!statsResponse.ok) {
    throw new Error(`获取统计信息失败: ${statsResponse.status}`)
  }

  const [projectsData, statsData, trendData] = await Promise.all([
    projectsResponse.json(),
    statsResponse.json(),
    trendResponse.ok ? trendResponse.json() : Promise.resolve({ success: true, data: { daily_stats: [] } })
  ])

  if (!projectsData.success) {
    throw new Error(projectsData.error?.message || '获取项目列表失败')
  }

  if (!statsData.success) {
    throw new Error(statsData.error?.message || '获取统计信息失败')
  }

  return {
    projects: projectsData.data,
    stats: statsData.data,
    trendData: trendData.success ? trendData.data.daily_stats || [] : []
  }
}

export default function HomePage() {
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const { toast } = useShadcnToast()

  // 创建获取数据的函数
  const fetchData = useCallback(() => {
    return fetchHomePageData(page, pageSize)
  }, [page, pageSize])

  // 使用页面可见性感知轮询（已禁用自动刷新，仅保留首次加载和手动刷新）
  const {
    data,
    isInitialLoading,
    isRefreshing,
    error,
    refetch
  } = useVisibilityAwarePolling(fetchData, POLLING_INTERVAL, {
    enabled: false, // 禁用自动刷新
    emptyInterval: EMPTY_DATA_INTERVAL,
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
      enabled: !isInitialLoading
    }
  )

  // 页码改变
  const handlePageChange = useCallback((newPage) => {
    setPage(newPage)
    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // 提取数据
  const projects = data?.projects?.items || []
  const pagination = data?.projects?.pagination || {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  }
  const stats = data?.stats || {
    project_count: 0,
    queue_count: 0,
    task_count: 0,
    task_stats: {
      total: 0,
      pending: 0,
      done: 0,
      error: 0
    }
  }
  const trendData = data?.trendData || []

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative">
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

        {/* 错误提示 */}
        {error && !isInitialLoading && (
          <div className="mb-4 md:mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
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

        {/* 后台更新提示 */}
        {isRefreshing && !isInitialLoading && (
          <div className="mb-4 md:mb-6 p-2 md:p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-2">
            <RefreshCw className="h-4 w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400 animate-spin" />
            <span className="text-xs md:text-sm text-blue-700 dark:text-blue-300">正在更新数据...</span>
          </div>
        )}

        {/* 全局统计区域（包含趋势图） */}
        <StatsSection stats={stats} trendData={trendData} loading={isInitialLoading} />

        {/* 项目列表 */}
        <ProjectList projects={projects} loading={isInitialLoading} isRefreshing={isRefreshing} />

        {/* 分页控件 */}
        {!isInitialLoading && !error && (
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </main>
    </div>
    </AuthGuard>
  )
}
