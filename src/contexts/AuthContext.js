'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [isInitialized, setIsInitialized] = useState(null) // null 表示未检查，true/false 表示已检查
  const [isLoading, setIsLoading] = useState(true)

  // 从 localStorage 加载 token
  useEffect(() => {
    const storedToken = localStorage.getItem('taskecho_token')
    const storedUser = localStorage.getItem('taskecho_user')
    
    if (storedToken && storedUser) {
      try {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      } catch (error) {
        console.error('加载用户信息失败:', error)
        localStorage.removeItem('taskecho_token')
        localStorage.removeItem('taskecho_user')
      }
    }
    
    setIsLoading(false)
  }, [])

  // 检查系统是否已初始化
  const checkInitStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/auth/check-init')
      const data = await response.json()
      
      if (data.success) {
        setIsInitialized(data.data.initialized)
        return data.data.initialized
      }
      return false
    } catch (error) {
      console.error('检查初始化状态失败:', error)
      return false
    }
  }, [])

  // 初始化时检查系统状态
  useEffect(() => {
    if (!isLoading && isInitialized === null) {
      checkInitStatus()
    }
  }, [isLoading, isInitialized, checkInitStatus])

  // 登录
  const login = useCallback(async (username, password) => {
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error?.message || data.message || '登录失败')
      }

      const { token: newToken, user: userData } = data.data

      // 保存到 localStorage
      localStorage.setItem('taskecho_token', newToken)
      localStorage.setItem('taskecho_user', JSON.stringify(userData))

      // 更新状态
      setToken(newToken)
      setUser(userData)

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }, [])

  // 初始化系统
  const init = useCallback(async (username, password) => {
    try {
      const response = await fetch('/api/v1/auth/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error?.message || data.message || '初始化失败')
      }

      // 初始化成功后自动登录
      setIsInitialized(true)
      return await login(username, password)
    } catch (error) {
      return { success: false, error: error.message }
    }
  }, [login])

  // 登出
  const logout = useCallback(() => {
    localStorage.removeItem('taskecho_token')
    localStorage.removeItem('taskecho_user')
    setToken(null)
    setUser(null)
  }, [])

  // 获取认证头
  const getAuthHeaders = useCallback(() => {
    const headers = {
      'Content-Type': 'application/json'
    }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    return headers
  }, [token])

  const value = {
    user,
    token,
    isInitialized,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    init,
    logout,
    getAuthHeaders,
    checkInitStatus
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

