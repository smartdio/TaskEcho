/**
 * GET /api/v1/stats/by-hour
 * 获取按小时分组的统计数据（当日或指定日期）
 */
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from '@/lib/api-response';
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware';
import connectDB from '@/lib/mongoose';
import Statistics from '@/lib/models/Statistics';

async function handleGET(request, context) {
  try {
    await connectDB();
    
    // 1. 解析查询参数
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // YYYY-MM-DD，默认今天
    const projectId = searchParams.get('projectId'); // 可选，不提供则查询系统级别
    
    // 2. 设置日期（默认今天）
    const targetDate = date ? new Date(date) : new Date();
    const dateStr = targetDate.toISOString().split('T')[0];
    
    // 3. 查询统计数据
    const stat = await Statistics.findOne({
      scope: projectId ? 'project' : 'system',
      projectId: projectId || null,
      date: dateStr
    }).lean();
    
    // 4. 处理按小时统计
    const hourlyStats = [];
    const byHour = stat?.extended?.by_hour || {};
    
    // 生成24小时的数据
    for (let hour = 0; hour < 24; hour++) {
      const hourStr = String(hour).padStart(2, '0');
      const hourData = byHour[hourStr] || { total: 0, success: 0, failure: 0 };
      
      hourlyStats.push({
        hour: hour,
        execution: {
          total: hourData.total || 0,
          success: hourData.success || 0,
          failure: hourData.failure || 0
        }
      });
    }
    
    return createSuccessResponse({
      date: dateStr,
      hourly_stats: hourlyStats
    }, '查询成功');
    
  } catch (error) {
    console.error('获取小时统计失败:', error);
    return createErrorResponse(
      error.message || '获取小时统计失败',
      ERROR_CODES.INTERNAL_ERROR,
      500
    );
  }
}

export const GET = createApiHandler(handleGET, [
  MiddlewarePresets.authenticated
]);

