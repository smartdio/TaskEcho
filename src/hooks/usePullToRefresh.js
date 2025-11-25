'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * 下拉刷新 Hook
 * @param {Function} onRefresh - 刷新回调函数
 * @param {Object} options - 配置选项
 * @param {number} options.threshold - 触发刷新的下拉距离阈值（px），默认80
 * @param {number} options.resistance - 下拉阻力系数（0-1），默认0.5
 * @param {boolean} options.enabled - 是否启用下拉刷新，默认true
 * @returns {{isRefreshing: boolean, pullDistance: number, isPulling: boolean}}
 */
export function usePullToRefresh(onRefresh, options = {}) {
  const {
    threshold = 80,
    resistance = 0.5,
    enabled = true
  } = options

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)

  const startYRef = useRef(0)
  const currentYRef = useRef(0)
  const isDraggingRef = useRef(false)
  const onRefreshRef = useRef(onRefresh)
  const thresholdRef = useRef(threshold)
  const resistanceRef = useRef(resistance)
  const pullDistanceRef = useRef(0)

  // 更新引用
  useEffect(() => {
    onRefreshRef.current = onRefresh
    thresholdRef.current = threshold
    resistanceRef.current = resistance
  }, [onRefresh, threshold, resistance])

  // 检查是否在页面顶部
  const isAtTop = useCallback(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return false
    return window.scrollY === 0 || document.documentElement.scrollTop === 0
  }, [])

  // 处理触摸开始
  const handleTouchStart = useCallback((e) => {
    if (!enabled || isRefreshing || typeof window === 'undefined') return
    
    // 只有在页面顶部时才允许下拉刷新
    if (!isAtTop()) return

    startYRef.current = e.touches[0].clientY
    currentYRef.current = startYRef.current
    isDraggingRef.current = true
  }, [enabled, isRefreshing, isAtTop])

  // 处理触摸移动
  const handleTouchMove = useCallback((e) => {
    if (!enabled || !isDraggingRef.current || isRefreshing || typeof window === 'undefined') return

    // 检查是否仍在页面顶部
    if (!isAtTop()) {
      // 如果不在顶部，重置状态
      isDraggingRef.current = false
      pullDistanceRef.current = 0
      setPullDistance(0)
      setIsPulling(false)
      return
    }

    currentYRef.current = e.touches[0].clientY
    const deltaY = currentYRef.current - startYRef.current

    // 只处理向下拉动
    if (deltaY > 0) {
      e.preventDefault() // 阻止默认滚动行为
      
      // 应用阻力，使下拉感觉更自然
      const distance = deltaY * resistanceRef.current
      pullDistanceRef.current = distance
      setPullDistance(distance)
      setIsPulling(true)
    } else {
      pullDistanceRef.current = 0
      setPullDistance(0)
      setIsPulling(false)
    }
  }, [enabled, isRefreshing, isAtTop])

  // 处理触摸结束
  const handleTouchEnd = useCallback(() => {
    if (!enabled || !isDraggingRef.current) return

    isDraggingRef.current = false
    const currentPullDistance = pullDistanceRef.current

    // 如果下拉距离超过阈值，触发刷新
    if (currentPullDistance >= thresholdRef.current && !isRefreshing) {
      setIsRefreshing(true)
      pullDistanceRef.current = thresholdRef.current
      setPullDistance(thresholdRef.current)
      
      // 调用刷新函数
      Promise.resolve(onRefreshRef.current())
        .finally(() => {
          setIsRefreshing(false)
          pullDistanceRef.current = 0
          setPullDistance(0)
          setIsPulling(false)
        })
    } else {
      // 否则回弹
      pullDistanceRef.current = 0
      setPullDistance(0)
      setIsPulling(false)
    }
  }, [enabled, isRefreshing])

  // 处理鼠标事件（桌面端支持）
  const handleMouseDown = useCallback((e) => {
    if (!enabled || isRefreshing || typeof window === 'undefined') return
    if (!isAtTop()) return

    startYRef.current = e.clientY
    currentYRef.current = startYRef.current
    isDraggingRef.current = true
  }, [enabled, isRefreshing, isAtTop])

  const handleMouseMove = useCallback((e) => {
    if (!enabled || !isDraggingRef.current || isRefreshing || typeof window === 'undefined') return

    // 检查是否仍在页面顶部
    if (!isAtTop()) {
      // 如果不在顶部，重置状态
      isDraggingRef.current = false
      pullDistanceRef.current = 0
      setPullDistance(0)
      setIsPulling(false)
      return
    }

    currentYRef.current = e.clientY
    const deltaY = currentYRef.current - startYRef.current

    if (deltaY > 0) {
      e.preventDefault()
      const distance = deltaY * resistanceRef.current
      pullDistanceRef.current = distance
      setPullDistance(distance)
      setIsPulling(true)
    } else {
      pullDistanceRef.current = 0
      setPullDistance(0)
      setIsPulling(false)
    }
  }, [enabled, isRefreshing, isAtTop])

  const handleMouseUp = useCallback(() => {
    if (!enabled || !isDraggingRef.current) return

    isDraggingRef.current = false
    const currentPullDistance = pullDistanceRef.current

    if (currentPullDistance >= thresholdRef.current && !isRefreshing) {
      setIsRefreshing(true)
      pullDistanceRef.current = thresholdRef.current
      setPullDistance(thresholdRef.current)
      
      Promise.resolve(onRefreshRef.current())
        .finally(() => {
          setIsRefreshing(false)
          pullDistanceRef.current = 0
          setPullDistance(0)
          setIsPulling(false)
        })
    } else {
      pullDistanceRef.current = 0
      setPullDistance(0)
      setIsPulling(false)
    }
  }, [enabled, isRefreshing])

  // 监听滚动，如果不在顶部则重置状态
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleScroll = () => {
      if (!isAtTop() && isDraggingRef.current) {
        isDraggingRef.current = false
        pullDistanceRef.current = 0
        setPullDistance(0)
        setIsPulling(false)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [isAtTop])

  // 绑定事件
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return

    // 触摸事件
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    // 鼠标事件（桌面端）
    document.addEventListener('mousedown', handleMouseDown, { passive: true })
    document.addEventListener('mousemove', handleMouseMove, { passive: false })
    document.addEventListener('mouseup', handleMouseUp, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd, handleMouseDown, handleMouseMove, handleMouseUp])

  return {
    isRefreshing,
    pullDistance,
    isPulling
  }
}

