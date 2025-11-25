'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Breadcrumb from '@/components/layout/Breadcrumb'
import { StatsOverviewCard } from '@/components/stats/StatsOverviewCard'
import { ExecutionTrendChart } from '@/components/stats/ExecutionTrendChart'
import { SuccessFailureChart } from '@/components/stats/SuccessFailureChart'
import { ProjectStatsTable } from '@/components/stats/ProjectStatsTable'
import { ProjectComparisonChart } from '@/components/stats/ProjectComparisonChart'
import { ProjectDistributionChart } from '@/components/stats/ProjectDistributionChart'
import { HourlyStatsChart } from '@/components/stats/HourlyStatsChart'
import { DurationStatsChart } from '@/components/stats/DurationStatsChart'
import { ErrorTypeStatsChart } from '@/components/stats/ErrorTypeStatsChart'
import { Button } from '@/components/ui/button'
import { RefreshCw, AlertCircle } from 'lucide-react'
import { useToast as useShadcnToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { useVisibilityAwarePolling } from '@/hooks/useVisibilityAwarePolling'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { fetchWithAuth } from '@/lib/fetch-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const POLLING_INTERVAL = 60000 // 60秒轮询间隔

/**
 * 获取统计数据
 */
async function fetchStatsData(days = 30, date = null) {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]
  const targetDate = date || endDateStr
  
  const [
    systemResponse,
    projectsResponse,
    hourlyResponse,
    durationResponse,
    errorTypesResponse
  ] = await Promise.all([
    fetchWithAuth(`/api/v1/stats/system?startDate=${startDateStr}&endDate=${endDateStr}`),
    fetchWithAuth(`/api/v1/stats/projects?startDate=${startDateStr}&endDate=${endDateStr}`),
    fetchWithAuth(`/api/v1/stats/by-hour?date=${targetDate}`),
    fetchWithAuth(`/api/v1/stats/execution-duration?startDate=${startDateStr}&endDate=${endDateStr}`),
    fetchWithAuth(`/api/v1/stats/error-types?startDate=${startDateStr}&endDate=${endDateStr}`)
  ])
  
  if (!systemResponse.ok) {
    throw new Error(`获取统计数据失败: ${systemResponse.status}`)
  }
  
  if (!projectsResponse.ok) {
    throw new Error(`获取项目统计失败: ${projectsResponse.status}`)
  }
  
  const [systemData, projectsData, hourlyData, durationData, errorTypesData] = await Promise.all([
    systemResponse.json(),
    projectsResponse.json(),
    hourlyResponse.json(),
    durationResponse.json(),
    errorTypesResponse.json()
  ])
  
  if (!systemData.success) {
    throw new Error(systemData.error?.message || '获取统计数据失败')
  }
  
  if (!projectsData.success) {
    throw new Error(projectsData.error?.message || '获取项目统计失败')
  }
  
  return {
    system: systemData.data,
    projects: projectsData.data,
    hourly: hourlyData.success ? hourlyData.data : { date: targetDate, hourly_stats: [] },
    duration: durationData.success ? durationData.data : { summary: {}, distribution: [] },
    errorTypes: errorTypesData.success ? errorTypesData.data : { error_types: [] }
  }
}

