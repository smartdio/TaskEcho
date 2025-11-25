/**
 * POST /api/v1/auth/login
 * 用户登录
 */
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from '@/lib/api-response';
import connectDB from '@/lib/mongoose';
import User from '@/lib/models/User';
import { generateToken } from '@/lib/jwt';

export async function POST(request) {
  try {
    await connectDB();

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

    // 查询用户
    const user = await User.findOne({ username: username.trim() });
    
    if (!user) {
      return createErrorResponse(
        '用户名或密码错误',
        ERROR_CODES.VALIDATION_ERROR,
        401
      );
    }

    // 验证密码
    const isValidPassword = await user.comparePassword(password);
    
    if (!isValidPassword) {
      return createErrorResponse(
        '用户名或密码错误',
        ERROR_CODES.VALIDATION_ERROR,
        401
      );
    }

    // 生成 Token
    const token = generateToken({
      userId: user._id.toString(),
      username: user.username
    });

    return createSuccessResponse(
      {
        token,
        user: {
          id: user._id.toString(),
          username: user.username
        }
      },
      '登录成功'
    );

  } catch (error) {
    console.error('登录失败:', error);
    return createErrorResponse(
      error.message || '登录失败',
      ERROR_CODES.INTERNAL_ERROR,
      500
    );
  }
}

