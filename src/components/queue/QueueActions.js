/**
 * 队列操作按钮组组件
 */
'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RefreshCw, RotateCcw, AlertCircle, Play, MoreVertical } from 'lucide-react'
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
import { useState } from 'react'

export function QueueActions({ 
  queueId, 
  projectId, 
  onReset, 
  onResetError, 
  onRerun,
  disabled = false 
}) {
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetErrorDialogOpen, setResetErrorDialogOpen] = useState(false)
  const [rerunDialogOpen, setRerunDialogOpen] = useState(false)
  const [actionType, setActionType] = useState(null) // 'reset' | 'reset-error' | 'rerun'

  const handleReset = () => {
    setActionType('reset')
    setResetDialogOpen(true)
  }

  const handleResetError = () => {
    setActionType('reset-error')
    setResetErrorDialogOpen(true)
  }

  const handleRerun = () => {
    setActionType('rerun')
    setRerunDialogOpen(true)
  }

  const confirmAction = () => {
    if (actionType === 'reset' && onReset) {
      onReset()
      setResetDialogOpen(false)
    } else if (actionType === 'reset-error' && onResetError) {
      onResetError()
      setResetErrorDialogOpen(false)
    } else if (actionType === 'rerun' && onRerun) {
      onRerun()
      setRerunDialogOpen(false)
    }
    setActionType(null)
  }

  const getActionTitle = () => {
    switch (actionType) {
      case 'reset':
        return '重置队列'
      case 'reset-error':
        return '重置错误任务'
      case 'rerun':
        return '重新运行队列'
      default:
        return '确认操作'
    }
  }

  const getActionDescription = () => {
    switch (actionType) {
      case 'reset':
        return '此操作将重置队列中所有任务的状态为pending，并清除拉取状态。此操作不可恢复。'
      case 'reset-error':
        return '此操作将重置队列中所有错误任务的状态为pending，并清除拉取状态。'
      case 'rerun':
        return '此操作将重置队列中所有任务的状态为pending，并清除拉取状态，使任务重新可执行。'
      default:
        return ''
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="h-9 md:h-10 px-3 md:px-4"
            aria-label="队列操作"
          >
            <MoreVertical className="h-4 w-4 md:h-5 md:w-5" />
            <span className="hidden sm:inline ml-2">操作</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            <span>重置队列</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleResetError}>
            <AlertCircle className="mr-2 h-4 w-4" />
            <span>重置错误任务</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleRerun}>
            <Play className="mr-2 h-4 w-4" />
            <span>重新运行</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 重置队列确认对话框 */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{getActionTitle()}</AlertDialogTitle>
            <AlertDialogDescription>
              {getActionDescription()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className="h-11 bg-red-600 hover:bg-red-700 text-white"
            >
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 重置错误任务确认对话框 */}
      <AlertDialog open={resetErrorDialogOpen} onOpenChange={setResetErrorDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{getActionTitle()}</AlertDialogTitle>
            <AlertDialogDescription>
              {getActionDescription()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className="h-11 bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 重新运行确认对话框 */}
      <AlertDialog open={rerunDialogOpen} onOpenChange={setRerunDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{getActionTitle()}</AlertDialogTitle>
            <AlertDialogDescription>
              {getActionDescription()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className="h-11 bg-blue-600 hover:bg-blue-700 text-white"
            >
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}







