import { DatabaseConfig, ComparisonResult } from '../types';

interface TaskSession {
  taskId: string;
  sourceConfig: DatabaseConfig;
  targetConfig: DatabaseConfig;
  result?: ComparisonResult;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  currentStep: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
}

class TaskCacheManager {
  private static instance: TaskCacheManager;
  private readonly STORAGE_KEY = 'sqldb_task_cache';
  private readonly LAST_TASK_KEY = 'sqldb_last_task_id';
  private readonly VERSION_KEY = 'sqldb_cache_version';
  private readonly CURRENT_VERSION = '1.0.0';

  static getInstance(): TaskCacheManager {
    if (!TaskCacheManager.instance) {
      TaskCacheManager.instance = new TaskCacheManager();
    }
    return TaskCacheManager.instance;
  }

  constructor() {
    this.initializeCache();
  }

  // 初始化缓存（检查版本兼容性）
  private initializeCache(): void {
    try {
      const cachedVersion = localStorage.getItem(this.VERSION_KEY);
      if (cachedVersion !== this.CURRENT_VERSION) {
        console.log('🔄 缓存版本不匹配，清理旧缓存数据');
        this.clearAllCache();
        localStorage.setItem(this.VERSION_KEY, this.CURRENT_VERSION);
      }
    } catch (error) {
      console.warn('初始化缓存失败:', error);
    }
  }

  // 缓存任务会话数据
  cacheTaskSession(taskId: string, session: Partial<TaskSession>): void {
    try {
      const existingSession = this.getTaskSession(taskId) || {} as TaskSession;
      const updatedSession: TaskSession = {
        ...existingSession,
        ...session,
        taskId,
        updatedAt: new Date().toISOString()
      } as TaskSession;

      // 确保必需字段存在
      if (!updatedSession.createdAt) {
        updatedSession.createdAt = new Date().toISOString();
      }

      const cacheKey = `${this.STORAGE_KEY}:${taskId}`;
      localStorage.setItem(cacheKey, JSON.stringify(updatedSession));
      localStorage.setItem(this.LAST_TASK_KEY, taskId);
      
      console.log(`💾 缓存任务会话: ${taskId}, 状态: ${updatedSession.status}`);
    } catch (error) {
      console.warn('缓存任务会话失败:', error);
    }
  }

  // 获取任务会话数据
  getTaskSession(taskId: string): TaskSession | null {
    try {
      const cacheKey = `${this.STORAGE_KEY}:${taskId}`;
      const data = localStorage.getItem(cacheKey);
      
      if (!data) return null;
      
      const session = JSON.parse(data) as TaskSession;
      
      // 数据完整性检查
      if (!session.taskId || !session.createdAt) {
        console.warn(`任务会话数据不完整: ${taskId}`);
        return null;
      }
      
      return session;
    } catch (error) {
      console.warn(`获取任务会话失败: ${taskId}`, error);
      return null;
    }
  }

  // 获取最后的任务ID
  getLastTaskId(): string | null {
    try {
      return localStorage.getItem(this.LAST_TASK_KEY);
    } catch (error) {
      console.warn('获取最后任务ID失败:', error);
      return null;
    }
  }

  // 获取最后的任务会话
  getLastTaskSession(): TaskSession | null {
    const lastTaskId = this.getLastTaskId();
    return lastTaskId ? this.getTaskSession(lastTaskId) : null;
  }

  // 更新任务状态
  updateTaskStatus(
    taskId: string, 
    status: TaskSession['status'], 
    progress?: number, 
    currentStep?: number,
    error?: string
  ): void {
    try {
      const session = this.getTaskSession(taskId);
      if (!session) {
        console.warn(`尝试更新不存在的任务状态: ${taskId}`);
        return;
      }

      const updates: Partial<TaskSession> = {
        status,
        updatedAt: new Date().toISOString()
      };

      if (progress !== undefined) {
        updates.progress = progress;
      }

      if (currentStep !== undefined) {
        updates.currentStep = currentStep;
      }

      if (error) {
        updates.error = error;
      }

      if (status === 'completed') {
        updates.completedAt = new Date().toISOString();
        updates.progress = 100;
      }

      this.cacheTaskSession(taskId, updates);
    } catch (error) {
      console.warn(`更新任务状态失败: ${taskId}`, error);
    }
  }

  // 缓存比较结果
  cacheComparisonResult(taskId: string, result: ComparisonResult): void {
    try {
      this.cacheTaskSession(taskId, {
        result,
        status: 'completed',
        progress: 100,
        completedAt: new Date().toISOString()
      });
      
      console.log(`📊 缓存比较结果: ${taskId}`);
    } catch (error) {
      console.warn(`缓存比较结果失败: ${taskId}`, error);
    }
  }

