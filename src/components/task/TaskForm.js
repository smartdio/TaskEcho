/**
 * 任务创建/编辑表单组件
 */
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Clock, Play, CheckCircle, XCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 生成唯一的任务ID
 * 格式: task-{timestamp}-{random}
 */
function generateTaskId() {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 11)
  return `task-${timestamp}-${random}`
}

/**
 * 获取状态对应的颜色类
 */
function getStatusColorClasses(status) {
  switch (status) {
    case 'pending':
      return {
        bg: 'bg-yellow-500',
        border: 'border-yellow-500',
        hover: 'hover:bg-yellow-50'
      }
    case 'running':
      return {
        bg: 'bg-blue-500',
        border: 'border-blue-500',
        hover: 'hover:bg-blue-50'
      }
    case 'done':
      return {
        bg: 'bg-green-600',
        border: 'border-green-600',
        hover: 'hover:bg-green-50'
      }
    case 'error':
      return {
        bg: 'bg-red-500',
        border: 'border-red-500',
        hover: 'hover:bg-red-50'
      }
    case 'cancelled':
      return {
        bg: 'bg-gray-500',
        border: 'border-gray-500',
        hover: 'hover:bg-gray-50'
      }
    default:
      return {
        bg: 'bg-gray-500',
        border: 'border-gray-500',
        hover: 'hover:bg-gray-50'
      }
  }
}

export function TaskForm({ 
  task = null, 
  onSubmit, 
  onCancel, 
  isSubmitting = false 
}) {
  // 判断是否为创建模式（编辑模式时 task 不为 null）
  const isCreateMode = !task
  
  // 创建模式时自动生成任务ID
  const initialTaskId = task?.task_id || task?.id || (isCreateMode ? generateTaskId() : '')
  
  const [formData, setFormData] = useState({
    taskId: initialTaskId,
    name: task?.name || '',
    prompt: task?.prompt || '',
    spec_file: task?.spec_file?.join('\n') || '',
    status: task?.status || 'pending'
  })

  // 创建模式下，如果任务ID被清空，自动重新生成
  useEffect(() => {
    if (isCreateMode && !formData.taskId.trim()) {
      setFormData(prev => ({ ...prev, taskId: generateTaskId() }))
    }
  }, [formData.taskId, isCreateMode])

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const submitData = {
      taskId: formData.taskId.trim(),
      name: formData.name.trim(),
      prompt: formData.prompt.trim(),
      spec_file: formData.spec_file
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0),
      status: formData.status
    }

    onSubmit(submitData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 任务ID */}
      <Input
        id="taskId"
        value={formData.taskId}
        onChange={(e) => handleChange('taskId', e.target.value)}
        placeholder="任务ID"
        required
        disabled={!isCreateMode}
        className="h-11"
      />

      {/* 任务名称 */}
      <Input
        id="name"
        value={formData.name}
        onChange={(e) => handleChange('name', e.target.value)}
        placeholder="任务名称"
        required
        className="h-11"
      />

      {/* Prompt */}
      <Textarea
        id="prompt"
        value={formData.prompt}
        onChange={(e) => handleChange('prompt', e.target.value)}
        placeholder="Prompt"
        required
        className="min-h-[240px]"
      />

      {/* 规范文件 */}
      <Textarea
        id="spec_file"
        value={formData.spec_file}
        onChange={(e) => handleChange('spec_file', e.target.value)}
        placeholder="规范文件（每行一个）"
        className="min-h-[80px] font-mono text-sm"
      />

      {/* 状态选择 - 移动端友好的按钮组 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { value: 'pending', label: 'Pending', icon: Clock },
          { value: 'running', label: 'Running', icon: Play },
          { value: 'done', label: 'Done', icon: CheckCircle },
          { value: 'error', label: 'Error', icon: XCircle },
          { value: 'cancelled', label: 'Cancelled', icon: X }
        ].map((option) => {
          const Icon = option.icon
          const isSelected = formData.status === option.value
          const colors = getStatusColorClasses(option.value)
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleChange('status', option.value)}
              className={cn(
                'h-11 rounded-md border text-sm font-medium transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                'active:opacity-80 flex items-center justify-center gap-1.5',
                isSelected
                  ? `${colors.bg} text-white ${colors.border}`
                  : `bg-white text-gray-900 border-gray-300 ${colors.hover}`
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{option.label}</span>
            </button>
          )
        })}
      </div>

      {/* 按钮 */}
      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="h-11"
        >
          取消
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !formData.taskId.trim() || !formData.name.trim() || !formData.prompt.trim()}
          className="h-11"
        >
          {isSubmitting ? '保存中...' : (isCreateMode ? '创建' : '更新')}
        </Button>
      </div>
    </form>
  )
}

