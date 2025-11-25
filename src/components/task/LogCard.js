'use client'

/**
 * 格式化时间显示
 */
function formatDateTime(dateString) {
  if (!dateString) return ''

  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * 日志卡片组件
 */
export function LogCard({ log }) {
  const { content, created_at } = log || {}

  return (
    <div className="mb-2 md:mb-3 p-2 md:p-3 lg:p-4 bg-gray-50 dark:bg-gray-800 border-l-4 border-gray-300 dark:border-gray-600 rounded-r-md">
      {/* 时间戳 */}
      {created_at && (
        <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-1 md:mb-2 font-mono">
          {formatDateTime(created_at)}
        </div>
      )}

      {/* 日志内容 */}
      <pre className="text-sm md:text-base text-gray-900 dark:text-gray-100 font-mono whitespace-pre-wrap break-words">
        {content || ''}
      </pre>
    </div>
  )
}
