/**
 * API 中间件系统
 * 用于处理 Next.js App Router API 路由的中间件和参数解析
 */

/**
 * 中间件运行器
 */
class MiddlewareRunner {
  constructor(request) {
    this.request = request;
    this.context = {
      params: {},
      user: null,
      data: null
    };
    this.middlewares = [];
  }

  /**
   * 添加中间件
   */
  use(middleware) {
    this.middlewares.push(middleware);
  }

  /**
   * 运行中间件链和处理函数
   */
  async run(handler) {
    // 执行所有中间件
    for (const middleware of this.middlewares) {
      const result = await middleware(this.request, this.context);
      // 如果中间件返回响应，直接返回（用于认证失败等情况）
      if (result instanceof Response) {
        return result;
      }
      // 如果中间件返回数据，更新context
      if (result && typeof result === 'object') {
        Object.assign(this.context, result);
      }
    }

    // 执行处理函数
    return await handler(this.request, this.context);
  }
}

/**
 * 创建 API 处理器
 * @param {Function} handler - 处理函数
 * @param {Array} middlewares - 中间件数组
 * @returns {Function}
 */
export function createApiHandler(handler, middlewares = []) {
  return async (request, routeContext = {}) => {
    const runner = new MiddlewareRunner(request);
    
    // ⚠️ Next.js 15+ 关键：动态路由参数必须 await
    // routeContext.params 在 Next.js 15 中是 Promise
    runner.context.params = routeContext.params 
      ? await routeContext.params 
      : {};
    
    // 执行中间件链
    middlewares.forEach(middleware => runner.use(middleware));
    
    // 执行业务处理函数
    return await runner.run(handler);
  };
}

/**
 * 中间件预设
 */
export const MiddlewarePresets = {
  /**
   * 认证中间件（支持 Token 和 API Key）
   */
  authenticated: async (request, context) => {
    const { authenticate } = await import('./auth.js');
    try {
      const authInfo = await authenticate(request);
      // 将认证信息存储到 context 中
      context.user = authInfo.type === 'token' ? authInfo : null;
      context.apiKey = authInfo.type === 'api-key' ? authInfo : null;
      context.auth = authInfo;
      return null; // 继续执行
    } catch (error) {
      const { createErrorResponse, ERROR_CODES } = await import('./api-response.js');
      return createErrorResponse(
        error.message || '认证失败',
        ERROR_CODES.INVALID_API_KEY,
        401
      );
    }
  }
};
