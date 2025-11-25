'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

/**
 * API Key 表单组件
 */
export function ApiKeyForm({ open, onOpenChange, isEditMode, editingApiKey, onCreate, onUpdate }) {
  const [formData, setFormData] = useState({
    name: '',
    project_id: '',
    is_active: true
  })
  
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  
  // 当编辑模式或弹窗打开时，重置表单
  useEffect(() => {
    if (open) {
      if (isEditMode && editingApiKey) {
        // 编辑模式：预填充数据
        setFormData({
          name: editingApiKey.name || '',
          project_id: editingApiKey.project_id || '',
          is_active: editingApiKey.is_active !== undefined ? editingApiKey.is_active : true
        })
      } else {
        // 添加模式：重置表单
        setFormData({
          name: '',
          project_id: '',
          is_active: true
        })
      }
      setFormErrors({})
      setSubmitError(null)
    }
  }, [open, isEditMode, editingApiKey])
  
  /**
   * 验证表单数据
   */
  const validateForm = () => {
    const errors = {}
    
    // 验证名称
    if (!formData.name || !formData.name.trim()) {
      errors.name = 'API Key 名称不能为空'
    } else if (formData.name.length > 255) {
      errors.name = 'API Key 名称长度不能超过 255 字符'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }
  
  /**
   * 处理表单提交
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // 验证表单
    if (!validateForm()) {
      return
    }
    
    setSubmitting(true)
    setSubmitError(null)
    
    try {
      let result
      if (isEditMode) {
        if (!editingApiKey || !editingApiKey.id) {
          setSubmitError('编辑数据无效，请刷新页面重试')
          return
        }
        result = await onUpdate(editingApiKey.id, formData)
      } else {
        result = await onCreate(formData)
      }
      
      if (!result.success) {
        setSubmitError(result.message || '操作失败')
        if (result.errors) {
          setFormErrors(result.errors)
        }
      } else {
        // 成功：关闭表单（由父组件处理）
        onOpenChange(false)
      }
    } catch (error) {
      setSubmitError(error.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }
  
  /**
   * 处理输入变化
   */
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // 清除该字段的错误
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl md:text-2xl">
            {isEditMode ? '编辑 API Key' : '添加 API Key'}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
            {isEditMode ? '修改 API Key 的信息和设置' : '创建一个新的 API Key 用于身份验证'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
          {/* 提交错误提示 */}
          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
          
          {/* API Key 名称 */}
          <div className="space-y-2">
            <Label htmlFor="name" className="mb-2 block">
              名称 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="请输入 API Key 名称"
              className={cn(
                'h-11',
                formErrors.name && 'border-red-500 focus-visible:ring-red-500'
              )}
              disabled={submitting}
              aria-invalid={!!formErrors.name}
              aria-describedby={formErrors.name ? 'name-error' : undefined}
            />
            {formErrors.name && (
              <p id="name-error" className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {formErrors.name}
              </p>
            )}
          </div>
          
          {/* 关联项目 ID */}
          <div className="space-y-2">
            <Label htmlFor="project_id" className="mb-2 block">
              关联项目 ID <span className="text-gray-400 text-xs">(可选)</span>
            </Label>
            <Input
              id="project_id"
              value={formData.project_id}
              onChange={(e) => handleChange('project_id', e.target.value)}
              placeholder="请输入项目 ID（可选）"
              className={cn(
                'h-11',
                formErrors.project_id && 'border-red-500 focus-visible:ring-red-500'
              )}
              disabled={submitting}
              aria-invalid={!!formErrors.project_id}
              aria-describedby={formErrors.project_id ? 'project_id-error' : undefined}
            />
            {formErrors.project_id && (
              <p id="project_id-error" className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {formErrors.project_id}
              </p>
            )}
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
              如果设置，该 API Key 只能用于指定项目
            </p>
          </div>
          
          {/* 激活状态（仅编辑模式） */}
          {isEditMode && (
            <div className="space-y-2">
              <Label htmlFor="is_active" className="mb-2 block">激活状态</Label>
              <div className="flex items-center gap-3">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleChange('is_active', checked)}
                  disabled={submitting}
                />
                <label htmlFor="is_active" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                  {formData.is_active ? '激活' : '禁用'}
                </label>
              </div>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                禁用后，该 API Key 将无法通过认证
              </p>
            </div>
          )}
          
          {/* 表单按钮 */}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="h-11"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="h-11"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
