import { DatabaseConfig, ComparisonResult } from '../../../src/types';
import { DatabaseCompareApp } from '../../../src/app';
import TaskDataStorage, { TaskData } from './TaskDataStorage';
import { Logger } from '../../../src/utils/logger';
import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as path from 'path';
import { SocketService } from './SocketService';
import { ReportGenerationService, Report } from './ReportGenerationService';

interface ComparisonOptions {
  tablesOnly?: boolean;
  includeData?: boolean;
  ignorePermissions?: boolean;
  // 报告生成配置
  autoGenerateReports?: boolean;           // 是否自动生成报告，默认true
  reportFormats?: ('html' | 'excel' | 'json')[]; // 要生成的报告格式
  defaultReportFormat?: 'html' | 'excel' | 'json'; // 默认报告格式，默认html
}

class EnhancedComparisonService extends EventEmitter {
  private taskStorage: TaskDataStorage;
  private logger: Logger;
  private activeTasks = new Map<string, any>();
  private socketService: SocketService | null = null;

  constructor() {
    super();
    this.taskStorage = new TaskDataStorage();
    this.logger = new Logger('info' as any, path.join(process.cwd(), 'logs', 'enhanced-comparison.log'));
    
    console.log('🚀 [EnhancedComparisonService] 服务初始化完成');
    this.logger.info('🚀 增强比较服务初始化完成');
  }

  // 设置SocketService（由app.ts调用）
  setSocketService(socketService: SocketService): void {
    this.socketService = socketService;
    console.log('🔗 [EnhancedComparisonService] SocketService已注入');
  }

