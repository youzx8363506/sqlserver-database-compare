import { BaseExtractor } from './base';
import { 
  TableInfo, 
  ColumnInfo, 
  PrimaryKeyInfo, 
  ForeignKeyInfo, 
  IndexInfo,
  IndexColumnInfo,
  ConstraintInfo 
} from '../types';

export class TableExtractor extends BaseExtractor {
  
  async extractAllTables(): Promise<TableInfo[]> {
    this.logger.info('开始提取表结构信息...');
    
    const tables = await this.getTableList();
    const tableInfos: TableInfo[] = [];

    for (const table of tables) {
      try {
        const tableInfo = await this.extractTableInfo(table.schemaName, table.tableName);
        tableInfos.push(tableInfo);
        this.logger.debug(`已提取表: ${table.schemaName}.${table.tableName}`);
      } catch (error) {
        this.logger.error(`提取表 ${table.schemaName}.${table.tableName} 失败:`, error);
      }
    }

    this.logger.info(`表结构提取完成，共 ${tableInfos.length} 个表`);
    return tableInfos;
  }

  private async getTableList(): Promise<{ schemaName: string; tableName: string }[]> {
    // 先检查是否有任何表（包括系统表）
    const checkQuery = `
      SELECT COUNT(*) as total_tables
      FROM INFORMATION_SCHEMA.TABLES
    `;
    
    const totalResult = await this.executeQuery(checkQuery);
    console.log('🔍 [TableExtractor] 数据库中总表数量:', totalResult[0]?.total_tables || 0);
    
    // 检查用户表
    const query = `
      SELECT 
        t.TABLE_SCHEMA as schemaName,
        t.TABLE_NAME as tableName,
        t.TABLE_TYPE as tableType
      FROM INFORMATION_SCHEMA.TABLES t
      WHERE t.TABLE_TYPE = 'BASE TABLE'
      ORDER BY t.TABLE_SCHEMA, t.TABLE_NAME
    `;

    console.log('🔍 [TableExtractor] 执行查询:', query);
    const result = await this.executeQuery(query);
    console.log('🔍 [TableExtractor] 查询结果数量:', result.length);
    console.log('🔍 [TableExtractor] 查询结果详情:', JSON.stringify(result.slice(0, 3), null, 2));
    
    return result;
  }

  private async extractTableInfo(schemaName: string, tableName: string): Promise<TableInfo> {
    const [columns, primaryKeys, foreignKeys, indexes, constraints] = await Promise.all([
      this.getColumns(schemaName, tableName),
      this.getPrimaryKeys(schemaName, tableName),
      this.getForeignKeys(schemaName, tableName),
      this.getIndexes(schemaName, tableName),
      this.getConstraints(schemaName, tableName),
    ]);

    return {
      schemaName,
      tableName,
      columns,
      primaryKeys,
      foreignKeys,
      indexes,
      constraints,
    };
  }

  private async getColumns(schemaName: string, tableName: string): Promise<ColumnInfo[]> {
    const query = `
      SELECT 
        c.COLUMN_NAME as columnName,
        c.ORDINAL_POSITION as position,
        c.COLUMN_DEFAULT as defaultValue,
        c.IS_NULLABLE as isNullable,
        c.DATA_TYPE as dataType,
        c.CHARACTER_MAXIMUM_LENGTH as maxLength,
        c.NUMERIC_PRECISION as precision,
        c.NUMERIC_SCALE as scale,
        c.CHARACTER_SET_NAME as characterSet,
        c.COLLATION_NAME as collation
      FROM INFORMATION_SCHEMA.COLUMNS c
      WHERE c.TABLE_NAME = @tableName 
        AND c.TABLE_SCHEMA = @schemaName
      ORDER BY c.ORDINAL_POSITION
    `;

    const results = await this.executeQuery(query, { schemaName, tableName });
    
    return results.map((row: any) => ({
      columnName: row.columnName,
      position: row.position,
      dataType: row.dataType,
      maxLength: row.maxLength,
      precision: row.precision,
      scale: row.scale,
      isNullable: row.isNullable === 'YES',
      defaultValue: row.defaultValue,
      characterSet: row.characterSet,
      collation: row.collation,
    }));
  }

  private async getPrimaryKeys(schemaName: string, tableName: string): Promise<PrimaryKeyInfo[]> {
    const query = `
      SELECT 
        tc.CONSTRAINT_NAME as constraintName,
        kcu.COLUMN_NAME as columnName,
        kcu.ORDINAL_POSITION as keySequence
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
      JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu 
        ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
        AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
        AND tc.TABLE_NAME = kcu.TABLE_NAME
      WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
        AND tc.TABLE_SCHEMA = @schemaName
        AND tc.TABLE_NAME = @tableName
      ORDER BY kcu.ORDINAL_POSITION
    `;

    return await this.executeQuery(query, { schemaName, tableName });
  }

