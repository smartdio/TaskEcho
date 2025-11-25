/**
 * GET /api/v1/stats/projects
 * 获取所有项目的统计数据汇总，用于对比展示
 */
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from '@/lib/api-response';
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware';
import connectDB from '@/lib/mongoose';
import Statistics from '@/lib/models/Statistics';
import Project from '@/lib/models/Project';

async function handleGET(request, context) {
  try {
    await connectDB();
    
    // 1. 解析查询参数
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // 2. 设置默认日期范围（30天前到今天）
    const today = new Date();
    const defaultStartDate = new Date(today);
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    
    const start = startDate ? new Date(startDate) : defaultStartDate;
    const end = endDate ? new Date(endDate) : today;
    
    // 确保日期格式为 YYYY-MM-DD
    const startDateStr = start.toISOString().split('T')[0];
    const endDateStr = end.toISOString().split('T')[0];
    
    // 3. 查询所有项目
    const projects = await Project.find().lean();
    
    // 4. 查询每个项目的统计数据
    const projectStatsPromises = projects.map(async (project) => {
      const stats = await Statistics.find({
        scope: 'project',
        projectId: project.projectId,
        date: {
          $gte: startDateStr,
          $lte: endDateStr
        }
      }).lean();
      
      // 计算汇总数据
      let totalExecution = 0;
      let totalSuccess = 0;
      let totalFailure = 0;
      
      stats.forEach(stat => {
        totalExecution += stat.execution?.total || 0;
        totalSuccess += stat.execution?.success || 0;
        totalFailure += stat.execution?.failure || 0;
      });
      
      // 计算成功率
      const successRate = totalExecution > 0 ? totalSuccess / totalExecution : 0;
      
      return {
        project_id: project.projectId,
        project_name: project.name,
        summary: {
          total_execution: totalExecution,
          total_success: totalSuccess,
          total_failure: totalFailure,
          success_rate: Math.round(successRate * 100) / 100
        }
      };
    });
    
    const projectStats = await Promise.all(projectStatsPromises);
    
    // 5. 按执行次数排序（降序）
    projectStats.sort((a, b) => b.summary.total_execution - a.summary.total_execution);
    
    // 6. 构建响应数据
    const responseData = {
      projects: projectStats
    };
    
    return createSuccessResponse(responseData, '查询成功');
    
  } catch (error) {
    console.error('获取项目列表统计失败:', error);
    return createErrorResponse(
      error.message || '获取项目列表统计失败',
      ERROR_CODES.INTERNAL_ERROR,
      500
    );
  }
}

export const GET = createApiHandler(handleGET, [
  MiddlewarePresets.authenticated
]);