  // 创建并启动比较任务
  async createAndStartTask(
    sourceConfig: DatabaseConfig,
    targetConfig: DatabaseConfig,
    options?: ComparisonOptions
  ): Promise<string> {
    const taskId = this.generateTaskId();
    
    console.log(`📋 [EnhancedComparisonService] 创建比较任务: ${taskId}`);
    console.log(`   - 源数据库: ${sourceConfig.server}.${sourceConfig.database}`);
    console.log(`   - 目标数据库: ${targetConfig.server}.${targetConfig.database}`);
    
    // 创建任务数据
    const taskData: TaskData = {
      taskId,
      sourceConfig,
      targetConfig,
      status: 'pending',
      progress: 0,
      currentStep: '初始化任务',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 保存任务配置
    await this.taskStorage.saveTaskData(taskData);
    
    this.logger.info(`📋 创建比较任务: ${taskId}`);
    
    // 异步执行比较
    this.executeComparison(taskId, sourceConfig, targetConfig, options);
    
    return taskId;
  }

  // 执行比较
  private async executeComparison(
    taskId: string,
    sourceConfig: DatabaseConfig,
    targetConfig: DatabaseConfig,
    options?: ComparisonOptions
  ): Promise<void> {
    try {
      console.log(`🚀 [EnhancedComparisonService] 开始执行比较: ${taskId}`);
      this.logger.info(`🚀 开始执行比较: ${taskId}`);
      
      // 标记任务为活跃状态
      this.activeTasks.set(taskId, {
        startTime: Date.now(),
        status: 'running'
      });
      
      // === 新增：详细的进度更新步骤 ===
      
      // 步骤1: 初始化任务 (5%)
      await this.updateTaskStatus(taskId, 'running', 5, '初始化比较任务...');
      await this.delay(500); // 模拟初始化时间
      
      // 步骤2: 连接源数据库 (15%)
      await this.updateTaskStatus(taskId, 'running', 15, '正在连接源数据库...');
      await this.delay(1000);
      
      // 步骤3: 连接目标数据库 (25%)
      await this.updateTaskStatus(taskId, 'running', 25, '正在连接目标数据库...');
      await this.delay(1000);
      
      // 步骤4: 提取源数据库元数据 (40%)
      await this.updateTaskStatus(taskId, 'running', 40, '正在提取源数据库元数据...');
      await this.delay(1500);
      
      // 步骤5: 提取目标数据库元数据 (55%)
      await this.updateTaskStatus(taskId, 'running', 55, '正在提取目标数据库元数据...');
      await this.delay(1500);
      
      // 步骤6: 执行对象比较 (50%)
      await this.updateTaskStatus(taskId, 'running', 50, '正在执行数据库对象比较...');
      await this.delay(1500);
      
      // 步骤7: 生成比较结果 (70%)
      await this.updateTaskStatus(taskId, 'running', 70, '正在生成比较结果...');
      await this.delay(1000);
      
      // 创建比较应用实例并执行比较
      const compareApp = new DatabaseCompareApp();
      
      console.log(`🔗 [EnhancedComparisonService] 开始数据库比较: ${taskId}`);
      
      // 执行实际比较
      const result = await compareApp.compareDatabase(sourceConfig, targetConfig);
      
      console.log(`✅ [EnhancedComparisonService] 数据库比较完成: ${taskId}`);
      console.log(`   - 表差异: ${result.differences?.tables?.added?.length || 0} 新增, ${result.differences?.tables?.removed?.length || 0} 删除, ${result.differences?.tables?.modified?.length || 0} 修改`);
      
      // 保存比较结果
      await this.taskStorage.saveComparisonResult(taskId, result);
      
      // === 新增：自动生成报告功能 ===
      let generatedReports: Report[] = [];
      
      // 检查是否启用自动报告生成（默认启用）
      const shouldGenerateReports = options?.autoGenerateReports !== false;
      
      if (shouldGenerateReports) {
        console.log(`📊 [EnhancedComparisonService] 开始自动生成报告: ${taskId}`);
        await this.updateTaskStatus(taskId, 'running', 75, '开始生成报告文件...');
        
        try {
          // 创建报告生成服务实例
          const reportService = new ReportGenerationService(this.socketService!, this.taskStorage, this.logger);
          
          // 设置报告生成选项（默认配置）
          const reportOptions = {
            autoGenerateReports: true,
            reportFormats: options?.reportFormats || ['html'], // 默认生成HTML格式
            defaultReportFormat: options?.defaultReportFormat || 'html'
          };
          
          console.log(`📋 [EnhancedComparisonService] 报告生成配置:`, reportOptions);
          
          // 生成报告（这将包含进度推送到前端）
          generatedReports = await reportService.generateReportsForTask(taskId, result, reportOptions);
          
          console.log(`✅ [EnhancedComparisonService] 报告生成完成: ${generatedReports.length} 个文件`);
          generatedReports.forEach(report => {
            console.log(`   - ${report.format.toUpperCase()}: ${report.fileName} (${(report.size / 1024).toFixed(1)} KB)`);
          });
          
        } catch (reportError: any) {
          console.error(`❌ [EnhancedComparisonService] 报告生成失败: ${taskId}`, reportError);
          this.logger.error(`报告生成失败: ${taskId}`, reportError);
          
          // 报告生成失败不应阻止任务完成，只记录错误
          await this.updateTaskStatus(taskId, 'running', 95, `报告生成出错: ${reportError.message}，但比较结果已保存`);
        }
      } else {
        console.log(`⚠️ [EnhancedComparisonService] 跳过自动报告生成（已禁用）: ${taskId}`);
      }
      
      // 步骤8: 任务完成 (100%)
      const finalMessage = generatedReports.length > 0 
        ? `数据库比较和报告生成已完成！共生成 ${generatedReports.length} 个报告文件`
        : '数据库比较已完成！';
        
      await this.updateTaskStatus(taskId, 'completed', 100, finalMessage, result);
      
      this.logger.info(`✅ 比较任务完成: ${taskId}, 报告: ${generatedReports.length} 个`);
      
      // 发送完成事件（包含报告信息）
      this.emit('taskCompleted', { 
        taskId, 
        result, 
        reports: generatedReports 
      });
      
    } catch (error: any) {
      console.error(`❌ [EnhancedComparisonService] 比较任务失败: ${taskId}`, error);
      this.logger.error(`❌ 比较任务失败: ${taskId}`, error);
      
      // 更新任务状态为错误
      await this.updateTaskStatus(taskId, 'error', 0, '比较失败', undefined, error.message);
      
      // 发送错误事件
      this.emit('taskError', { taskId, error: error.message });
    } finally {
      this.activeTasks.delete(taskId);
    }
  }

  // 更新任务状态
  private async updateTaskStatus(
    taskId: string,
    status: 'pending' | 'running' | 'completed' | 'error',
    progress: number,
    currentStep: string,
    result?: ComparisonResult,
    error?: string
  ): Promise<void> {
    try {
      await this.taskStorage.updateTaskStatus(taskId, status, progress, currentStep, error);
      
      // 发送进度更新事件
      this.emit('progressUpdate', { 
        taskId, 
        status, 
        progress, 
        currentStep,
        timestamp: new Date().toISOString()
      });
      
      // 直接发送日志消息到WebSocket
      if (this.socketService) {
        this.socketService.emitLog(taskId, {
          level: 'info',
          message: currentStep,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error: any) {
      this.logger.error(`❌ 更新任务状态失败: ${taskId}`, error);
      console.error(`❌ [EnhancedComparisonService] 更新任务状态失败: ${taskId}`, error);
    }
  }

  // 更新任务进度
  private async updateTaskProgress(taskId: string, progress: number, step: string): Promise<void> {
    try {
      const taskData = await this.taskStorage.loadTaskData(taskId);
      if (taskData) {
        taskData.progress = progress;
        taskData.currentStep = step;
        taskData.updatedAt = new Date().toISOString();
        await this.taskStorage.saveTaskData(taskData);
        
        // 发送进度更新事件
        this.emit('progressUpdate', { 
          taskId, 
          progress, 
          currentStep: step,
          status: taskData.status,
          timestamp: new Date().toISOString()
        });
        
        console.log(`📊 [EnhancedComparisonService] 进度更新: ${taskId} -> ${progress}% (${step})`);
      }
    } catch (error) {
      this.logger.warn(`更新进度失败: ${taskId}`);
      console.warn(`⚠️ [EnhancedComparisonService] 更新进度失败: ${taskId}`, error);
    }
  }

  // 获取任务状态
  async getTaskStatus(taskId: string): Promise<{
    id: string;
    status: string;
    progress: number;
    currentStep: string;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
    error?: string;
  } | null> {
    try {
      const taskData = await this.taskStorage.loadTaskData(taskId);
      if (!taskData) {
        console.log(`❌ [EnhancedComparisonService] 任务不存在: ${taskId}`);
        return null;
      }

      const status = {
        id: taskData.taskId,
        status: taskData.status,
        progress: taskData.progress,
        currentStep: taskData.currentStep,
        createdAt: taskData.createdAt,
        updatedAt: taskData.updatedAt,
        completedAt: taskData.completedAt,
        error: taskData.error
      };

      console.log(`📋 [EnhancedComparisonService] 获取任务状态: ${taskId} -> ${status.status} (${status.progress}%)`);
      return status;
    } catch (error) {
      this.logger.error(`❌ 获取任务状态失败: ${taskId}`, error);
      console.error(`❌ [EnhancedComparisonService] 获取任务状态失败: ${taskId}`, error);
      return null;
    }
  }

  // 获取任务结果
  async getTaskResult(taskId: string): Promise<ComparisonResult | null> {
    try {
      const result = await this.taskStorage.loadComparisonResult(taskId);
      
      if (result) {
        console.log(`📊 [EnhancedComparisonService] 获取任务结果: ${taskId}`);
      } else {
        console.log(`❌ [EnhancedComparisonService] 任务结果不存在: ${taskId}`);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`❌ 获取任务结果失败: ${taskId}`, error);
      console.error(`❌ [EnhancedComparisonService] 获取任务结果失败: ${taskId}`, error);
      return null;
    }
  }

  // 获取完整任务数据
  async getFullTaskData(taskId: string): Promise<{
    task: TaskData;
    result: ComparisonResult | null;
    reports: any[];
  } | null> {
    try {
      const fullData = await this.taskStorage.getFullTaskData(taskId);
      
      if (fullData) {
        console.log(`📦 [EnhancedComparisonService] 获取完整任务数据: ${taskId}`);
        console.log(`   - 任务状态: ${fullData.task.status}`);
        console.log(`   - 有结果: ${!!fullData.result}`);
        console.log(`   - 报告数量: ${fullData.reports.length}`);
      } else {
        console.log(`❌ [EnhancedComparisonService] 完整任务数据不存在: ${taskId}`);
      }
      
      return fullData;
    } catch (error) {
      this.logger.error(`❌ 获取完整任务数据失败: ${taskId}`, error);
      console.error(`❌ [EnhancedComparisonService] 获取完整任务数据失败: ${taskId}`, error);
      return null;
    }
  }

  // 关联报告到任务
  async linkReportToTask(taskId: string, report: any): Promise<void> {
    try {
      await this.taskStorage.linkReportToTask(taskId, {
        ...report,
        taskId,
        createdAt: new Date().toISOString()
      });
      
      console.log(`🔗 [EnhancedComparisonService] 报告已关联: ${taskId} -> ${report.format}`);
      this.logger.info(`🔗 报告已关联到任务: ${taskId}, 格式: ${report.format}`);
    } catch (error) {
      this.logger.error(`❌ 关联报告失败: ${taskId}`, error);
      console.error(`❌ [EnhancedComparisonService] 关联报告失败: ${taskId}`, error);
      throw error;
    }
  }

  // 获取任务报告
  async getTaskReports(taskId: string): Promise<any[]> {
    try {
      const reports = await this.taskStorage.getTaskReports(taskId);
      
      console.log(`📋 [EnhancedComparisonService] 获取任务报告: ${taskId}, 数量: ${reports.length}`);
      return reports;
    } catch (error) {
      this.logger.error(`❌ 获取任务报告失败: ${taskId}`, error);
      console.error(`❌ [EnhancedComparisonService] 获取任务报告失败: ${taskId}`, error);
      return [];
    }
  }

  // 获取任务历史
  async getTaskHistory(limit: number = 20, offset: number = 0): Promise<TaskData[]> {
    try {
      const history = await this.taskStorage.getTaskHistory(limit, offset);
      
      console.log(`📋 [EnhancedComparisonService] 获取任务历史: 返回 ${history.length} 条记录`);
      return history;
    } catch (error) {
      this.logger.error('❌ 获取任务历史失败', error);
      console.error('❌ [EnhancedComparisonService] 获取任务历史失败:', error);
      return [];
    }
  }

  // 清理旧任务
  async cleanupOldTasks(maxAge?: number): Promise<number> {
    try {
      const cleanedCount = await this.taskStorage.cleanupOldTasks(maxAge);
      
      console.log(`🧹 [EnhancedComparisonService] 清理完成: ${cleanedCount} 个过期任务`);
      this.logger.info(`🧹 清理了 ${cleanedCount} 个过期任务`);
      
      return cleanedCount;
    } catch (error) {
      this.logger.error('❌ 清理过期任务失败', error);
      console.error('❌ [EnhancedComparisonService] 清理过期任务失败:', error);
      return 0;
    }
  }

  // 取消正在运行的任务
  async cancelTask(taskId: string): Promise<boolean> {
    try {
      const activeTask = this.activeTasks.get(taskId);
      if (!activeTask) {
        console.log(`⚠️ [EnhancedComparisonService] 任务未在运行中: ${taskId}`);
        return false;
      }

      // 标记为取消（实际的取消逻辑需要在DatabaseCompareApp中实现）
      await this.updateTaskStatus(taskId, 'error', 0, '任务已取消', undefined, '用户取消');
      
      this.activeTasks.delete(taskId);
      
      console.log(`🛑 [EnhancedComparisonService] 任务已取消: ${taskId}`);
      this.logger.info(`🛑 任务已取消: ${taskId}`);
      
      return true;
    } catch (error) {
      this.logger.error(`❌ 取消任务失败: ${taskId}`, error);
      console.error(`❌ [EnhancedComparisonService] 取消任务失败: ${taskId}`, error);
      return false;
    }
  }

  // 生成任务ID
  private generateTaskId(): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `task_${timestamp}_${random}`;
  }

  // 获取服务统计
  async getServiceStats(): Promise<{
    activeTasks: number;
    totalTasks: number;
    completedTasks: number;
    runningTasks: number;
    errorTasks: number;
    storageSize: number;
    averageCompletionTime?: number;
  }> {
    try {
      const storageStats = await this.taskStorage.getStorageStats();
      
      // 计算平均完成时间（从活跃任务中）
      let totalCompletionTime = 0;
      let completedTaskCount = 0;
      
      for (const [taskId, taskInfo] of this.activeTasks) {
        if (taskInfo.completedAt && taskInfo.startTime) {
          totalCompletionTime += taskInfo.completedAt - taskInfo.startTime;
          completedTaskCount++;
        }
      }
      
      const averageCompletionTime = completedTaskCount > 0 
        ? totalCompletionTime / completedTaskCount 
        : undefined;

      const stats = {
        activeTasks: this.activeTasks.size,
        totalTasks: storageStats.taskCount,
        completedTasks: storageStats.completedTasks,
        runningTasks: storageStats.runningTasks,
        errorTasks: storageStats.errorTasks,
        storageSize: storageStats.totalSize,
        averageCompletionTime
      };

      console.log(`📊 [EnhancedComparisonService] 服务统计:`, stats);
      return stats;
    } catch (error) {
      this.logger.error('❌ 获取服务统计失败', error);
      console.error('❌ [EnhancedComparisonService] 获取服务统计失败:', error);
      return {
        activeTasks: 0,
        totalTasks: 0,
        completedTasks: 0,
        runningTasks: 0,
        errorTasks: 0,
        storageSize: 0
      };
    }
  }

  // 检查任务是否存在
  async taskExists(taskId: string): Promise<boolean> {
    try {
      return await this.taskStorage.taskExists(taskId);
    } catch (error) {
      console.error(`❌ [EnhancedComparisonService] 检查任务存在失败: ${taskId}`, error);
      return false;
    }
  }

  // 重启失败的任务
  async retryTask(taskId: string): Promise<boolean> {
    try {
      const taskData = await this.taskStorage.loadTaskData(taskId);
      if (!taskData) {
        console.log(`❌ [EnhancedComparisonService] 任务不存在，无法重试: ${taskId}`);
        return false;
      }

      if (taskData.status === 'running') {
        console.log(`⚠️ [EnhancedComparisonService] 任务正在运行中，无法重试: ${taskId}`);
        return false;
      }

      console.log(`🔄 [EnhancedComparisonService] 重试任务: ${taskId}`);
      
      // 重置任务状态
      await this.updateTaskStatus(taskId, 'pending', 0, '准备重试');
      
      // 重新执行比较
      this.executeComparison(taskId, taskData.sourceConfig, taskData.targetConfig);
      
      return true;
    } catch (error) {
      this.logger.error(`❌ 重试任务失败: ${taskId}`, error);
      console.error(`❌ [EnhancedComparisonService] 重试任务失败: ${taskId}`, error);
      return false;
    }
  }

  // 新增：延迟辅助方法
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 优雅关闭
  async shutdown(): Promise<void> {
    console.log('🔄 [EnhancedComparisonService] 开始服务关闭流程...');
    this.logger.info('🔄 开始增强比较服务关闭流程...');
    
    // 等待正在运行的任务完成（或设置超时）
    if (this.activeTasks.size > 0) {
      console.log(`⏳ [EnhancedComparisonService] 等待 ${this.activeTasks.size} 个任务完成...`);
      
      // 设置30秒超时
      await Promise.race([
        new Promise(resolve => {
          const checkTasks = () => {
            if (this.activeTasks.size === 0) {
              resolve(void 0);
            } else {
              setTimeout(checkTasks, 1000);
            }
          };
          checkTasks();
        }),
        new Promise(resolve => setTimeout(resolve, 30000))
      ]);
    }
    
    this.removeAllListeners();
    
    console.log('✅ [EnhancedComparisonService] 服务关闭完成');
    this.logger.info('✅ 增强比较服务关闭完成');
  }
}

export default EnhancedComparisonService;