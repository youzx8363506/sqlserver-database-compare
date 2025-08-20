// 数据库连接配置
export interface DatabaseConfig {
  server: string;
  database: string;
  port?: number; // 端口配置
  authentication: {
    type: 'sql' | 'windows';
    username?: string;
    password?: string;
  };
  options?: {
    encrypt?: boolean;
    trustServerCertificate?: boolean;
    connectionTimeout?: number;
    requestTimeout?: number;
  };
}

// 表结构定义
export interface TableInfo {
  schemaName: string;
  tableName: string;
  columns: ColumnInfo[];
  primaryKeys: PrimaryKeyInfo[];
  foreignKeys: ForeignKeyInfo[];
  indexes: IndexInfo[];
  constraints: ConstraintInfo[];
}

// 列信息
export interface ColumnInfo {
  columnName: string;
  position: number;
  dataType: string;
  maxLength?: number;
  precision?: number;
  scale?: number;
  isNullable: boolean;
  defaultValue?: string;
  characterSet?: string;
  collation?: string;
}

// 主键信息
export interface PrimaryKeyInfo {
  constraintName: string;
  columnName: string;
  keySequence: number;
}

// 外键信息
export interface ForeignKeyInfo {
  constraintName: string;
  columnName: string;
  referencedSchema: string;
  referencedTable: string;
  referencedColumn: string;
  updateRule: string;
  deleteRule: string;
}

// 索引信息
export interface IndexInfo {
  indexName: string;
  indexType: string;
  isUnique: boolean;
  isPrimaryKey: boolean;
  columns: IndexColumnInfo[];
}

export interface IndexColumnInfo {
  columnName: string;
  keyOrdinal: number;
  isDescending: boolean;
  isIncluded: boolean;
}

// 视图信息
export interface ViewInfo {
  schemaName: string;
  viewName: string;
  definition: string;
  checkOption?: string;
  isUpdatable: boolean;
  dependencies: DependencyInfo[];
}

// 存储过程信息
export interface ProcedureInfo {
  schemaName: string;
  procedureName: string;
  createDate: Date;
  modifyDate: Date;
  definition: string;
  parameters: ParameterInfo[];
}

// 函数信息
export interface FunctionInfo {
  schemaName: string;
  functionName: string;
  functionType: string;
  createDate: Date;
  modifyDate: Date;
  definition: string;
  parameters: ParameterInfo[];
}

// 参数信息
export interface ParameterInfo {
  parameterName: string;
  parameterId: number;
  dataType: string;
  maxLength?: number;
  precision?: number;
  scale?: number;
  isOutput?: boolean;
  hasDefault?: boolean;
  defaultValue?: string;
}

// 依赖关系
export interface DependencyInfo {
  referencedSchema: string;
  referencedObject: string;
  referencedType: string;
}

// 约束信息
export interface ConstraintInfo {
  constraintName: string;
  constraintType: 'CHECK' | 'DEFAULT' | 'UNIQUE';
  definition?: string;
  columnName?: string;
}