import { DatabaseConfig } from './database';

// 应用配置
export interface AppConfig {
  source: DatabaseConfig;
  target: DatabaseConfig;
  comparison: ComparisonConfig;
  output: OutputConfig;
  logging: LoggingConfig;
}

// 比较配置
export interface ComparisonConfig {
  includeObjects: ObjectType[];
  ignoreCase: boolean;
  ignoreWhitespace: boolean;
  ignoredTables?: string[];
  ignoredSchemas?: string[];
  customRules?: ComparisonRule[];
}

// 对象类型
export type ObjectType = 'tables' | 'indexes' | 'views' | 'procedures' | 'functions';

// 比较规则
export interface ComparisonRule {
  objectType: ObjectType;
  property: string;
  ignore: boolean;
  customComparer?: string;
}

// 输出配置
export interface OutputConfig {
  directory: string;
  formats: OutputFormat[];
  filename: string;
  includeTimestamp: boolean;
  templatePath?: string;
}

// 输出格式
export type OutputFormat = 'html' | 'excel' | 'json' | 'csv';

// 日志配置
export interface LoggingConfig {
  level: LogLevel;
  file?: string;
  console: boolean;
  maxSize?: string;
  maxFiles?: number;
}

// 日志级别
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

// CLI选项
export interface CliOptions {
  source?: string;
  target?: string;
  config?: string;
  output?: string;
  format?: OutputFormat;
  tablesOnly?: boolean;
  viewsOnly?: boolean;
  proceduresOnly?: boolean;
  functionsOnly?: boolean;
  verbose?: boolean;
  silent?: boolean;
}

// 验证结果
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// 验证错误
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}