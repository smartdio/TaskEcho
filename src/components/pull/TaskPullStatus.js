/**
 * 任务拉取状态组件
 * 显示任务的拉取状态标识
 */
import { Badge } from '@/components/ui/badge'
import { Clock, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function TaskPullStatus({ pulledAt, source, className }) {
  if (source === 'client') {
    return (
      <Badge 
        variant="outline" 
        className={cn("text-xs", className)}
      >
        客户端
      </Badge>
    )
  }

  if (!pulledAt) {
    return (
      <Badge 
        variant="outline" 
        className={cn("text-xs bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800", className)}
      >
        <Clock className="h-3 w-3 mr-1" />
        未拉取
      </Badge>
    )
  }

  return (
    <Badge 
      variant="outline" 
      className={cn("text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800", className)}
    >
      <CheckCircle2 className="h-3 w-3 mr-1" />
      已拉取
    </Badge>
  )
}







