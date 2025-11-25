# TaskEcho 通用组件使用指南

本文档说明 TaskEcho 系统中通用组件的使用方式，包括顶部导航栏（Header）、面包屑导航（Breadcrumb）、页面容器（Page Container）、主题切换（Theme Toggle）等组件。

## 目录

- [组件概述](#组件概述)
- [Header 组件](#header-组件)
- [Breadcrumb 组件](#breadcrumb-组件)
- [PageContainer 组件](#pagecontainer-组件)
- [ThemeToggle 组件](#themetoggle-组件)
- [使用示例](#使用示例)

---

## 组件概述

通用组件位于 `src/components/` 目录下，包括：

- **Header** (`src/components/layout/Header.js`) - 顶部导航栏
- **Breadcrumb** (`src/components/layout/Breadcrumb.js`) - 面包屑导航
- **PageContainer** (`src/components/layout/PageContainer.js`) - 页面容器
- **ThemeToggle** (`src/components/theme/ThemeToggle.js`) - 主题切换

所有组件都支持响应式设计，适配移动端、平板和桌面端。

---

## Header 组件

### 功能说明

顶部导航栏组件，提供应用 Logo、设置入口和主题切换功能。

### 导入方式

```javascript
import Header from '@/components/layout/Header'
```

### 使用方法

```javascript
export default function Page() {
  return (
    <>
      <Header />
      {/* 页面内容 */}
    </>
  )
}
```

### 组件特性

- **固定顶部**：使用 `sticky top-0` 固定在页面顶部
- **响应式高度**：移动端 64px，平板端 68px，桌面端 72px
- **Logo 链接**：点击 Logo 跳转到首页 `/`
- **设置入口**：点击设置图标跳转到 `/settings`
- **主题切换**：集成 ThemeToggle 组件

### 样式说明

- 背景：`bg-background/95`（支持主题切换）
- 边框：底部边框 `border-b`
- 阴影：轻微阴影效果
- 响应式内边距：移动端 16px，平板端 20px，桌面端 24px

---

## Breadcrumb 组件

### 功能说明

面包屑导航组件，显示当前页面在应用中的层级路径。

### 导入方式

```javascript
import Breadcrumb from '@/components/layout/Breadcrumb'
```

### Props

| 属性名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| items | Array | 否 | 面包屑项数组，默认为空数组 |

### items 数组项结构

```javascript
{
  label: string,  // 显示文本（必填）
  href: string    // 链接地址（可选，最后一项通常不提供）
}
```

### 使用方法

```javascript
// 基础使用
<Breadcrumb />

// 带路径项
<Breadcrumb
  items={[
    { label: '项目名称', href: '/project/test-project' },
    { label: '队列名称', href: '/project/test-project/queue/test-queue' },
    { label: '任务标题' } // 最后一项不提供 href，表示当前页
  ]}
/>
```

### 组件特性

- **自动首页链接**：自动在开头添加首页链接
- **分隔符**：使用 `ChevronRight` 图标作为分隔符
- **当前页标识**：最后一项使用 `aria-current="page"` 标识
- **响应式字体**：移动端 14px，平板端 15px，桌面端 16px
- **响应式间距**：移动端 12px，平板端 16px，桌面端 20px

### 样式说明

- 链接颜色：`text-muted-foreground`（默认），`text-foreground`（悬停）
- 当前页：`text-foreground font-medium`（不可点击）
- 分隔符：`text-muted-foreground`

---

## PageContainer 组件

### 功能说明

页面容器组件，提供统一的页面内容区域，包括响应式布局、最大宽度限制、统一的内边距和间距。

### 导入方式

```javascript
import PageContainer from '@/components/layout/PageContainer'
```

### Props

| 属性名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| children | ReactNode | 是 | - | 子元素 |
| className | string | 否 | - | 自定义样式类 |
| maxWidth | string | 否 | `'max-w-7xl'` | 最大宽度（Tailwind 类） |
| padding | string | 否 | `'px-4 md:px-5 lg:px-6'` | 内边距（Tailwind 类） |

### 使用方法

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

### 变体组件

#### PageContainerWithHeader

带页头的容器组件。

```javascript
import { PageContainerWithHeader } from '@/components/layout/PageContainer'

<PageContainerWithHeader
  title="页面标题"
  actions={<Button>操作按钮</Button>}
>
  <div>页面内容</div>
</PageContainerWithHeader>
```

**Props**：
- `title` (string, 必填) - 页面标题
- `actions` (ReactNode, 可选) - 右侧操作按钮区域
- `children` (ReactNode, 必填) - 页面内容

#### PageContainerWithBreadcrumb

带面包屑的容器组件。

```javascript
import { PageContainerWithBreadcrumb } from '@/components/layout/PageContainer'

<PageContainerWithBreadcrumb
  breadcrumb={<Breadcrumb items={items} />}
>
  <div>页面内容</div>
</PageContainerWithBreadcrumb>
```

**Props**：
- `breadcrumb` (ReactNode, 必填) - 面包屑组件
- `children` (ReactNode, 必填) - 页面内容

### 组件特性

- **最大宽度**：桌面端最大宽度 1280px（`max-w-7xl`）
- **居中布局**：桌面端自动居中（`mx-auto`）
- **响应式内边距**：移动端 16px，平板端 20px，桌面端 24px

---

## ThemeToggle 组件

### 功能说明

主题切换组件，提供深浅色主题的切换功能，支持系统主题检测和手动切换。

### 导入方式

```javascript
import { ThemeToggle } from '@/components/theme/ThemeToggle'
```

### 使用方法

```javascript
// 在 Header 组件中使用（已集成）
import { ThemeToggle } from '@/components/theme/ThemeToggle'

<ThemeToggle />
```

### 组件特性

- **三种模式**：浅色、深色、跟随系统
- **下拉菜单**：点击按钮显示主题选择菜单
- **图标切换**：根据当前主题显示太阳或月亮图标
- **持久化**：用户选择保存到 localStorage
- **SSR 安全**：防止服务端渲染和客户端不一致

### 主题选项

1. **浅色模式（Light）**：白色背景，深色文字
2. **深色模式（Dark）**：深色背景，浅色文字
3. **跟随系统（System）**：自动检测系统主题偏好（默认）

---

## 使用示例

### 完整页面布局示例

```javascript
// app/page.js (首页)
import Header from '@/components/layout/Header'
import PageContainer from '@/components/layout/PageContainer'

export default function HomePage() {
  return (
    <>
      <Header />
      <PageContainer>
        <h1>首页</h1>
        {/* 页面内容 */}
      </PageContainer>
    </>
  )
}
```

### 带面包屑的页面示例

```javascript
// app/project/[projectId]/page.js (项目详情页)
import Header from '@/components/layout/Header'
import Breadcrumb from '@/components/layout/Breadcrumb'
import PageContainer from '@/components/layout/PageContainer'

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
        {/* 页面内容 */}
      </PageContainer>
    </>
  )
}
```

### 任务详情页示例

```javascript
// app/project/[projectId]/queue/[queueId]/task/[taskId]/page.js
import Header from '@/components/layout/Header'
import Breadcrumb from '@/components/layout/Breadcrumb'
import PageContainer from '@/components/layout/PageContainer'

export default function TaskDetailPage({ params }) {
  const { projectId, queueId, taskId } = params
  // 获取数据...

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumb
          items={[
            { label: projectName, href: `/project/${projectId}` },
            { label: queueName, href: `/project/${projectId}/queue/${queueId}` },
            { label: taskTitle }
          ]}
        />
        {/* 任务详情内容 */}
      </PageContainer>
    </>
  )
}
```

### 使用 PageContainerWithHeader

```javascript
import Header from '@/components/layout/Header'
import { PageContainerWithHeader } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button'

export default function Page() {
  return (
    <>
      <Header />
      <PageContainerWithHeader
        title="页面标题"
        actions={
          <>
            <Button variant="outline">取消</Button>
            <Button>保存</Button>
          </>
        }
      >
        <div>页面内容</div>
      </PageContainerWithHeader>
    </>
  )
}
```

---

## 响应式设计

所有组件都遵循移动优先的设计原则：

- **移动端**（< 768px）：单列布局，较小的字体和间距
- **平板端**（768px - 1024px）：可双列布局，中等字体和间距
- **桌面端**（> 1024px）：多列布局，较大字体和间距

### 响应式断点

- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

---

## 主题支持

所有组件都支持深浅色主题切换：

- **浅色模式**：白色背景，深色文字
- **深色模式**：深色背景，浅色文字
- **自动切换**：根据系统主题偏好自动切换

主题切换通过 `next-themes` 库实现，配置在 `app/layout.js` 中。

---

## 无障碍性（A11y）

所有组件都遵循无障碍性标准：

- **语义化 HTML**：使用正确的 HTML 标签（`<header>`, `<nav>` 等）
- **ARIA 属性**：提供 `aria-label`、`aria-current` 等属性
- **键盘导航**：支持 Tab 键切换焦点，Enter 键触发操作
- **焦点可见性**：使用 `focus-visible` 样式
- **颜色对比度**：确保文字和背景颜色对比度符合 WCAG AA 标准

---

## 注意事项

1. **Header 组件**：应在所有页面的最顶部使用
2. **Breadcrumb 组件**：首页通常不需要显示面包屑
3. **PageContainer 组件**：建议在所有页面内容外层使用，确保统一的布局和间距
4. **ThemeToggle 组件**：已集成在 Header 组件中，通常不需要单独使用
5. **响应式**：所有组件都支持响应式，无需额外配置

---

## 相关文档

- [通用组件设计文档](../doc/spec/common-components-design.md)
- [UI 设计规范](../doc/design/ui-design.md)
