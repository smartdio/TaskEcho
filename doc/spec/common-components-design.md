# TaskEcho 通用组件设计文档

## 1. 概述

### 1.1 文档目的

本文档详细说明 TaskEcho 系统中通用组件的设计和实现方案，包括顶部导航栏、面包屑导航、页面容器、主题切换、响应式布局等组件的设计规范、实现要点和使用方式。

### 1.2 组件定位

通用组件是系统中所有页面共用的基础组件，提供统一的用户体验和视觉风格。这些组件包括：

- **顶部导航栏（Header）**：所有页面的顶部导航，提供 Logo、设置入口、主题切换
- **面包屑导航（Breadcrumb）**：除首页外的所有页面使用，显示页面层级路径
- **页面容器（Page Container）**：统一的页面内容容器，提供响应式布局和间距
- **主题切换（Theme Toggle）**：深浅色主题切换功能
- **响应式布局（Responsive Layout）**：统一的响应式布局系统

### 1.3 设计原则

1. **一致性**：所有页面使用统一的组件和样式
2. **可复用性**：组件设计通用，易于在不同页面复用
3. **响应式**：支持手机、平板、桌面等多种设备
4. **可访问性**：遵循 WCAG 标准，支持键盘导航和屏幕阅读器
5. **性能优化**：组件轻量，避免不必要的重渲染

### 1.4 技术栈

- **前端框架**：React
- **UI 组件库**：shadcn/ui
- **样式方案**：Tailwind CSS
- **状态管理**：React Hooks（useState, useEffect, useContext）
- **路由**：Next.js App Router
- **主题管理**：next-themes（推荐）或自定义实现

---

## 2. 顶部导航栏（Header）

### 2.1 组件概述

顶部导航栏是所有页面的固定顶部区域，提供应用 Logo、设置入口和主题切换功能。

### 2.2 设计规范

#### 2.2.1 布局结构

```
┌─────────────────────────────────────────────────┐
│  Header (固定顶部)                                │
│  ┌─────────────┐          ┌──────────┐ ┌──────┐ │
│  │ Logo/标题   │          │ 设置图标  │ │主题切换│ │
│  └─────────────┘          └──────────┘ └──────┘ │
│  左侧（Logo）              右侧（操作按钮）        │
└─────────────────────────────────────────────────┘
```

#### 2.2.2 尺寸规范

| 设备类型 | 高度 | Logo 字体大小 | 图标大小 | 内边距 |
|---------|------|--------------|---------|--------|
| 移动端（< 768px） | 64px | 18px | 20px | 16px |
| 平板端（768px - 1024px） | 68px | 20px | 22px | 20px |
| 桌面端（> 1024px） | 72px | 22px | 24px | 24px |

#### 2.2.3 样式规范

**背景色**：
- 浅色模式：`bg-white` 或 `bg-gray-50`
- 深色模式：`bg-gray-900` 或 `bg-gray-800`

**阴影**：
- 浅色模式：`shadow-sm`（轻微阴影）
- 深色模式：`shadow-lg`（更明显的阴影）

**边框**：
- 底部边框：`border-b border-gray-200`（浅色）或 `border-gray-700`（深色）

**文字颜色**：
- Logo/标题：`text-gray-900`（浅色）或 `text-white`（深色）
- 图标：`text-gray-600`（浅色）或 `text-gray-300`（深色）

**悬停效果**：
- Logo：无悬停效果（或轻微透明度变化）
- 设置图标：`hover:text-gray-900`（浅色）或 `hover:text-white`（深色）
- 主题切换按钮：`hover:bg-gray-100`（浅色）或 `hover:bg-gray-700`（深色）

### 2.3 功能实现

#### 2.3.1 组件结构

```javascript
// src/components/layout/Header.js
'use client'

import Link from 'next/link'
import { useTheme } from 'next-themes'
import { Settings, Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Header() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // 防止 SSR 和客户端渲染不一致
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="container mx-auto flex h-16 md:h-18 lg:h-20 items-center justify-between px-4 md:px-6 lg:px-8">
        {/* Logo/标题 */}
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-lg md:text-xl lg:text-2xl font-bold">
            TaskEcho
          </span>
        </Link>

        {/* 右侧操作按钮 */}
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* 设置图标 */}
          <Link href="/settings">
            <Button variant="ghost" size="icon" aria-label="设置">
              <Settings className="h-5 w-5 md:h-6 md:w-6" />
            </Button>
          </Link>

          {/* 主题切换按钮 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="切换主题"
          >
            {mounted && theme === 'dark' ? (
              <Sun className="h-5 w-5 md:h-6 md:w-6" />
            ) : (
              <Moon className="h-5 w-5 md:h-6 md:w-6" />
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}
```

