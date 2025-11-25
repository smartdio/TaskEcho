'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 分页组件
 * @param {Object} props
 * @param {number} props.page - 当前页码
 * @param {number} props.totalPages - 总页数
 * @param {Function} props.onPageChange - 页码改变回调
 */
export function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) {
    return null
  }

  const handlePrev = () => {
    if (page > 1) {
      onPageChange(page - 1)
    }
  }

  const handleNext = () => {
    if (page < totalPages) {
      onPageChange(page + 1)
    }
  }

  const handlePageClick = (targetPage) => {
    if (targetPage >= 1 && targetPage <= totalPages && targetPage !== page) {
      onPageChange(targetPage)
    }
  }

  // 生成页码按钮数组
  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5 // 最多显示5个页码按钮

    if (totalPages <= maxVisible) {
      // 如果总页数少于等于5，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // 否则显示当前页附近的页码
      let start = Math.max(1, page - Math.floor(maxVisible / 2))
      let end = Math.min(totalPages, start + maxVisible - 1)

      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1)
      }

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
    }

    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className="flex items-center justify-center gap-2 mt-6 md:mt-8">
      {/* 上一页按钮 */}
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrev}
        disabled={page === 1}
        className="h-9 md:h-10 px-3 md:px-4"
        aria-label="上一页"
      >
        <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
        <span className="hidden sm:inline ml-1">上一页</span>
      </Button>

      {/* 页码按钮 */}
      <div className="flex items-center gap-1 md:gap-2">
        {pageNumbers.map((pageNum) => (
          <Button
            key={pageNum}
            variant={pageNum === page ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePageClick(pageNum)}
            className={cn(
              'h-9 md:h-10 w-9 md:w-10 p-0',
              pageNum === page && 'bg-blue-600 text-white hover:bg-blue-700'
            )}
            aria-label={`第${pageNum}页`}
            aria-current={pageNum === page ? 'page' : undefined}
          >
            {pageNum}
          </Button>
        ))}
      </div>

      {/* 下一页按钮 */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleNext}
        disabled={page === totalPages}
        className="h-9 md:h-10 px-3 md:px-4"
        aria-label="下一页"
      >
        <span className="hidden sm:inline mr-1">下一页</span>
        <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
      </Button>

      {/* 页码信息 */}
      <div className="hidden md:flex items-center ml-4 text-sm text-gray-600 dark:text-gray-400">
        第 {page} / {totalPages} 页
      </div>
    </div>
  )
}
