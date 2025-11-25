'use client'

/**
 * 请求去重：防止并发请求
 * 使用Map存储pending请求，相同的URL只发起一次请求
 */
const pendingRequests = new Map()

/**
 * 获取认证头
 * @returns {Object} 认证头对象
 */
function getAuthHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('taskecho_token') : null
  const headers = {}
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  return headers
}

/**
 * 带去重的fetch函数（自动添加认证头）
 * @param {string} url - 请求URL
 * @param {Object} options - fetch选项
 * @returns {Promise<Response>}
 */
export async function fetchWithDeduplication(url, options = {}) {
  // 合并认证头
  const authHeaders = getAuthHeaders()
  const headers = {
    ...authHeaders,
    ...(options.headers || {})
  }

  const finalOptions = {
    ...options,
    headers
  }

  // 如果已经有相同的pending请求，直接返回
  if (pendingRequests.has(url)) {
    return pendingRequests.get(url)
  }

  // 创建新的请求
  const requestPromise = fetch(url, finalOptions)
    .then(response => {
      // 请求完成后移除
      pendingRequests.delete(url)
      return response
    })
    .catch(error => {
      // 请求失败后也移除
      pendingRequests.delete(url)
      throw error
    })

  // 存储pending请求
  pendingRequests.set(url, requestPromise)

  return requestPromise
}

/**
 * 带认证头的fetch函数
 * @param {string} url - 请求URL
 * @param {Object} options - fetch选项
 * @returns {Promise<Response>}
 */
export async function fetchWithAuth(url, options = {}) {
  const authHeaders = getAuthHeaders()
  const headers = {
    'Content-Type': 'application/json',
    ...authHeaders,
    ...(options.headers || {})
  }

  return fetch(url, {
    ...options,
    headers
  })
}

/**
 * 条件请求：使用If-Modified-Since头
 * @param {string} url - 请求URL
 * @param {string|Date} lastModified - 最后修改时间
 * @param {Object} options - fetch选项
 * @returns {Promise<{data: any|null, modified: boolean}>}
 */
export async function fetchWithConditionalRequest(url, lastModified, options = {}) {
  const headers = {
    ...options.headers,
  }

  if (lastModified) {
    const lastModifiedDate = lastModified instanceof Date 
      ? lastModified.toUTCString() 
      : new Date(lastModified).toUTCString()
    headers['If-Modified-Since'] = lastModifiedDate
  }

  const response = await fetchWithDeduplication(url, {
    ...options,
    headers
  })

  if (response.status === 304) {
    // 数据未更新，返回null
    return { data: null, modified: false }
  }

  const data = await response.json()
  return { data, modified: true }
}

/**
 * 带错误处理和重试的fetch函数
 * @param {string} url - 请求URL
 * @param {Object} options - fetch选项
 * @param {number} maxRetries - 最大重试次数，默认3
 * @param {Function} retryDelay - 重试延迟函数，默认指数退避
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(
  url,
  options = {},
  maxRetries = 3,
  retryDelay = (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
) {
  let lastError

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithDeduplication(url, options)

      // 如果是网络错误或5xx错误，重试
      if (!response.ok && response.status >= 500 && attempt < maxRetries) {
        const delay = retryDelay(attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      return response
    } catch (error) {
      lastError = error

      // 如果是网络错误且还有重试机会，等待后重试
      if (attempt < maxRetries) {
        const delay = retryDelay(attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      throw error
    }
  }

  throw lastError
}

/**
 * 合并多个请求
 * @param {Array<Promise>} requests - 请求Promise数组
 * @returns {Promise<Array>}
 */
export async function fetchMultiple(requests) {
  return Promise.all(requests)
}
