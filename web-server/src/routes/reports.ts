import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { HtmlReporter } from '../../../src/reporters/html';
import { ExcelReporter } from '../../../src/reporters/excel';
import { JsonReporter } from '../../../src/reporters/json';
import { Logger } from '../../../src/utils/logger';

// 这些服务需要在路由初始化时注入，避免循环依赖
let comparisonService: any;

const router = express.Router();

// 初始化服务的函数，由主应用调用
export const initializeServices = (comparisonSvc: any) => {
  comparisonService = comparisonSvc;
};

const logger = new Logger('info', path.join(__dirname, '../../../logs/web-server.log'));

// 报告文件存储目录 - 优先使用环境变量，否则使用Web服务根目录下的reports
const REPORTS_DIR = process.env.REPORTS_DIR || path.join(__dirname, '../../reports');
console.log(`📁 [路径检查] REPORTS_DIR = ${REPORTS_DIR}`);
console.log(`📁 [路径检查] __dirname = ${__dirname}`);

// 确保报告目录存在
const ensureReportsDir = async () => {
  try {
    await fs.access(REPORTS_DIR);
  } catch {
    await fs.mkdir(REPORTS_DIR, { recursive: true });
  }
};

// 生成报告
router.post('/generate/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { format = 'html', options = {} } = req.body;
    
    console.log(`📋 [报告生成] 开始处理请求 - 任务ID: ${taskId}, 格式: ${format}`);
    
    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: '任务ID不能为空'
      });
    }

    const result = comparisonService.getTaskResult(taskId);
    
    if (!result) {
      console.log(`❌ [报告生成] 任务结果不存在: ${taskId}`);
      return res.status(404).json({
        success: false,
        error: '任务结果不存在或任务尚未完成'
      });
    }

    console.log(`✅ [报告生成] 找到任务结果，开始生成${format.toUpperCase()}报告`);
    await ensureReportsDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseFileName = `comparison-${taskId}-${timestamp}`;
    
    let reporter;
    let expectedFileName;
    let mimeType;

    switch (format.toLowerCase()) {
      case 'html':
        reporter = new HtmlReporter(logger);
        expectedFileName = `${baseFileName}.html`;
        mimeType = 'text/html';
        break;
      case 'excel':
        reporter = new ExcelReporter(logger);
        expectedFileName = `${baseFileName}.xlsx`;
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case 'json':
        reporter = new JsonReporter(logger);
        expectedFileName = `${baseFileName}.json`;
        mimeType = 'application/json';
        break;
      default:
        return res.status(400).json({
          success: false,
          error: '不支持的报告格式。支持的格式: html, excel, json'
        });
    }

    const expectedFilePath = path.join(REPORTS_DIR, expectedFileName);
    console.log(`📁 [报告生成] 预期文件路径: ${expectedFilePath}`);
    
    // 生成报告 - 使用Reporter返回的实际文件路径
    let actualFilePath;
    try {
      actualFilePath = await reporter.generateReport(result, expectedFilePath);
      console.log(`✅ [报告生成] Reporter返回的实际文件路径: ${actualFilePath}`);
    } catch (reporterError: any) {
      console.error(`❌ [报告生成] Reporter生成失败:`, reporterError);
      throw new Error(`报告生成失败: ${reporterError.message}`);
    }

    // 检查实际生成的文件是否存在
    let finalFilePath = actualFilePath || expectedFilePath;
    try {
      await fs.access(finalFilePath);
      console.log(`✅ [报告生成] 文件存在确认: ${finalFilePath}`);
    } catch (accessError) {
      console.error(`❌ [报告生成] 文件不存在: ${finalFilePath}`, accessError);
      
      // 尝试检查预期路径
      try {
        await fs.access(expectedFilePath);
        finalFilePath = expectedFilePath;
        console.log(`✅ [报告生成] 使用预期路径: ${expectedFilePath}`);
      } catch {
        throw new Error(`报告文件生成失败，文件不存在: ${finalFilePath}`);
      }
    }

    // 获取文件大小和最终文件名
    const stats = await fs.stat(finalFilePath);
    const actualFileName = path.basename(finalFilePath);
    
    console.log(`✅ [报告生成] 报告生成成功 - 文件: ${actualFileName}, 大小: ${stats.size} bytes`);

    res.json({
      success: true,
      report: {
        taskId,
        format,
        fileName: actualFileName,
        filePath: `/reports/${actualFileName}`,
        downloadUrl: `http://localhost:${process.env.PORT || 3001}/reports/${actualFileName}`,
        size: stats.size,
        createdAt: new Date().toISOString(),
        mimeType
      }
    });

  } catch (error: any) {
    console.error('❌ [报告生成] 生成报告失败:', error);
    console.error('❌ [报告生成] 错误堆栈:', error.stack);
    res.status(500).json({
      success: false,
      error: '生成报告失败',
      details: error.message
    });
  }
});