  private async getForeignKeys(schemaName: string, tableName: string): Promise<ForeignKeyInfo[]> {
    const query = `
      SELECT 
        rc.CONSTRAINT_NAME as constraintName,
        kcu1.COLUMN_NAME as columnName,
        kcu2.TABLE_SCHEMA as referencedSchema,
        kcu2.TABLE_NAME as referencedTable,
        kcu2.COLUMN_NAME as referencedColumn,
        rc.UPDATE_RULE as updateRule,
        rc.DELETE_RULE as deleteRule
      FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
      JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu1 
        ON rc.CONSTRAINT_NAME = kcu1.CONSTRAINT_NAME
        AND rc.CONSTRAINT_SCHEMA = kcu1.CONSTRAINT_SCHEMA
      JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu2 
        ON rc.UNIQUE_CONSTRAINT_NAME = kcu2.CONSTRAINT_NAME
        AND rc.UNIQUE_CONSTRAINT_SCHEMA = kcu2.CONSTRAINT_SCHEMA
        AND kcu1.ORDINAL_POSITION = kcu2.ORDINAL_POSITION
      WHERE kcu1.TABLE_SCHEMA = @schemaName
        AND kcu1.TABLE_NAME = @tableName
      ORDER BY rc.CONSTRAINT_NAME, kcu1.ORDINAL_POSITION
    `;

    return await this.executeQuery(query, { schemaName, tableName });
  }

  private async getIndexes(schemaName: string, tableName: string): Promise<IndexInfo[]> {
    const query = `
      SELECT 
        i.name as indexName,
        i.type_desc as indexType,
        i.is_unique as isUnique,
        i.is_primary_key as isPrimaryKey,
        ic.key_ordinal as keyOrdinal,
        c.name as columnName,
        ic.is_descending_key as isDescending,
        ic.is_included_column as isIncluded
      FROM sys.indexes i
      JOIN sys.tables t ON i.object_id = t.object_id
      JOIN sys.schemas s ON t.schema_id = s.schema_id
      JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
      JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
      WHERE i.type > 0
        AND s.name = @schemaName
        AND t.name = @tableName
      ORDER BY i.name, ic.key_ordinal
    `;

    const results = await this.executeQuery(query, { schemaName, tableName });
    
    // 按索引名称分组
    const indexMap = new Map<string, IndexInfo>();
    
    results.forEach((row: any) => {
      const indexName = row.indexName;
      
      if (!indexMap.has(indexName)) {
        indexMap.set(indexName, {
          indexName,
          indexType: row.indexType,
          isUnique: row.isUnique,
          isPrimaryKey: row.isPrimaryKey,
          columns: [],
        });
      }
      
      const index = indexMap.get(indexName)!;
      index.columns.push({
        columnName: row.columnName,
        keyOrdinal: row.keyOrdinal,
        isDescending: row.isDescending,
        isIncluded: row.isIncluded,
      });
    });

    return Array.from(indexMap.values());
  }

  private async getConstraints(schemaName: string, tableName: string): Promise<ConstraintInfo[]> {
    const queries = [
      // 检查约束
      `
        SELECT 
          cc.CONSTRAINT_NAME as constraintName,
          'CHECK' as constraintType,
          cc.CHECK_CLAUSE as definition,
          NULL as columnName
        FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc
        JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc 
          ON cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
        WHERE tc.TABLE_SCHEMA = @schemaName
          AND tc.TABLE_NAME = @tableName
      `,
      // 默认约束
      `
        SELECT 
          dc.name as constraintName,
          'DEFAULT' as constraintType,
          dc.definition as definition,
          c.name as columnName
        FROM sys.default_constraints dc
        JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
        JOIN sys.tables t ON dc.parent_object_id = t.object_id
        JOIN sys.schemas s ON t.schema_id = s.schema_id
        WHERE s.name = @schemaName
          AND t.name = @tableName
      `,
      // 唯一约束
      `
        SELECT 
          tc.CONSTRAINT_NAME as constraintName,
          'UNIQUE' as constraintType,
          NULL as definition,
          kcu.COLUMN_NAME as columnName
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu 
          ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
        WHERE tc.CONSTRAINT_TYPE = 'UNIQUE'
          AND tc.TABLE_SCHEMA = @schemaName
          AND tc.TABLE_NAME = @tableName
      `
    ];

    const constraints: ConstraintInfo[] = [];
    
    for (const query of queries) {
      try {
        const results = await this.executeQuery(query, { schemaName, tableName });
        constraints.push(...results.map((row: any) => ({
          constraintName: row.constraintName,
          constraintType: row.constraintType as 'CHECK' | 'DEFAULT' | 'UNIQUE',
          definition: row.definition,
          columnName: row.columnName,
        })));
      } catch (error) {
        this.logger.warn(`获取约束信息时出错: ${error}`);
      }
    }

    return constraints;
  }
}