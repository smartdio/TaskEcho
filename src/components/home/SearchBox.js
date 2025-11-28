'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const DEBOUNCE_DELAY = 300 // 防抖延迟300ms

/**
 * 搜索框组件
 * @param {Object} props
 * @param {string} props.value - 搜索关键词
 * @param {Function} props.onChange - 搜索关键词改变回调（防抖后触发）
 * @param {string} props.placeholder - 占位符文本
 * @param {boolean} props.disabled - 是否禁用
 */
export function SearchBox({ 
  value = '', 
  onChange, 
  placeholder = '搜索项目名称...',
  disabled = false 
}) {
  const [inputValue, setInputValue] = useState(value || '')
  const debounceTimerRef = useRef(null)

  // 当外部value改变时，同步内部状态（例如清除搜索时）
  useEffect(() => {
    setInputValue(value || '')
  }, [value])

  // 防抖处理
  useEffect(() => {
    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // 设置新的定时器
    debounceTimerRef.current = setTimeout(() => {
      if (onChange) {
        onChange(inputValue.trim())
      }
    }, DEBOUNCE_DELAY)

    // 清理函数
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [inputValue, onChange])

  // 处理输入变化
  const handleInputChange = (e) => {
    setInputValue(e.target.value)
  }

  // 处理清除按钮点击
  const handleClear = () => {
    setInputValue('')
    // 立即触发onChange，不需要等待防抖
    if (onChange) {
      onChange('')
    }
  }

  const hasValue = inputValue.trim().length > 0

  return (
    <div className="relative mb-4 md:mb-5 lg:mb-6">
      <div className="relative">
        {/* 搜索图标 */}
        <div className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <Search 
            className={cn(
              'h-5 w-5 md:h-5 md:w-5 lg:h-6 lg:w-6',
              'text-gray-400 dark:text-gray-500',
              disabled && 'opacity-50'
            )}
            aria-hidden="true"
          />
        </div>

        {/* 输入框 */}
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'h-11 md:h-11 lg:h-11',
            'pl-10 md:pl-11 lg:pl-12',
            hasValue && 'pr-10 md:pr-11 lg:pr-12',
            'text-base md:text-base lg:text-base',
            'bg-white dark:bg-gray-800',
            'border-gray-200 dark:border-gray-700',
            'focus-visible:ring-blue-600 dark:focus-visible:ring-blue-400',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          aria-label="搜索项目"
        />

        {/* 清除按钮 */}
        {hasValue && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className={cn(
              'absolute right-1 md:right-1.5 lg:right-2',
              'top-1/2 -translate-y-1/2',
              'h-9 w-9 md:h-9 md:w-9 lg:h-10 lg:w-10',
              'rounded-full',
              'hover:bg-gray-100 dark:hover:bg-gray-700',
              'active:opacity-80',
              'text-gray-400 dark:text-gray-500',
              'hover:text-gray-600 dark:hover:text-gray-400'
            )}
            aria-label="清除搜索"
          >
            <X className="h-4 w-4 md:h-4 md:w-4 lg:h-5 lg:w-5" />
          </Button>
        )}
      </div>
    </div>
  )
}
