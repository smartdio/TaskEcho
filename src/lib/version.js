/**
 * 版本信息工具函数
 * 提供读取版本信息的函数，支持客户端和服务端读取
 */

/**
 * 获取版本信息
 * @returns {Promise<Object|null>} 版本信息对象，如果获取失败返回 null
 */
export async function getVersionInfo() {
  try {
    // 在客户端和服务端都可以通过 fetch 读取 public/version.json
    const response = await fetch('/version.json', {
      // 添加时间戳防止缓存（可选）
      cache: 'no-store'
    })
    
    if (!response.ok) {
      return null
    }
    
    const versionInfo = await response.json()
    return versionInfo
  } catch (error) {
    console.error('获取版本信息失败:', error)
    return null
  }
}

/**
 * 获取版本信息（同步版本，仅服务端使用）
 * @returns {Object|null} 版本信息对象，如果获取失败返回 null
 */
export function getVersionInfoSync() {
  // 这个方法只能在服务端使用（Node.js 环境）
  if (typeof window !== 'undefined') {
    console.warn('getVersionInfoSync 只能在服务端使用')
    return null
  }
  
  try {
    const fs = require('fs')
    const path = require('path')
    
    const versionJsonPath = path.join(process.cwd(), 'public', 'version.json')
    
    if (!fs.existsSync(versionJsonPath)) {
      return null
    }
    
    const content = fs.readFileSync(versionJsonPath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error('读取版本信息失败:', error)
    return null
  }
}

/**
 * 格式化版本号显示（只显示大版本号）
 * @param {Object} versionInfo - 版本信息对象
 * @returns {string} 格式化后的版本号，如 "v1.0"
 */
export function formatMajorVersion(versionInfo) {
  if (!versionInfo) {
    return ''
  }
  
  return `v${versionInfo.major}.${versionInfo.minor}`
}

/**
 * 格式化构建时间显示
 * @param {string} buildTime - ISO 8601 格式的时间字符串
 * @returns {string} 格式化后的时间字符串
 */
export function formatBuildTime(buildTime) {
  if (!buildTime) {
    return '未知'
  }
  
  try {
    const date = new Date(buildTime)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch (error) {
    return buildTime
  }
}

/**
 * 默认版本信息（当无法读取版本信息时使用）
 */
export const DEFAULT_VERSION_INFO = {
  version: '0.1.0',
  major: 0,
  minor: 1,
  patch: 0,
  buildTime: new Date().toISOString(),
  gitCommit: '',
  gitCommitShort: '',
  gitBranch: '',
  buildNumber: 0
}

