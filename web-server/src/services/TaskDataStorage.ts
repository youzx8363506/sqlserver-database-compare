import * as fs from 'fs/promises';
import * as path from 'path';
import { ComparisonResult, DatabaseConfig } from '../../../src/types';
import { Logger } from '../../../src/utils/logger';

interface TaskData {
  taskId: string;
  sourceConfig: DatabaseConfig;
  targetConfig: DatabaseConfig;
  result?: ComparisonResult;
  reports?: TaskReport[];
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  currentStep: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

interface TaskReport {
  fileName: string;
  format: 'html' | 'excel' | 'json';
  filePath: string;
  downloadUrl: string;
  viewUrl?: string;
  size: number;
  createdAt: string;
  taskId: string;
}

class TaskDataStorage {
  private dataDir: string;
  private tasksDir: string;
  private resultsDir: string;
  private logger: Logger;

  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.tasksDir = path.join(this.dataDir, 'tasks');
    this.resultsDir = path.join(this.dataDir, 'results');
    this.logger = new Logger('info' as any, path.join(process.cwd(), 'logs', 'task-storage.log'));
    
    this.initializeDirectories();
  }

  // 初始化目录结构
  private async initializeDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(this.tasksDir, { recursive: true });
      await fs.mkdir(this.resultsDir, { recursive: true });
      
