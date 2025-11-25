'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * 状态过滤组件
 * @param {Object} props
 * @param {string} props.selectedStatus - 选中的状态
 * @param {Function} props.onStatusChange - 状态变化回调
 * @param {Function} props.onClear - 清除过滤回调
 */
export function StatusFilter({ selectedStatus = 'all', onStatusChange, onClear }) {
  const statuses = [
    { value: 'all', label: '全部', className: 'bg-gray-500 hover:bg-gray-600' },
    { value: 'pending', label: 'Pending', className: 'bg-yellow-500 hover:bg-yellow-600' },
    { value: 'done', label: 'Done', className: 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600' },
    { value: 'error', label: 'Error', className: 'bg-red-500 hover:bg-red-600' }
  ]

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
      {/* 状态按钮组 */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        <span className="text-sm md:text-base text-gray-600 dark:text-gray-400 mr-2">
          状态过滤:
        </span>
        {statuses.map((status) => (
          <Button
            key={status.value}
            variant={selectedStatus === status.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onStatusChange(status.value)}
            className={cn(
              'h-9 md:h-10 px-3 md:px-4 text-xs md:text-sm font-medium transition-colors',
              selectedStatus === status.value
                ? status.className
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            )}
            aria-label={`过滤状态 ${status.label}`}
            aria-pressed={selectedStatus === status.value}
          >
            {status.label}
          </Button>
        ))}
      </div>

      {/* 清除过滤按钮 */}
      {selectedStatus !== 'all' && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          className="h-9 md:h-10 px-3 md:px-4 text-xs md:text-sm"
          aria-label="清除过滤"
        >
          清除过滤
        </Button>
      )}
    </div>
  )
}
