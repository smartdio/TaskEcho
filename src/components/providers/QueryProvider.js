'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

/**
 * React Query Provider 组件
 * 配置全局的缓存和轮询策略
 */
export function QueryProvider({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30000, // 30秒内认为数据是新鲜的
        gcTime: 300000, // 5分钟内保留缓存（原cacheTime）
        refetchOnWindowFocus: true, // 窗口聚焦时重新获取
        refetchOnReconnect: true, // 网络重连时重新获取
        retry: 3, // 失败重试3次
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // 指数退避
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
