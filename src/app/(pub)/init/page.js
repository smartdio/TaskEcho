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

export default function InitPage() {
  const router = useRouter()
  const { init, isInitialized, isLoading, isAuthenticated } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 如果已初始化且已登录，重定向到首页
  useEffect(() => {
    if (!isLoading && isInitialized && isAuthenticated) {
      router.push('/')
    }
  }, [isLoading, isInitialized, isAuthenticated, router])

  // 如果已初始化但未登录，重定向到登录页
  useEffect(() => {
    if (!isLoading && isInitialized && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isInitialized, isAuthenticated, router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // 验证输入
    if (!username.trim()) {
      setError('请输入用户名')
      return
    }

    if (username.length < 3 || username.length > 20) {
      setError('用户名长度必须在 3-20 个字符之间')
      return
    }

    if (!password) {
      setError('请输入密码')
      return
    }

    if (password.length < 6) {
      setError('密码长度不能少于 6 个字符')
      return
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await init(username.trim(), password)
      
      if (result.success) {
        router.push('/')
      } else {
        setError(result.error || '初始化失败')
      }
    } catch (err) {
      setError(err.message || '初始化失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 加载中或已初始化，显示加载状态
  if (isLoading || (isInitialized && !isAuthenticated)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <span className="text-gray-600 dark:text-gray-400">加载中...</span>
        </div>
      </div>
    )
  }

  // 如果已初始化且已登录，不显示内容（会被重定向）
  if (isInitialized && isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md p-6 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-gray-50 mb-2">
            系统初始化
          </h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
            欢迎使用 TaskEcho！请设置管理员账号和密码。
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
              placeholder="请输入用户名（3-20个字符）"
              disabled={isSubmitting}
              className="h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码（至少6个字符）"
              disabled={isSubmitting}
              className="h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">确认密码</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="请再次输入密码"
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
                初始化中...
              </>
            ) : (
              '初始化系统'
            )}
          </Button>
        </form>
      </Card>
    </div>
  )
}

