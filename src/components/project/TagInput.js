'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 标签输入组件
 * @param {Object} props
 * @param {string[]} props.tags - 标签列表
 * @param {Function} props.onTagsChange - 标签变化回调函数
 * @param {number} props.maxTags - 最大标签数量，默认20
 * @param {number} props.maxTagLength - 每个标签最大长度，默认50
 */
export function TagInput({ tags = [], onTagsChange, maxTags = 20, maxTagLength = 50 }) {
  const [inputValue, setInputValue] = useState('')
  const { toast } = useToast()

  /**
   * 处理输入框按键事件
   */
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    }
  }

  /**
   * 添加标签
   */
  const addTag = (value) => {
    // 如果输入值包含逗号，分割成多个标签
    if (value.includes(',')) {
      const tagList = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      tagList.forEach(tag => {
        addSingleTag(tag)
      })
      setInputValue('')
      return
    }

    // 单个标签处理
    addSingleTag(value)
    setInputValue('')
  }

  /**
   * 添加单个标签
   */
  const addSingleTag = (value) => {
    const trimmedValue = value.trim().toLowerCase()

    // 验证标签
    if (!trimmedValue) return

    // 检查标签数量限制
    if (tags.length >= maxTags) {
      toast({
        title: '提示',
        description: `最多只能添加${maxTags}个标签`,
        variant: 'default'
      })
      return
    }

    // 检查标签长度限制
    if (trimmedValue.length > maxTagLength) {
      toast({
        title: '提示',
        description: `标签长度不能超过${maxTagLength}个字符`,
        variant: 'default'
      })
      return
    }

    // 检查是否已存在（不区分大小写）
    if (tags.some(tag => tag.toLowerCase() === trimmedValue)) {
      toast({
        title: '提示',
        description: '标签已存在',
        variant: 'default'
      })
      return
    }

    // 添加标签
    onTagsChange([...tags, trimmedValue])
  }

  /**
   * 删除标签
   */
  const removeTag = (index) => {
    onTagsChange(tags.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      {/* 已添加的标签 */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-md text-sm"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="ml-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                aria-label={`删除标签 ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 标签输入框 */}
      {tags.length < maxTags && (
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="输入标签，按 Enter 或逗号添加"
          className="h-11"
          maxLength={maxTagLength}
        />
      )}

      {/* 提示信息 */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        已添加 {tags.length} / {maxTags} 个标签，每个标签最多 {maxTagLength} 个字符
      </p>
    </div>
  )
}
