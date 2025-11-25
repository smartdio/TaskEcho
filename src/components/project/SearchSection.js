'use client'

import { useState, useCallback, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * 防抖函数
 */
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * 搜索区域组件
 * @param {Object} props
 * @param {string} props.value - 搜索关键词
 * @param {Function} props.onChange - 搜索关键词变化回调
 * @param {string} props.placeholder - 占位符文本
 */
export function SearchSection({ value = '', onChange, placeholder = '输入队列名称进行搜索...' }) {
  const [searchKeyword, setSearchKeyword] = useState(value)

  // 防抖搜索处理
  const debouncedOnChange = useMemo(
    () => debounce((keyword) => {
      onChange?.(keyword)
    }, 300),
    [onChange]
  )

  // 搜索输入处理
  const handleInputChange = useCallback((e) => {
    const keyword = e.target.value
    setSearchKeyword(keyword)
    debouncedOnChange(keyword)
  }, [debouncedOnChange])

  // 清除搜索
  const handleClear = useCallback(() => {
    setSearchKeyword('')
    onChange?.('')
  }, [onChange])

  return (
    <div className="relative mb-4 md:mb-5 lg:mb-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchKeyword}
          onChange={handleInputChange}
          className="pl-10 pr-10 h-11 md:h-12 text-base md:text-base"
          aria-label="搜索任务队列"
        />
        {searchKeyword && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-9 w-9"
            aria-label="清除搜索"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
