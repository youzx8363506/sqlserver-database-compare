import express from 'express';
import { DatabaseConfig } from '../../../src/types';

// 这些服务需要在路由初始化时注入，避免循环依赖
let comparisonService: any;
let socketService: any;

const router = express.Router();

// 初始化服务的函数，由主应用调用
export const initializeServices = (socketSvc: any, comparisonSvc: any) => {
  socketService = socketSvc;
  comparisonService = comparisonSvc;
};

// 启动数据库比较任务
router.post('/start', async (req, res) => {
  try {
    const { sourceDatabase, targetDatabase, options } = req.body;
    
    // 验证请求参数
    if (!sourceDatabase || !targetDatabase) {
      return res.status(400).json({
        success: false,
        error: '源数据库和目标数据库配置不能为空'
      });
    }

    // 验证数据库配置
    const validateConfig = (config: any, name: string) => {
      if (!config.server || !config.database) {
        throw new Error(`${name}的服务器和数据库名称不能为空`);
      }
      if (config.authentication.type === 'sql' && (!config.authentication.username || !config.authentication.password)) {
        throw new Error(`${name}的SQL认证需要提供用户名和密码`);
      }
    };

    validateConfig(sourceDatabase, '源数据库');
    validateConfig(targetDatabase, '目标数据库');

    const sourceConfig: DatabaseConfig = {
      server: sourceDatabase.server,
      database: sourceDatabase.database,
      authentication: {
        type: sourceDatabase.authentication.type || 'windows',
        username: sourceDatabase.authentication.username,
        password: sourceDatabase.authentication.password
      }
    };

    const targetConfig: DatabaseConfig = {
      server: targetDatabase.server,
      database: targetDatabase.database,
      authentication: {
        type: targetDatabase.authentication.type || 'windows',
        username: targetDatabase.authentication.username,
        password: targetDatabase.authentication.password
      }
    };

    // 创建比较任务
    const taskId = await comparisonService.createTask(sourceConfig, targetConfig, options);

    res.json({
      success: true,
      data: {
        taskId,
        websocketUrl: `ws://localhost:${process.env.PORT || 3001}`
      },
      message: '比较任务已启动'
    });

  } catch (error: any) {
    console.error('启动比较任务失败:', error);
    res.status(500).json({
      success: false,
      error: '启动比较任务失败',
      details: error.message
    });
  }
});

// 获取比较任务状态
router.get('/status/:taskId', (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: '任务ID不能为空'
      });
    }

    const status = comparisonService.getTaskStatus(taskId);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }

    res.json({
      success: true,
      task: {
        id: status.id,
        status: status.status,
        progress: status.progress,
        currentStep: status.currentStep,
        createdAt: status.createdAt,
        completedAt: status.completedAt,
        error: status.error
      }
    });

  } catch (error: any) {
    console.error('获取任务状态失败:', error);
    res.status(500).json({
      success: false,
      error: '获取任务状态失败',
      details: error.message
    });
  }
});

// 获取比较结果
router.get('/result/:taskId', (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: '任务ID不能为空'
      });
    }

    const result = comparisonService.getTaskResult(taskId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: '任务结果不存在或任务尚未完成'
      });
    }

    console.log(`📊 [比较结果] 返回比较结果，任务ID: ${taskId}`);
    console.log(`📋 [比较结果] 表差异: 新增${result.differences.tables.added.length}, 删除${result.differences.tables.removed.length}, 修改${result.differences.tables.modified.length}`);
    
    res.json({
      success: true,
      result: {
        summary: result.summary,
        // 返回完整的differences结构，包含added/removed/modified数组
        differences: {
          tables: {
            added: result.differences.tables.added,
            removed: result.differences.tables.removed,
            modified: result.differences.tables.modified
          },
          indexes: {
            added: result.differences.indexes?.added || [],
            removed: result.differences.indexes?.removed || [],
            modified: result.differences.indexes?.modified || []
          },
          views: {
            added: result.differences.views.added,
            removed: result.differences.views.removed,
            modified: result.differences.views.modified
          },
          procedures: {
            added: result.differences.procedures.added,
            removed: result.differences.procedures.removed,
            modified: result.differences.procedures.modified
          },
          functions: {
            added: result.differences.functions.added,
            removed: result.differences.functions.removed,
            modified: result.differences.functions.modified
          }
        },
        hasChanges: result.differences.tables.added.length > 0 || 
                   result.differences.tables.removed.length > 0 ||
                   result.differences.tables.modified.length > 0 ||
                   result.differences.views.added.length > 0 ||
                   result.differences.views.removed.length > 0 ||
                   result.differences.views.modified.length > 0 ||
                   result.differences.procedures.added.length > 0 ||
                   result.differences.procedures.removed.length > 0 ||
                   result.differences.procedures.modified.length > 0 ||
                   result.differences.functions.added.length > 0 ||
                   result.differences.functions.removed.length > 0 ||
                   result.differences.functions.modified.length > 0
      }
    });

  } catch (error: any) {
    console.error('获取比较结果失败:', error);
    res.status(500).json({
      success: false,
      error: '获取比较结果失败',
      details: error.message
    });
  }
});

