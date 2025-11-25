'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Edit, Trash2, Copy, Check, Key } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'

/**
 * API Key 表格行组件（桌面端）
 */
function ApiKeyTableRow({ apiKey, visibleKeys, createdKeys, onEdit, onDelete, onToggleVisibility, onViewKey, formatDateTime }) {
  const { showSuccess } = useToast()
  const [copied, setCopied] = useState(false)
  
  const originalKey = createdKeys.get(apiKey.id)
  const isVisible = visibleKeys.has(apiKey.id)
  const displayKey = isVisible && originalKey ? originalKey : apiKey.key
  
  const handleCopy = async () => {
    if (isVisible && originalKey) {
      try {
        await navigator.clipboard.writeText(originalKey)
        setCopied(true)
        showSuccess('已复制到剪贴板')
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        // 复制失败，忽略
      }
    }
  }
  
  return (
    <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <td className="px-4 py-3 text-sm md:text-base text-gray-900 dark:text-gray-100">
        {apiKey.name}
      </td>
      <td className="px-4 py-3 text-sm md:text-base text-gray-900 dark:text-gray-100">
        <div className="flex items-center gap-2">
          <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono">
            {displayKey}
          </code>
          {originalKey && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleVisibility(apiKey.id)}
              className="h-8 w-8 p-0"
              aria-label={isVisible ? '隐藏' : '显示'}
            >
              {isVisible ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          )}
          {isVisible && originalKey && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 w-8 p-0"
              aria-label="复制"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-sm md:text-base text-gray-600 dark:text-gray-400">
        {apiKey.project_id || (
          <span className="text-gray-400 dark:text-gray-500">未关联</span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        <span
          className={cn(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
            apiKey.is_active
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
          )}
        >
          {apiKey.is_active ? '激活' : '禁用'}
        </span>
      </td>
      <td className="px-4 py-3 text-sm md:text-base text-gray-600 dark:text-gray-400">
        {formatDateTime(apiKey.created_at)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewKey && onViewKey(apiKey)}
            className="h-8 px-3"
            aria-label={`查看 ${apiKey.name}`}
          >
            <Key className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">查看</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(apiKey)}
            className="h-8 px-3"
            aria-label={`编辑 ${apiKey.name}`}
          >
            <Edit className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">编辑</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(apiKey)}
            className="h-8 px-3 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            aria-label={`删除 ${apiKey.name}`}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">删除</span>
          </Button>
        </div>
      </td>
    </tr>
  )
}

/**
 * API Key 卡片组件（移动端和平板端）
 */
function ApiKeyCard({ apiKey, visibleKeys, createdKeys, onEdit, onDelete, onToggleVisibility, onViewKey, formatDateTime }) {
  const { showSuccess } = useToast()
  const [copied, setCopied] = useState(false)
  
  const originalKey = createdKeys.get(apiKey.id)
  const isVisible = visibleKeys.has(apiKey.id)
  const displayKey = isVisible && originalKey ? originalKey : apiKey.key
  
  const handleCopy = async () => {
    if (isVisible && originalKey) {
      try {
        await navigator.clipboard.writeText(originalKey)
        setCopied(true)
        showSuccess('已复制到剪贴板')
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        // 复制失败，忽略
      }
    }
  }
  
  return (
    <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors hover:shadow-md">
      <CardContent className="p-4 md:p-5">
        <div className="space-y-3 md:space-y-4">
          {/* 名称和状态 */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 flex-1">
              {apiKey.name}
            </h3>
            <span
              className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                apiKey.is_active
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
              )}
            >
              {apiKey.is_active ? '激活' : '禁用'}
            </span>
          </div>
          
          {/* Key 值 */}
          <div>
            <label className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1.5 block font-medium">
              Key 值
            </label>
            <div className="flex items-start gap-2">
              <code className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-md text-xs md:text-sm font-mono break-all border border-gray-200 dark:border-gray-700">
                {displayKey}
              </code>
              {originalKey && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleVisibility(apiKey.id)}
                    className="h-9 w-9 p-0 flex-shrink-0"
                    aria-label={isVisible ? '隐藏' : '显示'}
                  >
                    {isVisible ? (
                      <EyeOff className="h-4 w-4 md:h-5 md:w-5" />
                    ) : (
                      <Eye className="h-4 w-4 md:h-5 md:w-5" />
                    )}
                  </Button>
                  {isVisible && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="h-9 w-9 p-0 flex-shrink-0"
                      aria-label="复制"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4 md:h-5 md:w-5" />
                      )}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* 关联项目和创建时间 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div>
              <label className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1 block font-medium">
                关联项目
              </label>
              <p className="text-sm md:text-base text-gray-900 dark:text-gray-100">
                {apiKey.project_id || (
                  <span className="text-gray-400 dark:text-gray-500">未关联</span>
                )}
              </p>
            </div>
            <div>
              <label className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1 block font-medium">
                创建时间
              </label>
              <p className="text-sm md:text-base text-gray-900 dark:text-gray-100">
                {formatDateTime(apiKey.created_at)}
              </p>
            </div>
          </div>
          
          {/* 操作按钮 */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewKey && onViewKey(apiKey)}
              className="flex-1 h-11 active:opacity-80"
              aria-label={`查看 ${apiKey.name}`}
            >
              <Key className="h-4 w-4 md:h-5 md:w-5 mr-1.5" />
              <span className="text-sm md:text-base">查看</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(apiKey)}
              className="flex-1 h-11 active:opacity-80"
              aria-label={`编辑 ${apiKey.name}`}
            >
              <Edit className="h-4 w-4 md:h-5 md:w-5 mr-1.5" />
              <span className="text-sm md:text-base">编辑</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(apiKey)}
              className="flex-1 h-11 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border-red-200 dark:border-red-800 active:opacity-80"
              aria-label={`删除 ${apiKey.name}`}
            >
              <Trash2 className="h-4 w-4 md:h-5 md:w-5 mr-1.5" />
              <span className="text-sm md:text-base">删除</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 空状态组件
 */
