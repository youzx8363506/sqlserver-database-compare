import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { Logger } from '../../src/utils/logger';

// 导入路由
import databaseRoutes from './routes/database';
import compareRoutes, { initializeServices as initCompareServices } from './routes/compare';
import reportsRoutes, { initializeServices as initReportsServices } from './routes/reports';
import configsRoutes from './routes/configs';

// 导入服务
import { SocketService } from './services/SocketService';
import { ComparisonService } from './services/ComparisonService';
import EnhancedComparisonService from './services/EnhancedComparisonService';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000'],
    methods: ['GET', 'POST']
  }
});

// 创建日志器实例
const logger = new Logger('info', path.join(__dirname, '../../logs/web-server.log'));

// 中间件
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000'],
  credentials: true
}));
// 配置 Morgan 日志，同时输出到控制台和文件
const morganFormat = ':remote-addr - - [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';

// 创建写入文件的流
const accessLogStream = require('fs').createWriteStream(path.join(__dirname, '../../logs/web-server.log'), { flags: 'a' });

// 自定义 Morgan 日志格式，写入到 logger
app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      // 移除末尾的换行符并通过 logger 记录
      logger.info(message.trim());
    }
  }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务 - 用于提供报告文件  
const STATIC_REPORTS_DIR = path.join(__dirname, '../reports');
console.log(`📁 [路径检查] 静态文件服务路径 = ${STATIC_REPORTS_DIR}`);
app.use('/reports', express.static(STATIC_REPORTS_DIR));

// API 路由
app.use('/api/database', databaseRoutes);
app.use('/api/compare', compareRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/configs', configsRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 初始化服务
const socketService = new SocketService(io);
const comparisonService = new ComparisonService(socketService); // 保留原有服务兼容性
const enhancedComparisonService = new EnhancedComparisonService();

// 为EnhancedComparisonService注入SocketService
enhancedComparisonService.setSocketService(socketService);

// 设置增强服务的事件监听器
enhancedComparisonService.on('progressUpdate', (data) => {
  console.log(`📊 [进度更新] ${data.taskId}: ${data.progress}% - ${data.currentStep}`);
  socketService.emitProgress(data.taskId, {
    step: data.currentStep,
    percentage: data.progress || 0,
    message: data.currentStep,
    details: data
  });
});

enhancedComparisonService.on('taskCompleted', (data) => {
  console.log(`✅ [任务完成] ${data.taskId}, 报告: ${data.reports?.length || 0} 个`);
  
  // 使用增强的完成通知方法，包含报告信息
  if (data.reports && data.reports.length > 0) {
    socketService.emitCompleteWithReports(data.taskId, data.result, data.reports);
  } else {
    // 回退到原有方法
    socketService.emitComplete(data.taskId, data.result);
  }
});

enhancedComparisonService.on('taskError', (data) => {
  console.log(`❌ [任务错误] ${data.taskId}: ${data.error}`);
  socketService.emitError(data.taskId, data.error);
});

console.log('🔗 [EnhancedComparisonService] 事件监听器设置完成');

// 初始化路由服务—统一使用增强服务
initCompareServices(socketService, enhancedComparisonService);
initReportsServices(enhancedComparisonService); // 报告服务也使用增强服务

// 错误处理
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('服务器错误', error);
  console.error('服务器错误:', error);
  res.status(500).json({
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? error.message : '请稍后重试'
  });
});

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: '接口不存在',
    path: req.originalUrl
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  const startupMsg = `🚀 SQL Server 数据库比较工具 API 服务启动成功`;
  const addressMsg = `📍 服务地址: http://localhost:${PORT}`;
  const healthMsg = `📋 健康检查: http://localhost:${PORT}/api/health`;
  const socketMsg = `📊 WebSocket: ws://localhost:${PORT}`;
  const versionMsg = `🔧 代码版本: 2025-08-20-v4 (新增任务数据缓存和会话恢复功能)`;
  const cwdMsg = `📁 工作目录: ${process.cwd()}`;
  const dirMsg = `📂 脚本目录: ${__dirname}`;
  
  console.log(startupMsg);
  console.log(addressMsg);
  console.log(healthMsg);
  console.log(socketMsg);
  console.log(versionMsg);
  console.log(cwdMsg);
  console.log(dirMsg);
  
  // 同时记录到日志文件
  logger.info(startupMsg);
  logger.info(addressMsg);
  logger.info(healthMsg);
  logger.info(socketMsg);
  logger.info(versionMsg);
  logger.info(cwdMsg);
  logger.info(dirMsg);
});

export { io };