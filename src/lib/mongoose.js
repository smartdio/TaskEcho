import mongoose from 'mongoose';
import { validateEnv } from './env-validator.js';

// 在首次导入时验证环境变量（仅生产环境）
if (process.env.NODE_ENV === 'production') {
  try {
    validateEnv();
  } catch (error) {
    // 验证失败时，mongoose.js 的导入会失败，阻止应用启动
    throw error;
  }
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskecho';

/**
 * 全局缓存 Mongoose 连接，避免在开发模式下重复连接
 * 参考：https://github.com/vercel/next.js/blob/canary/examples/with-mongodb/lib/mongodb.js
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * 解析并验证 MongoDB 连接字符串
 * @param {string} uri - MongoDB 连接字符串
 * @returns {Object} 解析结果
 */
function parseMongoURI(uri) {
  try {
    const url = new URL(uri);
    const hasAuth = url.username && url.password;
    return {
      hasAuth,
      protocol: url.protocol,
      host: url.hostname,
      port: url.port || (url.protocol === 'mongodb+srv:' ? 27017 : 27017),
      database: url.pathname.slice(1) || 'taskecho',
      authSource: url.searchParams.get('authSource'),
      username: url.username || null,
    };
  } catch (error) {
    return null;
  }
}

async function connectDB() {
  // 如果已有连接，直接返回
  if (cached.conn) {
    return cached.conn;
  }

  // 如果正在连接，等待连接完成
  if (!cached.promise) {
    // 解析连接字符串以获取配置信息
    const uriInfo = parseMongoURI(MONGODB_URI);
    
    // 构建连接选项
    const opts = {
      bufferCommands: false,
      // 服务器选择超时（5秒）
      serverSelectionTimeoutMS: 5000,
      // 套接字超时（45秒）
      socketTimeoutMS: 45000,
      // 连接超时（10秒）
      connectTimeoutMS: 10000,
      // 如果连接字符串中没有指定 authSource，且需要认证，默认使用 admin
      // 注意：如果连接字符串中已包含 authSource，Mongoose 会自动使用
    };

    // 如果连接字符串中包含认证信息，输出提示（隐藏密码）
    if (uriInfo && uriInfo.hasAuth) {
      const maskedURI = MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
      console.log(`正在连接 MongoDB（使用身份验证）: ${maskedURI}`);
    } else {
      const maskedURI = MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
      console.log(`正在连接 MongoDB（无认证）: ${maskedURI}`);
      console.warn('⚠️  如果 MongoDB 需要认证，请在连接字符串中添加用户名和密码');
      console.warn('   格式: mongodb://username:password@host:port/database?authSource=admin');
    }

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('✓ MongoDB 连接成功');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    
    // 改进错误处理，提供更友好的认证错误提示
    let errorMessage = '✗ MongoDB 连接失败';
    if (e.code === 13 || e.codeName === 'Unauthorized') {
      errorMessage += ': 认证失败';
      console.error(errorMessage);
      const uriInfo = parseMongoURI(MONGODB_URI);
      if (!uriInfo || !uriInfo.hasAuth) {
        console.error('❌ MongoDB 需要认证，但连接字符串中没有提供用户名和密码');
        console.error('📝 请在 .env.local 文件中更新 MONGODB_URI，添加认证信息：');
        console.error('   格式: mongodb://username:password@localhost:27017/taskecho?authSource=admin');
        console.error('   示例: mongodb://root:yourpassword@localhost:27017/taskecho?authSource=admin');
      } else {
        console.error('❌ 认证失败，请检查 MONGODB_URI 中的用户名和密码是否正确');
        console.error('📝 连接字符串格式: mongodb://username:password@host:port/database?authSource=admin');
      }
    } else if (e.name === 'MongoServerSelectionError') {
      errorMessage += ': 无法连接到 MongoDB 服务器';
      console.error(errorMessage);
      console.error('提示: 请检查 MongoDB 服务是否运行，以及连接字符串中的主机和端口是否正确');
    } else {
      console.error(errorMessage + ':', e.message || e);
    }
    
    throw e;
  }

  return cached.conn;
}

export default connectDB;
