/**
 * POST /api/v1/auth/init
 * 初始化系统（创建第一个用户）
 */
import bcrypt from 'bcrypt';
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from '@/lib/api-response';
import connectDB from '@/lib/mongoose';
import User from '@/lib/models/User';

export async function POST(request) {
  try {
    await connectDB();

    // 检查是否已有用户
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return createErrorResponse(
        '系统已初始化，无法重复初始化',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    // 解析请求体
    const body = await request.json();
    const { username, password } = body;

    // 验证参数
    if (!username || !password) {
      return createErrorResponse(
        '用户名和密码不能为空',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    if (username.length < 3 || username.length > 20) {
      return createErrorResponse(
        '用户名长度必须在 3-20 个字符之间',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    if (password.length < 6) {
      return createErrorResponse(
        '密码长度不能少于 6 个字符',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    // 创建用户
    const user = new User({
      username: username.trim(),
      password: await bcrypt.hash(password, 10)
    });

    await user.save();

    return createSuccessResponse(
      {
        message: '系统初始化成功'
      },
      '系统初始化成功'
    );

  } catch (error) {
    console.error('系统初始化失败:', error);
    
    // 处理唯一性约束错误
    if (error.code === 11000 || error.name === 'MongoServerError') {
      return createErrorResponse(
        '用户名已存在',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    return createErrorResponse(
      error.message || '系统初始化失败',
      ERROR_CODES.INTERNAL_ERROR,
      500
    );
  }
}

