import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * 高亮文本中的关键词
 * @param {string} text - 原始文本
 * @param {string} keyword - 搜索关键词
 * @returns {Array} 包含文本和标记的数组，用于渲染
 */
export function highlightKeyword(text, keyword) {
  if (!text || !keyword || keyword.trim() === '') {
    return [{ type: 'text', content: text }]
  }

  const normalizedText = text
  const normalizedKeyword = keyword.trim()
  const regex = new RegExp(`(${normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = []
  let lastIndex = 0
  let match

  while ((match = regex.exec(normalizedText)) !== null) {
    // 添加匹配前的文本
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: normalizedText.substring(lastIndex, match.index)
      })
    }
    // 添加高亮的文本
    parts.push({
      type: 'highlight',
      content: match[0]
    })
    lastIndex = regex.lastIndex
  }

  // 添加剩余的文本
  if (lastIndex < normalizedText.length) {
    parts.push({
      type: 'text',
      content: normalizedText.substring(lastIndex)
    })
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: text }]
}

