import axios from 'axios';
import { 
  DatabaseConfig, 
  ApiResponse, 
  ComparisonTask, 
  ComparisonResult, 
  Report,
  DatabaseConfigPair,
  SavedConfig,
  SavedConfigInput
} from '../types';

const API_BASE_URL = '/api';

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 响应拦截器
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API请求错误:', error);
    return Promise.reject(error);
  }
);

// 数据库相关API
export const databaseApi = {
  // 测试数据库连接
  testConnection: async (config: DatabaseConfig): Promise<ApiResponse> => {
    const response = await api.post('/database/test-connection', config);
    return response.data;
  },

  // test-quick风格数据库连接测试
  testQuickConnection: async (config: {
    server: string;
    database: string;
    authType: 'sql' | 'windows';
    username?: string;
    password?: string;
  }): Promise<ApiResponse> => {
    const response = await api.post('/database/test-quick-connection', config);
    return response.data;
  },

  // 获取数据库对象列表
  getObjects: async (
    config: DatabaseConfig,
    objectType: string = 'tables'
  ): Promise<ApiResponse> => {
    const params = {
      server: config.server,
      database: config.database,
      authType: config.authentication.type,
      username: config.authentication.username,
      password: config.authentication.password,
      objectType,
    };
    const response = await api.get('/database/objects', { params });
    return response.data;
  },

  // 获取数据库信息
  getInfo: async (config: DatabaseConfig): Promise<ApiResponse> => {
    const params = {
      server: config.server,
      database: config.database,
      authType: config.authentication.type,
      username: config.authentication.username,
      password: config.authentication.password,
    };
    const response = await api.get('/database/info', { params });
    return response.data;
  },
};

// 比较相关API
export const compareApi = {
  // 启动比较任务
  startComparison: async (
    sourceDatabase: DatabaseConfig,
    targetDatabase: DatabaseConfig,
    options?: any
  ): Promise<ApiResponse<{ taskId: string; websocketUrl: string }>> => {
    const response = await api.post('/compare/start', {
      sourceDatabase,
      targetDatabase,
      options,
    });
    return response.data;
  },

  // 获取任务状态
  getTaskStatus: async (taskId: string): Promise<ApiResponse<{ task: ComparisonTask }>> => {
    const response = await api.get(`/compare/status/${taskId}`);
    return response.data;
  },

  // 获取比较结果
  getTaskResult: async (taskId: string): Promise<ApiResponse<{ result: ComparisonResult }>> => {
    const response = await api.get(`/compare/result/${taskId}`);
    return response.data;
  },

  // 获取详细差异数据
  getDifferences: async (
    taskId: string,
    type: 'tables' | 'indexes' | 'views' | 'procedures' | 'functions',
    page: number = 1,
    limit: number = 50
  ): Promise<ApiResponse> => {
    const response = await api.get(`/compare/differences/${taskId}/${type}`, {
      params: { page, limit },
    });
    return response.data;
  },

  // 清理过期任务
  cleanupTasks: async (): Promise<ApiResponse> => {
    const response = await api.delete('/compare/cleanup');
    return response.data;
  },
};

// 报告相关API
export const reportsApi = {
  // 生成报告
  generateReport: async (
    taskId: string,
    format: 'html' | 'excel' | 'json',
    options?: any
  ): Promise<ApiResponse<{ report: Report }>> => {
    console.log(`🚀 [API] 开始生成报告请求 - taskId: ${taskId}, format: ${format}`);
    console.log(`🌐 [API] 请求URL: /api/reports/generate/${taskId}`);
    console.log(`📤 [API] 请求参数:`, { format, options });
    
    try {
      const response = await api.post(`/reports/generate/${taskId}`, {
        format,
        options,
      });
      console.log(`📥 [API] 生成报告响应:`, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`❌ [API] 生成报告失败:`, error);
      console.error(`❌ [API] 错误响应:`, error.response?.data);
      throw error;
    }
  },

  // 获取报告列表
  getReports: async (): Promise<{ success: boolean; reports: Report[]; count: number }> => {
    console.log(`📋 [API] 开始获取报告列表请求`);
    console.log(`🌐 [API] 请求URL: /api/reports/list`);
    
    try {
      const response = await api.get('/reports/list');
      console.log(`📥 [API] 获取报告列表响应:`, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`❌ [API] 获取报告列表失败:`, error);
      console.error(`❌ [API] 错误响应:`, error.response?.data);
      throw error;
    }
  },

  // 获取报告信息
  getReportInfo: async (fileName: string): Promise<ApiResponse<{ report: Report }>> => {
    const response = await api.get(`/reports/info/${fileName}`);
    return response.data;
  },

  // 删除报告
  deleteReport: async (fileName: string): Promise<ApiResponse> => {
    const response = await api.delete(`/reports/${fileName}`);
    return response.data;
  },

  // 清理过期报告
  cleanupReports: async (days: number): Promise<ApiResponse> => {
    const response = await api.delete(`/reports/cleanup/${days}`);
    return response.data;
  },
};

// 配置相关API
export const configApi = {
  // 获取最近使用的配置
  getLastUsedConfig: async (): Promise<ApiResponse<DatabaseConfigPair>> => {
    console.log(`🔍 [配置] 获取最近使用的配置`);
    const response = await api.get('/configs/database/last-used');
    console.log(`📥 [配置] 最近配置响应:`, response.data);
    return response.data;
  },

  // 保存最近使用的配置
  saveLastUsedConfig: async (config: DatabaseConfigPair): Promise<ApiResponse> => {
    console.log(`💾 [配置] 保存最近配置:`, config);
    const response = await api.post('/configs/database/last-used', config);
    console.log(`✅ [配置] 保存响应:`, response.data);
    return response.data;
  },

  // 获取保存的配置列表
  getSavedConfigs: async (): Promise<ApiResponse<SavedConfig[]>> => {
    console.log(`📋 [配置] 获取保存的配置列表`);
    const response = await api.get('/configs/database/saved');
    console.log(`📊 [配置] 配置列表响应:`, response.data);
    return response.data;
  },

  // 保存新的配置
  saveConfig: async (config: SavedConfigInput): Promise<ApiResponse<SavedConfig>> => {
    console.log(`💾 [配置] 保存新配置:`, config);
    const response = await api.post('/configs/database/saved', config);
    console.log(`✅ [配置] 保存响应:`, response.data);
    return response.data;
  },

  // 更新配置
  updateConfig: async (id: string, config: SavedConfigInput): Promise<ApiResponse<SavedConfig>> => {
    console.log(`🔄 [配置] 更新配置 ${id}:`, config);
    const response = await api.put(`/configs/database/saved/${id}`, config);
    console.log(`✅ [配置] 更新响应:`, response.data);
    return response.data;
  },

  // 删除配置
  deleteConfig: async (id: string): Promise<ApiResponse> => {
    console.log(`🗑️ [配置] 删除配置: ${id}`);
    const response = await api.delete(`/configs/database/saved/${id}`);
    console.log(`✅ [配置] 删除响应:`, response.data);
    return response.data;
  },

  // 应用保存的配置
  useConfig: async (id: string): Promise<ApiResponse<DatabaseConfigPair>> => {
    console.log(`🔄 [配置] 应用配置: ${id}`);
    const response = await api.post(`/configs/database/saved/${id}/use`);
    console.log(`✅ [配置] 应用响应:`, response.data);
    return response.data;
  },
};

// 健康检查
export const healthApi = {
  check: async (): Promise<ApiResponse> => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api;