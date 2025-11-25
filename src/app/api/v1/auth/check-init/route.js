/**
 * GET /api/v1/auth/check-init
 * 检查系统是否已初始化
 */
import { createSuccessResponse } from '@/lib/api-response';
import connectDB from '@/lib/mongoose';
import User from '@/lib/models/User';

export async function GET() {
  try {
    await connectDB();

    // 检查是否有用户
    const userCount = await User.countDocuments();
    const isInitialized = userCount > 0;

    return createSuccessResponse(
      {
        initialized: isInitialized
      },
      '查询成功'
    );

  } catch (error) {
    console.error('检查初始化状态失败:', error);
    // 即使出错，也返回未初始化状态，让前端可以尝试初始化
    return createSuccessResponse(
      {
        initialized: false
      },
      '查询成功'
    );
  }
}

