'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * 基于时间戳检查的无感更新 Hook
 * @param {Function} checkFn - 检查函数，返回 { version, last_updated_at, count }
 * @param {Function} fetchFn - 获取完整数据的函数
 * @param {number} interval - 检查间隔（毫秒），默认30000
 * @param {Object} options - 配置选项
 * @param {boolean} options.enabled - 是否启用自动检查，默认true
 * @param {Function} options.onError - 错误回调
 * @returns {{data: any, isLoading: boolean, isRefreshing: boolean, error: Error|null, refetch: Function}}
 */
export function useTimestampCheck(checkFn, fetchFn, interval = 30000, options = {}) {
  const { enabled = true, onError } = options
  
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)
  
  // 记录当前数据的版本号和时间戳
  const currentVersionRef = useRef(null)
  const currentTimestampRef = useRef(null)
  const timeoutIdRef = useRef(null)
  const isMountedRef = useRef(true)
  const checkFnRef = useRef(checkFn)
  const fetchFnRef = useRef(fetchFn)
  const enabledRef = useRef(enabled)
  const intervalRef = useRef(interval)
  const onErrorRef = useRef(onError)

  // 更新引用
  useEffect(() => {
    checkFnRef.current = checkFn
    fetchFnRef.current = fetchFn
    enabledRef.current = enabled
    intervalRef.current = interval
    onErrorRef.current = onError
  }, [checkFn, fetchFn, enabled, interval, onError])

  // 首次加载完整数据
  const loadFullData = useCallback(async () => {
    if (!isMountedRef.current) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await fetchFnRef.current()
      if (isMountedRef.current) {
        setData(result)
        
        // 获取版本号和时间戳（从检查API获取）
        try {
          const checkResult = await checkFnRef.current()
          if (checkResult && isMountedRef.current) {
            currentVersionRef.current = checkResult.version
            currentTimestampRef.current = checkResult.last_updated_at
          }
        } catch (checkError) {
          // 检查失败不影响首次加载
          console.error('获取版本号失败:', checkError)
        }
        
        setIsLoading(false)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err)
        setIsLoading(false)
        onErrorRef.current?.(err)
      }
    }
  }, [])

  // 检查更新
  const checkUpdate = useCallback(async () => {
    if (!isMountedRef.current || !enabledRef.current) return
    
    try {
      const checkResult = await checkFnRef.current()
      
      if (!checkResult || !isMountedRef.current) return
      
      // 比对版本号
      const hasUpdate = currentVersionRef.current === null || 
                        checkResult.version !== currentVersionRef.current
      
      if (hasUpdate) {
        // 有更新，拉取完整数据
        setIsRefreshing(true)
        setError(null)
        
        try {
          const result = await fetchFnRef.current()
          if (isMountedRef.current) {
            setData(result)
            currentVersionRef.current = checkResult.version
            currentTimestampRef.current = checkResult.last_updated_at
            setIsRefreshing(false)
          }
        } catch (err) {
          if (isMountedRef.current) {
            setError(err)
            setIsRefreshing(false)
            onErrorRef.current?.(err)
          }
        }
      }
    } catch (err) {
      // 检查失败，静默处理（不打断用户）
      console.error('检查更新失败:', err)
    }
  }, [])

  // 手动刷新
  const refetch = useCallback(() => {
    // 重置版本号，强制刷新
    currentVersionRef.current = null
    loadFullData()
  }, [loadFullData])

  // 当fetchFn变化时，重置并重新加载
  useEffect(() => {
    // 清除现有的定时器
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current)
      timeoutIdRef.current = null
    }
    
    // 重置状态
    currentVersionRef.current = null
    currentTimestampRef.current = null
    
    // 重新加载数据
    loadFullData()
  }, [loadFullData])

  // 初始化定期检查
  useEffect(() => {
    isMountedRef.current = true
    
    // 设置定期检查
    const scheduleCheck = () => {
      if (isMountedRef.current && enabledRef.current) {
        timeoutIdRef.current = setTimeout(() => {
          checkUpdate()
          scheduleCheck() // 递归调度下一次检查
        }, intervalRef.current)
      }
    }
    
    // 延迟第一次检查（避免与首次加载冲突）
    if (enabledRef.current) {
      timeoutIdRef.current = setTimeout(() => {
        checkUpdate()
        scheduleCheck()
      }, intervalRef.current)
    }
    
    return () => {
      isMountedRef.current = false
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current)
        timeoutIdRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 只在组件挂载时执行一次，使用ref来访问最新的函数

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    refetch
  }
}

