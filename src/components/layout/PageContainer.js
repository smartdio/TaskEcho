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
