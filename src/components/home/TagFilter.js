'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { X, Tag, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchWithAuth } from '@/lib/fetch-utils'
import { useToast } from '@/components/ui/use-toast'

/**
 * 标签过滤器组件
 * @param {Object} props
 * @param {string[]} props.selectedTags - 已选中的标签列表
 * @param {Function} props.onTagsChange - 标签选择变化回调函数
 * @param {boolean} props.disabled - 是否禁用
 */
export function TagFilter({ selectedTags = [], onTagsChange, disabled = false }) {
  const [popularTags, setPopularTags] = useState([])
  const [loadingTags, setLoadingTags] = useState(false)
  const { toast } = useToast()

  // 加载常用标签列表
  useEffect(() => {
    const loadPopularTags = async () => {
      setLoadingTags(true)
      try {
        const response = await fetchWithAuth('/api/v1/projects/tags?limit=50')
        if (!response.ok) {
          throw new Error(`获取常用标签失败: ${response.status}`)
        }
        const result = await response.json()
        if (result.success && result.data) {
          setPopularTags(result.data.tags || [])
        }
      } catch (error) {
        console.error('加载常用标签失败:', error)
        // 不显示错误提示，静默失败
      } finally {
        setLoadingTags(false)
      }
    }

    loadPopularTags()
  }, [])

  // 切换标签选择状态
  const toggleTag = useCallback((tag) => {
    if (disabled) return
    
    const normalizedTag = tag.toLowerCase()
    const isSelected = selectedTags.some(t => t.toLowerCase() === normalizedTag)
    
    if (isSelected) {
      // 取消选择
      onTagsChange(selectedTags.filter(t => t.toLowerCase() !== normalizedTag))
    } else {
      // 选择标签
      onTagsChange([...selectedTags, normalizedTag])
    }
  }, [selectedTags, onTagsChange, disabled])

  // 清除所有标签
  const handleClearAll = useCallback(() => {
    if (disabled) return
    onTagsChange([])
  }, [onTagsChange, disabled])

  const hasSelectedTags = selectedTags.length > 0

  return (
    <div className="mb-4 md:mb-5 lg:mb-6">
      {/* 标题和清除按钮 */}
      <div className="flex items-center justify-between mb-2 md:mb-3">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 md:h-5 md:w-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
          <h3 className="text-sm md:text-base font-medium text-gray-700 dark:text-gray-300">
            标签过滤
          </h3>
          {hasSelectedTags && (
            <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
              ({selectedTags.length} 个已选)
            </span>
          )}
        </div>
        {hasSelectedTags && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            disabled={disabled}
            className={cn(
              'h-8 md:h-9 px-2 md:px-3',
              'text-xs md:text-sm',
              'text-gray-600 dark:text-gray-400',
              'hover:text-gray-900 dark:hover:text-gray-100',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            aria-label="清除所有标签"
          >
            <X className="h-3 w-3 md:h-4 md:w-4 mr-1" />
            清除
          </Button>
        )}
      </div>

      {/* 已选标签显示 */}
      {hasSelectedTags && (
        <div className="mb-3 md:mb-4 flex flex-wrap gap-2">
          {selectedTags.map((tag, index) => (
            <button
              key={index}
              type="button"
              onClick={() => toggleTag(tag)}
              disabled={disabled}
              className={cn(
                'inline-flex items-center gap-1.5',
                'px-2.5 py-1 md:px-3 md:py-1.5',
                'rounded-md text-xs md:text-sm',
                'bg-blue-600 dark:bg-blue-500',
                'text-white',
                'border border-blue-700 dark:border-blue-600',
                'hover:bg-blue-700 dark:hover:bg-blue-600',
                'active:opacity-80',
                'transition-colors duration-200',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              aria-label={`取消选择标签 ${tag}`}
            >
              {tag}
              <X className="h-3 w-3 md:h-3.5 md:w-3.5" />
            </button>
          ))}
        </div>
      )}

      {/* 常用标签列表 */}
      <div className="space-y-2">
        {loadingTags ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>加载常用标签...</span>
          </div>
        ) : popularTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {popularTags.map((tag, index) => {
              const isSelected = selectedTags.some(t => t.toLowerCase() === tag.toLowerCase())
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  disabled={disabled}
                  className={cn(
                    'inline-flex items-center',
                    'px-2.5 py-1 md:px-3 md:py-1.5',
                    'rounded-md text-xs md:text-sm',
                    'border transition-colors duration-200',
                    'active:opacity-80',
                    isSelected
                      ? 'bg-blue-600 dark:bg-blue-500 text-white border-blue-700 dark:border-blue-600'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  aria-label={isSelected ? `取消选择标签 ${tag}` : `选择标签 ${tag}`}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        ) : (
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
            暂无常用标签
          </p>
        )}
      </div>
    </div>
  )
}
