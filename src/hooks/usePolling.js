'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * 基础轮询 Hook
 * @param {Function} fetchFn - 获取数据的函数
 * @param {number} interval - 轮询间隔（毫秒），默认30000
 * @param {Object} options - 配置选项
 * @param {boolean} options.enabled - 是否启用轮询，默认true
 * @param {Function} options.onSuccess - 成功回调
 * @param {Function} options.onError - 错误回调
 * @param {boolean} options.immediate - 是否立即执行一次，默认true
 * @param {Function} options.shouldContinuePolling - 判断是否应该继续轮询的回调函数，接收最新数据作为参数，返回boolean
 * @param {number} options.emptyInterval - 当数据为空时的轮询间隔（毫秒），如果未设置则使用正常间隔
 * @returns {{data: any, isInitialLoading: boolean, isRefreshing: boolean, error: Error|null, refetch: Function}}
 */
export function usePolling(fetchFn, interval = 30000, options = {}) {
  const {
    enabled = true,
    onSuccess,
    onError,
    immediate = true,
    shouldContinuePolling,
    emptyInterval
  } = options

  const [data, setData] = useState(null)
  const [isInitialLoading, setIsInitialLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)
  
  const timeoutIdRef = useRef(null)
  const isMountedRef = useRef(true)
  const hasDataRef = useRef(false) // 跟踪是否已有数据
  const fetchFnRef = useRef(fetchFn)
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)
  const shouldContinuePollingRef = useRef(shouldContinuePolling)
  const enabledRef = useRef(enabled)
  const intervalRef = useRef(interval)
  const emptyIntervalRef = useRef(emptyInterval)
  
  // 更新引用
  useEffect(() => {
    fetchFnRef.current = fetchFn
    onSuccessRef.current = onSuccess
    onErrorRef.current = onError
    shouldContinuePollingRef.current = shouldContinuePolling
    enabledRef.current = enabled
    intervalRef.current = interval
    emptyIntervalRef.current = emptyInterval
  }, [fetchFn, onSuccess, onError, shouldContinuePolling, enabled, interval, emptyInterval])

  // 辅助函数：检查数据是否为空
  const isEmptyData = useCallback((data) => {
    if (data === null || data === undefined) return true
    
    // 如果是对象，检查是否有项目列表或统计数据
    if (typeof data === 'object') {
      // 检查项目列表
      if (data.projects) {
        // 优先检查 pagination.total
        if (data.projects.pagination && data.projects.pagination.total === 0) {
          return true
        }
        // 其次检查 items 数组
        const items = data.projects.items
        if (Array.isArray(items) && items.length === 0) {
          return true
        }
      }
      
      // 检查统计数据（所有统计都为0时认为数据为空）
      if (data.stats) {
        if (data.stats.project_count === 0 && 
            data.stats.queue_count === 0 && 
            data.stats.task_count === 0) {
          return true
        }
      }
      
      // 如果是数组，检查是否为空
      if (Array.isArray(data) && data.length === 0) return true
    }
    
    return false
  }, [])

  const poll = useCallback(async () => {
    if (!isMountedRef.current) return
    
    // 判断是首次加载还是后台更新
    const isFirstLoad = !hasDataRef.current
    if (isFirstLoad) {
      setIsInitialLoading(true)
    } else {
      setIsRefreshing(true)
    }
    setError(null)
    
    try {
      const result = await fetchFnRef.current()
      if (isMountedRef.current) {
        setData(result)
        hasDataRef.current = true // 标记已有数据
        setIsInitialLoading(false)
        setIsRefreshing(false)
        onSuccessRef.current?.(result)
        
        // 检查是否应该继续轮询
        const shouldContinue = shouldContinuePollingRef.current 
          ? shouldContinuePollingRef.current(result) 
          : true
        
        // 如果数据为空且设置了 emptyInterval，使用更长的间隔
        const isEmpty = isEmptyData(result)
        const nextInterval = (emptyIntervalRef.current && shouldContinue && isEmpty)
          ? emptyIntervalRef.current
          : intervalRef.current
        
        // 调试日志（仅在开发环境）
        if (process.env.NODE_ENV === 'development') {
          if (isEmpty && emptyIntervalRef.current) {
            console.log(`[Polling] 数据为空，使用更长轮询间隔: ${emptyIntervalRef.current}ms (${Math.round(emptyIntervalRef.current / 1000)}秒)`)
          } else {
            console.log(`[Polling] 使用正常轮询间隔: ${intervalRef.current}ms (${Math.round(intervalRef.current / 1000)}秒)`)
          }
        }
        
        // 安排下一次轮询
        if (isMountedRef.current && enabledRef.current && shouldContinue) {
          timeoutIdRef.current = setTimeout(poll, nextInterval)
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err)
        setIsInitialLoading(false)
        setIsRefreshing(false)
        onErrorRef.current?.(err)
        
        // 即使出错也继续轮询（除非 shouldContinuePolling 返回 false）
        if (isMountedRef.current && enabledRef.current) {
          const shouldContinue = shouldContinuePollingRef.current 
            ? shouldContinuePollingRef.current(null) 
            : true
          if (shouldContinue) {
            timeoutIdRef.current = setTimeout(poll, intervalRef.current)
          }
        }
      }
    }
  }, [isEmptyData])

  const refetch = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current)
      timeoutIdRef.current = null
    }
    poll()
  }, [poll])

  // 使用 ref 存储 poll 函数，避免 useEffect 频繁重新执行
  const pollRef = useRef(poll)
  useEffect(() => {
    pollRef.current = poll
  }, [poll])

  useEffect(() => {
    isMountedRef.current = true
    
    // 清除现有的定时器
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current)
      timeoutIdRef.current = null
    }
    
    // 重置数据状态（当 fetchFn 变化时）
    hasDataRef.current = false
    
    // 如果启用了轮询，执行首次加载并设置后续轮询
    if (enabled) {
      // 立即执行一次（如果 immediate 为 true）
      if (immediate) {
        pollRef.current()
      } else {
        timeoutIdRef.current = setTimeout(() => pollRef.current(), intervalRef.current)
      }
    } else {
      // 如果禁用了轮询，仍然执行首次加载（如果 immediate 为 true），但不设置后续轮询
      if (immediate) {
        pollRef.current()
      }
    }
    
    return () => {
      isMountedRef.current = false
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current)
        timeoutIdRef.current = null
      }
    }
  }, [enabled, immediate])
  
  return { data, isInitialLoading, isRefreshing, error, refetch }
}
