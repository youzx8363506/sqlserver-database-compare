import { v4 as uuidv4 } from 'uuid';
import { DatabaseCompareApp } from '../../../src/app';
import { Logger } from '../../../src/utils/logger';
import { DatabaseConfig, ComparisonResult } from '../../../src/types';
import { SocketService } from './SocketService';

interface ComparisonTask {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  result?: ComparisonResult;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
  sourceConfig: DatabaseConfig;
  targetConfig: DatabaseConfig;
}

export class ComparisonService {
  private tasks: Map<string, ComparisonTask> = new Map();
  private socketService: SocketService;

  constructor(socketService: SocketService) {
    this.socketService = socketService;
  }

  // 创建比较任务
  public async createTask(
    sourceConfig: DatabaseConfig,
    targetConfig: DatabaseConfig,
    options?: any
  ): Promise<string> {
    const taskId = uuidv4();
    
    const task: ComparisonTask = {
      id: taskId,
      status: 'pending',
      progress: 0,
      currentStep: '准备开始比较',
      sourceConfig,
      targetConfig,
      createdAt: new Date()
    };

    this.tasks.set(taskId, task);

    // 异步执行比较
    this.executeComparison(taskId).catch(error => {
      console.error(`任务 ${taskId} 执行失败:`, error);
      this.updateTaskError(taskId, error.message);
    });

    return taskId;
  }

  // 获取任务状态
  public getTaskStatus(taskId: string): ComparisonTask | null {
    return this.tasks.get(taskId) || null;
  }

  // 获取任务结果
  public getTaskResult(taskId: string): ComparisonResult | null {
    const task = this.tasks.get(taskId);
    return task?.result || null;
  }

