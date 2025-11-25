'use client'

import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { Toaster } from '@/components/ui/toaster'
import Header from '@/components/layout/Header'

export default function ErrorBoundaryWrapper({ children }) {
  return (
    <ErrorBoundary>
      <Header />
      <main>{children}</main>
      <Toaster />
    </ErrorBoundary>
  )
}
