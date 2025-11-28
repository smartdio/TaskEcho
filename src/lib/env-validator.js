/**
 * 环境变量验证工具
 * 在应用启动时验证必需的环境变量
 */

/**
 * 验证环境变量配置
 * @throws {Error} 如果必需的环境变量未设置
 */
export function validateEnv() {
  const errors = [];
  const warnings = [];

  // 必需的环境变量（生产环境）
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.MONGODB_URI) {
      errors.push('MONGODB_URI 未设置（生产环境必需）');
    }

    if (!process.env.ENCRYPTION_KEY) {
      errors.push('ENCRYPTION_KEY 未设置（生产环境必需）');
    } else {
      // 验证 ENCRYPTION_KEY 格式
      if (process.env.ENCRYPTION_KEY.length !== 64) {
        warnings.push('ENCRYPTION_KEY 长度不是 64 字符，将使用 SHA256 派生密钥');
      }
      if (!/^[0-9a-fA-F]+$/.test(process.env.ENCRYPTION_KEY)) {
        warnings.push('ENCRYPTION_KEY 不是有效的十六进制字符串');
      }
    }

    if (!process.env.JWT_SECRET) {
      errors.push('JWT_SECRET 未设置（生产环境必需）');
    }
  }

  // 开发环境警告
  if (process.env.NODE_ENV === 'development') {
    if (!process.env.MONGODB_URI) {
      warnings.push('MONGODB_URI 未设置，将使用默认值 mongodb://localhost:27017/taskecho');
    }

    if (!process.env.ENCRYPTION_KEY) {
      warnings.push('ENCRYPTION_KEY 未设置，将使用随机生成的密钥（重启后会变化）');
    }

    if (!process.env.JWT_SECRET) {
      warnings.push('JWT_SECRET 未设置，将使用默认值（不安全，仅用于开发）');
    }
  }

  // 输出警告
  if (warnings.length > 0) {
    console.warn('⚠️  环境变量警告:');
    warnings.forEach(warning => {
      console.warn(`   - ${warning}`);
    });
  }

  // 如果有错误，抛出异常
  if (errors.length > 0) {
    console.error('❌ 环境变量配置错误:');
    errors.forEach(error => {
      console.error(`   - ${error}`);
    });
    console.error('\n请检查 .env.local 文件或环境变量配置');
    throw new Error('环境变量验证失败');
  }

  // 验证成功
  if (process.env.NODE_ENV === 'production') {
    console.log('✓ 环境变量验证通过');
  }
}

/**
 * 在应用启动时调用此函数验证环境变量
 */
export function initEnvValidation() {
  try {
    validateEnv();
  } catch (error) {
    // 在生产环境，验证失败应该阻止应用启动
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    // 开发环境只输出警告
    console.error('环境变量验证失败，但开发环境继续运行');
  }
}

