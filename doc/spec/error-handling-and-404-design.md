# TaskEcho 错误处理和404页面设计文档

## 1. 概述

### 1.1 文档目的

本文档详细说明 TaskEcho 系统的错误处理和404页面设计方案，包括页面级错误处理、组件级错误处理、404页面设计、错误提示机制等详细说明。

### 1.2 设计原则

1. **用户友好**：错误信息清晰易懂，提供明确的解决建议
2. **一致性**：统一的错误处理机制和错误提示样式
3. **可恢复性**：提供重试、刷新、返回等恢复操作
4. **可访问性**：错误信息支持屏幕阅读器，符合无障碍标准
5. **性能优化**：错误处理不影响正常功能性能

### 1.3 错误类型分类

#### 1.3.1 页面级错误

- **404 错误**：页面路由不存在
- **500 错误**：服务器内部错误
- **网络错误**：网络连接失败、超时
- **数据加载失败**：API 请求失败、数据解析错误

#### 1.3.2 组件级错误

- **API 调用失败**：接口请求失败、认证失败
- **表单验证失败**：输入数据格式错误、必填项缺失
- **操作失败**：创建、更新、删除操作失败
- **数据渲染错误**：数据格式异常、组件渲染异常

#### 1.3.3 业务逻辑错误

- **资源不存在**：项目、队列、任务不存在
- **权限错误**：API Key 无效、操作权限不足
- **数据冲突**：唯一约束冲突、数据状态冲突

---

## 2. 页面级错误处理

### 2.1 错误边界（Error Boundary）

#### 2.1.1 设计概述

使用 React Error Boundary 捕获页面级错误，防止整个应用崩溃，提供友好的错误提示和恢复选项。

#### 2.1.2 实现方案

**全局错误边界组件**：

```javascript
// src/components/error/ErrorBoundary.js
'use client'

import React from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-6 w-6 text-destructive" />
                <CardTitle>页面加载错误</CardTitle>
              </div>
              <CardDescription>
                抱歉，页面加载时发生了错误。请尝试刷新页面或返回首页。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-mono text-destructive">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={this.handleReset} className="flex-1">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  刷新页面
                </Button>
                <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
                  <Home className="mr-2 h-4 w-4" />
                  返回首页
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
```

**在根布局中使用**：

```javascript
// app/layout.js
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import Header from '@/components/layout/Header'

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <ErrorBoundary>
          <Header />
          <main>{children}</main>
        </ErrorBoundary>
      </body>
    </html>
  )
}
```

#### 2.1.3 错误类型处理

**网络错误**：

```javascript
// src/components/error/NetworkError.js
'use client'

import { WifiOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function NetworkError({ onRetry, message = '网络连接失败' }) {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <WifiOff className="h-6 w-6 text-destructive" />
          <CardTitle>网络错误</CardTitle>
        </div>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={onRetry} className="w-full">
          <RefreshCw className="mr-2 h-4 w-4" />
          重试
        </Button>
      </CardContent>
    </Card>
  )
}
```

**数据加载失败**：

```javascript
// src/components/error/DataLoadError.js
'use client'

import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function DataLoadError({ onRetry, message = '数据加载失败' }) {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <CardTitle>数据加载失败</CardTitle>
        </div>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={onRetry} className="w-full">
          <RefreshCw className="mr-2 h-4 w-4" />
          重新加载
        </Button>
      </CardContent>
    </Card>
  )
}
```

### 2.2 页面级错误处理流程

#### 2.2.1 错误捕获流程

```
用户访问页面
  ↓
页面组件加载
  ↓
API 请求数据
  ↓
错误发生？
  ├── 是 → 捕获错误
  │     ├── 网络错误 → 显示网络错误组件
  │     ├── 数据错误 → 显示数据加载错误组件
  │     ├── 渲染错误 → Error Boundary 捕获
  │     └── 其他错误 → 显示通用错误组件
  └── 否 → 正常渲染页面
```

