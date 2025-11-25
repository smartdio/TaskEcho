'use client'

import { useState, useCallback } from 'react'
import { toast } from '@/components/ui/use-toast'

export function useApiError() {
  const [error, setError] = useState(null)

  const handleError = useCallback((err) => {
    console.error('API Error:', err)
    
    let errorMessage = '操作失败，请稍后重试'
    
    if (err.response) {
      // API 返回的错误
      const { status, data } = err.response
      
      switch (status) {
        case 400:
          errorMessage = data?.error?.message || '请求参数错误'
          break
        case 401:
          errorMessage = '认证失败，请检查 API Key'
          break
        case 404:
          errorMessage = '资源不存在'
          break
        case 500:
          errorMessage = '服务器内部错误'
          break
        default:
          errorMessage = data?.error?.message || `请求失败 (${status})`
      }
    } else if (err.request) {
      // 请求发送但未收到响应
      errorMessage = '网络连接失败，请检查网络设置'
    } else {
      // 其他错误
      errorMessage = err.message || '未知错误'
    }
    
    setError(errorMessage)
    toast({
      title: '错误',
      description: errorMessage,
      variant: 'destructive'
    })
    
    return errorMessage
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return { error, handleError, clearError }
}
