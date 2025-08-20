import { DatabaseConnection } from './connections/connection';
import { 
  TableExtractor, 
  ViewExtractor, 
  ProcedureExtractor, 
  FunctionExtractor 
} from './extractors';
import { 
  TableComparer, 
  ViewComparer, 
  ProcedureComparer, 
  FunctionComparer 
} from './comparers';
import { Logger } from './utils/logger';
import { parseServerAddress } from './utils/server-parser';
import { 
  DatabaseConfig, 
  ComparisonResult, 
  DatabaseMetadata,
  DatabaseDifferences,
  ComparisonSummary
} from './types';

export class DatabaseCompareApp {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger();
  }

  async compareDatabase(
    sourceConfig: DatabaseConfig, 
    targetConfig: DatabaseConfig
  ): Promise<ComparisonResult> {
    
    this.logger.info('开始数据库比较...');
    const startTime = Date.now();

    // 使用简单的连接方式，避免DatabaseConnection的复杂性
    const sql = require('mssql');
    
    // 创建连接函数 - 完全复制test-connection的成功逻辑，并添加IP地址逗号处理
    const createDatabaseConnection = async (server: string, database: string, authType: string, username?: string, password?: string) => {
      // 🔧 标识日志：证明使用了新的连接逻辑 - 同时输出到控制台和日志
      console.log('🚀 [NEW-CONNECTION-LOGIC] 使用修改后的数据库连接逻辑');
      console.log('🔧 [NEW-CONNECTION-LOGIC] 连接函数版本: 2025-08-20-修复IP逗号处理');
      this.logger.info('🚀 [NEW-CONNECTION-LOGIC] 使用修改后的数据库连接逻辑');
      this.logger.info('🔧 [NEW-CONNECTION-LOGIC] 连接函数版本: 2025-08-20-修复IP逗号处理');
      
      // 解析服务器地址和端口号，处理IP地址中的逗号
      const parsedServer = parseServerAddress(server);
      console.log('🔧 [NEW-CONNECTION-LOGIC] 解析的服务器信息:', parsedServer);
      this.logger.info(`解析服务器地址: ${JSON.stringify(parsedServer)}`);
      
      // 使用与test-connection完全相同的配置
      const config: any = {
        server: parsedServer.server,
        database: database,
        options: {
          encrypt: false,
          trustServerCertificate: true,
          enableArithAbort: true,
          useUTC: false
        },
        connectionTimeout: 10000,
        requestTimeout: 10000
      };

      // 只有当端口不是-1时才设置端口（-1表示使用逗号格式，让mssql自己处理）
      if (parsedServer.port !== -1) {
        config.port = parsedServer.port;
      }

      // 根据认证类型添加用户信息
      if (authType === 'sql') {
        config.user = username;
        config.password = password;
      }

      console.log(`🔧 [NEW-CONNECTION-LOGIC] 创建连接池配置: 服务器=${server}, 数据库=${database}, 认证=${authType}`);
      this.logger.info(`创建连接池配置: 服务器=${server}, 数据库=${database}, 认证=${authType}`);
      
      const pool = new sql.ConnectionPool(config);
      
      console.log('🔧 [NEW-CONNECTION-LOGIC] 开始连接...');
      this.logger.info('开始连接...');
      await pool.connect();
      
      // 执行测试查询确认连接有效
      const result = await pool.request().query('SELECT @@VERSION as version');
      const version = result.recordset[0]?.version;
      this.logger.info(`连接成功，数据库版本: ${version?.substring(0, 50)}...`);
      
      // 🎉 成功标识日志 - 同时输出到控制台和日志
      console.log('✅ [NEW-CONNECTION-LOGIC] 新连接逻辑执行成功，无SSL协议错误');
      this.logger.info('✅ [NEW-CONNECTION-LOGIC] 新连接逻辑执行成功，无SSL协议错误');
      
      return pool;
    };

    let sourcePool = null;
    let targetPool = null;

    try {
      this.logger.info('正在连接源数据库...');
      sourcePool = await createDatabaseConnection(
        sourceConfig.server,
        sourceConfig.database,
        sourceConfig.authentication.type,
        sourceConfig.authentication.username,
        sourceConfig.authentication.password
      );
      this.logger.info(`✅ 源数据库连接成功: ${sourceConfig.server}/${sourceConfig.database}`);

      this.logger.info('正在连接目标数据库...');
      targetPool = await createDatabaseConnection(
        targetConfig.server,
        targetConfig.database,
        targetConfig.authentication.type,
        targetConfig.authentication.username,
        targetConfig.authentication.password
      );
      this.logger.info(`✅ 目标数据库连接成功: ${targetConfig.server}/${targetConfig.database}`);

      // 简单的元数据提取 - 先提取表信息作为测试
      this.logger.info('开始提取源数据库元数据...');
      const sourceMetadata = await this.extractSimpleMetadata(sourcePool, sourceConfig.server || 'Unknown', sourceConfig.database);
      this.logger.info(`源数据库元数据提取完成: ${sourceMetadata.tables.length}个表, ${sourceMetadata.views.length}个视图, ${sourceMetadata.procedures.length}个存储过程, ${sourceMetadata.functions.length}个函数`);

      this.logger.info('开始提取目标数据库元数据...');
      const targetMetadata = await this.extractSimpleMetadata(targetPool, targetConfig.server || 'Unknown', targetConfig.database);
      this.logger.info(`目标数据库元数据提取完成: ${targetMetadata.tables.length}个表, ${targetMetadata.views.length}个视图, ${targetMetadata.procedures.length}个存储过程, ${targetMetadata.functions.length}个函数`);

      // 执行比较
      this.logger.info('开始执行对象比较...');
      const differences = this.performComparison(sourceMetadata, targetMetadata);

      // 生成摘要
      this.logger.info('生成比较摘要...');
      const summary = this.generateSummary(sourceMetadata, targetMetadata, differences);

      const result: ComparisonResult = {
        source: sourceMetadata,
        target: targetMetadata,
        differences,
        summary,
        timestamp: new Date()
      };

      const endTime = Date.now();
      this.logger.info(`数据库比较完成，总耗时 ${endTime - startTime}ms`);

      return result;

    } catch (error: any) {
      this.logger.error('数据库比较过程中出错:', error);
      throw error;
    } finally {
      // 关闭连接
      if (sourcePool) {
        try {
          await sourcePool.close();
          this.logger.info('源数据库连接已关闭');
        } catch (error) {
          this.logger.error('关闭源数据库连接时出错:', error);
        }
      }
      
      if (targetPool) {
        try {
          await targetPool.close();
          this.logger.info('目标数据库连接已关闭');
        } catch (error) {
          this.logger.error('关闭目标数据库连接时出错:', error);
        }
      }
    }
  }

  // 简单的元数据提取方法
  private async extractSimpleMetadata(pool: any, serverName: string, databaseName: string): Promise<DatabaseMetadata> {
    this.logger.info(`开始提取数据库元数据: ${serverName}/${databaseName}`);

    try {
      // 提取表信息
      this.logger.info('提取表结构信息...');
      const tablesResult = await pool.request().query(`
        SELECT 
          TABLE_SCHEMA as schemaName,
          TABLE_NAME as tableName
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_SCHEMA, TABLE_NAME
      `);

      const tables = tablesResult.recordset.map((row: any) => ({
        schemaName: row.schemaName,
        tableName: row.tableName,
        columns: [], // 暂时为空，后续可以扩展
        primaryKeys: [],
        foreignKeys: [],
        indexes: [],
        constraints: []
      }));

      this.logger.info(`提取到 ${tables.length} 个表`);

      // 提取视图信息
      this.logger.info('提取视图信息...');
      const viewsResult = await pool.request().query(`
        SELECT 
          TABLE_SCHEMA as schemaName,
          TABLE_NAME as viewName,
          VIEW_DEFINITION as definition
        FROM INFORMATION_SCHEMA.VIEWS
        ORDER BY TABLE_SCHEMA, TABLE_NAME
      `);

      const views = viewsResult.recordset.map((row: any) => ({
        schemaName: row.schemaName,
        viewName: row.viewName,
        definition: row.definition || '',
        isUpdatable: false, // 暂时为false
        dependencies: []
      }));

      this.logger.info(`提取到 ${views.length} 个视图`);

      // 提取存储过程信息
      this.logger.info('提取存储过程信息...');
      const proceduresResult = await pool.request().query(`
        SELECT 
          ROUTINE_SCHEMA as schemaName,
          ROUTINE_NAME as procedureName,
          CREATED as createDate,
          LAST_ALTERED as modifyDate,
          ROUTINE_DEFINITION as definition
        FROM INFORMATION_SCHEMA.ROUTINES
        WHERE ROUTINE_TYPE = 'PROCEDURE'
        ORDER BY ROUTINE_SCHEMA, ROUTINE_NAME
      `);

      const procedures = proceduresResult.recordset.map((row: any) => ({
        schemaName: row.schemaName,
        procedureName: row.procedureName,
        createDate: row.createDate || new Date(),
        modifyDate: row.modifyDate || new Date(),
        definition: row.definition || '',
        parameters: []
      }));

      this.logger.info(`提取到 ${procedures.length} 个存储过程`);

      // 提取函数信息
      this.logger.info('提取函数信息...');
      const functionsResult = await pool.request().query(`
        SELECT 
          ROUTINE_SCHEMA as schemaName,
          ROUTINE_NAME as functionName,
          CREATED as createDate,
          LAST_ALTERED as modifyDate,
          ROUTINE_DEFINITION as definition
        FROM INFORMATION_SCHEMA.ROUTINES
        WHERE ROUTINE_TYPE = 'FUNCTION'
        ORDER BY ROUTINE_SCHEMA, ROUTINE_NAME
      `);

      const functions = functionsResult.recordset.map((row: any) => ({
        schemaName: row.schemaName,
        functionName: row.functionName,
        functionType: 'USER_DEFINED', // 默认值
        createDate: row.createDate || new Date(),
        modifyDate: row.modifyDate || new Date(),
        definition: row.definition || '',
        parameters: []
      }));

      this.logger.info(`提取到 ${functions.length} 个函数`);

      return {
        databaseName,
        server: serverName,
        tables,
        views,
        procedures,
        functions,
        extractedAt: new Date()
      };

    } catch (error: any) {
      this.logger.error(`提取数据库元数据时出错: ${error.message}`, error);
      throw error;
    }
  }

  private async extractDatabaseMetadata(connection: DatabaseConnection): Promise<DatabaseMetadata> {
    this.logger.info(`开始提取数据库元数据: ${connection.getServerName()}/${connection.getDatabaseName()}`);

    const tableExtractor = new TableExtractor(connection, this.logger);
    const viewExtractor = new ViewExtractor(connection, this.logger);
    const procedureExtractor = new ProcedureExtractor(connection, this.logger);
    const functionExtractor = new FunctionExtractor(connection, this.logger);

    const [tables, views, procedures, functions] = await Promise.all([
      tableExtractor.extractAllTables(),
      viewExtractor.extractAllViews(),
      procedureExtractor.extractAllProcedures(),
      functionExtractor.extractAllFunctions()
    ]);

    return {
      databaseName: connection.getDatabaseName(),
      server: connection.getServerName(),
      tables,
      views,
      procedures,
      functions,
      extractedAt: new Date()
    };
  }

  private performComparison(
    sourceMetadata: DatabaseMetadata, 
    targetMetadata: DatabaseMetadata
  ): DatabaseDifferences {
    
    this.logger.info('开始执行对象比较...');

    const tableComparer = new TableComparer(this.logger);
    const viewComparer = new ViewComparer(this.logger);
    const procedureComparer = new ProcedureComparer(this.logger);
    const functionComparer = new FunctionComparer(this.logger);

    const tables = tableComparer.compareTables(sourceMetadata.tables, targetMetadata.tables);
    const views = viewComparer.compareViews(sourceMetadata.views, targetMetadata.views);
    const procedures = procedureComparer.compareProcedures(sourceMetadata.procedures, targetMetadata.procedures);
    const functions = functionComparer.compareFunctions(sourceMetadata.functions, targetMetadata.functions);

    return {
      tables,
      views,
      procedures,
      functions
    };
  }

  private generateSummary(
    sourceMetadata: DatabaseMetadata,
    targetMetadata: DatabaseMetadata,
    differences: DatabaseDifferences
  ): ComparisonSummary {
    
    const summary: ComparisonSummary = {
      totalTables: {
        source: sourceMetadata.tables.length,
        target: targetMetadata.tables.length,
        added: differences.tables.added.length,
        removed: differences.tables.removed.length,
        modified: differences.tables.modified.length
      },
      totalViews: {
        source: sourceMetadata.views.length,
        target: targetMetadata.views.length,
        added: differences.views.added.length,
        removed: differences.views.removed.length,
        modified: differences.views.modified.length
      },
      totalProcedures: {
        source: sourceMetadata.procedures.length,
        target: targetMetadata.procedures.length,
        added: differences.procedures.added.length,
        removed: differences.procedures.removed.length,
        modified: differences.procedures.modified.length
      },
      totalFunctions: {
        source: sourceMetadata.functions.length,
        target: targetMetadata.functions.length,
        added: differences.functions.added.length,
        removed: differences.functions.removed.length,
        modified: differences.functions.modified.length
      },
      overallStatus: this.determineOverallStatus(differences)
    };

    return summary;
  }

  private determineOverallStatus(differences: DatabaseDifferences): 'identical' | 'different' {
    const hasChanges = 
      differences.tables.added.length > 0 ||
      differences.tables.removed.length > 0 ||
      differences.tables.modified.length > 0 ||
      differences.views.added.length > 0 ||
      differences.views.removed.length > 0 ||
      differences.views.modified.length > 0 ||
      differences.procedures.added.length > 0 ||
      differences.procedures.removed.length > 0 ||
      differences.procedures.modified.length > 0 ||
      differences.functions.added.length > 0 ||
      differences.functions.removed.length > 0 ||
      differences.functions.modified.length > 0;

    return hasChanges ? 'different' : 'identical';
  }
}

// 测试用例
async function testApp() {
  const logger = new Logger('debug');
  const app = new DatabaseCompareApp(logger);

  const sourceConfig: DatabaseConfig = {
    server: 'localhost',
    database: 'TestDB1',
    authentication: {
      type: 'windows'
    }
  };

  const targetConfig: DatabaseConfig = {
    server: 'localhost',
    database: 'TestDB2',
    authentication: {
      type: 'windows'
    }
  };

  try {
    const result = await app.compareDatabase(sourceConfig, targetConfig);
    console.log('比较结果:', JSON.stringify(result.summary, null, 2));
  } catch (error) {
    logger.error('比较失败:', error);
  }
}

// 仅在直接运行此文件时执行测试
if (require.main === module) {
  testApp();
}