#### 2.2.2 错误恢复机制

1. **自动重试**：网络错误自动重试（最多3次，指数退避）
2. **手动重试**：提供重试按钮，用户手动触发
3. **返回导航**：提供返回上一页或首页的选项
4. **刷新页面**：提供刷新页面选项

### 2.3 页面级错误处理实现示例

#### 2.3.1 首页错误处理

```javascript
// app/page.js
'use client'

import { useState, useEffect } from 'react'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import NetworkError from '@/components/error/NetworkError'
import DataLoadError from '@/components/error/DataLoadError'
import { fetchProjects, fetchStats } from '@/lib/api'

export default function HomePage() {
  const [projects, setProjects] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [projectsData, statsData] = await Promise.all([
        fetchProjects(),
        fetchStats()
      ])
      setProjects(projectsData)
      setStats(statsData)
    } catch (err) {
      console.error('Failed to load data:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (error) {
    if (error.name === 'NetworkError' || error.message.includes('网络')) {
      return <NetworkError onRetry={loadData} />
    }
    return <DataLoadError onRetry={loadData} message={error.message} />
  }

  if (loading) {
    return <div>加载中...</div>
  }

  return (
    <ErrorBoundary>
      {/* 页面内容 */}
    </ErrorBoundary>
  )
}
```

---

## 3. 组件级错误处理

### 3.1 API 调用错误处理

#### 3.1.1 统一错误处理 Hook

```javascript
// src/hooks/useApiError.js
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
```

#### 3.1.2 API 请求封装

```javascript
// src/lib/api.js
export async function apiRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const error = new Error(errorData.error?.message || `HTTP ${response.status}`)
      error.response = {
        status: response.status,
        data: errorData
      }
      throw error
    }

    const data = await response.json()
    
    if (!data.success) {
      const error = new Error(data.error?.message || '请求失败')
      error.response = {
        status: response.status,
        data
      }
      throw error
    }

    return data.data
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      const networkError = new Error('网络连接失败')
      networkError.name = 'NetworkError'
      throw networkError
    }
    throw err
  }
}
```

#### 3.1.3 组件中使用示例

```javascript
// src/components/project/ProjectList.js
'use client'

import { useState, useEffect } from 'react'
import { useApiError } from '@/hooks/useApiError'
import { fetchProjects } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'

export default function ProjectList() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const { error, handleError, clearError } = useApiError()

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true)
        clearError()
        const data = await fetchProjects()
        setProjects(data)
      } catch (err) {
        handleError(err)
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
  }, [])

  if (loading) {
    return <Skeleton className="h-32 w-full" />
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {error}
      </div>
    )
  }

  return (
    <div>
      {projects.map(project => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  )
}
```

### 3.2 表单验证错误处理

#### 3.2.1 表单验证 Hook

```javascript
// src/hooks/useFormValidation.js
'use client'

import { useState, useCallback } from 'react'

export function useFormValidation(validationRules) {
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  const validate = useCallback((fieldName, value) => {
    const rules = validationRules[fieldName]
    if (!rules) return null

    for (const rule of rules) {
      const error = rule(value)
      if (error) {
        return error
      }
    }
    return null
  }, [validationRules])

  const validateAll = useCallback((values) => {
    const newErrors = {}
    Object.keys(validationRules).forEach(fieldName => {
      const error = validate(fieldName, values[fieldName])
      if (error) {
        newErrors[fieldName] = error
      }
    })
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [validationRules, validate])

  const handleBlur = useCallback((fieldName) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }))
  }, [])

  const handleChange = useCallback((fieldName, value) => {
    if (touched[fieldName]) {
      const error = validate(fieldName, value)
      setErrors(prev => ({
        ...prev,
        [fieldName]: error || undefined
      }))
    }
  }, [touched, validate])

  const setFieldError = useCallback((fieldName, error) => {
    setErrors(prev => ({
      ...prev,
      [fieldName]: error
    }))
  }, [])

  const clearErrors = useCallback(() => {
    setErrors({})
    setTouched({})
  }, [])

  return {
    errors,
    touched,
    validate,
    validateAll,
    handleBlur,
    handleChange,
    setFieldError,
    clearErrors
  }
}
```

