'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

export function AuthGuard({ children }) {
  const router = useRouter()
  const { isAuthenticated, isLoading, isInitialized, checkInitStatus } = useAuth()

  useEffect(() => {
    const checkAuth = async () => {
      // 如果还在加载，等待
      if (isLoading) {
        return
      }

      // 检查初始化状态
      if (isInitialized === null) {
        await checkInitStatus()
        return
      }

      // 如果未初始化，重定向到初始化页面
      if (!isInitialized) {
        router.push('/init')
        return
      }

      // 如果未登录，重定向到登录页面
      if (!isAuthenticated) {
        router.push('/login')
        return
      }
    }

    checkAuth()
  }, [isLoading, isInitialized, isAuthenticated, router, checkInitStatus])

  // 加载中或未初始化或未登录，显示加载状态
  if (isLoading || isInitialized === null || !isInitialized || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <span className="text-gray-600 dark:text-gray-400">加载中...</span>
        </div>
      </div>
    )
  }

  // 已认证，显示子组件
  return children
}

