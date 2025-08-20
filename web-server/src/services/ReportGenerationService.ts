import { HtmlReporter, ExcelReporter, JsonReporter } from '../../../src/reporters';
import { ComparisonResult } from '../../../src/types';
import { SocketService } from './SocketService';
import TaskDataStorage from './TaskDataStorage';
import { Logger } from '../../../src/utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

// 报告类型定义
export interface Report {
  taskId: string;
  fileName: string;
  format: 'html' | 'excel' | 'json';
  filePath: string;
  size: number;
  downloadUrl: string;
  viewUrl?: string;
  createdAt: string;
}

// 报告生成选项
interface ReportGenerationOptions {
  autoGenerateReports?: boolean;
  reportFormats?: ('html' | 'excel' | 'json')[];
  defaultReportFormat?: 'html' | 'excel' | 'json';
}

export class ReportGenerationService {
  private socketService: SocketService;
  private taskStorage: TaskDataStorage;
  private logger: Logger;

  constructor(socketService: SocketService, taskStorage: TaskDataStorage, logger?: Logger) {
    this.socketService = socketService;
    this.taskStorage = taskStorage;
    this.logger = logger || new Logger('info' as any, path.join(process.cwd(), 'logs', 'report-generation.log'));
    
    console.log('📊 [ReportGenerationService] 报告生成服务初始化完成');
    this.logger.info('📊 报告生成服务初始化完成');
  }

  /**
   * 为任务生成报告
   */
  async generateReportsForTask(
    taskId: string,
    result: ComparisonResult,
    options: ReportGenerationOptions = {}
  ): Promise<Report[]> {
    console.log(`🚀 [ReportGenerationService] 开始为任务 ${taskId} 生成报告`);
    this.logger.info(`开始为任务 ${taskId} 生成报告`);

    const reports: Report[] = [];
    
    // 确定要生成的报告格式
    const formats = this.determineFormats(options);
    console.log(`📋 [ReportGenerationService] 将生成 ${formats.length} 种格式的报告: ${formats.join(', ')}`);

    for (let i = 0; i < formats.length; i++) {
      const format = formats[i];
      const baseProgress = 70; // 比较完成后的基础进度
      const reportProgress = Math.round(((i + 1) / formats.length) * 30); // 30%进度分配给报告生成

      try {
        console.log(`📄 [ReportGenerationService] 开始生成 ${format.toUpperCase()} 格式报告 (${i + 1}/${formats.length})`);
        
        // 发送报告生成进度
        this.emitReportProgress(taskId, {
          format,
          step: 'generating',
          percentage: baseProgress + reportProgress,
          message: `正在生成${format.toUpperCase()}格式报告...`,
          currentFile: `report.${format}`,
          totalFiles: formats.length,
          completedFiles: i
        });

        // 生成单个报告
        const report = await this.generateSingleReport(taskId, format, result);
        reports.push(report);

        // 关联报告到任务
        await this.taskStorage.linkReportToTask(taskId, {
          ...report,
          taskId,
          createdAt: report.createdAt
        });

        console.log(`✅ [ReportGenerationService] ${format.toUpperCase()} 报告生成完成: ${report.fileName}`);
        this.logger.info(`${format.toUpperCase()} 报告生成完成: ${report.fileName}`);

      } catch (error: any) {
        console.error(`❌ [ReportGenerationService] 生成${format}格式报告失败:`, error);
        this.logger.error(`生成${format}格式报告失败: ${error.message}`, error);
        
        // 发送错误进度，但继续处理其他格式
        this.emitReportProgress(taskId, {
          format,
          step: 'error',
          percentage: baseProgress + reportProgress,
          message: `生成${format.toUpperCase()}报告时出错: ${error.message}`,
          currentFile: `report.${format}`,
          totalFiles: formats.length,
          completedFiles: i
        });
      }
    }

    // 发送报告生成完成通知
    if (reports.length > 0) {
      this.emitReportProgress(taskId, {
        format: 'all',
        step: 'completed',
        percentage: 100,
        message: `报告生成完成！共生成 ${reports.length} 个报告文件`,
        totalFiles: formats.length,
        completedFiles: reports.length
      });
    }

    console.log(`🎉 [ReportGenerationService] 任务 ${taskId} 报告生成完成，共 ${reports.length} 个文件`);
    this.logger.info(`任务 ${taskId} 报告生成完成，共 ${reports.length} 个文件`);

    return reports;
  }

