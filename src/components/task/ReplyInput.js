'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 回复输入组件
 */
export function ReplyInput({ onSend, disabled = false }) {
  const [content, setContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const textareaRef = useRef(null)

  // 自动调整输入框高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        300
      )}px`
    }
  }, [content])

  const handleSend = async () => {
    const trimmedContent = content.trim()
    if (!trimmedContent || isSending || disabled) return

    setIsSending(true)

    try {
      // 创建本地消息对象
      const localMessage = {
        id: `local_${Date.now()}`,
        role: 'user',
        content: trimmedContent,
        created_at: new Date().toISOString(),
        isLocal: true, // 标识为本地消息
      }

      // 调用回调函数
      await onSend(localMessage)

      // 清空输入框
      setContent('')
    } catch (error) {
      console.error('发送回复失败:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e) => {
    // Ctrl+Enter 或 Cmd+Enter 发送
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  const canSend = content.trim().length > 0 && !isSending && !disabled

  return (
    <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 md:p-5 lg:p-6 shadow-lg">
      <div className="flex flex-col md:flex-row gap-3 md:gap-4 max-w-7xl mx-auto">
        {/* 输入框 */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入回复内容..."
          rows={3}
          disabled={disabled || isSending}
          className={cn(
            'flex-1 min-h-[80px] md:min-h-[100px] max-h-[300px] px-3 md:px-4 py-2 md:py-3',
            'border border-gray-300 dark:border-gray-600 rounded-lg md:rounded-xl',
            'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'resize-none focus:outline-none focus:ring-2 focus:ring-blue-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'text-sm md:text-base'
          )}
        />

        {/* 发送按钮 */}
        <Button
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            'h-11 md:h-12 px-4 md:px-6',
            'flex items-center justify-center gap-2',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          aria-label="发送回复"
        >
          <Send className="h-4 w-4 md:h-5 md:w-5" />
          <span className="hidden sm:inline">发送</span>
        </Button>
      </div>

      {/* 快捷键提示 */}
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
        按 Ctrl+Enter 或 Cmd+Enter 发送
      </div>
    </div>
  )
}
