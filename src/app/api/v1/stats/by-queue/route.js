/**
 * GET /api/v1/stats/by-queue
 * 获取按队列分组的统计数据
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
    
    // 3. 查询统计数据
    const query = {
      scope: projectId ? 'project' : 'system',
      projectId: projectId || null,
      date: {
        $gte: startDateStr,
        $lte: endDateStr
      }
    };
    
    const stats = await Statistics.find(query).lean();
    
    // 4. 聚合队列统计数据
    const queueStatsMap = new Map();
    
    stats.forEach(stat => {
      const byQueue = stat.extended?.by_queue || {};
      Object.keys(byQueue).forEach(queueId => {
        const queueData = byQueue[queueId];
        if (!queueStatsMap.has(queueId)) {
          queueStatsMap.set(queueId, {
            queue_id: queueId,
            total_execution: 0,
            total_success: 0,
            total_failure: 0
          });
        }
        
        const queueStat = queueStatsMap.get(queueId);
        queueStat.total_execution += queueData.total || 0;
        queueStat.total_success += queueData.success || 0;
        queueStat.total_failure += queueData.failure || 0;
      });
    });
    
    // 5. 转换为数组并计算成功率
    const queues = Array.from(queueStatsMap.values()).map(queue => ({
      queue_id: queue.queue_id,
      summary: {
        total_execution: queue.total_execution,
        total_success: queue.total_success,
        total_failure: queue.total_failure,
        success_rate: queue.total_execution > 0 
          ? Math.round((queue.total_success / queue.total_execution) * 100) / 100 
          : 0
      }
    }));
    
    // 6. 按执行次数排序（降序）
    queues.sort((a, b) => b.summary.total_execution - a.summary.total_execution);
    
    return createSuccessResponse({ queues }, '查询成功');
    
  } catch (error) {
    console.error('获取队列统计失败:', error);
    return createErrorResponse(
      error.message || '获取队列统计失败',
      ERROR_CODES.INTERNAL_ERROR,
      500
    );
  }
}

export const GET = createApiHandler(handleGET, [
  MiddlewarePresets.authenticated
]);

