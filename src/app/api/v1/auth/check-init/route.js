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

    // 检查是否有用户（注意：只看 users 集合，与 projects/queues/tasks 无关）
    const userCount = await User.countDocuments();
    const isInitialized = userCount > 0;

    // 调试日志：便于排查「有数据却跳转初始化页」的问题
    if (!isInitialized) {
      console.log('[check-init] users 集合为空 (userCount=0)，返回未初始化。请确认数据库 taskecho.users 中是否有用户文档。');
    }

    return createSuccessResponse(
      {
        initialized: isInitialized
      },
      '查询成功'
    );

  } catch (error) {
    console.error('检查初始化状态失败:', error);
    console.error('[check-init] 出错时将返回未初始化。若数据库已连接且有用户数据，请检查上述错误。');
    // 即使出错，也返回未初始化状态，让前端可以尝试初始化
    return createSuccessResponse(
      {
        initialized: false
      },
      '查询成功'
    );
  }
}