#### 2.3.2 响应式实现

使用 Tailwind CSS 响应式类：

```javascript
// 高度响应式
className="h-16 md:h-18 lg:h-20"

// 内边距响应式
className="px-4 md:px-6 lg:px-8"

// 字体大小响应式
className="text-lg md:text-xl lg:text-2xl"

// 图标大小响应式
className="h-5 w-5 md:h-6 md:w-6"
```

#### 2.3.3 主题切换实现

**方案一：使用 next-themes（推荐）**

```javascript
// app/layout.js
import { ThemeProvider } from 'next-themes'

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

**方案二：自定义实现**

```javascript
// src/hooks/useTheme.js
'use client'

import { useState, useEffect } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('theme') || 'system'
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    const finalTheme = savedTheme === 'system' ? systemTheme : savedTheme
    setTheme(finalTheme)
    document.documentElement.classList.toggle('dark', finalTheme === 'dark')
  }, [])

  const updateTheme = (newTheme) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    const isDark = newTheme === 'dark' || (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', isDark)
  }

  return { theme, setTheme: updateTheme, mounted }
}
```

### 2.4 交互功能

1. **Logo 点击**：跳转到首页 `/`
2. **设置图标点击**：跳转到设置页面 `/settings`
3. **主题切换按钮点击**：切换深浅色主题，保存到 localStorage
4. **键盘导航**：支持 Tab 键切换焦点，Enter 键触发操作

### 2.5 无障碍性（A11y）

- 所有按钮添加 `aria-label` 属性
- 支持键盘导航（Tab、Enter、Space）
- 焦点可见性：使用 `focus-visible` 样式
- 语义化 HTML：使用 `<header>` 标签

---

## 3. 面包屑导航（Breadcrumb）

### 3.1 组件概述

面包屑导航显示当前页面在应用中的层级路径，帮助用户理解页面位置和快速导航到上级页面。

### 3.2 设计规范

#### 3.2.1 布局结构

```
┌─────────────────────────────────────────────────┐
│  Breadcrumb                                      │
│  首页 > 项目名称 > 队列名称 > 任务标题            │
│  [可点击] [可点击] [可点击] [当前页]              │
└─────────────────────────────────────────────────┘
```

#### 3.2.2 尺寸规范

| 设备类型 | 字体大小 | 高度 | 内边距 | 分隔符 |
|---------|---------|------|--------|--------|
| 移动端（< 768px） | 14px | 40px | 12px | `/` 或 `>` |
| 平板端（768px - 1024px） | 15px | 44px | 16px | `>` |
| 桌面端（> 1024px） | 16px | 48px | 20px | `>` |

#### 3.2.3 样式规范

**容器样式**：
- 背景色：透明或轻微背景色
- 内边距：`py-3 md:py-4 lg:py-5`
- 边框：无边框或底部轻微边框

**链接样式**：
- 默认：`text-gray-600`（浅色）或 `text-gray-400`（深色）
- 悬停：`hover:text-gray-900`（浅色）或 `hover:text-white`（深色）
- 当前页：`text-gray-900`（浅色）或 `text-white`（深色），不可点击

**分隔符样式**：
- 颜色：`text-gray-400`（浅色）或 `text-gray-600`（深色）
- 间距：`mx-2`（左右各 8px）

### 3.3 功能实现

#### 3.3.1 组件结构

```javascript
// src/components/layout/Breadcrumb.js
'use client'

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Breadcrumb({ items }) {
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

        return (
          <div key={item.href || index} className="flex items-center space-x-2">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            {isLast ? (
              <span className="text-foreground font-medium">{item.label}</span>
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
```

#### 3.3.2 使用示例

```javascript
// 项目详情页
<Breadcrumb
  items={[
    { label: projectName, href: `/project/${projectId}` }
  ]}
/>

// 任务队列详情页
<Breadcrumb
  items={[
    { label: projectName, href: `/project/${projectId}` },
    { label: queueName, href: `/project/${projectId}/queue/${queueId}` }
  ]}
/>

// 任务详情页
<Breadcrumb
  items={[
    { label: projectName, href: `/project/${projectId}` },
    { label: queueName, href: `/project/${projectId}/queue/${queueId}` },
    { label: taskTitle }
  ]}
/>
```

#### 3.3.3 响应式优化

移动端可以隐藏中间层级，只显示首页和当前页：

```javascript
// 移动端简化显示
const displayItems = isMobile
  ? items.slice(-1) // 只显示最后一项
  : items

// 或者使用折叠菜单
const [isExpanded, setIsExpanded] = useState(false)
```

### 3.4 交互功能

1. **链接点击**：跳转到对应页面
2. **当前页**：不可点击，显示为当前页面
3. **键盘导航**：支持 Tab 键切换焦点，Enter 键触发跳转

### 3.5 无障碍性（A11y）

- 使用 `<nav>` 标签和 `aria-label` 属性
- 当前页使用 `aria-current="page"` 属性
- 支持键盘导航
- 语义化 HTML 结构

---

## 4. 页面容器（Page Container）

### 4.1 组件概述

页面容器提供统一的页面内容区域，包括响应式布局、最大宽度限制、统一的内边距和间距。

### 4.2 设计规范

#### 4.2.1 布局结构

```
┌─────────────────────────────────────────────────┐
│  Page Container                                  │
│  ┌───────────────────────────────────────────┐  │
│  │  Max Width: 1280px (桌面端)                │  │
│  │  Padding: 16px (移动端) / 24px (桌面端)    │  │
│  │                                            │  │
│  │  [页面内容]                                 │  │
│  │                                            │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

#### 4.2.2 尺寸规范

| 设备类型 | 最大宽度 | 内边距 | 外边距 |
|---------|---------|--------|--------|
| 移动端（< 768px） | 100% | 16px | 0 |
| 平板端（768px - 1024px） | 100% | 20px | 0 |
| 桌面端（> 1024px） | 1280px | 24px | 0（居中） |

#### 4.2.3 样式规范

**容器样式**：
- 最大宽度：`max-w-7xl`（1280px）
- 内边距：`px-4 md:px-5 lg:px-6`
- 外边距：`mx-auto`（桌面端居中）
- 背景色：透明或页面背景色

### 4.3 功能实现

#### 4.3.1 基础组件

```javascript
// src/components/layout/PageContainer.js
import { cn } from '@/lib/utils'

export default function PageContainer({
  children,
  className,
  maxWidth = 'max-w-7xl',
  padding = 'px-4 md:px-5 lg:px-6',
}) {
  return (
    <div className={cn('mx-auto w-full', maxWidth, padding, className)}>
      {children}
    </div>
  )
}
```

#### 4.3.2 使用示例

```javascript
// 基础使用
<PageContainer>
  <h1>页面标题</h1>
  <p>页面内容</p>
</PageContainer>

// 自定义样式
<PageContainer
  className="py-8"
  maxWidth="max-w-5xl"
>
  <div>自定义内容</div>
</PageContainer>
```

#### 4.3.3 变体组件

```javascript
// 带页头的容器
export function PageContainerWithHeader({ title, children, actions }) {
  return (
    <PageContainer className="py-6 md:py-8 lg:py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">{title}</h1>
        {actions && <div className="flex items-center space-x-2">{actions}</div>}
      </div>
      {children}
    </PageContainer>
  )
}

// 带面包屑的容器
export function PageContainerWithBreadcrumb({ breadcrumb, children }) {
  return (
    <>
      <PageContainer>
        {breadcrumb}
      </PageContainer>
      <PageContainer>
        {children}
      </PageContainer>
    </>
  )
}
```

### 4.4 响应式实现

使用 Tailwind CSS 响应式类：

```javascript
// 响应式内边距
className="px-4 md:px-5 lg:px-6"

// 响应式外边距
className="py-4 md:py-6 lg:py-8"

// 响应式最大宽度
className="max-w-full md:max-w-2xl lg:max-w-7xl"
```

---

## 5. 主题切换（Theme Toggle）

### 5.1 组件概述

主题切换组件提供深浅色主题的切换功能，支持系统主题检测和手动切换。

### 5.2 设计规范

#### 5.2.1 组件样式

- **按钮类型**：图标按钮（Icon Button）
- **图标**：太阳图标（浅色模式）和月亮图标（深色模式）
- **尺寸**：与 Header 中的图标按钮一致
- **动画**：平滑过渡动画

#### 5.2.2 主题选项

1. **浅色模式（Light）**：白色背景，深色文字
2. **深色模式（Dark）**：深色背景，浅色文字
3. **系统模式（System）**：跟随系统设置（默认）

### 5.3 功能实现

#### 5.3.1 使用 next-themes（推荐）

```javascript
// app/layout.js
import { ThemeProvider } from 'next-themes'

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

// src/components/theme/ThemeToggle.js
'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Sun className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="切换主题">
          {theme === 'dark' ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          <span>浅色</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          <span>深色</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          <span>跟随系统</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

#### 5.3.2 Tailwind CSS 配置

```javascript
// tailwind.config.js
module.exports = {
  darkMode: ['class'], // 使用 class 策略
  theme: {
    extend: {
      colors: {
        // 浅色模式颜色
        background: 'hsl(0, 0%, 100%)',
        foreground: 'hsl(222.2, 84%, 4.9%)',
        // 深色模式颜色（通过 dark: 前缀覆盖）
      },
    },
  },
}
```

#### 5.3.3 CSS 变量配置

```css
/* app/globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  /* 其他颜色变量 */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* 其他深色模式颜色变量 */
}
```

### 5.4 交互功能

1. **点击切换**：在浅色、深色、系统模式之间切换
2. **下拉菜单**：提供三种模式选择（可选）
3. **系统检测**：自动检测系统主题偏好
4. **持久化**：保存用户选择到 localStorage

### 5.5 无障碍性（A11y）

- 按钮添加 `aria-label` 属性
- 支持键盘导航（Tab、Enter、Space）
- 提供视觉反馈（图标变化）

---

## 6. 响应式布局（Responsive Layout）

### 6.1 概述

响应式布局系统提供统一的断点和布局策略，确保应用在不同设备上都能良好显示。

### 6.2 断点设计

#### 6.2.1 Tailwind CSS 默认断点

| 断点 | 最小宽度 | 设备类型 | 用途 |
|------|---------|---------|------|
| `sm` | 640px | 大屏手机 | 小屏幕优化 |
| `md` | 768px | 平板 | 平板布局 |
| `lg` | 1024px | 小桌面 | 桌面布局 |
| `xl` | 1280px | 大桌面 | 大屏优化 |
| `2xl` | 1536px | 超大屏 | 超大屏优化 |

#### 6.2.2 自定义断点（可选）

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
  },
}
```

### 6.3 布局策略

#### 6.3.1 移动优先（Mobile First）

```javascript
// ✅ 推荐：移动优先
<div className="text-sm md:text-base lg:text-lg">
  {/* 默认移动端样式，然后逐步增强 */}
</div>

// ❌ 不推荐：桌面优先
<div className="text-lg lg:text-sm">
  {/* 先写桌面样式，再覆盖移动端 */}
</div>
```

#### 6.3.2 常见布局模式

**单列布局**：
```javascript
<div className="flex flex-col space-y-4">
  {/* 移动端和桌面端都是单列 */}
</div>
```

**响应式网格**：
```javascript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 移动端1列，平板2列，桌面3列 */}
</div>
```

**响应式 Flex**：
```javascript
<div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
  {/* 移动端垂直，桌面端水平 */}
</div>
```

### 6.4 组件响应式实现

#### 6.4.1 Header 响应式

```javascript
<header className="h-16 md:h-18 lg:h-20">
  <div className="px-4 md:px-6 lg:px-8">
    {/* 内容 */}
  </div>
</header>
```

#### 6.4.2 卡片响应式

```javascript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
  {items.map(item => (
    <Card key={item.id} className="w-full">
      {/* 卡片内容 */}
    </Card>
  ))}
</div>
```

#### 6.4.3 文本响应式

```javascript
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
  标题
</h1>

<p className="text-sm md:text-base lg:text-lg">
  正文内容
</p>
```

### 6.5 性能优化

#### 6.5.1 图片响应式

```javascript
<Image
  src="/image.jpg"
  width={800}
  height={600}
  className="w-full h-auto"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  alt="描述"
/>
```

#### 6.5.2 条件渲染

```javascript
// 使用 CSS 隐藏/显示（推荐）
<div className="hidden md:block">
  {/* 桌面端显示 */}
</div>

<div className="block md:hidden">
  {/* 移动端显示 */}
</div>

// 使用 JavaScript 条件渲染（性能考虑）
const isMobile = useMediaQuery('(max-width: 768px)')
{isMobile ? <MobileComponent /> : <DesktopComponent />}
```

---

## 7. 组件组合使用

### 7.1 完整页面布局示例

```javascript
// app/page.js (首页)
import Header from '@/components/layout/Header'
import PageContainer from '@/components/layout/PageContainer'
import StatsSection from '@/components/home/StatsSection'
import ProjectList from '@/components/home/ProjectList'

export default function HomePage() {
  return (
    <>
      <Header />
      <PageContainer>
        <StatsSection />
        <ProjectList />
      </PageContainer>
    </>
  )
}

// app/project/[projectId]/page.js (项目详情页)
import Header from '@/components/layout/Header'
import Breadcrumb from '@/components/layout/Breadcrumb'
import PageContainer from '@/components/layout/PageContainer'
import QueueList from '@/components/project/QueueList'

export default function ProjectDetailPage({ params }) {
  const { projectId } = params
  // 获取项目数据...

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumb
          items={[
            { label: projectName, href: `/project/${projectId}` }
          ]}
        />
        <QueueList projectId={projectId} />
      </PageContainer>
    </>
  )
}
```

### 7.2 布局组件封装

```javascript
// src/components/layout/AppLayout.js
import Header from './Header'
import PageContainer from './PageContainer'

export default function AppLayout({
  children,
  breadcrumb,
  showHeader = true,
}) {
  return (
    <>
      {showHeader && <Header />}
      <PageContainer>
        {breadcrumb && breadcrumb}
        {children}
      </PageContainer>
    </>
  )
}

// 使用
<AppLayout
  breadcrumb={<Breadcrumb items={items} />}
>
  <div>页面内容</div>
</AppLayout>
```

---

## 8. 样式系统

### 8.1 Tailwind CSS 配置

```javascript
// tailwind.config.js
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,jsx}',
    './src/components/**/*.{js,jsx}',
    './src/app/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // 使用 CSS 变量
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // 其他颜色...
      },
      spacing: {
        // 自定义间距
      },
      borderRadius: {
        // 自定义圆角
      },
    },
  },
  plugins: [],
}
```

### 8.2 CSS 变量定义

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    /* 其他颜色变量... */
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    /* 其他深色模式颜色变量... */
  }
}
```

### 8.3 工具函数

```javascript
// src/lib/utils.js
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
```

---

## 9. 性能优化

### 9.1 组件优化

1. **使用 React.memo**：避免不必要的重渲染
2. **代码分割**：按路由进行代码分割
3. **懒加载**：非关键组件使用懒加载
4. **CSS 优化**：使用 Tailwind CSS 的 purge 功能

### 9.2 主题切换优化

1. **防止闪烁**：使用 `suppressHydrationWarning` 属性
2. **过渡动画**：使用 CSS 过渡而非 JavaScript 动画
3. **持久化**：使用 localStorage 保存用户选择

### 9.3 响应式优化

1. **移动优先**：减少移动端不必要的样式
2. **条件加载**：根据设备类型加载不同资源
3. **图片优化**：使用 Next.js Image 组件

---

## 10. 无障碍性（A11y）

### 10.1 语义化 HTML

- 使用正确的 HTML 标签（`<header>`, `<nav>`, `<main>`）
- 使用 ARIA 属性（`aria-label`, `aria-current`）
- 提供有意义的文本内容

### 10.2 键盘导航

- 所有交互元素支持键盘操作
- 焦点可见性：使用 `focus-visible` 样式
- Tab 顺序合理

### 10.3 屏幕阅读器

- 提供替代文本（`alt` 属性）
- 使用 `aria-label` 描述图标按钮
- 使用 `aria-current` 标记当前页

### 10.4 颜色对比度

- 确保文字和背景颜色对比度符合 WCAG AA 标准（4.5:1）
- 深色模式下也要保证足够的对比度

---

## 11. 测试建议

### 11.1 组件测试

1. **单元测试**：测试组件渲染和交互
2. **快照测试**：确保 UI 一致性
3. **交互测试**：测试用户交互流程

### 11.2 响应式测试

1. **设备测试**：在不同设备上测试
2. **浏览器测试**：在不同浏览器上测试
3. **断点测试**：测试各个断点的表现

### 11.3 主题测试

1. **主题切换测试**：测试主题切换功能
2. **持久化测试**：测试主题选择的保存
3. **系统主题测试**：测试系统主题检测

### 11.4 无障碍性测试

1. **键盘导航测试**：使用键盘操作所有功能
2. **屏幕阅读器测试**：使用屏幕阅读器测试
3. **颜色对比度测试**：使用工具检查对比度

---

## 12. 总结

本文档详细定义了 TaskEcho 系统的通用组件设计和实现方案，包括：

1. **顶部导航栏（Header）**：固定顶部导航，提供 Logo、设置入口、主题切换
2. **面包屑导航（Breadcrumb）**：显示页面层级路径，支持快速导航
3. **页面容器（Page Container）**：统一的页面内容容器，提供响应式布局
4. **主题切换（Theme Toggle）**：深浅色主题切换功能
5. **响应式布局（Responsive Layout）**：统一的响应式布局系统

所有组件遵循以下原则：
- **一致性**：统一的视觉风格和交互方式
- **可复用性**：组件设计通用，易于复用
- **响应式**：支持多种设备
- **可访问性**：遵循 WCAG 标准
- **性能优化**：轻量高效

这些通用组件为整个应用提供了坚实的基础，确保用户体验的一致性和应用的易用性。
