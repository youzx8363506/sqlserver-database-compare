import { io, Socket } from 'socket.io-client';
import { ProgressEvent, LogEvent, CompleteEvent, ErrorEvent } from '../types';

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 2000;

  // 连接到WebSocket服务器
  connect(url: string = 'ws://localhost:3001'): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`🔗 [前端WebSocket] 尝试连接到: ${url}`);
      
      try {
        this.socket = io(url, {
          transports: ['websocket'],
          autoConnect: true,
          timeout: 5000,
        });

        this.socket.on('connect', () => {
          console.log('✅ [前端WebSocket] 连接建立成功');
          console.log(`🆔 [前端WebSocket] Socket ID: ${this.socket?.id}`);
          
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.log('🔌 [前端WebSocket] 连接断开，原因:', reason);
          this.isConnected = false;
        });

        this.socket.on('connect_error', (error) => {
          console.error('❌ [前端WebSocket] 连接错误:', error);
          this.isConnected = false;
          
          // 自动重连逻辑
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 [前端WebSocket] 尝试重连 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            
            setTimeout(() => {
              if (this.socket && !this.socket.connected) {
                this.socket.connect();
              }
            }, this.reconnectInterval);
          } else {
            console.error('❌ [前端WebSocket] 重连次数超过限制，停止重连');
            reject(error);
          }
        });

      } catch (error) {
        console.error('❌ [前端WebSocket] 创建连接失败:', error);
        reject(error);
      }
    });
  }

  // 断开连接
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // 加入任务房间
  joinTask(taskId: string): void {
    if (this.socket && this.isConnected) {
      console.log(`🔗 [前端WebSocket] 发送加入任务房间请求: ${taskId}`);
      this.socket.emit('join-task', taskId);
      console.log(`✅ [前端WebSocket] 已发送 join-task 事件，任务ID: ${taskId}`);
    } else {
      console.warn(`⚠️ [前端WebSocket] 无法加入房间，连接状态: socket=${!!this.socket}, connected=${this.isConnected}`);
    }
  }

  // 离开任务房间
  leaveTask(taskId: string): void {
    if (this.socket && this.isConnected) {
      console.log(`🚪 [前端WebSocket] 离开任务房间: ${taskId}`);
      this.socket.emit('leave-task', taskId);
    } else {
      console.warn(`⚠️ [前端WebSocket] 无法离开房间，连接状态: socket=${!!this.socket}, connected=${this.isConnected}`);
    }
  }

  // 监听比较进度
  onProgress(callback: (progress: ProgressEvent) => void): void {
    if (this.socket) {
      console.log(`👂 [前端WebSocket] 开始监听 comparison-progress 事件`);
      this.socket.on('comparison-progress', (data) => {
        console.log(`📊 [前端WebSocket] 收到进度事件:`, data);
        callback(data);
      });
    }
  }

  // 监听比较完成
  onComplete(callback: (result: CompleteEvent) => void): void {
    if (this.socket) {
      console.log(`👂 [前端WebSocket] 开始监听 comparison-complete 事件`);
      this.socket.on('comparison-complete', (data) => {
        console.log(`🎉 [前端WebSocket] 收到完成事件:`, data);
        callback(data);
      });
    }
  }

  // 监听错误
  onError(callback: (error: ErrorEvent) => void): void {
    if (this.socket) {
      console.log(`👂 [前端WebSocket] 开始监听 comparison-error 事件`);
      this.socket.on('comparison-error', (data) => {
        console.log(`❌ [前端WebSocket] 收到错误事件:`, data);
        callback(data);
      });
    }
  }

  // 监听日志消息
  onLog(callback: (log: LogEvent) => void): void {
    if (this.socket) {
      console.log(`👂 [前端WebSocket] 开始监听 log-message 事件`);
      this.socket.on('log-message', (data) => {
        console.log(`📝 [前端WebSocket] 收到日志事件:`, data);
        callback(data);
      });
    }
  }

  // 移除所有监听器
  removeAllListeners(): void {
    if (this.socket) {
      this.socket.removeAllListeners('comparison-progress');
      this.socket.removeAllListeners('comparison-complete');
      this.socket.removeAllListeners('comparison-error');
      this.socket.removeAllListeners('log-message');
    }
  }

  // 检查连接状态
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  // 获取连接ID
  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

// 创建单例实例
export const socketService = new SocketService();

export default socketService;