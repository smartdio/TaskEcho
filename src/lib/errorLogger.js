export function logError(error, context = {}) {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    context,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
    url: typeof window !== 'undefined' ? window.location.href : ''
  }

  // 开发环境：输出到控制台
  if (process.env.NODE_ENV === 'development') {
    console.error('Error logged:', errorInfo)
  }

  // 生产环境：发送到错误追踪服务（可选）
  if (process.env.NODE_ENV === 'production') {
    // 可以集成 Sentry、LogRocket 等错误追踪服务
    // sendToErrorTrackingService(errorInfo)
  }
}
