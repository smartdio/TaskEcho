/**
 * JWT Token 生成和验证模块
 */
import jwt from 'jsonwebtoken';

// JWT 密钥（从环境变量获取，生产环境必须设置）
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'; // 默认7天过期

// 生产环境必须设置 JWT_SECRET
if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
  throw new Error('生产环境必须设置 JWT_SECRET 环境变量');
}

// 开发环境使用默认值（仅用于开发）
const DEFAULT_JWT_SECRET = 'taskecho-secret-key-change-in-production';
const finalJwtSecret = JWT_SECRET || (process.env.NODE_ENV === 'development' ? DEFAULT_JWT_SECRET : null);

if (!finalJwtSecret) {
  throw new Error('JWT_SECRET 未设置');
}

/**
 * 生成 JWT Token
 * @param {Object} payload - Token 载荷
 * @param {string} payload.userId - 用户ID
 * @param {string} payload.username - 用户名
 * @returns {string} JWT Token
 */
export function generateToken(payload) {
  return jwt.sign(payload, finalJwtSecret, {
    expiresIn: JWT_EXPIRES_IN
  });
}

/**
 * 验证 JWT Token
 * @param {string} token - JWT Token
 * @returns {Object} 解码后的 Token 载荷
 * @throws {Error} 如果 Token 无效或过期
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, finalJwtSecret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token 已过期');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('无效的 Token');
    } else {
      throw new Error('Token 验证失败');
    }
  }
}

/**
 * 从请求头提取 Bearer Token
 * @param {Request} request - 请求对象
 * @returns {string|null} Token 或 null
 */
export function extractTokenFromRequest(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // 移除 'Bearer ' 前缀
}