#### 3.2.2 表单组件示例

```javascript
// src/components/settings/ApiKeyForm.js
'use client'

import { useState } from 'react'
import { useFormValidation } from '@/hooks/useFormValidation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createApiKey } from '@/lib/api'

const validationRules = {
  name: [
    (value) => !value ? '名称不能为空' : null,
    (value) => value.length > 255 ? '名称不能超过255个字符' : null
  ],
  key: [
    (value) => !value ? 'API Key 不能为空' : null,
    (value) => value.length < 8 ? 'API Key 长度至少8个字符' : null
  ]
}

export default function ApiKeyForm({ onSuccess, onCancel }) {
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({ name: '', key: '', projectId: '' })
  const { errors, touched, validateAll, handleBlur, handleChange, setFieldError } = useFormValidation(validationRules)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateAll(formData)) {
      return
    }

    try {
      setSubmitting(true)
      await createApiKey(formData)
      onSuccess?.()
    } catch (err) {
      if (err.response?.status === 409) {
        setFieldError('key', 'API Key 已存在')
      } else {
        setFieldError('_form', err.message || '创建失败')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors._form && (
        <Alert variant="destructive">
          <AlertDescription>{errors._form}</AlertDescription>
        </Alert>
      )}

      <div>
        <Label htmlFor="name">名称</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => {
            setFormData(prev => ({ ...prev, name: e.target.value }))
            handleChange('name', e.target.value)
          }}
          onBlur={() => handleBlur('name')}
          className={touched.name && errors.name ? 'border-destructive' : ''}
        />
        {touched.name && errors.name && (
          <p className="text-sm text-destructive mt-1">{errors.name}</p>
        )}
      </div>

      <div>
        <Label htmlFor="key">API Key</Label>
        <Input
          id="key"
          type="password"
          value={formData.key}
          onChange={(e) => {
            setFormData(prev => ({ ...prev, key: e.target.value }))
            handleChange('key', e.target.value)
          }}
          onBlur={() => handleBlur('key')}
          className={touched.key && errors.key ? 'border-destructive' : ''}
        />
        {touched.key && errors.key && (
          <p className="text-sm text-destructive mt-1">{errors.key}</p>
        )}
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? '创建中...' : '创建'}
        </Button>
      </div>
    </form>
  )
}
```

### 3.3 操作失败错误处理

#### 3.3.1 操作确认和错误处理

```javascript
// src/components/common/ConfirmDialog.js
'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useApiError } from '@/hooks/useApiError'

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  variant = 'default'
}) {
  const { handleError } = useApiError()

  const handleConfirm = async () => {
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (err) {
      handleError(err)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={variant === 'destructive' ? 'bg-destructive text-destructive-foreground' : ''}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

---

## 4. 404页面设计

### 4.1 404页面概述

#### 4.1.1 设计目标

- 清晰告知用户页面不存在
- 提供友好的导航选项
- 保持与应用整体风格一致
- 支持响应式布局

#### 4.1.2 页面内容

- **错误提示**：404错误说明
- **友好提示**：页面不存在的原因说明
- **导航选项**：返回首页、返回上一页
- **搜索功能**（可选）：提供搜索框帮助用户找到内容

### 4.2 404页面实现

#### 4.2.1 Next.js 404页面

```javascript
// app/not-found.js
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Home, ArrowLeft, Search, FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Header from '@/components/layout/Header'
import PageContainer from '@/components/layout/PageContainer'

