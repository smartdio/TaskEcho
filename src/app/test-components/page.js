import Header from '@/components/layout/Header'
import Breadcrumb from '@/components/layout/Breadcrumb'
import PageContainer from '@/components/layout/PageContainer'

export default function TestComponentsPage() {
  return (
    <>
      <Header />
      <PageContainer>
        <div className="py-6 md:py-8 lg:py-10">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6">
            通用组件测试页面
          </h1>
          
          {/* 测试面包屑 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">面包屑导航测试</h2>
            <Breadcrumb
              items={[
                { label: '项目名称', href: '/project/test-project' },
                { label: '队列名称', href: '/project/test-project/queue/test-queue' },
                { label: '任务标题' }
              ]}
            />
          </section>

          {/* 测试页面容器 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">页面容器测试</h2>
            <PageContainer className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <p>这是一个页面容器示例，包含响应式内边距和最大宽度限制。</p>
            </PageContainer>
          </section>

          {/* 测试响应式 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">响应式测试</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-card p-4 rounded-lg border">
                <h3 className="font-semibold mb-2">移动端</h3>
                <p className="text-sm text-muted-foreground">单列布局</p>
              </div>
              <div className="bg-card p-4 rounded-lg border">
                <h3 className="font-semibold mb-2">平板端</h3>
                <p className="text-sm text-muted-foreground">双列布局</p>
              </div>
              <div className="bg-card p-4 rounded-lg border">
                <h3 className="font-semibold mb-2">桌面端</h3>
                <p className="text-sm text-muted-foreground">三列布局</p>
              </div>
            </div>
          </section>
        </div>
      </PageContainer>
    </>
  )
}
