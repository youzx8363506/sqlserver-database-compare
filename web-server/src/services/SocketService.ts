import { Server } from 'socket.io';
import { Logger } from '../../../src/utils/logger';
import path from 'path';

export class SocketService {
  private io: Server;
  private logger: Logger;

  constructor(io: Server) {
    this.io = io;
    this.logger = new Logger('info', path.join(__dirname, '../../../logs/web-server.log'));
    this.setupEvents();
  }

  private setupEvents() {
    this.io.on('connection', (socket) => {
      const connectMsg = `客户端连接: ${socket.id}`;
      console.log(connectMsg);
      this.logger.info(connectMsg);

      // 客户端加入特定任务房间
      socket.on('join-task', (taskId: string) => {
        socket.join(`task-${taskId}`);
        const joinMsg = `客户端 ${socket.id} 加入任务房间: task-${taskId}`;
        console.log(joinMsg);
        this.logger.info(joinMsg);
      });

      // 客户端离开任务房间
      socket.on('leave-task', (taskId: string) => {
        socket.leave(`task-${taskId}`);
        const leaveMsg = `客户端 ${socket.id} 离开任务房间: task-${taskId}`;
        console.log(leaveMsg);
        this.logger.info(leaveMsg);
      });

      socket.on('disconnect', () => {
        const disconnectMsg = `客户端断开连接: ${socket.id}`;
        console.log(disconnectMsg);
        this.logger.info(disconnectMsg);
      });
    });
  }

  // 发送比较进度更新
  public emitProgress(taskId: string, progress: {
    step: string;
    percentage: number;
    message: string;
    details?: any;
  }) {
    console.log(`🔔 [SocketService] 发送进度更新到房间 task-${taskId}:`, progress);
    this.logger.info(`发送进度更新到任务 ${taskId}: ${progress.step} (${progress.percentage}%)`);
    this.io.to(`task-${taskId}`).emit('comparison-progress', progress);
  }

  // 发送比较完成通知
  public emitComplete(taskId: string, result: any) {
    console.log(`🎉 [SocketService] 发送完成通知到房间 task-${taskId}:`, {
      taskId,
      resultStatus: result?.summary?.overallStatus,
      tablesCount: result?.summary?.totalTables
    });
    this.logger.info(`发送完成通知到任务 ${taskId}: ${result?.summary?.overallStatus || '未知状态'}`);
    
    // 检查房间中是否有客户端
    const room = this.io.sockets.adapter.rooms.get(`task-${taskId}`);
    const clientCount = room ? room.size : 0;
    console.log(`🔍 [SocketService] 房间 task-${taskId} 中有 ${clientCount} 个客户端`);
    this.logger.info(`目标房间 task-${taskId} 中有 ${clientCount} 个客户端`);
    
    this.io.to(`task-${taskId}`).emit('comparison-complete', result);
  }

  // 发送错误通知
  public emitError(taskId: string, error: any) {
    console.log(`❌ [SocketService] 发送错误通知到房间 task-${taskId}:`, error);
    this.logger.error(`发送错误通知到任务 ${taskId}: ${error.error || error.message}`);
    
    // 检查房间中是否有客户端
    const room = this.io.sockets.adapter.rooms.get(`task-${taskId}`);
    const clientCount = room ? room.size : 0;
    console.log(`🔍 [SocketService] 房间 task-${taskId} 中有 ${clientCount} 个客户端`);
    
    this.io.to(`task-${taskId}`).emit('comparison-error', error);
  }

  // 发送日志消息
  public emitLog(taskId: string, log: {
    level: 'info' | 'warn' | 'error';
    message: string;
    timestamp: string;
  }) {
    console.log(`📝 [SocketService] 发送日志到房间 task-${taskId}: [${log.level}] ${log.message.substring(0, 100)}...`);
    this.io.to(`task-${taskId}`).emit('log-message', log);
  }

  // 发送报告生成专用进度更新
  public emitReportProgress(taskId: string, reportProgress: {
    format: string;
    step: string;
    percentage: number;
    message: string;
    currentFile?: string;
    totalFiles?: number;
    completedFiles?: number;
  }) {
    console.log(`📊 [SocketService] 发送报告生成进度到房间 task-${taskId}:`, {
      format: reportProgress.format,
      step: reportProgress.step,
      percentage: reportProgress.percentage,
      message: reportProgress.message.substring(0, 50) + '...'
    });
    this.logger.info(`发送报告生成进度到任务 ${taskId}: ${reportProgress.format} ${reportProgress.step} (${reportProgress.percentage}%)`);
    
    // 检查房间中是否有客户端
    const room = this.io.sockets.adapter.rooms.get(`task-${taskId}`);
    const clientCount = room ? room.size : 0;
    console.log(`🔍 [SocketService] 报告进度推送 - 房间 task-${taskId} 中有 ${clientCount} 个客户端`);
    
    this.io.to(`task-${taskId}`).emit('report-progress', reportProgress);
  }

  // 增强完成通知，支持报告信息
  public emitCompleteWithReports(taskId: string, result: any, reports?: any[]) {
    console.log(`🎉 [SocketService] 发送完成通知（含报告）到房间 task-${taskId}:`, {
      taskId,
      resultStatus: result?.summary?.overallStatus,
      tablesCount: result?.summary?.totalTables,
      reportsCount: reports?.length || 0
    });
    this.logger.info(`发送完成通知到任务 ${taskId}: ${result?.summary?.overallStatus || '未知状态'}, 报告: ${reports?.length || 0} 个`);
    
    // 检查房间中是否有客户端
    const room = this.io.sockets.adapter.rooms.get(`task-${taskId}`);
    const clientCount = room ? room.size : 0;
    console.log(`🔍 [SocketService] 房间 task-${taskId} 中有 ${clientCount} 个客户端`);
    this.logger.info(`目标房间 task-${taskId} 中有 ${clientCount} 个客户端`);
    
    // 发送完成事件，包含报告信息
    const completeData = {
      ...result,
      reports: reports || []
    };
    
    this.io.to(`task-${taskId}`).emit('comparison-complete', completeData);
  }
}