export default function StatsPage() {
  const [days, setDays] = useState(30)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const { toast } = useShadcnToast()
  const router = useRouter()
  
  // 创建获取数据的函数
  const fetchData = useCallback(() => {
    return fetchStatsData(days, selectedDate)
  }, [days, selectedDate])
  
  // 使用页面可见性感知轮询
  const {
    data,
    isInitialLoading,
    isRefreshing,
    error,
    refetch
  } = useVisibilityAwarePolling(fetchData, POLLING_INTERVAL, {
    enabled: false, // 禁用自动刷新
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
  
  // 时间范围选择
  const timeRanges = [
    { label: '7天', value: 7 },
    { label: '30天', value: 30 },
    { label: '90天', value: 90 }
  ]
  
  const handleTimeRangeChange = useCallback((newDays) => {
    setDays(newDays)
  }, [])
  
  // 加载状态
  if (isInitialLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <main className="container mx-auto px-4 md:px-5 lg:px-6 py-4 md:py-5 lg:py-6">
            <Breadcrumb
              items={[
                { label: '统计' }
              ]}
            />
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
          </main>
        </div>
      </AuthGuard>
    )
  }
  
  // 错误状态
  if (error) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <main className="container mx-auto px-4 md:px-5 lg:px-6 py-4 md:py-5 lg:py-6">
            <Breadcrumb
              items={[
                { label: '统计' }
              ]}
            />
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <CardContent className="p-4 md:p-5 lg:p-6">
                <div className="flex flex-col items-center justify-center py-8">
                  <AlertCircle className="h-12 w-12 text-red-500 dark:text-red-400 mb-4" />
                  <p className="text-base md:text-lg text-gray-900 dark:text-gray-50 mb-4">
                    {error.message || '加载统计数据失败'}
                  </p>
                  <Button onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    重试
                  </Button>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </AuthGuard>
    )
  }
  
  const stats = data || {}
  const systemStats = stats.system || {}
  const projectsStats = stats.projects || {}
  const hourlyStats = stats.hourly || { date: selectedDate, hourly_stats: [] }
  const durationStats = stats.duration || { summary: {}, distribution: [] }
  const errorTypesStats = stats.errorTypes || { error_types: [] }
  
  const { summary = {}, daily_stats = [] } = systemStats
  const { projects = [] } = projectsStats
  
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
              { label: '统计' }
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
          
          {/* 页面标题和时间范围选择 */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-5 lg:mb-6 gap-4">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-50">
              统计信息
            </h1>
            
            <div className="flex items-center gap-2">
              {timeRanges.map((range) => (
                <Button
                  key={range.value}
                  variant={days === range.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTimeRangeChange(range.value)}
                  className="text-xs md:text-sm"
                >
                  {range.label}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isRefreshing}
                className="text-xs md:text-sm"
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
                刷新
              </Button>
            </div>
          </div>
          
          {/* 统计概览卡片 */}
          <StatsOverviewCard summary={summary} loading={isRefreshing} />
          
          {/* 执行趋势图表 */}
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mb-4 md:mb-5 lg:mb-6">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-50">
                执行趋势
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ExecutionTrendChart data={daily_stats} loading={isRefreshing} />
            </CardContent>
          </Card>
          
          {/* 成功/失败对比图表 */}
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mb-4 md:mb-5 lg:mb-6">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-50">
                成功/失败对比
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SuccessFailureChart data={daily_stats} loading={isRefreshing} />
            </CardContent>
          </Card>
          
          {/* 项目统计列表 */}
          <ProjectStatsTable projects={projects} loading={isRefreshing} />
          
          {/* 项目对比图表 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5 lg:gap-6 mb-4 md:mb-5 lg:mb-6">
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-50">
                  项目执行对比
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ProjectComparisonChart projects={projects} loading={isRefreshing} />
              </CardContent>
            </Card>
            
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-50">
                  项目执行占比
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ProjectDistributionChart projects={projects} loading={isRefreshing} />
              </CardContent>
            </Card>
          </div>
          
          {/* 扩展统计维度 */}
          <div className="space-y-4 md:space-y-5 lg:space-y-6">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-50">
              扩展统计
            </h2>
            
            {/* 24小时执行趋势 */}
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <CardTitle className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-50">
                    24小时执行趋势
                  </CardTitle>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 text-sm md:text-base"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <HourlyStatsChart data={hourlyStats.hourly_stats || []} loading={isRefreshing} />
              </CardContent>
            </Card>
            
            {/* 执行时长统计 */}
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-50">
                  执行时长统计
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DurationStatsChart
                  summary={durationStats.summary || {}}
                  distribution={durationStats.distribution || []}
                  loading={isRefreshing}
                />
              </CardContent>
            </Card>
            
            {/* 错误类型统计 */}
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-50">
                  错误类型分布
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ErrorTypeStatsChart data={errorTypesStats.error_types || []} loading={isRefreshing} />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}

