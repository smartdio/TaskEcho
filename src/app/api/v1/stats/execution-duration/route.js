/**
 * GET /api/v1/stats/execution-duration
 * 获取执行时长统计数据
 */
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from '@/lib/api-response';
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware';
import connectDB from '@/lib/mongoose';
import Statistics from '@/lib/models/Statistics';
import StatisticsLog from '@/lib/models/StatisticsLog';

async function handleGET(request, context) {
  try {
    await connectDB();
    
    // 1. 解析查询参数
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const projectId = searchParams.get('projectId'); // 可选，不提供则查询系统级别
    
    // 2. 设置默认日期范围（30天前到今天）
    const today = new Date();
    const defaultStartDate = new Date(today);
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    
    const start = startDate ? new Date(startDate) : defaultStartDate;
    const end = endDate ? new Date(endDate) : today;
    
    // 确保日期格式为 YYYY-MM-DD
    const startDateStr = start.toISOString().split('T')[0];
    const endDateStr = end.toISOString().split('T')[0];
    
    // 3. 查询统计日志（用于计算执行时长分布）
    const logQuery = {
      isExecution: true,
      executionDuration: { $ne: null, $gt: 0 },
      date: {
        $gte: startDateStr,
        $lte: endDateStr
      }
    };
    
    if (projectId) {
      logQuery.projectId = projectId;
    }
    
    const logs = await StatisticsLog.find(logQuery)
      .select('executionDuration')
      .lean();
    
    // 4. 计算统计信息
    const durations = logs.map(log => log.executionDuration).filter(d => d > 0);
    const totalCount = durations.length;
    
    let summary = {
      avg_duration: 0,
      min_duration: 0,
      max_duration: 0,
      total_count: totalCount
    };
    
    if (totalCount > 0) {
      const sum = durations.reduce((a, b) => a + b, 0);
      summary.avg_duration = Math.round(sum / totalCount);
      summary.min_duration = Math.min(...durations);
      summary.max_duration = Math.max(...durations);
    }
    
    // 5. 计算时长分布
    const distribution = [
      { range: '0-1分钟', min: 0, max: 60000, count: 0 },
      { range: '1-5分钟', min: 60000, max: 300000, count: 0 },
      { range: '5-10分钟', min: 300000, max: 600000, count: 0 },
      { range: '10分钟以上', min: 600000, max: Infinity, count: 0 }
    ];
    
    durations.forEach(duration => {
      for (const dist of distribution) {
        if (duration >= dist.min && duration < dist.max) {
          dist.count++;
          break;
        }
      }
    });
    
    return createSuccessResponse({
      summary,
      distribution: distribution.map(d => ({
        range: d.range,
        count: d.count
      }))
    }, '查询成功');
    
  } catch (error) {
    console.error('获取执行时长统计失败:', error);
    return createErrorResponse(
      error.message || '获取执行时长统计失败',
      ERROR_CODES.INTERNAL_ERROR,
      500
    );
  }
}

export const GET = createApiHandler(handleGET, [
  MiddlewarePresets.authenticated
]);

