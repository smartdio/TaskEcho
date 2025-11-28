import fs from 'fs';
import path from 'path';

/**
 * 错误日志记录工具
 * 开发环境：输出到控制台
 * 生产环境：写入日志文件（可选集成错误追踪服务）
 */

const LOG_DIR = path.join(process.cwd(), 'logs');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'error.log');

// 确保日志目录存在
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  } catch (error) {
    console.error('无法创建日志目录:', error);
  }
}

/**
 * 写入错误日志到文件（仅服务端）
 */
function writeErrorLog(errorInfo) {
  if (typeof window !== 'undefined') {
    return; // 客户端不写入文件
  }

  try {
    const logLine = JSON.stringify(errorInfo) + '\n';
    fs.appendFileSync(ERROR_LOG_FILE, logLine, 'utf8');
  } catch (error) {
    // 如果写入失败，至少输出到控制台
    console.error('写入错误日志失败:', error);
    console.error('原始错误:', errorInfo);
  }
}

/**
 * 记录错误
 * @param {Error} error - 错误对象
 * @param {Object} context - 上下文信息
 */
export function logError(error, context = {}) {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    context,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
    url: typeof window !== 'undefined' ? window.location.href : '',
    environment: process.env.NODE_ENV || 'unknown'
  };

  // 开发环境：输出到控制台
  if (process.env.NODE_ENV === 'development') {
    console.error('Error logged:', errorInfo);
  }

  // 生产环境：写入日志文件
  if (process.env.NODE_ENV === 'production') {
    writeErrorLog(errorInfo);
    
    // 可以集成 Sentry、LogRocket 等错误追踪服务
    // 示例：
    // if (typeof Sentry !== 'undefined') {
    //   Sentry.captureException(error, { extra: context });
    // }
  }
}

/**
 * 记录 API 错误（带请求信息）
 * @param {Error} error - 错误对象
 * @param {Object} requestInfo - 请求信息
 * @param {Object} context - 额外上下文
 */
export function logApiError(error, requestInfo = {}, context = {}) {
  const apiContext = {
    ...context,
    request: {
      method: requestInfo.method,
      url: requestInfo.url,
      headers: requestInfo.headers ? Object.fromEntries(requestInfo.headers) : {},
      body: requestInfo.body ? (typeof requestInfo.body === 'string' ? requestInfo.body.substring(0, 500) : JSON.stringify(requestInfo.body).substring(0, 500)) : undefined
    }
  };
  
  logError(error, apiContext);
}