// 获取所有可用报告列表
router.get('/list', async (req, res) => {
  try {
    console.log(`📋 [报告列表] 收到获取报告列表请求`);
    console.log(`📁 [报告列表] 报告目录: ${REPORTS_DIR}`);
    
    await ensureReportsDir();
    
    const files = await fs.readdir(REPORTS_DIR);
    console.log(`📂 [报告列表] 扫描到 ${files.length} 个文件:`, files);
    
    const reports = [];
    
    // 获取当前请求的主机信息，用于生成完整的下载链接
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    console.log(`🌐 [报告列表] 基础URL: ${baseUrl}`);

    for (const file of files) {
      const filePath = path.join(REPORTS_DIR, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile()) {
        const ext = path.extname(file).toLowerCase();
        let format = 'unknown';
        let mimeType = 'application/octet-stream';

        switch (ext) {
          case '.html':
            format = 'html';
            mimeType = 'text/html';
            break;
          case '.xlsx':
            format = 'excel';
            mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            break;
          case '.json':
            format = 'json';
            mimeType = 'application/json';
            break;
        }

        // 尝试从文件名提取任务ID - 支持新旧两种格式
        // 新格式: comparison-{taskId}-{timestamp}.ext
        // 旧格式: database-comparison_{timestamp}.ext (无taskId)
        let taskId = null;
        const newFormatMatch = file.match(/comparison-([a-f0-9-]{36})-/);
        if (newFormatMatch) {
          taskId = newFormatMatch[1];
        }
        // 如果是旧格式文件，taskId保持为null

        reports.push({
          fileName: file,
          format,
          taskId,
          size: stats.size,
          createdAt: stats.ctime.toISOString(),
          modifiedAt: stats.mtime.toISOString(),
          downloadUrl: `${baseUrl}/reports/${encodeURIComponent(file)}`,
          viewUrl: `${baseUrl}/reports/${encodeURIComponent(file)}`,
          mimeType
        });
      }
    }

    // 按修改时间降序排列
    reports.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

    console.log(`✅ [报告列表] 成功处理 ${reports.length} 个报告文件`);
    console.log(`📄 [报告列表] 报告详情:`, reports.map(r => ({
      fileName: r.fileName,
      format: r.format,
      size: r.size,
      taskId: r.taskId
    })));

    res.json({
      success: true,
      reports,
      count: reports.length
    });

  } catch (error: any) {
    console.error('获取报告列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取报告列表失败',
      details: error.message
    });
  }
});

// 获取特定报告信息
router.get('/info/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    
    if (!fileName) {
      return res.status(400).json({
        success: false,
        error: '文件名不能为空'
      });
    }

    const filePath = path.join(REPORTS_DIR, fileName);
    
    try {
      const stats = await fs.stat(filePath);
      
      if (!stats.isFile()) {
        return res.status(404).json({
          success: false,
          error: '文件不存在'
        });
      }

      const ext = path.extname(fileName).toLowerCase();
      let format = 'unknown';
      let mimeType = 'application/octet-stream';

      switch (ext) {
        case '.html':
          format = 'html';
          mimeType = 'text/html';
          break;
        case '.xlsx':
          format = 'excel';
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        case '.json':
          format = 'json';
          mimeType = 'application/json';
          break;
      }

      const taskIdMatch = fileName.match(/comparison-([a-f0-9-]+)-/);
      const taskId = taskIdMatch ? taskIdMatch[1] : null;

      res.json({
        success: true,
        report: {
          fileName,
          format,
          taskId,
          size: stats.size,
          createdAt: stats.ctime.toISOString(),
          modifiedAt: stats.mtime.toISOString(),
          downloadUrl: `http://localhost:${process.env.PORT || 3001}/reports/${fileName}`,
          mimeType
        }
      });

    } catch {
      return res.status(404).json({
        success: false,
        error: '文件不存在'
      });
    }

  } catch (error: any) {
    console.error('获取报告信息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取报告信息失败',
      details: error.message
    });
  }
});

// 删除报告文件
router.delete('/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    
    if (!fileName) {
      return res.status(400).json({
        success: false,
        error: '文件名不能为空'
      });
    }

    const filePath = path.join(REPORTS_DIR, fileName);
    
    try {
      await fs.access(filePath);
      await fs.unlink(filePath);
      
      res.json({
        success: true,
        message: '报告文件删除成功'
      });

    } catch {
      return res.status(404).json({
        success: false,
        error: '文件不存在'
      });
    }

  } catch (error: any) {
    console.error('删除报告文件失败:', error);
    res.status(500).json({
      success: false,
      error: '删除报告文件失败',
      details: error.message
    });
  }
});

// 批量删除过期报告（超过指定天数）
router.delete('/cleanup/:days', async (req, res) => {
  try {
    const { days } = req.params;
    const daysNum = parseInt(days);
    
    if (isNaN(daysNum) || daysNum < 1) {
      return res.status(400).json({
        success: false,
        error: '天数必须是大于0的整数'
      });
    }

    await ensureReportsDir();
    
    const files = await fs.readdir(REPORTS_DIR);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysNum);
    
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(REPORTS_DIR, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile() && stats.mtime < cutoffDate) {
        try {
          await fs.unlink(filePath);
          deletedCount++;
        } catch (error) {
          console.error(`删除文件 ${file} 失败:`, error);
        }
      }
    }

    res.json({
      success: true,
      message: `清理完成，删除了 ${deletedCount} 个过期报告文件`,
      deletedCount
    });

  } catch (error: any) {
    console.error('清理报告文件失败:', error);
    res.status(500).json({
      success: false,
      error: '清理报告文件失败',
      details: error.message
    });
  }
});

export default router;