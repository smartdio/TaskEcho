/**
 * GET /api/v1/stats/by-client
 * 获取按客户端分组的统计数据
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
    
    // 4. 聚合客户端统计数据
    const clientStatsMap = new Map();
    
    stats.forEach(stat => {
      const byClient = stat.extended?.by_client || {};
      Object.keys(byClient).forEach(hostname => {
        const clientData = byClient[hostname];
        if (!clientStatsMap.has(hostname)) {
          clientStatsMap.set(hostname, {
            hostname: hostname,
            total_execution: 0,
            total_success: 0,
            total_failure: 0
          });
        }
        
        const clientStat = clientStatsMap.get(hostname);
        clientStat.total_execution += clientData.total || 0;
        clientStat.total_success += clientData.success || 0;
        clientStat.total_failure += clientData.failure || 0;
      });
    });
    
    // 5. 转换为数组并计算成功率
    const clients = Array.from(clientStatsMap.values()).map(client => ({
      hostname: client.hostname,
      summary: {
        total_execution: client.total_execution,
        total_success: client.total_success,
        total_failure: client.total_failure,
        success_rate: client.total_execution > 0 
          ? Math.round((client.total_success / client.total_execution) * 100) / 100 
          : 0
      }
    }));
    
    // 6. 按执行次数排序（降序）
    clients.sort((a, b) => b.summary.total_execution - a.summary.total_execution);
    
    return createSuccessResponse({ clients }, '查询成功');
    
  } catch (error) {
    console.error('获取客户端统计失败:', error);
    return createErrorResponse(
      error.message || '获取客户端统计失败',
      ERROR_CODES.INTERNAL_ERROR,
      500
    );
  }
}

export const GET = createApiHandler(handleGET, [
  MiddlewarePresets.authenticated
]);