export default function NotFound() {
  const router = useRouter()

  return (
    <>
      <Header />
      <PageContainer>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-muted p-4">
                  <FileQuestion className="h-12 w-12 text-muted-foreground" />
                </div>
              </div>
              <CardTitle className="text-4xl font-bold">404</CardTitle>
              <CardDescription className="text-lg mt-2">
                页面不存在
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                抱歉，您访问的页面不存在或已被删除。
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button onClick={() => router.back()} variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  返回上一页
                </Button>
                <Button asChild>
                  <Link href="/">
                    <Home className="mr-2 h-4 w-4" />
                    返回首页
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </>
  )
}
```

#### 4.2.2 动态路由404处理

```javascript
// app/project/[projectId]/page.js
'use client'

import { useEffect, useState } from 'react'
import { useParams, notFound } from 'next/navigation'
import { fetchProject } from '@/lib/api'
import NotFound from '@/app/not-found'

export default function ProjectDetailPage() {
  const params = useParams()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const loadProject = async () => {
      try {
        setLoading(true)
        const data = await fetchProject(params.projectId)
        if (!data) {
          setNotFound(true)
          return
        }
        setProject(data)
      } catch (err) {
        if (err.response?.status === 404) {
          setNotFound(true)
        }
      } finally {
        setLoading(false)
      }
    }

    loadProject()
  }, [params.projectId])

  if (loading) {
    return <div>加载中...</div>
  }

  if (notFound) {
    return <NotFound />
  }

  return (
    <div>
      {/* 项目详情内容 */}
    </div>
  )
}
```

#### 4.2.3 404页面样式设计

**浅色模式样式**：
- 背景：白色或浅灰色
- 主标题：深色文字
- 图标：灰色图标
- 按钮：主要按钮和次要按钮

**深色模式样式**：
- 背景：深色背景
- 主标题：浅色文字
- 图标：浅色图标
- 按钮：适配深色主题

**响应式设计**：
- 移动端：单列布局，按钮垂直排列
- 桌面端：居中卡片，按钮水平排列

### 4.3 404页面交互

#### 4.3.1 导航选项

1. **返回上一页**：使用浏览器历史记录返回
2. **返回首页**：跳转到应用首页
3. **搜索功能**（可选）：提供搜索框帮助用户找到内容

#### 4.3.2 用户体验优化

- **自动重定向**：如果URL格式正确但资源不存在，可以尝试自动重定向到相似资源
- **错误日志**：记录404错误，帮助改进应用
- **友好提示**：提供可能的页面建议

---

## 5. 错误提示机制

### 5.1 Toast 通知系统

#### 5.1.1 Toast 组件实现

使用 shadcn/ui 的 Toast 组件：

```javascript
// src/components/ui/use-toast.js (shadcn/ui)
// Toast 组件的标准实现

// src/components/ui/toast.js
'use client'

