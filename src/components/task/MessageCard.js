'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useTheme } from 'next-themes'
import { useState, useEffect } from 'react'
import { Copy, Check, User, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useToast as useShadcnToast } from '@/components/ui/use-toast'

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
 * 代码块组件（带复制功能）
 */
function CodeBlock({ language, children, ...props }) {
  const { theme } = useTheme()
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { toast } = useShadcnToast()

  useEffect(() => {
    setMounted(true)
  }, [])

  const codeString = String(children).replace(/\n$/, '')
  // 默认使用浅色主题，避免hydration问题
  const style = mounted && theme === 'dark' ? vscDarkPlus : vs

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeString)
      setCopied(true)
      toast({
        title: '已复制',
        description: '代码已复制到剪贴板',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('复制失败:', err)
      toast({
        title: '复制失败',
        description: '无法复制代码到剪贴板',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="relative group">
      <div className="absolute top-2 right-2 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="复制代码"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={style}
        showLineNumbers={false}
        customStyle={{
          borderRadius: '8px',
          padding: '16px',
          fontSize: '14px',
          margin: '0',
        }}
        {...props}
      >
        {codeString}
      </SyntaxHighlighter>
    </div>
  )
}

/**
 * 消息卡片组件
 */
export function MessageCard({ message }) {
  const { role, content, created_at, session_id } = message || {}
  const isUser = role === 'user'

  return (
    <div
      className={cn(
        'mb-4 md:mb-5 lg:mb-6',
        isUser ? 'flex justify-end' : 'flex justify-start'
      )}
    >
      <div
        className={cn(
          'w-[95%] md:w-[85%] lg:w-[80%] rounded-lg md:rounded-xl p-3 md:p-4 lg:p-5 shadow-sm',
          isUser
            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
            : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
        )}
      >
        {/* 角色标识 */}
        <div className="flex items-center gap-2 mb-2 md:mb-3">
          {isUser ? (
            <User className="h-4 w-4 md:h-5 md:w-5 text-gray-700 dark:text-gray-300 shrink-0" aria-hidden="true" />
          ) : (
            <Bot className="h-4 w-4 md:h-5 md:w-5 text-gray-700 dark:text-gray-300 shrink-0" aria-hidden="true" />
          )}
          <span className="text-sm md:text-base font-medium text-gray-700 dark:text-gray-300">
            {isUser ? '用户' : 'AI'}
          </span>
        </div>

        {/* 消息内容（Markdown 渲染） */}
        <div className="prose prose-sm md:prose-base lg:prose-lg dark:prose-invert max-w-none mb-2 md:mb-3">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '')
                const language = match ? match[1] : ''
                return !inline && language ? (
                  <CodeBlock language={language} {...props}>
                    {children}
                  </CodeBlock>
                ) : (
                  <code
                    className={cn(
                      'px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-sm font-mono',
                      className
                    )}
                    {...props}
                  >
                    {children}
                  </code>
                )
              },
              h1: ({ node, ...props }) => (
                <h1 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4 mt-4 md:mt-5" {...props} />
              ),
              h2: ({ node, ...props }) => (
                <h2 className="text-xl md:text-2xl font-bold mb-2 md:mb-3 mt-3 md:mt-4" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 className="text-lg md:text-xl font-semibold mb-2 mt-3" {...props} />
              ),
              p: ({ node, ...props }) => (
                <p className="mb-2 md:mb-3 text-gray-900 dark:text-gray-100" {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul className="list-disc list-inside mb-2 md:mb-3 space-y-1" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="list-decimal list-inside mb-2 md:mb-3 space-y-1" {...props} />
              ),
              a: ({ node, ...props }) => (
                <a
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  {...props}
                />
              ),
              blockquote: ({ node, ...props }) => (
                <blockquote
                  className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-2 md:my-3 italic"
                  {...props}
                />
              ),
              table: ({ node, ...props }) => (
                <div className="overflow-x-auto my-2 md:my-3">
                  <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600" {...props} />
                </div>
              ),
              th: ({ node, ...props }) => (
                <th className="border border-gray-300 dark:border-gray-600 px-2 md:px-4 py-2 bg-gray-100 dark:bg-gray-700 font-semibold" {...props} />
              ),
              td: ({ node, ...props }) => (
                <td className="border border-gray-300 dark:border-gray-600 px-2 md:px-4 py-2" {...props} />
              ),
            }}
          >
            {content || ''}
          </ReactMarkdown>
        </div>

        {/* 时间戳和会话ID */}
        <div className="mt-2 md:mt-3">
          {created_at && (
            <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
              {formatDateTime(created_at)}
            </div>
          )}
          {session_id && (
            <div className="text-xs md:text-sm text-gray-400 dark:text-gray-500 font-mono mt-1 md:mt-1.5 break-all">
              {session_id}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
