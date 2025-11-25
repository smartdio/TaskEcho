'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Settings, LogOut, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const isStatsPage = pathname === '/stats'

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 md:h-[68px] lg:h-20 items-center justify-between px-4 md:px-5 lg:px-6">
        {/* Logo/标题 */}
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-lg md:text-xl lg:text-2xl font-bold text-foreground">
            TaskEcho
          </span>
        </Link>

        {/* 右侧操作按钮 */}
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* 用户信息 */}
          {user && (
            <span className="hidden sm:inline text-sm text-gray-600 dark:text-gray-400">
              {user.username}
            </span>
          )}

          {/* 统计图标 */}
          <Link href="/stats">
            <Button
              variant="ghost"
              size="icon"
              aria-label="统计"
              className={cn(
                isStatsPage && 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              )}
            >
              <BarChart3 className="h-5 w-5 md:h-6 md:w-6" />
            </Button>
          </Link>

          {/* 设置图标 */}
          <Link href="/settings">
            <Button variant="ghost" size="icon" aria-label="设置">
              <Settings className="h-5 w-5 md:h-6 md:w-6" />
            </Button>
          </Link>

          {/* 登出按钮 */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleLogout}
            aria-label="登出"
          >
            <LogOut className="h-5 w-5 md:h-6 md:w-6" />
          </Button>

          {/* 主题切换按钮 */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
