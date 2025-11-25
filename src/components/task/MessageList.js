'use client'

import { useEffect, useRef } from 'react'
import { MessageCard } from './MessageCard'

/**
 * 消息列表组件
 */
export function MessageList({ messages = [] }) {
  const messagesEndRef = useRef(null)

  // 自动滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="text-center py-12 md:py-16 lg:py-20">
        <p className="text-base md:text-lg lg:text-xl text-gray-600 dark:text-gray-400">
          暂无对话消息
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {messages.map((message, index) => (
        <MessageCard key={index} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  )
}
