'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

/**
 * 滑动返回 Hook
 * @param {Function} onBack - 返回回调函数（可选，如果不提供则使用router.back()）
 * @param {Object} options - 配置选项
 * @param {number} options.threshold - 触发返回的滑动距离阈值（px），默认100
 * @param {number} options.resistance - 滑动阻力系数（0-1），默认0.3
 * @param {boolean} options.enabled - 是否启用滑动返回，默认true
 * @returns {{isSwiping: boolean, swipeDistance: number}}
 */
export function useSwipeBack(onBack, options = {}) {
  const {
    threshold = 80,
    resistance = 0.5,
    enabled = true
  } = options

  const router = useRouter()
  const [isSwiping, setIsSwiping] = useState(false)
  const [swipeDistance, setSwipeDistance] = useState(0)

  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const currentXRef = useRef(0)
  const isDraggingRef = useRef(false)
  const onBackRef = useRef(onBack)
  const thresholdRef = useRef(threshold)
  const resistanceRef = useRef(resistance)
  const swipeDistanceRef = useRef(0)

  // 更新引用
  useEffect(() => {
    onBackRef.current = onBack
    thresholdRef.current = threshold
    resistanceRef.current = resistance
  }, [onBack, threshold, resistance])

  // 处理触摸开始
  const handleTouchStart = useCallback((e) => {
    if (!enabled || typeof window === 'undefined') return
    
    // 从屏幕左边缘开始滑动（左边缘50px内）
    const touchX = e.touches[0].clientX
    const touchY = e.touches[0].clientY
    
    // 检查是否从左边缘开始
    if (touchX > 50) return

    startXRef.current = touchX
    startYRef.current = touchY
    currentXRef.current = touchX
    isDraggingRef.current = true
  }, [enabled])

  // 处理触摸移动
  const handleTouchMove = useCallback((e) => {
    if (!enabled || !isDraggingRef.current || typeof window === 'undefined') return

    const touchX = e.touches[0].clientX
    const touchY = e.touches[0].clientY
    currentXRef.current = touchX
    
    const deltaX = currentXRef.current - startXRef.current
    const deltaY = Math.abs(touchY - startYRef.current)

    // 只处理向右滑动，且水平滑动距离大于垂直滑动距离（避免与垂直滚动冲突）
    if (deltaX > 0 && deltaX > deltaY) {
      // 阻止默认滚动行为，避免干扰
      if (deltaX > 10) {
        e.preventDefault()
      }
      
      // 应用阻力，使滑动感觉更自然
      const distance = deltaX * resistanceRef.current
      swipeDistanceRef.current = distance
      setSwipeDistance(distance)
      setIsSwiping(true)
    } else if (deltaX < 0 || deltaY > deltaX) {
      // 如果向左滑动或垂直滑动距离更大，取消手势
      swipeDistanceRef.current = 0
      setSwipeDistance(0)
      setIsSwiping(false)
      isDraggingRef.current = false
    }
  }, [enabled])

  // 处理触摸结束
  const handleTouchEnd = useCallback(() => {
    if (!enabled || !isDraggingRef.current) return

    isDraggingRef.current = false
    const currentSwipeDistance = swipeDistanceRef.current

    // 如果滑动距离超过阈值，触发返回
    if (currentSwipeDistance >= thresholdRef.current) {
      // 调用返回函数
      if (onBackRef.current) {
        onBackRef.current()
      } else {
        router.back()
      }
    }

    // 重置状态
    swipeDistanceRef.current = 0
    setSwipeDistance(0)
    setIsSwiping(false)
  }, [enabled, router])

  // 绑定事件
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return

    const element = document.documentElement || document.body

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd])

  return {
    isSwiping,
    swipeDistance
  }
}

