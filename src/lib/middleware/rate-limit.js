/**
 * 拉取限流中间件
 * 使用内存缓存记录每个API Key的拉取频率
 */
const rateLimitCache = new Map();

/**
 * 清理过期的限流记录
 */
function cleanupExpiredRecords() {
  const now = Date.now();
  for (const [key, record] of rateLimitCache.entries()) {
    // 清理超过1小时的记录
    if (now - record.lastReset > 3600000) {
      rateLimitCache.delete(key);
    }
  }
}

// 每10分钟清理一次过期记录
setInterval(cleanupExpiredRecords, 600000);

/**
 * 拉取限流中间件
 * @param {Object} options - 配置选项
 * @param {number} options.windowMs - 时间窗口（毫秒），默认60000（1分钟）
 * @param {number} options.maxRequests - 时间窗口内最大请求数，默认100
 * @param {number} options.dailyQuota - 每日配额，默认10000
 */
export function createPullRateLimitMiddleware(options = {}) {
  const {
    windowMs = 60000,      // 1分钟
    maxRequests = 100,     // 每分钟最多100次
    dailyQuota = 10000     // 每天最多10000次
  } = options;
  
  return async (request, context) => {
    // 只对拉取接口限流
    if (!request.url.includes('/pull')) {
      return null; // 继续执行
    }
    
    const apiKey = context.apiKey;
    if (!apiKey) {
      return null; // 没有API Key，跳过限流（由认证中间件处理）
    }
    
    const key = apiKey.key || apiKey.id;
    const now = Date.now();
    const today = new Date().toDateString();
    
    // 获取或创建限流记录
    let record = rateLimitCache.get(key);
    if (!record) {
      record = {
        requests: [],
        dailyCount: {},
        lastReset: now
      };
      rateLimitCache.set(key, record);
    }
    
    // 清理时间窗口外的请求记录
    record.requests = record.requests.filter(timestamp => now - timestamp < windowMs);
    
    // 检查时间窗口内的请求数
    if (record.requests.length >= maxRequests) {
      const resetTime = record.requests[0] + windowMs;
      const retryAfter = Math.ceil((resetTime - now) / 1000);
      
      return Response.json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `拉取频率超限，每分钟最多 ${maxRequests} 次`,
          retry_after: retryAfter
        },
        timestamp: new Date().toISOString()
      }, {
        status: 429,
        headers: {
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(resetTime).toISOString(),
          'Retry-After': retryAfter.toString()
        }
      });
    }
    
    // 检查每日配额
    const dailyCount = record.dailyCount[today] || 0;
    if (dailyCount >= dailyQuota) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const retryAfter = Math.ceil((tomorrow.getTime() - now) / 1000);
      
      return Response.json({
        success: false,
        error: {
          code: 'QUOTA_EXCEEDED',
          message: `每日拉取配额已用完，每天最多 ${dailyQuota} 次`,
          retry_after: retryAfter
        },
        timestamp: new Date().toISOString()
      }, {
        status: 429,
        headers: {
          'X-RateLimit-Limit': dailyQuota.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': tomorrow.toISOString(),
          'Retry-After': retryAfter.toString()
        }
      });
    }
    
    // 记录本次请求
    record.requests.push(now);
    record.dailyCount[today] = (record.dailyCount[today] || 0) + 1;
    record.lastReset = now;
    
    // 在响应头中添加限流信息
    const remaining = maxRequests - record.requests.length;
    const resetTime = record.requests.length > 0 
      ? record.requests[0] + windowMs 
      : now + windowMs;
    const dailyRemaining = dailyQuota - dailyCount;
    
    // 将限流信息存储到context中，供后续中间件使用
    context.rateLimit = {
      limit: maxRequests,
      remaining: remaining,
      reset: resetTime,
      dailyLimit: dailyQuota,
      dailyRemaining: dailyRemaining
    };
    
    return null; // 继续执行
  };
}