import * as React from 'react'
import * as ToastPrimitives from '@radix-ui/react-toast'
import { cva } from 'class-variance-authority'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      'fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]',
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full',
  {
    variants: {
      variant: {
        default: 'border bg-background text-foreground',
        destructive:
          'destructive group border-destructive bg-destructive text-destructive-foreground',
        success: 'border-green-500 bg-green-50 text-green-900 dark:bg-green-900 dark:text-green-50',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

const Toast = React.forwardRef(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      'inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive',
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      'absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600',
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn('text-sm font-semibold', className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn('text-sm opacity-90', className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
```

#### 5.1.2 Toast Hook 封装

```javascript
// src/hooks/useToast.js
'use client'

import { toast as shadcnToast } from '@/components/ui/use-toast'

export function useToast() {
  const showSuccess = (message, title = '成功') => {
    shadcnToast({
      title,
      description: message,
      variant: 'success'
    })
  }

  const showError = (message, title = '错误') => {
    shadcnToast({
      title,
      description: message,
      variant: 'destructive'
    })
  }

  const showInfo = (message, title = '提示') => {
    shadcnToast({
      title,
      description: message
    })
  }

  const showWarning = (message, title = '警告') => {
    shadcnToast({
      title,
      description: message,
      variant: 'default'
    })
  }

  return {
    showSuccess,
    showError,
    showInfo,
    showWarning
  }
}
```

### 5.2 内联错误提示

#### 5.2.1 Alert 组件

```javascript
// src/components/ui/alert.js (shadcn/ui)
'use client'

import * as React from 'react'
import { cva } from 'class-variance-authority'
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive:
          'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
        success: 'border-green-500/50 text-green-900 dark:text-green-50 [&>svg]:text-green-600',
        warning: 'border-yellow-500/50 text-yellow-900 dark:text-yellow-50 [&>svg]:text-yellow-600',
        info: 'border-blue-500/50 text-blue-900 dark:text-blue-50 [&>svg]:text-blue-600',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

const Alert = React.forwardRef(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = 'Alert'

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
))
AlertTitle.displayName = 'AlertTitle'

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
))
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertTitle, AlertDescription }
```

#### 5.2.2 错误提示使用示例

```javascript
// 表单错误提示
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>错误</AlertTitle>
  <AlertDescription>
    表单验证失败，请检查输入内容。
  </AlertDescription>
</Alert>

// 成功提示
<Alert variant="success">
  <CheckCircle2 className="h-4 w-4" />
  <AlertTitle>成功</AlertTitle>
  <AlertDescription>
    操作成功完成。
  </AlertDescription>
</Alert>

// 警告提示
<Alert variant="warning">
  <AlertTriangle className="h-4 w-4" />
  <AlertTitle>警告</AlertTitle>
  <AlertDescription>
    请注意此操作的影响。
  </AlertDescription>
</Alert>
```

### 5.3 错误提示最佳实践

#### 5.3.1 错误信息设计原则

1. **清晰明确**：错误信息应该清晰说明问题
2. **可操作**：提供解决建议或操作选项
3. **用户友好**：避免技术术语，使用用户能理解的语言
4. **及时反馈**：错误发生后立即显示提示

#### 5.3.2 错误提示时机

- **即时验证**：表单字段失去焦点时验证
- **提交验证**：表单提交时验证所有字段
- **API 错误**：API 请求失败时立即显示
- **操作反馈**：操作成功或失败时显示提示

#### 5.3.3 错误提示位置

- **Toast 通知**：页面右上角或底部（非阻塞式）
- **内联提示**：表单字段下方（字段级错误）
- **页面级提示**：页面顶部（页面级错误）
- **模态对话框**：重要操作确认（阻塞式）

---

## 6. 错误处理流程

### 6.1 完整错误处理流程

```
错误发生
  ↓
错误类型判断
  ├── 网络错误
  │   ├── 自动重试（最多3次）
  │   ├── 重试失败 → 显示网络错误提示
  │   └── 提供手动重试选项
  │
  ├── API 错误
  │   ├── 400 → 显示参数错误提示
  │   ├── 401 → 显示认证错误提示
  │   ├── 404 → 显示资源不存在提示或404页面
  │   ├── 500 → 显示服务器错误提示
  │   └── 其他 → 显示通用错误提示
  │
  ├── 表单验证错误
  │   ├── 字段级错误 → 字段下方显示错误
  │   ├── 表单级错误 → 表单顶部显示错误
  │   └── 提交错误 → Toast 通知 + 表单错误
  │
  ├── 渲染错误
  │   ├── Error Boundary 捕获
  │   ├── 显示错误页面
  │   └── 提供恢复选项
  │
  └── 其他错误
      ├── 记录错误日志
      ├── 显示通用错误提示
      └── 提供反馈渠道
```

### 6.2 错误日志记录

#### 6.2.1 客户端错误日志

```javascript
// src/lib/errorLogger.js
export function logError(error, context = {}) {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    context,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
    url: typeof window !== 'undefined' ? window.location.href : ''
  }

  // 开发环境：输出到控制台
  if (process.env.NODE_ENV === 'development') {
    console.error('Error logged:', errorInfo)
  }

  // 生产环境：发送到错误追踪服务（可选）
  if (process.env.NODE_ENV === 'production') {
    // 可以集成 Sentry、LogRocket 等错误追踪服务
    // sendToErrorTrackingService(errorInfo)
  }
}
```

#### 6.2.2 错误追踪集成（可选）

```javascript
// src/lib/sentry.js (示例)
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
})

