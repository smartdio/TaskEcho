/**
 * GET /api/v1/projects/tags
 * 获取所有项目的常用标签列表
 */
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from '@/lib/api-response';
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware';
import connectDB from '@/lib/mongoose';
import ProjectMetadata from '@/lib/models/ProjectMetadata';

async function handleGET(request, context) {
  try {
    // 连接数据库
    await connectDB();

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100); // 最多返回100个标签

    // 使用聚合操作统计所有标签及其使用次数
    const pipeline = [
      // 过滤掉没有标签的项目
      {
        $match: {
          tags: { $exists: true, $ne: [], $not: { $size: 0 } }
        }
      },
      // 展开 tags 数组，每个标签生成一个文档
      {
        $unwind: '$tags'
      },
      // 按标签分组，统计每个标签的使用次数
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 }
        }
      },
      // 按使用次数降序排序
      {
        $sort: { count: -1 }
      },
      // 限制返回数量
      {
        $limit: limit
      },
      // 格式化输出
      {
        $project: {
          _id: 0,
          tag: '$_id',
          count: 1
        }
      }
    ];

    const tags = await ProjectMetadata.aggregate(pipeline);

    // 返回标签列表（只返回标签名称，不返回计数，前端可以根据需要显示）
    const tagList = tags.map(item => item.tag);

    return createSuccessResponse(
      {
        tags: tagList,
        count: tagList.length
      },
      '获取常用标签成功'
    );

  } catch (error) {
    console.error('获取常用标签失败:', error);
    return createErrorResponse(
      error.message || '获取常用标签失败',
      ERROR_CODES.INTERNAL_ERROR,
      500
    );
  }
}

export const GET = createApiHandler(handleGET, [
  MiddlewarePresets.authenticated
]);
