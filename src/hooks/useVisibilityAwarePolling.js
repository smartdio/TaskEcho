'use client'

import { useState, useEffect, useRef } from 'react'
import { usePolling } from './usePolling'

/**
 * 页面可见性感知轮询 Hook
 * 页面隐藏时暂停轮询，页面重新可见时立即执行一次轮询
 * @param {Function} fetchFn - 获取数据的函数
 * @param {number} interval - 轮询间隔（毫秒），默认30000
 * @param {Object} options - 配置选项（传递给usePolling）
 * @returns {{data: any, isInitialLoading: boolean, isRefreshing: boolean, error: Error|null, refetch: Function}}
 */
export function useVisibilityAwarePolling(fetchFn, interval = 30000, options = {}) {
  const [isVisible, setIsVisible] = useState(true)
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden)
    }
    
    // 初始化可见性状态
    setIsVisible(!document.hidden)
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
  
  const { data, isInitialLoading, isRefreshing, error, refetch } = usePolling(fetchFn, interval, {
    ...options,
    enabled: options.enabled !== false && isVisible
  })
  
  // 页面重新可见时立即执行一次轮询（仅在从隐藏变为可见时触发）
  const prevVisibleRef = useRef(isVisible)
  useEffect(() => {
    const wasHidden = !prevVisibleRef.current
    const isNowVisible = isVisible
    
    // 只有在从隐藏变为可见时才触发 refetch
    if (wasHidden && isNowVisible && options.enabled !== false) {
      // 延迟一小段时间确保轮询Hook已经准备好
      const timer = setTimeout(() => {
        refetch()
      }, 100)
      prevVisibleRef.current = isVisible
      return () => clearTimeout(timer)
    }
    
    prevVisibleRef.current = isVisible
  }, [isVisible, refetch, options.enabled])
  
  return { data, isInitialLoading, isRefreshing, error, refetch }
}
