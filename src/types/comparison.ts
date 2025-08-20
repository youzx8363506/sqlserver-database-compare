import { 
  TableInfo, 
  ViewInfo, 
  ProcedureInfo, 
  FunctionInfo, 
  ColumnInfo, 
  IndexInfo, 
  ConstraintInfo, 
  ParameterInfo 
} from './database';

// 比较结果
export interface ComparisonResult {
  source: DatabaseMetadata;
  target: DatabaseMetadata;
  differences: DatabaseDifferences;
  summary: ComparisonSummary;
  timestamp: Date;
}

// 数据库元数据
export interface DatabaseMetadata {
  databaseName: string;
  server: string;
  tables: TableInfo[];
  views: ViewInfo[];
  procedures: ProcedureInfo[];
  functions: FunctionInfo[];
  extractedAt: Date;
}

// 数据库差异
export interface DatabaseDifferences {
  tables: TableDifferences;
  views: ViewDifferences;
  procedures: ProcedureDifferences;
  functions: FunctionDifferences;
}

// 表差异
export interface TableDifferences {
  added: TableInfo[];
  removed: TableInfo[];
  modified: TableModification[];
}

// 表修改详情
export interface TableModification {
  tableName: string;
  schemaName: string;
  columnChanges: ColumnChanges;
  indexChanges: IndexChanges;
  constraintChanges: ConstraintChanges;
}

// 列变更
export interface ColumnChanges {
  added: ColumnInfo[];
  removed: ColumnInfo[];
  modified: ColumnModification[];
}

// 列修改详情
export interface ColumnModification {
  columnName: string;
  changes: ColumnPropertyChange[];
}

// 列属性变更
export interface ColumnPropertyChange {
  property: string;
  sourceValue: any;
  targetValue: any;
}

// 索引变更
export interface IndexChanges {
  added: IndexInfo[];
  removed: IndexInfo[];
  modified: IndexModification[];
}

// 索引修改详情
export interface IndexModification {
  indexName: string;
  changes: IndexPropertyChange[];
}

// 索引属性变更
export interface IndexPropertyChange {
  property: string;
  sourceValue: any;
  targetValue: any;
}

// 约束变更
export interface ConstraintChanges {
  added: ConstraintInfo[];
  removed: ConstraintInfo[];
  modified: ConstraintModification[];
}

// 约束修改详情
export interface ConstraintModification {
  constraintName: string;
  changes: ConstraintPropertyChange[];
}

// 约束属性变更
export interface ConstraintPropertyChange {
  property: string;
  sourceValue: any;
  targetValue: any;
}

// 视图差异
export interface ViewDifferences {
  added: ViewInfo[];
  removed: ViewInfo[];
  modified: ViewModification[];
}

// 视图修改详情
export interface ViewModification {
  viewName: string;
  schemaName: string;
  definitionChanged: boolean;
  sourceDefinition: string;
  targetDefinition: string;
}

// 存储过程差异
export interface ProcedureDifferences {
  added: ProcedureInfo[];
  removed: ProcedureInfo[];
  modified: ProcedureModification[];
}

// 存储过程修改详情
export interface ProcedureModification {
  procedureName: string;
  schemaName: string;
  definitionChanged: boolean;
  parametersChanged: boolean;
  sourceDefinition: string;
  targetDefinition: string;
  parameterChanges: ParameterChanges;
}

// 参数变更
export interface ParameterChanges {
  added: ParameterInfo[];
  removed: ParameterInfo[];
  modified: ParameterModification[];
}

// 参数修改详情
export interface ParameterModification {
  parameterName: string;
  changes: ParameterPropertyChange[];
}

// 参数属性变更
export interface ParameterPropertyChange {
  property: string;
  sourceValue: any;
  targetValue: any;
}

// 函数差异
export interface FunctionDifferences {
  added: FunctionInfo[];
  removed: FunctionInfo[];
  modified: FunctionModification[];
}

// 函数修改详情
export interface FunctionModification {
  functionName: string;
  schemaName: string;
  definitionChanged: boolean;
  parametersChanged: boolean;
  sourceDefinition: string;
  targetDefinition: string;
  parameterChanges: ParameterChanges;
}

// 比较摘要
export interface ComparisonSummary {
  totalTables: {
    source: number;
    target: number;
    added: number;
    removed: number;
    modified: number;
  };
  totalViews: {
    source: number;
    target: number;
    added: number;
    removed: number;
    modified: number;
  };
  totalProcedures: {
    source: number;
    target: number;
    added: number;
    removed: number;
    modified: number;
  };
  totalFunctions: {
    source: number;
    target: number;
    added: number;
    removed: number;
    modified: number;
  };
  overallStatus: 'identical' | 'different';
}