// 获取详细差异数据
router.get('/differences/:taskId/:type', (req, res) => {
  try {
    const { taskId, type } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    console.log(`🔍 [差异数据] 请求详细差异数据 - 任务ID: ${taskId}, 类型: ${type}, 页码: ${page}, 限制: ${limit}`);
    
    if (!taskId || !type) {
      return res.status(400).json({
        success: false,
        error: '任务ID和差异类型不能为空'
      });
    }

    const result = comparisonService.getTaskResult(taskId);
    
    if (!result) {
      console.log(`❌ [差异数据] 任务结果不存在: ${taskId}`);
      return res.status(404).json({
        success: false,
        error: '任务结果不存在或任务尚未完成'
      });
    }

    console.log(`📋 [差异数据] 找到任务结果，检查数据结构...`);
    console.log(`🔍 [差异数据] result.differences 存在: ${!!result.differences}`);
    
    if (!result.differences) {
      console.log(`❌ [差异数据] result.differences 不存在`);
      return res.status(500).json({
        success: false,
        error: '比较结果数据结构异常，缺少differences字段'
      });
    }

    const validTypes = ['tables', 'indexes', 'views', 'procedures', 'functions'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: '无效的差异类型'
      });
    }

    const differences = result.differences[type as keyof typeof result.differences];
    console.log(`📊 [差异数据] ${type} 差异数据存在: ${!!differences}, 类型: ${typeof differences}`);
    
    if (!differences) {
      console.log(`⚠️ [差异数据] ${type} 差异数据不存在，返回空数组`);
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: 0,
          totalPages: 0
        }
      });
    }

    // 将differences对象转换为详细差异数组
    let diffArray: any[] = [];
    
    if (differences && typeof differences === 'object') {
      console.log(`📊 [差异数据] ${type} 差异对象结构:`, {
        added: differences.added?.length || 0,
        removed: differences.removed?.length || 0,
        modified: differences.modified?.length || 0
      });
      
      // 处理新增的对象
      if (differences.added && Array.isArray(differences.added)) {
        differences.added.forEach((item: any) => {
          diffArray.push({
            name: item.tableName || item.viewName || item.procedureName || item.functionName || item.indexName || '未知',
            type: 'added',
            description: `新增的${type === 'tables' ? '表' : type === 'views' ? '视图' : type === 'procedures' ? '存储过程' : type === 'functions' ? '函数' : '索引'}`,
            details: item
          });
        });
      }
      
      // 处理删除的对象
      if (differences.removed && Array.isArray(differences.removed)) {
        differences.removed.forEach((item: any) => {
          diffArray.push({
            name: item.tableName || item.viewName || item.procedureName || item.functionName || item.indexName || '未知',
            type: 'removed',
            description: `删除的${type === 'tables' ? '表' : type === 'views' ? '视图' : type === 'procedures' ? '存储过程' : type === 'functions' ? '函数' : '索引'}`,
            details: item
          });
        });
      }
      
      // 处理修改的对象
      if (differences.modified && Array.isArray(differences.modified)) {
        differences.modified.forEach((item: any) => {
          diffArray.push({
            name: item.tableName || item.viewName || item.procedureName || item.functionName || item.indexName || '未知',
            type: 'modified',
            description: `修改的${type === 'tables' ? '表' : type === 'views' ? '视图' : type === 'procedures' ? '存储过程' : type === 'functions' ? '函数' : '索引'}`,
            details: item
          });
        });
      }
    } else if (Array.isArray(differences)) {
      // 如果已经是数组格式，直接使用
      diffArray = differences;
    }
    
    console.log(`📈 [差异数据] ${type} 转换后差异数组长度: ${diffArray.length}`);
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    
    const paginatedData = diffArray.slice(startIndex, endIndex);
    console.log(`📄 [差异数据] 分页结果: 第${pageNum}页，显示${paginatedData.length}条记录`);

    res.json({
      success: true,
      data: paginatedData,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: diffArray.length,
        totalPages: Math.ceil(diffArray.length / limitNum)
      }
    });

  } catch (error: any) {
    console.error('❌ [差异数据] 获取差异数据失败:', error);
    console.error('❌ [差异数据] 错误堆栈:', error.stack);
    res.status(500).json({
      success: false,
      error: '获取差异数据失败',
      details: error.message
    });
  }
});

// 清理过期任务
router.delete('/cleanup', (req, res) => {
  try {
    comparisonService.cleanupOldTasks();
    res.json({
      success: true,
      message: '过期任务清理完成'
    });
  } catch (error: any) {
    console.error('清理任务失败:', error);
    res.status(500).json({
      success: false,
      error: '清理任务失败',
      details: error.message
    });
  }
});

export default router;