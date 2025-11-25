'use client'

import { toast as shadcnToast } from '@/components/ui/use-toast'

export function useToast() {
  const showSuccess = (message, title = '成功') => {
    shadcnToast({
      title,
      description: message,
      variant: 'success'
    })
  }

  const showError = (message, title = '错误') => {
    shadcnToast({
      title,
      description: message,
      variant: 'destructive'
    })
  }

  const showInfo = (message, title = '提示') => {
    shadcnToast({
      title,
      description: message
    })
  }

  const showWarning = (message, title = '警告') => {
    shadcnToast({
      title,
      description: message,
      variant: 'default'
    })
  }

  return {
    showSuccess,
    showError,
    showInfo,
    showWarning
  }
}