  // 获取比较结果
  getComparisonResult(taskId: string): ComparisonResult | null {
    try {
      const session = this.getTaskSession(taskId);
      return session?.result || null;
    } catch (error) {
      console.warn(`获取比较结果失败: ${taskId}`, error);
      return null;
    }
  }

  // 清理过期缓存
  cleanupExpiredCache(maxAge: number = 7 * 24 * 60 * 60 * 1000): number {
    try {
      const now = Date.now();
      const keys = Object.keys(localStorage);
      let cleanedCount = 0;
      
      keys.forEach(key => {
        if (key.startsWith(this.STORAGE_KEY) && key !== this.LAST_TASK_KEY) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            const age = now - new Date(data.createdAt || 0).getTime();
            
            if (age > maxAge) {
              localStorage.removeItem(key);
              cleanedCount++;
              console.log(`🗑️ 清理过期缓存: ${key}`);
            }
          } catch (error) {
            // 损坏的数据也删除
            localStorage.removeItem(key);
            cleanedCount++;
            console.log(`🗑️ 清理损坏缓存: ${key}`);
          }
        }
      });
      
      console.log(`🧹 清理完成，共清理 ${cleanedCount} 个过期缓存`);
      return cleanedCount;
    } catch (error) {
      console.warn('清理缓存失败:', error);
      return 0;
    }
  }

  // 获取所有任务历史
  getAllTaskSessions(): TaskSession[] {
    try {
      const sessions: TaskSession[] = [];
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        if (key.startsWith(this.STORAGE_KEY) && key !== this.LAST_TASK_KEY) {
          try {
            const session = JSON.parse(localStorage.getItem(key) || '{}');
            if (session.taskId && session.createdAt) {
              sessions.push(session);
            }
          } catch (error) {
            console.warn(`解析任务会话失败: ${key}`, error);
          }
        }
      });
      
      // 按创建时间倒序排列
      return sessions.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.warn('获取任务历史失败:', error);
      return [];
    }
  }

  // 删除特定任务缓存
  deleteTaskSession(taskId: string): void {
    try {
      const cacheKey = `${this.STORAGE_KEY}:${taskId}`;
      localStorage.removeItem(cacheKey);
      
      // 如果删除的是最后一个任务，清除最后任务ID
      const lastTaskId = this.getLastTaskId();
      if (lastTaskId === taskId) {
        localStorage.removeItem(this.LAST_TASK_KEY);
      }
      
      console.log(`🗑️ 删除任务缓存: ${taskId}`);
    } catch (error) {
      console.warn(`删除任务缓存失败: ${taskId}`, error);
    }
  }

  // 清空所有缓存
  clearAllCache(): void {
    try {
      const keys = Object.keys(localStorage);
      let clearedCount = 0;
      
      keys.forEach(key => {
        if (key.startsWith(this.STORAGE_KEY) || key === this.LAST_TASK_KEY) {
          localStorage.removeItem(key);
          clearedCount++;
        }
      });
      
      console.log(`🗑️ 清空所有缓存，共清理 ${clearedCount} 个项目`);
    } catch (error) {
      console.warn('清空缓存失败:', error);
    }
  }

  // 获取缓存统计信息
  getCacheStats(): {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    errorTasks: number;
    totalSize: number;
    lastTaskId: string | null;
  } {
    try {
      const sessions = this.getAllTaskSessions();
      const stats = {
        totalTasks: sessions.length,
        completedTasks: sessions.filter(s => s.status === 'completed').length,
        pendingTasks: sessions.filter(s => s.status === 'pending').length,
        errorTasks: sessions.filter(s => s.status === 'error').length,
        totalSize: 0,
        lastTaskId: this.getLastTaskId()
      };

      // 计算总大小（粗略估算）
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.STORAGE_KEY)) {
          const value = localStorage.getItem(key);
          if (value) {
            stats.totalSize += value.length * 2; // UTF-16字符估算
          }
        }
      });

      return stats;
    } catch (error) {
      console.warn('获取缓存统计失败:', error);
      return {
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        errorTasks: 0,
        totalSize: 0,
        lastTaskId: null
      };
    }
  }

  // 检查是否有可恢复的会话
  hasRecoverableSession(): boolean {
    const lastSession = this.getLastTaskSession();
    return !!lastSession && (
      lastSession.status === 'completed' ||
      lastSession.status === 'running' ||
      (lastSession.status === 'pending' && !!lastSession.sourceConfig && !!lastSession.targetConfig)
    );
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
  getStorageUsageDescription(): string {
    const stats = this.getCacheStats();
    return `缓存了 ${stats.totalTasks} 个任务，占用 ${this.formatSize(stats.totalSize)} 存储空间`;
  }
}

export default TaskCacheManager;
export type { TaskSession };