      this.logger.info('📁 任务存储目录初始化完成');
      console.log('📁 [TaskDataStorage] 存储目录初始化完成');
      console.log(`   - 数据目录: ${this.dataDir}`);
      console.log(`   - 任务目录: ${this.tasksDir}`);
      console.log(`   - 结果目录: ${this.resultsDir}`);
    } catch (error) {
      this.logger.error('❌ 初始化存储目录失败', error);
      console.error('❌ [TaskDataStorage] 初始化存储目录失败:', error);
      throw error;
    }
  }

  // 保存任务数据
  async saveTaskData(taskData: TaskData): Promise<void> {
    try {
      const filePath = this.getTaskFilePath(taskData.taskId);
      
      // 更新时间戳
      taskData.updatedAt = new Date().toISOString();
      
      await fs.writeFile(filePath, JSON.stringify(taskData, null, 2), 'utf8');
      
      this.logger.info(`💾 任务数据已保存: ${taskData.taskId}`);
      console.log(`💾 [TaskDataStorage] 任务数据已保存: ${taskData.taskId}, 状态: ${taskData.status}`);
    } catch (error) {
      this.logger.error(`❌ 保存任务数据失败: ${taskData.taskId}`, error);
      console.error(`❌ [TaskDataStorage] 保存任务数据失败: ${taskData.taskId}`, error);
      throw error;
    }
  }

  // 读取任务数据
  async loadTaskData(taskId: string): Promise<TaskData | null> {
    try {
      const filePath = this.getTaskFilePath(taskId);
      const data = await fs.readFile(filePath, 'utf8');
      const taskData = JSON.parse(data);
      
      console.log(`📋 [TaskDataStorage] 读取任务数据: ${taskId}, 状态: ${taskData.status}`);
      return taskData;
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        this.logger.error(`❌ 读取任务数据失败: ${taskId}`, error);
        console.error(`❌ [TaskDataStorage] 读取任务数据失败: ${taskId}`, error);
      }
      return null;
    }
  }

  // 保存比较结果
  async saveComparisonResult(taskId: string, result: ComparisonResult): Promise<void> {
    try {
      const filePath = this.getResultFilePath(taskId);
      await fs.writeFile(filePath, JSON.stringify(result, null, 2), 'utf8');
      
      this.logger.info(`📊 比较结果已保存: ${taskId}`);
      console.log(`📊 [TaskDataStorage] 比较结果已保存: ${taskId}`);
    } catch (error) {
      this.logger.error(`❌ 保存比较结果失败: ${taskId}`, error);
      console.error(`❌ [TaskDataStorage] 保存比较结果失败: ${taskId}`, error);
      throw error;
    }
  }

  // 读取比较结果
  async loadComparisonResult(taskId: string): Promise<ComparisonResult | null> {
    try {
      const filePath = this.getResultFilePath(taskId);
      const data = await fs.readFile(filePath, 'utf8');
      const result = JSON.parse(data);
      
      // 修复日期反序列化问题：将timestamp字符串转换回Date对象
      if (result.timestamp && typeof result.timestamp === 'string') {
        result.timestamp = new Date(result.timestamp);
      }
      
      console.log(`📊 [TaskDataStorage] 读取比较结果: ${taskId}`);
      console.log(`📅 [TaskDataStorage] 时间戳类型: ${typeof result.timestamp}, 值: ${result.timestamp}`);
      return result;
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        this.logger.error(`❌ 读取比较结果失败: ${taskId}`, error);
        console.error(`❌ [TaskDataStorage] 读取比较结果失败: ${taskId}`, error);
      }
      return null;
    }
  }

  // 关联报告到任务
  async linkReportToTask(taskId: string, report: TaskReport): Promise<void> {
    try {
      const taskData = await this.loadTaskData(taskId);
      if (!taskData) {
        throw new Error(`任务不存在: ${taskId}`);
      }

      if (!taskData.reports) {
        taskData.reports = [];
      }

      // 检查是否已存在同格式的报告，如果存在则替换
      const existingIndex = taskData.reports.findIndex(r => r.format === report.format);
      if (existingIndex >= 0) {
        taskData.reports[existingIndex] = report;
        console.log(`🔄 [TaskDataStorage] 替换已存在的${report.format}格式报告: ${taskId}`);
      } else {
        taskData.reports.push(report);
        console.log(`➕ [TaskDataStorage] 添加新报告: ${taskId}, 格式: ${report.format}`);
      }

      await this.saveTaskData(taskData);
      
      this.logger.info(`🔗 报告已关联到任务: ${taskId}, 格式: ${report.format}`);
    } catch (error) {
      this.logger.error(`❌ 关联报告失败: ${taskId}`, error);
      console.error(`❌ [TaskDataStorage] 关联报告失败: ${taskId}`, error);
      throw error;
    }
  }

  // 获取任务的所有报告
  async getTaskReports(taskId: string): Promise<TaskReport[]> {
    try {
      const taskData = await this.loadTaskData(taskId);
      const reports = taskData?.reports || [];
      
      console.log(`📋 [TaskDataStorage] 获取任务报告: ${taskId}, 数量: ${reports.length}`);
      return reports;
    } catch (error) {
      this.logger.error(`❌ 获取任务报告失败: ${taskId}`, error);
      console.error(`❌ [TaskDataStorage] 获取任务报告失败: ${taskId}`, error);
      return [];
    }
  }

  // 获取完整的任务信息（包含结果和报告）
  async getFullTaskData(taskId: string): Promise<{
    task: TaskData;
    result: ComparisonResult | null;
    reports: TaskReport[];
  } | null> {
    try {
      const taskData = await this.loadTaskData(taskId);
      if (!taskData) {
        console.log(`❌ [TaskDataStorage] 任务不存在: ${taskId}`);
        return null;
      }

      const [result, reports] = await Promise.all([
        this.loadComparisonResult(taskId),
        this.getTaskReports(taskId)
      ]);

      console.log(`📦 [TaskDataStorage] 获取完整任务数据: ${taskId}`);
      console.log(`   - 任务状态: ${taskData.status}`);
      console.log(`   - 有结果: ${!!result}`);
      console.log(`   - 报告数量: ${reports.length}`);

      return {
        task: taskData,
        result,
        reports
      };
    } catch (error) {
      this.logger.error(`❌ 获取完整任务数据失败: ${taskId}`, error);
      console.error(`❌ [TaskDataStorage] 获取完整任务数据失败: ${taskId}`, error);
      return null;
    }
  }

  // 获取任务历史列表
  async getTaskHistory(limit: number = 20, offset: number = 0): Promise<TaskData[]> {
    try {
      const files = await fs.readdir(this.tasksDir);
      const tasks: TaskData[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(this.tasksDir, file);
            const data = await fs.readFile(filePath, 'utf8');
            const taskData = JSON.parse(data);
            
            // 验证数据完整性
            if (taskData.taskId && taskData.createdAt) {
              tasks.push(taskData);
            } else {
              console.warn(`⚠️ [TaskDataStorage] 跳过不完整的任务文件: ${file}`);
            }
          } catch (error) {
            this.logger.warn(`跳过损坏的任务文件: ${file}`);
            console.warn(`⚠️ [TaskDataStorage] 跳过损坏的任务文件: ${file}`, error);
          }
        }
      }

      // 按创建时间排序
      tasks.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const result = tasks.slice(offset, offset + limit);
      
      console.log(`📋 [TaskDataStorage] 获取任务历史: 总数${tasks.length}, 返回${result.length}条`);
      return result;
    } catch (error) {
      this.logger.error('❌ 获取任务历史失败', error);
      console.error('❌ [TaskDataStorage] 获取任务历史失败:', error);
      return [];
    }
  }

  // 更新任务状态
  async updateTaskStatus(
    taskId: string,
    status: TaskData['status'],
    progress?: number,
    currentStep?: string,
    error?: string
  ): Promise<void> {
    try {
      const taskData = await this.loadTaskData(taskId);
      if (!taskData) {
        console.warn(`⚠️ [TaskDataStorage] 尝试更新不存在的任务: ${taskId}`);
        return;
      }

      taskData.status = status;
      taskData.updatedAt = new Date().toISOString();

      if (progress !== undefined) {
        taskData.progress = progress;
      }

      if (currentStep !== undefined) {
        taskData.currentStep = currentStep;
      }

      if (error) {
        taskData.error = error;
      }

      if (status === 'completed') {
        taskData.completedAt = new Date().toISOString();
        taskData.progress = 100;
      }

      await this.saveTaskData(taskData);
      
      console.log(`📊 [TaskDataStorage] 更新任务状态: ${taskId} -> ${status} (${progress}%)`);
    } catch (error) {
      this.logger.error(`❌ 更新任务状态失败: ${taskId}`, error);
      console.error(`❌ [TaskDataStorage] 更新任务状态失败: ${taskId}`, error);
      throw error;
    }
  }

  // 清理过期任务
  async cleanupOldTasks(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<number> {
    try {
      const files = await fs.readdir(this.tasksDir);
      const now = Date.now();
      let cleanedCount = 0;

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(this.tasksDir, file);
            const data = await fs.readFile(filePath, 'utf8');
            const taskData = JSON.parse(data);
            
            const age = now - new Date(taskData.createdAt).getTime();
            if (age > maxAge) {
              // 删除任务文件
              await fs.unlink(filePath);
              
              // 删除对应的结果文件
              const resultPath = this.getResultFilePath(taskData.taskId);
              await fs.unlink(resultPath).catch(() => {}); // 忽略不存在的文件
              
              cleanedCount++;
              console.log(`🗑️ [TaskDataStorage] 清理过期任务: ${taskData.taskId}`);
            }
          } catch (error) {
            this.logger.warn(`清理任务文件失败: ${file}`);
            console.warn(`⚠️ [TaskDataStorage] 清理任务文件失败: ${file}`, error);
          }
        }
      }

      this.logger.info(`🧹 清理了 ${cleanedCount} 个过期任务`);
      console.log(`🧹 [TaskDataStorage] 清理完成，共清理 ${cleanedCount} 个过期任务`);
      return cleanedCount;
    } catch (error) {
      this.logger.error('❌ 清理过期任务失败', error);
      console.error('❌ [TaskDataStorage] 清理过期任务失败:', error);
      return 0;
    }
  }

  // 获取文件路径
  private getTaskFilePath(taskId: string): string {
    return path.join(this.tasksDir, `${taskId}.json`);
  }

  private getResultFilePath(taskId: string): string {
    return path.join(this.resultsDir, `${taskId}.json`);
  }

  // 获取存储统计信息
  async getStorageStats(): Promise<{
    taskCount: number;
    resultCount: number;
    totalSize: number;
    completedTasks: number;
    runningTasks: number;
    errorTasks: number;
  }> {
    try {
      const [taskFiles, resultFiles] = await Promise.all([
        fs.readdir(this.tasksDir),
        fs.readdir(this.resultsDir)
      ]);

      let totalSize = 0;
      let completedTasks = 0;
      let runningTasks = 0;
      let errorTasks = 0;
      
      // 计算任务文件大小和统计状态
      for (const file of taskFiles) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(this.tasksDir, file);
            const stat = await fs.stat(filePath);
            totalSize += stat.size;
            
            // 读取任务状态
            const data = await fs.readFile(filePath, 'utf8');
            const taskData = JSON.parse(data);
            
            switch (taskData.status) {
              case 'completed':
                completedTasks++;
                break;
              case 'running':
                runningTasks++;
                break;
              case 'error':
                errorTasks++;
                break;
            }
          } catch (error) {
            // 忽略错误文件
          }
        }
      }

      // 计算结果文件大小
      for (const file of resultFiles) {
        if (file.endsWith('.json')) {
          try {
            const stat = await fs.stat(path.join(this.resultsDir, file));
            totalSize += stat.size;
          } catch (error) {
            // 忽略错误
          }
        }
      }

      const stats = {
        taskCount: taskFiles.filter(f => f.endsWith('.json')).length,
        resultCount: resultFiles.filter(f => f.endsWith('.json')).length,
        totalSize,
        completedTasks,
        runningTasks,
        errorTasks
      };

      console.log(`📊 [TaskDataStorage] 存储统计:`, stats);
      return stats;
    } catch (error) {
      this.logger.error('❌ 获取存储统计失败', error);
      console.error('❌ [TaskDataStorage] 获取存储统计失败:', error);
      return { 
        taskCount: 0, 
        resultCount: 0, 
        totalSize: 0,
        completedTasks: 0,
        runningTasks: 0,
        errorTasks: 0
      };
    }
  }

  // 检查任务是否存在
  async taskExists(taskId: string): Promise<boolean> {
    try {
      const filePath = this.getTaskFilePath(taskId);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // 格式化存储大小
  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 获取存储使用情况描述
  async getStorageUsageDescription(): Promise<string> {
    const stats = await this.getStorageStats();
    return `存储了 ${stats.taskCount} 个任务，${stats.resultCount} 个结果，占用 ${this.formatSize(stats.totalSize)} 空间`;
  }
}

export default TaskDataStorage;
export type { TaskData, TaskReport };