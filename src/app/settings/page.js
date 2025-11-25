'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, AlertCircle, Loader2, Copy, Check } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import Breadcrumb from '@/components/layout/Breadcrumb'
import { ApiKeyList } from '@/components/settings/ApiKeyList'
import { ApiKeyForm } from '@/components/settings/ApiKeyForm'
import { DeleteConfirmDialog } from '@/components/settings/DeleteConfirmDialog'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { fetchWithAuth } from '@/lib/fetch-utils'

/**
 * 格式化时间显示
 */
function formatDateTime(dateString) {
  if (!dateString) return '暂无'
  
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  
  // 小于1分钟：刚刚
  if (diff < 60000) return '刚刚'
  
  // 小于1小时：X分钟前
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes}分钟前`
  }
  
  // 小于24小时：X小时前
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours}小时前`
  }
  
  // 小于7天：X天前
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000)
    return `${days}天前`
  }
  
  // 其他：显示具体日期时间
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function SettingsPage() {
  const { showSuccess, showError } = useToast()
  
  // API Key 列表状态
  const [apiKeys, setApiKeys] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  })
  
  // 加载状态
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // 表单状态
  const [formOpen, setFormOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingApiKey, setEditingApiKey] = useState(null)
  
  // 删除对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingApiKey, setDeletingApiKey] = useState(null)
  
  // 显示新创建的 API Key 对话框状态
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false)
  const [newApiKey, setNewApiKey] = useState(null)
  
  // 显示完整 API Key 对话框状态
  const [showViewKeyDialog, setShowViewKeyDialog] = useState(false)
  const [viewingApiKey, setViewingApiKey] = useState(null)
  const [loadingKey, setLoadingKey] = useState(false)
  
  // Key 值显示状态（临时保存创建时的原始值）
  const [visibleKeys, setVisibleKeys] = useState(new Set())
  const [createdKeys, setCreatedKeys] = useState(new Map())
  
  // 防止重复请求的 ref
  const isFetchingRef = useRef(false)
  const hasInitializedRef = useRef(false)
  
  /**
   * 获取 API Key 列表
   * @param {number} page - 页码，默认 1
   * @param {number} pageSize - 每页数量，默认 20
   * @param {boolean} force - 是否强制刷新（忽略并发检查），默认 false
   */
  const fetchApiKeys = useCallback(async (page = 1, pageSize = 20, force = false) => {
    // 防止并发请求（除非强制刷新）
    if (!force && isFetchingRef.current) {
      return
    }
    
    try {
      isFetchingRef.current = true
      setLoading(true)
      setError(null)
      
      const response = await fetchWithAuth(
        `/api/v1/api-keys?page=${page}&pageSize=${pageSize}`
      )
      
      if (!response.ok) {
        throw new Error('获取 API Key 列表失败')
      }
      
      const data = await response.json()
      
      if (data.success) {
        setApiKeys(data.data.items)
        setPagination(data.data.pagination)
        setError(null) // 清除之前的错误
      } else {
        throw new Error(data.error?.message || '获取 API Key 列表失败')
      }
    } catch (err) {
      setError(err.message)
      showError(err.message || '加载数据失败')
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [showError])
  
  /**
   * 创建 API Key
   */
  const createApiKey = useCallback(async (formData) => {
    try {
      const response = await fetchWithAuth('/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          project_id: formData.project_id?.trim() || null
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // 保存完整的 API Key（仅在创建时返回）
        const fullApiKey = result.data?.key
        
        // 调试：检查返回的数据
        console.log('创建 API Key 响应:', {
          success: result.success,
          data: result.data,
          hasKey: !!result.data?.key,
          keyValue: result.data?.key
        })
        
        if (!fullApiKey) {
          // 如果没有返回 key，显示错误
          console.error('API Key 创建成功但未返回 key:', result.data)
          return { 
            success: false, 
            message: '创建成功但未返回 API Key，请刷新页面查看' 
          }
        }
        
        // 先设置 newApiKey，再显示对话框
        const newKeyData = {
          id: result.data.id,
          name: result.data.name,
          key: fullApiKey
        }
        
        console.log('准备显示 API Key 对话框:', { 
          id: newKeyData.id, 
          name: newKeyData.name, 
          hasKey: !!newKeyData.key,
          keyLength: newKeyData.key?.length 
        })
        
        // 保存完整的 API Key 到 createdKeys（用于列表显示）
        setCreatedKeys(prev => {
          const newMap = new Map(prev)
          newMap.set(result.data.id, fullApiKey)
          return newMap
        })
        
        // 关闭表单
        setFormOpen(false)
        
        // 清除错误状态
        setError(null)
        
        // 设置新创建的 API Key 并立即显示对话框
        console.log('设置 newApiKey:', newKeyData)
        setNewApiKey(newKeyData)
        
        // 立即显示对话框（不等待状态更新）
        console.log('立即显示 API Key 对话框')
        setShowApiKeyDialog(true)
        
        // 强制刷新列表：刷新第一页（新创建的会在最前面）
        isFetchingRef.current = false
        await fetchApiKeys(1, pagination.pageSize, true)
        
        return { success: true }
      } else {
        return { 
          success: false, 
          message: result.error?.message || '创建失败',
          errors: result.error?.details || {}
        }
      }
    } catch (error) {
      return { 
        success: false, 
        message: '网络错误，请稍后重试' 
      }
    }
  }, [fetchApiKeys, pagination, showSuccess])
  
  /**
   * 更新 API Key
   */
  const updateApiKey = useCallback(async (id, formData) => {
    try {
      const response = await fetchWithAuth(`/api/v1/api-keys/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          project_id: formData.project_id?.trim() || null,
          is_active: formData.is_active
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // 关闭表单
        setFormOpen(false)
        
        // 强制刷新列表：刷新当前页
        isFetchingRef.current = false
        await fetchApiKeys(pagination.page, pagination.pageSize, true)
        
        showSuccess('API Key 更新成功')
        return { success: true }
      } else {
        return { 
          success: false, 
          message: result.error?.message || '更新失败',
          errors: result.error?.details || {}
        }
      }
    } catch (error) {
      return { 
        success: false, 
        message: '网络错误，请稍后重试' 
      }
    }
  }, [fetchApiKeys, pagination, showSuccess])
  
  /**
   * 删除 API Key
   */
  const deleteApiKey = useCallback(async (id) => {
    try {
      const response = await fetchWithAuth(`/api/v1/api-keys/${id}`, {
        method: 'DELETE'
      })
      
      const result = await response.json()
      
      if (result.success) {
        // 关闭对话框
        setDeleteDialogOpen(false)
        setDeletingApiKey(null)
        
        // 清除临时保存的 Key 值
        setCreatedKeys(prev => {
          const newMap = new Map(prev)
          newMap.delete(id)
          return newMap
        })
        setVisibleKeys(prev => {
          const newSet = new Set(prev)
          newSet.delete(id)
          return newSet
        })
        
        // 强制刷新列表：刷新当前页
        isFetchingRef.current = false
        await fetchApiKeys(pagination.page, pagination.pageSize, true)
        
        showSuccess('API Key 删除成功')
        return { success: true }
      } else {
        return { 
          success: false, 
          message: result.error?.message || '删除失败' 
        }
      }
    } catch (error) {
      return { 
        success: false, 
        message: '网络错误，请稍后重试' 
      }
    }
  }, [fetchApiKeys, pagination, showSuccess])
  
  /**
   * 打开添加表单
   */
  const handleAdd = () => {
    setIsEditMode(false)
    setEditingApiKey(null)
    setFormOpen(true)
  }
  
  /**
   * 打开编辑表单
   */
  const handleEdit = (apiKey) => {
    // 如果 apiKey 为 null，表示是添加模式
    if (apiKey === null) {
      handleAdd()
      return
    }
    
    // 编辑模式：验证 apiKey 是否有效
    if (!apiKey || !apiKey.id) {
      showError('API Key 数据无效，请刷新页面重试')
      return
    }
    
    setIsEditMode(true)
    setEditingApiKey(apiKey)
    setFormOpen(true)
  }
  
  /**
   * 打开删除确认对话框
   */
  const handleDelete = (apiKey) => {
    setDeletingApiKey(apiKey)
    setDeleteDialogOpen(true)
  }
  
  /**
   * 切换 Key 值显示/隐藏（用于创建后临时显示）
   */
  const toggleKeyVisibility = (id) => {
    const newVisibleKeys = new Set(visibleKeys)
    if (newVisibleKeys.has(id)) {
      newVisibleKeys.delete(id)
    } else {
      // 检查是否有保存的原始值
      if (createdKeys.has(id)) {
        newVisibleKeys.add(id)
      } else {
        // 如果没有原始值，提示无法显示
        showError('无法显示完整 Key 值，仅在创建后短时间内可查看')
        return
      }
    }
    setVisibleKeys(newVisibleKeys)
  }
  
  /**
   * 查看完整的 API Key
   */
  const handleViewKey = useCallback(async (apiKey) => {
    setLoadingKey(true)
    setViewingApiKey(null)
    setShowViewKeyDialog(true)
    
    try {
      const response = await fetchWithAuth(`/api/v1/api-keys/${apiKey.id}?show_key=true`)
      const result = await response.json()
      
      if (result.success && result.data) {
        // 确保 key 值存在且不为空
        if (!result.data.key) {
          showError('API Key 值不存在')
          setShowViewKeyDialog(false)
          return
        }
        
        setViewingApiKey({
          id: result.data.id,
          name: result.data.name,
          key: result.data.key
        })
      } else {
        showError(result.error?.message || result.message || '获取 API Key 失败')
        setShowViewKeyDialog(false)
      }
    } catch (error) {
      console.error('获取 API Key 失败:', error)
      showError('网络错误，请稍后重试')
      setShowViewKeyDialog(false)
    } finally {
      setLoadingKey(false)
    }
  }, [showError])
  
  // 当 newApiKey 设置后，自动显示对话框（备用机制）
  useEffect(() => {
    if (newApiKey && newApiKey.key && !showApiKeyDialog) {
      // 如果对话框还没显示，则显示它
      setShowApiKeyDialog(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newApiKey])
  
  // 初始加载（只在组件挂载时执行一次）
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true
      fetchApiKeys()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="container mx-auto px-4 md:px-5 lg:px-6 py-4 md:py-5 lg:py-6">
        {/* 面包屑导航 */}
        <Breadcrumb items={[{ label: 'API Key 管理' }]} />
        
        {/* 页面标题和操作按钮 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 md:mb-6">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-gray-900 dark:text-gray-50">
            API Key 管理
          </h1>
          <Button
            onClick={handleAdd}
            className="h-11 w-full sm:w-auto px-4 md:px-5 lg:px-6 active:opacity-80"
            aria-label="添加 API Key"
          >
            <Plus className="h-5 w-5 md:h-5.5 md:w-5.5 lg:h-6 lg:w-6 mr-2" />
            <span>添加 API Key</span>
          </Button>
        </div>
        
        {/* 错误提示 */}
        {error && !loading && (
          <Card className="mb-4 md:mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm md:text-base text-red-800 dark:text-red-200">
                  {error}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchApiKeys(pagination.page, pagination.pageSize)}
                className="h-8 md:h-9"
              >
                重试
              </Button>
            </CardContent>
          </Card>
        )}
        
        {/* 加载状态 */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">加载中...</span>
          </div>
        )}
        
        {/* API Key 列表 */}
        {!loading && !error && (
          <ApiKeyList
            apiKeys={apiKeys}
            visibleKeys={visibleKeys}
            createdKeys={createdKeys}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleVisibility={toggleKeyVisibility}
            onViewKey={handleViewKey}
            formatDateTime={formatDateTime}
          />
        )}
        
        {/* 表单弹窗 */}
        <ApiKeyForm
          open={formOpen}
          onOpenChange={setFormOpen}
          isEditMode={isEditMode}
          editingApiKey={editingApiKey}
          onCreate={createApiKey}
          onUpdate={updateApiKey}
        />
        
        {/* 删除确认对话框 */}
        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          apiKey={deletingApiKey}
          onConfirm={deleteApiKey}
        />
        
        {/* 显示新创建的 API Key 对话框 */}
        <Dialog open={showApiKeyDialog} onOpenChange={(open) => {
          console.log('API Key 对话框状态变化:', open, 'newApiKey:', newApiKey)
          setShowApiKeyDialog(open)
          if (!open) {
            // 关闭对话框时，延迟清空 newApiKey，避免闪烁
            setTimeout(() => setNewApiKey(null), 200)
          }
        }}>
          <DialogContent className="max-w-lg z-[100]">
            <DialogHeader>
              <DialogTitle className="text-xl md:text-2xl">
                API Key 创建成功
              </DialogTitle>
            </DialogHeader>
            
            {newApiKey ? (
              <div className="space-y-4">
                <Alert variant="info" className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertDescription className="text-blue-800 dark:text-blue-200">
                    请妥善保存您的 API Key。您可以在列表中随时查看完整值。
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">API Key 名称</Label>
                  <p className="text-base text-gray-900 dark:text-gray-100">{newApiKey.name}</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">API Key 值</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono break-all">
                      {newApiKey.key || '加载中...'}
                    </code>
                    {newApiKey.key && <ApiKeyCopyButton apiKey={newApiKey.key} />}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">加载中...</span>
              </div>
            )}
            
            <DialogFooter>
              <Button
                onClick={() => {
                  setShowApiKeyDialog(false)
                  setTimeout(() => setNewApiKey(null), 200)
                }}
                className="h-11"
              >
                我已保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* 查看完整 API Key 对话框 */}
        <Dialog 
          open={showViewKeyDialog} 
          onOpenChange={(open) => {
            setShowViewKeyDialog(open)
            if (!open) {
              // 关闭对话框时清空状态
              setTimeout(() => {
                setViewingApiKey(null)
                setLoadingKey(false)
              }, 200)
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl md:text-2xl">
                查看 API Key
              </DialogTitle>
            </DialogHeader>
            
            {loadingKey ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">加载中...</span>
              </div>
            ) : viewingApiKey ? (
              <div className="space-y-4">
                <Alert variant="info" className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertDescription className="text-blue-800 dark:text-blue-200">
                    请妥善保管您的 API Key，避免泄露。
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">API Key 名称</Label>
                  <p className="text-base text-gray-900 dark:text-gray-100">{viewingApiKey.name}</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">API Key 值</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono break-all">
                      {viewingApiKey.key || '未获取到 Key 值'}
                    </code>
                    {viewingApiKey.key && (
                      <ApiKeyCopyButton apiKey={viewingApiKey.key} />
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <p className="text-gray-600 dark:text-gray-400">未获取到 API Key 数据</p>
              </div>
            )}
            
            <DialogFooter>
              <Button
                onClick={() => {
                  setShowViewKeyDialog(false)
                  setTimeout(() => {
                    setViewingApiKey(null)
                    setLoadingKey(false)
                  }, 200)
                }}
                className="h-11"
              >
                关闭
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
    </AuthGuard>
  )
}

/**
 * API Key 复制按钮组件
 */
function ApiKeyCopyButton({ apiKey }) {
  const { showSuccess } = useToast()
  const [copied, setCopied] = useState(false)
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey)
      setCopied(true)
      showSuccess('已复制到剪贴板')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // 复制失败，忽略
    }
  }
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="h-10 w-10 p-0 flex-shrink-0"
      aria-label="复制 API Key"
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  )
}