  // 执行数据库比较
  private async executeComparison(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    try {
      // 更新任务状态为运行中
      this.updateTaskStatus(taskId, 'running', 0, '开始数据库比较');

      // 创建自定义日志器，用于进度报告
      const path = require('path');
      const logger = new Logger('info', path.join(__dirname, '../../../logs/web-server.log'));
      const originalInfo = logger.info.bind(logger);
      const originalDebug = logger.debug.bind(logger);
      const originalError = logger.error.bind(logger);

      // 重写日志方法，同时输出到文件和WebSocket
      logger.info = (message: string) => {
        console.log(`[数据库比较-INFO] ${message}`);
        originalInfo(message);
        this.socketService.emitLog(taskId, {
          level: 'info',
          message,
          timestamp: new Date().toISOString()
        });
      };

      logger.debug = (message: string) => {
        console.log(`[数据库比较-DEBUG] ${message}`);
        originalDebug(message);
        this.socketService.emitLog(taskId, {
          level: 'info',
          message: `[DEBUG] ${message}`,
          timestamp: new Date().toISOString()
        });
      };

      logger.error = (message: string, error?: any) => {
        console.error(`[数据库比较-ERROR] ${message}`, error || '');
        originalError(message, error);
        this.socketService.emitLog(taskId, {
          level: 'error',
          message: `${message}${error ? ' - ' + error.toString() : ''}`,
          timestamp: new Date().toISOString()
        });
      };

      // 创建比较应用实例
      const app = new DatabaseCompareApp(logger);

      // 添加更详细的步骤日志
      logger.info('========== 开始数据库比较任务 ==========');
      logger.info(`任务ID: ${taskId}`);
      logger.info(`源数据库: ${task.sourceConfig.server}/${task.sourceConfig.database}`);
      logger.info(`目标数据库: ${task.targetConfig.server}/${task.targetConfig.database}`);
      
      this.updateTaskStatus(taskId, 'running', 5, '连接数据库...');

      // 执行比较，并添加错误处理
      logger.info('开始执行数据库比较...');
      const result = await app.compareDatabase(task.sourceConfig, task.targetConfig);
      
      logger.info('数据库比较完成，正在生成结果...');
      logger.info(`比较结果摘要:`);
      logger.info(`- 表: 源${result.summary.totalTables.source}个, 目标${result.summary.totalTables.target}个`);
      logger.info(`- 新增表: ${result.summary.totalTables.added}个, 删除表: ${result.summary.totalTables.removed}个, 修改表: ${result.summary.totalTables.modified}个`);
      logger.info(`- 视图: 源${result.summary.totalViews.source}个, 目标${result.summary.totalViews.target}个`);
      logger.info(`- 存储过程: 源${result.summary.totalProcedures.source}个, 目标${result.summary.totalProcedures.target}个`);
      logger.info(`- 函数: 源${result.summary.totalFunctions.source}个, 目标${result.summary.totalFunctions.target}个`);
      logger.info(`- 整体状态: ${result.summary.overallStatus}`);

      // 更新任务完成状态
      this.updateTaskComplete(taskId, result);
      logger.info('========== 数据库比较任务完成 ==========');

    } catch (error: any) {
      console.error(`[数据库比较-CRITICAL] 任务 ${taskId} 执行失败:`, error);
      const errorMessage = `数据库比较失败: ${error.message || error.toString()}`;
      this.updateTaskError(taskId, errorMessage);
      
      // 发送详细错误信息到WebSocket
      this.socketService.emitLog(taskId, {
        level: 'error',
        message: `关键错误: ${errorMessage}`,
        timestamp: new Date().toISOString()
      });
      
      if (error.stack) {
        console.error('错误堆栈:', error.stack);
        this.socketService.emitLog(taskId, {
          level: 'error',
          message: `错误堆栈: ${error.stack}`,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  // 模拟进度更新（实际应该集成到核心比较逻辑中）
  private simulateProgress(taskId: string): void {
    const steps = [
      { step: '连接源数据库', percentage: 10 },
      { step: '连接目标数据库', percentage: 20 },
      { step: '提取表结构', percentage: 40 },
      { step: '提取视图定义', percentage: 60 },
      { step: '提取存储过程', percentage: 80 },
      { step: '执行比较分析', percentage: 90 },
      { step: '生成比较结果', percentage: 95 }
    ];

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < steps.length) {
        const current = steps[currentIndex];
        this.updateTaskStatus(taskId, 'running', current.percentage, current.step);
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 2000); // 每2秒更新一次进度
  }

  // 更新任务状态
  private updateTaskStatus(
    taskId: string, 
    status: ComparisonTask['status'], 
    progress: number, 
    currentStep: string
  ): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = status;
    task.progress = progress;
    task.currentStep = currentStep;

    // 通过 WebSocket 发送进度更新
    this.socketService.emitProgress(taskId, {
      step: currentStep,
      percentage: progress,
      message: currentStep
    });
  }

  // 更新任务完成状态
  private updateTaskComplete(taskId: string, result: ComparisonResult): void {
    console.log(`🔥 [ComparisonService] updateTaskComplete 被调用，任务ID: ${taskId}`);
    
    const task = this.tasks.get(taskId);
    if (!task) {
      console.log(`❌ [ComparisonService] 任务 ${taskId} 不存在于任务映射中`);
      return;
    }

    console.log(`✅ [ComparisonService] 找到任务 ${taskId}，更新状态为完成`);
    task.status = 'completed';
    task.progress = 100;
    task.currentStep = '比较完成';
    task.result = result;
    task.completedAt = new Date();

    console.log(`📡 [ComparisonService] 准备发送WebSocket完成通知，任务ID: ${taskId}`);
    console.log(`📊 [ComparisonService] 结果摘要: ${result.summary.overallStatus}`);
    
    // 通过 WebSocket 发送完成通知
    this.socketService.emitComplete(taskId, {
      taskId,
      result,
      summary: result.summary
    });
    
    console.log(`🎯 [ComparisonService] WebSocket完成通知已发送，任务ID: ${taskId}`);
  }

  // 更新任务错误状态
  private updateTaskError(taskId: string, error: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = 'failed';
    task.error = error;
    task.completedAt = new Date();

    // 通过 WebSocket 发送错误通知
    this.socketService.emitError(taskId, {
      taskId,
      error,
      message: '数据库比较失败'
    });
  }

  // 清理过期任务（可选，避免内存泄漏）
  public cleanupOldTasks(): void {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24小时

    for (const [taskId, task] of this.tasks.entries()) {
      if (now.getTime() - task.createdAt.getTime() > maxAge) {
        this.tasks.delete(taskId);
      }
    }
  }
}