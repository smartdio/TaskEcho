'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Alert } from '@/components/ui/alert'

export default function LoginPage() {
  const router = useRouter()
  const { login, isInitialized, isLoading, isAuthenticated } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 如果未初始化，重定向到初始化页面
  useEffect(() => {
    if (!isLoading && isInitialized === false) {
      router.push('/init')
    }
  }, [isLoading, isInitialized, router])

  // 如果已登录，重定向到首页
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/')
    }
  }, [isLoading, isAuthenticated, router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!username.trim()) {
      setError('请输入用户名')
      return
    }

    if (!password) {
      setError('请输入密码')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await login(username.trim(), password)
      
      if (result.success) {
        router.push('/')
      } else {
        setError(result.error || '登录失败')
      }
    } catch (err) {
      setError(err.message || '登录失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 加载中或未初始化，显示加载状态
  if (isLoading || isInitialized === false) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <span className="text-gray-600 dark:text-gray-400">加载中...</span>
        </div>
      </div>
    )
  }

  // 如果已登录，不显示内容（会被重定向）
  if (isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md p-6 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-gray-50 mb-2">
            登录
          </h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
            请输入您的账号和密码登录系统
          </p>
        </div>

        {error && (
          <Alert className="mb-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              disabled={isSubmitting}
              className="h-11"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              disabled={isSubmitting}
              className="h-11"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full h-11"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                登录中...
              </>
            ) : (
              '登录'
            )}
          </Button>
        </form>
      </Card>
    </div>
  )
}