  /**
   * 生成单个报告
   */
  private async generateSingleReport(
    taskId: string,
    format: 'html' | 'excel' | 'json',
    result: ComparisonResult
  ): Promise<Report> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `database-comparison-${taskId}-${timestamp}.${format === 'excel' ? 'xlsx' : format}`;
    const outputPath = path.join(this.getReportsDirectory(), fileName);

    console.log(`📝 [ReportGenerationService] 开始生成 ${format} 报告: ${fileName}`);

    // 选择对应的报告生成器
    let reporter;
    switch (format) {
      case 'html':
        reporter = new HtmlReporter(this.logger);
        break;
      case 'excel':
        reporter = new ExcelReporter(this.logger);
        break;
      case 'json':
        reporter = new JsonReporter(this.logger);
        break;
      default:
        throw new Error(`不支持的报告格式: ${format}`);
    }

    // 生成报告文件
    const filePath = await reporter.generateReport(result, outputPath);
    console.log(`📄 [ReportGenerationService] 报告文件已生成: ${filePath}`);

    // 获取文件信息
    const stats = await fs.stat(filePath);

    // 构建报告对象
    const report: Report = {
      taskId,
      fileName,
      format,
      filePath,
      size: stats.size,
      downloadUrl: `/reports/${fileName}`,
      viewUrl: format === 'html' ? `/reports/${fileName}` : undefined,
      createdAt: new Date().toISOString()
    };

    console.log(`✅ [ReportGenerationService] 报告对象创建完成:`, {
      fileName: report.fileName,
      format: report.format,
      size: `${(report.size / 1024).toFixed(1)} KB`
    });

    return report;
  }

  /**
   * 确定要生成的报告格式
   */
  private determineFormats(options: ReportGenerationOptions): ('html' | 'excel' | 'json')[] {
    // 如果明确指定了格式，使用指定的格式
    if (options.reportFormats && options.reportFormats.length > 0) {
      return options.reportFormats;
    }

    // 如果有默认格式，使用默认格式
    if (options.defaultReportFormat) {
      return [options.defaultReportFormat];
    }

    // 默认生成HTML格式
    return ['html'];
  }

  /**
   * 获取报告存储目录
   */
  private getReportsDirectory(): string {
    // 检查环境变量中的报告目录
    const envReportsDir = process.env.REPORTS_DIR;
    if (envReportsDir) {
      return path.resolve(envReportsDir);
    }

    // 默认使用项目根目录下的reports目录
    const defaultReportsDir = path.join(process.cwd(), 'reports');
    
    // 确保目录存在
    this.ensureDirectoryExists(defaultReportsDir);
    
    return defaultReportsDir;
  }

  /**
   * 确保目录存在
   */
  private async ensureDirectoryExists(dir: string): Promise<void> {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error: any) {
      console.error(`❌ [ReportGenerationService] 创建报告目录失败: ${dir}`, error);
      throw new Error(`无法创建报告目录: ${error.message}`);
    }
  }

  /**
   * 发送报告生成进度
   */
  private emitReportProgress(taskId: string, progress: {
    format: string;
    step: string;
    percentage: number;
    message: string;
    currentFile?: string;
    totalFiles?: number;
    completedFiles?: number;
  }): void {
    console.log(`📊 [ReportGenerationService] 发送报告进度: ${taskId}`, progress);
    
    // 发送给SocketService
    if (this.socketService && typeof this.socketService.emitReportProgress === 'function') {
      this.socketService.emitReportProgress(taskId, progress);
    }

    // 同时发送普通进度更新
    if (this.socketService && typeof this.socketService.emitProgress === 'function') {
      this.socketService.emitProgress(taskId, {
        step: 'report-generation',
        percentage: progress.percentage,
        message: progress.message,
        details: {
          format: progress.format,
          currentFile: progress.currentFile,
          totalFiles: progress.totalFiles,
          completedFiles: progress.completedFiles
        }
      });
    }
  }

  /**
   * 生成单个格式的报告（公共方法，供API直接调用）
   */
  async generateReport(
    taskId: string,
    format: 'html' | 'excel' | 'json',
    result?: ComparisonResult
  ): Promise<Report> {
    console.log(`🚀 [ReportGenerationService] API调用生成单个报告: ${taskId}, ${format}`);

    // 如果没有提供结果，从存储中加载
    let finalResult: ComparisonResult;
    if (result) {
      finalResult = result;
    } else {
      const loadedResult = await this.taskStorage.loadComparisonResult(taskId);
      if (!loadedResult) {
        throw new Error(`找不到任务 ${taskId} 的比较结果`);
      }
      finalResult = loadedResult;
    }

    return this.generateSingleReport(taskId, format, finalResult);
  }
}