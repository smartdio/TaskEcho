'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AlertTriangle } from 'lucide-react'

/**
 * 删除确认对话框组件
 */
export function DeleteConfirmDialog({ open, onOpenChange, apiKey, onConfirm }) {
  const handleConfirm = async () => {
    if (apiKey && onConfirm) {
      const result = await onConfirm(apiKey.id)
      if (result?.success) {
        onOpenChange(false)
      }
    }
  }
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <AlertDialogTitle>确认删除</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            <p className="mb-2">
              确定要删除 API Key「<strong>{apiKey?.name || ''}</strong>」吗？
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              删除后，使用该 API Key 的请求将无法通过认证。此操作不可恢复。
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel className="h-11">取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="h-11 bg-red-600 hover:bg-red-700 text-white focus:ring-red-500"
          >
            确认删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
