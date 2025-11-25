'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Home, ArrowLeft, FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Header from '@/components/layout/Header'
import PageContainer from '@/components/layout/PageContainer'

export default function NotFound() {
  const router = useRouter()

  return (
    <>
      <Header />
      <PageContainer>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-muted p-4">
                  <FileQuestion className="h-12 w-12 text-muted-foreground" />
                </div>
              </div>
              <CardTitle className="text-4xl font-bold">404</CardTitle>
              <CardDescription className="text-lg mt-2">
                页面不存在
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                抱歉，您访问的页面不存在或已被删除。
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button onClick={() => router.back()} variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  返回上一页
                </Button>
                <Button asChild>
                  <Link href="/">
                    <Home className="mr-2 h-4 w-4" />
                    返回首页
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </>
  )
}
