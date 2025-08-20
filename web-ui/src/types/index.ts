// 数据库配置类型
export interface DatabaseConfig {
  server: string;
  database: string;
  authentication: {
    type: 'windows' | 'sql';
    username?: string;
    password?: string;
  };
}

// 比较任务状态
export interface ComparisonTask {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  result?: ComparisonResult;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

// 比较结果
export interface ComparisonResult {
  summary: {
    sourceDatabase: string;
    targetDatabase: string;
    comparedAt: string;
    totalDifferences: number;
    tablesDifferences: number;
    indexesDifferences: number;
    viewsDifferences: number;
    proceduresDifferences: number;
    functionsDifferences: number;
  };
  differences: {
    tables: any[];
    indexes: any[];
    views: any[];
    procedures: any[];
    functions: any[];
  };
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  message?: string;
}

// 报告类型
export interface Report {
  fileName: string;
  format: 'html' | 'excel' | 'json';
  taskId: string | null;
  size: number;
  createdAt: string;
  modifiedAt: string;
  downloadUrl: string;
  viewUrl: string;
  mimeType: string;
}

// WebSocket事件类型
export interface ProgressEvent {
  step: string;
  percentage: number;
  message: string;
  details?: any;
}

export interface LogEvent {
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

export interface CompleteEvent {
  taskId: string;
  result: ComparisonResult;
  summary: any;
}

export interface ErrorEvent {
  taskId: string;
  error: string;
  message: string;
}

// 数据库配置对类型
export interface DatabaseConfigPair {
  source: DatabaseConfig;
  target: DatabaseConfig;
}

// 保存的配置类型
export interface SavedConfig {
  id: string;
  name: string;
  source: DatabaseConfig;
  target: DatabaseConfig;
  createdAt: string;
  lastUsedAt: string;
}

// 保存配置输入类型
export interface SavedConfigInput {
  name: string;
  source: DatabaseConfig;
  target: DatabaseConfig;
}