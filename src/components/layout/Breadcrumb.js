'use client'

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Breadcrumb({ items = [] }) {
  return (
    <nav
      className="flex items-center space-x-2 py-3 md:py-4 lg:py-5 text-sm md:text-base"
      aria-label="面包屑导航"
    >
      {/* 首页链接 */}
      <Link
        href="/"
        className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4 mr-1" />
        <span>首页</span>
      </Link>

      {/* 动态路径项 */}
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        const hasHref = item.href !== undefined && item.href !== null

        return (
          <div key={item.href || index} className="flex items-center space-x-2">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            {isLast || !hasHref ? (
              <span className={cn(
                "text-foreground",
                isLast && "font-medium"
              )} aria-current={isLast ? "page" : undefined}>
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}
