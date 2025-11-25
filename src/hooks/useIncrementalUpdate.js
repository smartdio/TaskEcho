'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useVisibilityAwarePolling } from './useVisibilityAwarePolling'

/**
 * 增量更新检测 Hook（用于任务详情页）
 * 检测新消息、新日志和状态变化，只更新变化的部分
 * @param {Function} fetchFn - 获取数据的函数
 * @param {number} interval - 轮询间隔（毫秒），默认5000
 * @param {Object} options - 配置选项
 * @param {Function} options.onNewMessages - 新消息回调
 * @param {Function} options.onNewLogs - 新日志回调
 * @param {Function} options.onStatusChange - 状态变化回调
 * @returns {{data: any, isLoading: boolean}}
 */
export function useIncrementalUpdate(fetchFn, interval = 5000, options = {}) {
  const {
    onNewMessages,
    onNewLogs,
    onStatusChange
  } = options

  const [data, setData] = useState(null)
  const lastMessageIdsRef = useRef(new Set())
  const lastLogIdsRef = useRef(new Set())
  const lastStatusRef = useRef(null)
  const isInitialLoadRef = useRef(true)

  const handleSuccess = useCallback((result) => {
    if (!result) return

    // 提取task字段（如果存在）
    const task = result.task || result
    const messages = task?.messages || []
    const logs = task?.logs || []
    const status = task?.status

    if (isInitialLoadRef.current) {
      // 首次加载
      setData(result)
      
      // 记录初始消息和日志ID
      if (messages.length > 0) {
        messages.forEach(msg => {
          if (msg.id) {
            lastMessageIdsRef.current.add(msg.id)
          }
        })
      }
      
      if (logs.length > 0) {
        logs.forEach(log => {
          if (log.id) {
            lastLogIdsRef.current.add(log.id)
          }
        })
      }
      
      lastStatusRef.current = status
      isInitialLoadRef.current = false
      return
    }

    if (!data) {
      // 如果还没有数据，直接设置
      setData(result)
      return
    }

    // 获取当前数据中的task
    const currentTask = data.task || data
    const currentMessages = currentTask?.messages || []
    const currentLogs = currentTask?.logs || []

    // 检测新消息
    const newMessages = messages.filter(
      msg => msg.id && !lastMessageIdsRef.current.has(msg.id)
    )

    // 检测新日志
    const newLogs = logs.filter(
      log => log.id && !lastLogIdsRef.current.has(log.id)
    )

    // 检测状态变化
    const statusChanged = status !== lastStatusRef.current

    // 如果有更新，合并数据
    if (newMessages.length > 0 || newLogs.length > 0 || statusChanged) {
      const updatedTask = {
        ...task,
        // 合并消息（按时间排序）
        messages: [
          ...currentMessages,
          ...newMessages
        ].sort((a, b) => {
          const dateA = new Date(a.created_at || 0)
          const dateB = new Date(b.created_at || 0)
          return dateA - dateB
        }),
        // 合并日志（倒序，新日志在前面）
        logs: [
          ...newLogs,
          ...currentLogs
        ]
      }

      const updatedData = {
        ...result,
        task: updatedTask
      }

      setData(updatedData)

      // 更新最后的消息和日志 ID
      newMessages.forEach(msg => {
        if (msg.id) {
          lastMessageIdsRef.current.add(msg.id)
        }
      })

      newLogs.forEach(log => {
        if (log.id) {
          lastLogIdsRef.current.add(log.id)
        }
      })

      lastStatusRef.current = status

      // 触发回调
      if (newMessages.length > 0) {
        onNewMessages?.(newMessages)
      }

      if (newLogs.length > 0) {
        onNewLogs?.(newLogs)
      }

      if (statusChanged) {
        onStatusChange?.(status, lastStatusRef.current)
      }
    } else {
      // 即使没有新内容，也更新其他字段（如状态、更新时间等）
      const updatedTask = {
        ...currentTask,
        ...task,
        messages: currentMessages,
        logs: currentLogs
      }
      setData({
        ...data,
        ...result,
        task: updatedTask
      })
    }
  }, [data, onNewMessages, onNewLogs, onStatusChange])

  const { data: newData, isLoading, error, refetch } = useVisibilityAwarePolling(
    fetchFn,
    interval,
    {
      enabled: options.enabled !== false, // 支持 enabled 选项
      onSuccess: handleSuccess,
      immediate: true
    }
  )

  // 重置状态（当fetchFn变化时）
  useEffect(() => {
    isInitialLoadRef.current = true
    lastMessageIdsRef.current.clear()
    lastLogIdsRef.current.clear()
    lastStatusRef.current = null
    setData(null)
  }, [fetchFn])

  return { data, isLoading, error, refetch }
}