export function captureException(error, context) {
  Sentry.captureException(error, {
    contexts: {
      custom: context
    }
  })
}
```

---

## 7. 无障碍性（A11y）设计

### 7.1 错误信息的无障碍性

#### 7.1.1 ARIA 属性

```javascript
// 错误提示使用 ARIA
<div role="alert" aria-live="assertive" aria-atomic="true">
  <Alert variant="destructive">
    <AlertTitle>错误</AlertTitle>
    <AlertDescription>错误信息</AlertDescription>
  </Alert>
</div>

// 表单字段错误关联
<div>
  <Label htmlFor="email">邮箱</Label>
  <Input
    id="email"
    aria-invalid={!!errors.email}
    aria-describedby={errors.email ? 'email-error' : undefined}
  />
  {errors.email && (
    <p id="email-error" role="alert" className="text-sm text-destructive">
      {errors.email}
    </p>
  )}
</div>
```

#### 7.1.2 键盘导航

- 错误提示支持键盘操作
- 错误恢复按钮支持 Tab 键导航
- 错误提示自动获得焦点（可选）

### 7.2 屏幕阅读器支持

- 使用语义化 HTML 标签
- 提供有意义的错误描述
- 使用 `aria-live` 区域通知屏幕阅读器
- 错误信息使用 `role="alert"`

---

## 8. 性能优化

### 8.1 错误处理性能优化

1. **错误边界优化**：避免不必要的重渲染
2. **错误日志优化**：异步记录错误，不阻塞主线程
3. **错误提示优化**：使用 Toast 而非模态框（非阻塞）
4. **错误重试优化**：使用指数退避策略

### 8.2 错误处理代码分割

```javascript
// 错误组件懒加载
const ErrorBoundary = lazy(() => import('@/components/error/ErrorBoundary'))
const NotFound = lazy(() => import('@/app/not-found'))
```

---

## 9. 测试建议

### 9.1 错误处理测试

1. **单元测试**：测试错误处理函数和 Hook
2. **集成测试**：测试错误处理流程
3. **E2E 测试**：测试用户错误场景

### 9.2 404页面测试

1. **路由测试**：测试各种404场景
2. **响应式测试**：测试不同设备上的显示
3. **导航测试**：测试导航按钮功能

### 9.3 错误提示测试

1. **Toast 测试**：测试 Toast 显示和消失
2. **表单验证测试**：测试表单错误提示
3. **无障碍性测试**：测试屏幕阅读器支持

---

## 10. 总结

本文档详细定义了 TaskEcho 系统的错误处理和404页面设计方案，包括：

1. **页面级错误处理**：Error Boundary、网络错误、数据加载错误
2. **组件级错误处理**：API 调用错误、表单验证错误、操作失败错误
3. **404页面设计**：页面布局、交互功能、响应式设计
4. **错误提示机制**：Toast 通知、内联提示、错误信息设计原则

所有错误处理遵循以下原则：
- **用户友好**：清晰的错误信息和恢复选项
- **一致性**：统一的错误处理机制和样式
- **可访问性**：支持屏幕阅读器和键盘导航
- **性能优化**：不影响正常功能性能

这些错误处理机制确保应用在各种错误场景下都能提供良好的用户体验，帮助用户快速理解和解决问题。
