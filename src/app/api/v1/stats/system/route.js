/**
 * GET /api/v1/stats/system
 * 获取系统级别统计数据
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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const groupBy = searchParams.get('groupBy') || 'day';
    
    // 2. 设置默认日期范围（30天前到今天）
    const today = new Date();
    const defaultStartDate = new Date(today);
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    
    const start = startDate ? new Date(startDate) : defaultStartDate;
    const end = endDate ? new Date(endDate) : today;
    
    // 确保日期格式为 YYYY-MM-DD
    const startDateStr = start.toISOString().split('T')[0];
    const endDateStr = end.toISOString().split('T')[0];
    
    // 3. 查询统计数据
    const stats = await Statistics.find({
      scope: 'system',
      projectId: null,
      date: {
        $gte: startDateStr,
        $lte: endDateStr
      }
    }).sort({ date: 1 }).lean();
    
    // 4. 计算汇总数据
    let totalExecution = 0;
    let totalSuccess = 0;
    let totalFailure = 0;
    
    const dailyStats = stats.map(stat => {
      totalExecution += stat.execution?.total || 0;
      totalSuccess += stat.execution?.success || 0;
      totalFailure += stat.execution?.failure || 0;
      
      return {
        date: stat.date,
        execution: {
          total: stat.execution?.total || 0,
          success: stat.execution?.success || 0,
          failure: stat.execution?.failure || 0
        },
        task_status: {
          total: stat.task_status?.total || 0,
          pending: stat.task_status?.pending || 0,
          done: stat.task_status?.done || 0,
          error: stat.task_status?.error || 0
        }
      };
    });
    
    // 5. 计算成功率
    const successRate = totalExecution > 0 ? totalSuccess / totalExecution : 0;
    
    // 6. 构建响应数据
    const responseData = {
      summary: {
        total_execution: totalExecution,
        total_success: totalSuccess,
        total_failure: totalFailure,
        success_rate: Math.round(successRate * 100) / 100
      },
      daily_stats: dailyStats
    };
    
    // 7. 如果按月份分组，需要聚合数据
    if (groupBy === 'month') {
      // 按月聚合的逻辑（可选实现）
      // 这里先返回按日的数据
    }
    
    return createSuccessResponse(responseData, '查询成功');
    
  } catch (error) {
    console.error('获取系统级别统计失败:', error);
    return createErrorResponse(
      error.message || '获取系统级别统计失败',
      ERROR_CODES.INTERNAL_ERROR,
      500
    );
  }
}

export const GET = createApiHandler(handleGET, [
  MiddlewarePresets.authenticated
]);

