/**
 * GET /api/v1/stats/error-types
 * 获取错误类型统计数据
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
    
    // 4. 聚合错误类型统计数据
    const errorTypesMap = new Map();
    
    stats.forEach(stat => {
      const errorTypes = stat.extended?.error_types || {};
      Object.keys(errorTypes).forEach(errorType => {
        const count = errorTypes[errorType] || 0;
        if (!errorTypesMap.has(errorType)) {
          errorTypesMap.set(errorType, 0);
        }
        errorTypesMap.set(errorType, errorTypesMap.get(errorType) + count);
      });
    });
    
    // 5. 转换为数组并计算百分比
    const totalErrors = Array.from(errorTypesMap.values()).reduce((a, b) => a + b, 0);
    
    const errorTypes = Array.from(errorTypesMap.entries()).map(([type, count]) => ({
      type: type,
      count: count,
      percentage: totalErrors > 0 ? Math.round((count / totalErrors) * 100 * 10) / 10 : 0
    }));
    
    // 6. 按数量排序（降序）
    errorTypes.sort((a, b) => b.count - a.count);
    
    // 7. 错误类型中文映射
    const typeLabels = {
      timeout: '超时',
      network: '网络',
      validation: '验证',
      permission: '权限',
      not_found: '未找到',
      other: '其他',
      unknown: '未知'
    };
    
    const errorTypesWithLabels = errorTypes.map(et => ({
      ...et,
      label: typeLabels[et.type] || et.type
    }));
    
    return createSuccessResponse({ error_types: errorTypesWithLabels }, '查询成功');
    
  } catch (error) {
    console.error('获取错误类型统计失败:', error);
    return createErrorResponse(
      error.message || '获取错误类型统计失败',
      ERROR_CODES.INTERNAL_ERROR,
      500
    );
  }
}

export const GET = createApiHandler(handleGET, [
  MiddlewarePresets.authenticated
]);

