/**
 * API Key 加密/解密工具
 * 使用 AES-256-CBC 加密算法
 */
import crypto from 'crypto';

// 加密密钥（从环境变量获取，生产环境必须设置）
// 注意：生产环境必须设置 ENCRYPTION_KEY 环境变量
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // IV 长度（字节）

// 生产环境必须设置 ENCRYPTION_KEY
if (process.env.NODE_ENV === 'production' && !ENCRYPTION_KEY) {
  throw new Error('生产环境必须设置 ENCRYPTION_KEY 环境变量');
}

// 开发环境使用随机生成的密钥（仅用于开发，重启后会变化）
let finalEncryptionKey = ENCRYPTION_KEY;
if (!finalEncryptionKey) {
  if (process.env.NODE_ENV === 'development') {
    // 开发环境：使用全局变量缓存随机密钥，避免每次重启变化
    if (!global.devEncryptionKey) {
      global.devEncryptionKey = crypto.randomBytes(32).toString('hex');
      console.warn('⚠️  开发环境：使用随机生成的 ENCRYPTION_KEY，重启后会变化');
      console.warn('   建议在 .env.local 中设置 ENCRYPTION_KEY 以避免重启后无法解密');
    }
    finalEncryptionKey = global.devEncryptionKey;
  } else {
    throw new Error('ENCRYPTION_KEY 未设置');
  }
}

/**
 * 确保加密密钥长度为 32 字节
 */
function getEncryptionKey() {
  // 如果环境变量是 hex 字符串，转换为 Buffer
  if (finalEncryptionKey.length === 64) {
    return Buffer.from(finalEncryptionKey, 'hex');
  }
  // 否则使用密钥派生函数生成 32 字节密钥
  return crypto.createHash('sha256').update(finalEncryptionKey).digest();
}

/**
 * 加密 API Key
 * @param {string} text - 要加密的文本
 * @returns {string} 加密后的字符串（格式：iv:encrypted，都是 hex 编码）
 */
export function encryptApiKey(text) {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // 返回格式：iv:encrypted（都是 hex 编码）
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('加密失败:', error);
    throw new Error('加密失败');
  }
}

/**
 * 解密 API Key
 * @param {string} encryptedText - 加密后的字符串（格式：iv:encrypted）
 * @returns {string} 解密后的原始文本
 */
export function decryptApiKey(encryptedText) {
  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');
    
    if (parts.length !== 2) {
      throw new Error('无效的加密格式');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('解密失败:', error);
    throw new Error('解密失败');
  }
}

/**
 * 验证 API Key（用于认证）
 * @param {string} plainText - 明文 API Key
 * @param {string} encryptedText - 加密后的 API Key
 * @returns {boolean} 是否匹配
 */
export function verifyApiKey(plainText, encryptedText) {
  try {
    const decrypted = decryptApiKey(encryptedText);
    return decrypted === plainText;
  } catch (error) {
    return false;
  }
}