function EmptyState({ onAdd }) {
  return (
    <Card className="border-dashed border-2 border-gray-300 dark:border-gray-600">
      <CardContent className="p-8 md:p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
          <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            暂无 API Key
          </h3>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-6">
            创建您的第一个 API Key 以开始使用
          </p>
          <Button
            onClick={onAdd}
            className="h-11 px-6"
            aria-label="添加第一个 API Key"
          >
            添加第一个 API Key
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * API Key 列表主组件
 */
export function ApiKeyList({ apiKeys, visibleKeys, createdKeys, onEdit, onDelete, onToggleVisibility, onViewKey, formatDateTime }) {
  // 如果没有 API Key，显示空状态
  if (apiKeys.length === 0) {
    return <EmptyState onAdd={() => onEdit(null)} />
  }
  
  return (
    <div>
      {/* 桌面端：表格布局（lg及以上，>= 1024px） */}
      <div className="hidden lg:block overflow-x-auto">
        <Card className="border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                    名称
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                    Key 值
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                    关联项目
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {apiKeys.map((apiKey) => (
                  <ApiKeyTableRow
                    key={apiKey.id}
                    apiKey={apiKey}
                    visibleKeys={visibleKeys}
                    createdKeys={createdKeys}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggleVisibility={onToggleVisibility}
                    onViewKey={onViewKey}
                    formatDateTime={formatDateTime}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      
      {/* 移动端和平板端：卡片布局（< 1024px） */}
      <div className="lg:hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {apiKeys.map((apiKey) => (
            <ApiKeyCard
              key={apiKey.id}
              apiKey={apiKey}
              visibleKeys={visibleKeys}
              createdKeys={createdKeys}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleVisibility={onToggleVisibility}
              onViewKey={onViewKey}
              formatDateTime={formatDateTime}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
