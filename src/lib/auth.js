/**
 * 认证模块
 * 支持 Token 和 API Key 两种认证方式
 */
import connectDB from './mongoose.js';
import ApiKey from './models/ApiKey.js';
import User from './models/User.js';
import { verifyToken, extractTokenFromRequest } from './jwt.js';
import { verifyApiKey } from './encryption.js';

/**
 * 认证 Token（JWT）
 * @param {Request} request - 请求对象
 * @returns {Promise<Object>} 用户信息
 * @throws {Error} 如果认证失败
 */
export async function authenticateToken(request) {
  await connectDB();
  
  // 1. 从请求头提取 Token
  const token = extractTokenFromRequest(request);
  
  if (!token) {
    throw new Error('缺少 Token');
  }
  
  // 2. 验证 Token
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (error) {
    throw new Error(error.message || '无效的 Token');
  }
  
  // 3. 查询用户是否存在
  const user = await User.findById(decoded.userId).lean();
  
  if (!user) {
    throw new Error('用户不存在');
  }
  
  // 4. 返回用户信息
  return {
    userId: user._id.toString(),
    username: user.username,
    type: 'token'
  };
}

/**
 * 认证 API Key
 * @param {Request} request - 请求对象
 * @returns {Promise<Object>} API Key 记录
 * @throws {Error} 如果认证失败
 */
export async function authenticateApiKey(request) {
  await connectDB();
  
  // 1. 从请求头提取 API Key
  const apiKey = request.headers.get('X-API-Key');
  
  if (!apiKey) {
    throw new Error('缺少 API Key');
  }
  
  // 2. 查询所有激活的 API Key
  const keyRecords = await ApiKey.find({ isActive: true }).lean();
  
  if (keyRecords.length === 0) {
    throw new Error('无效的 API Key');
  }
  
  // 3. 验证 API Key（解密比对）
  let validKey = null;
  for (const record of keyRecords) {
    try {
      const isValid = verifyApiKey(apiKey, record.key);
      if (isValid) {
        validKey = record;
        break;
      }
    } catch (error) {
      // verifyApiKey 可能抛出错误，继续下一个
      continue;
    }
  }
  
  if (!validKey) {
    throw new Error('无效的 API Key');
  }
  
  // 4. 返回验证通过的 API Key 记录
  return {
    ...validKey,
    type: 'api-key'
  };
}

/**
 * 统一认证函数
 * 支持 Token 和 API Key 两种认证方式
 * 优先尝试 Token 认证，如果失败则尝试 API Key 认证
 * @param {Request} request - 请求对象
 * @returns {Promise<Object>} 认证信息（用户信息或 API Key 记录）
 * @throws {Error} 如果两种认证方式都失败
 */
export async function authenticate(request) {
  // 优先尝试 Token 认证
  const token = extractTokenFromRequest(request);
  if (token) {
    try {
      return await authenticateToken(request);
    } catch (error) {
      // Token 认证失败，继续尝试 API Key
    }
  }
  
  // 尝试 API Key 认证
  const apiKey = request.headers.get('X-API-Key');
  if (apiKey) {
    try {
      return await authenticateApiKey(request);
    } catch (error) {
      // API Key 认证也失败
    }
  }
  
  // 两种认证方式都失败
  throw new Error('缺少认证信息（Token 或 API Key）');
}

/**
 * 验证 API Key 是否匹配项目（如果 API Key 关联了项目）
 * @param {Object} apiKeyRecord - API Key 记录
 * @param {string} projectId - 项目ID
 * @returns {boolean}
 */
export function validateApiKeyProject(apiKeyRecord, projectId) {
  // 如果 API Key 没有关联项目，可以用于所有项目
  if (!apiKeyRecord.projectId) {
    return true;
  }
  
  // 如果 API Key 关联了项目，必须匹配
  return apiKeyRecord.projectId === projectId;
}
