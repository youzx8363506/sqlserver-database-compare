import express from 'express';
import path from 'path';
import * as sql from 'mssql';
import { DatabaseConnection } from '../../../src/connections/connection';
import { TableExtractor } from '../../../src/extractors/tables';
import { Logger } from '../../../src/utils/logger';
import { DatabaseConfig } from '../../../src/types';
import { parseServerAddress } from '../../../src/utils/server-parser';

const router = express.Router();
const logger = new Logger('info', path.join(__dirname, '../../../logs/web-server.log'));

// test-quick风格的直接数据库连接测试
router.post('/test-quick-connection', async (req, res) => {
  try {
    const { server, database, authType, username, password } = req.body;
    
    // 验证必要参数
    if (!server || !database) {
      return res.status(400).json({
        success: false,
        error: '服务器和数据库名称不能为空'
      });
    }

    if (authType === 'sql' && (!username || !password)) {
      return res.status(400).json({
        success: false,
        error: 'SQL认证需要提供用户名和密码'
      });
    }

    // 解析服务器地址和端口号
    const parsedServer = parseServerAddress(server as string);
    
    // 使用test-quick.js的完全相同配置
    const config: any = {
      database: database,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        useUTC: false
      },
      connectionTimeout: 30000,
      requestTimeout: 30000
    };

    // 处理服务器地址和端口
    if (parsedServer.server.includes(',')) {
      // 对于逗号格式，分离服务器和端口
      const parts = parsedServer.server.split(',');
      config.server = parts[0];
      config.port = parseInt(parts[1], 10);
    } else {
      config.server = parsedServer.server;
      if (parsedServer.port !== -1) {
        config.port = parsedServer.port;
      }
    }

    // 根据认证类型添加用户信息
    if (authType === 'sql') {
      config.user = username;
      config.password = password;
    }

    logger.info('🚀 使用test-quick风格连接测试');
    logger.info(`目标服务器: ${parsedServer.port === -1 ? parsedServer.server : `${parsedServer.server}:${parsedServer.port}`}`);
    logger.info(`目标数据库: ${database}`);
    logger.info(`认证方式: ${authType || 'windows'}`);

    let pool = null;
    
    try {
      console.log('创建连接池...');
      pool = new sql.ConnectionPool(config);
      
      console.log('连接中...');
      await pool.connect();
      
      console.log('✅ 连接成功! 执行测试查询...');
      const result = await pool.request().query('SELECT @@VERSION as version');
      const version = result.recordset[0]?.version;
      
      console.log('获取到数据库版本:', version?.substring(0, 100) + '...');
      
      await pool.close();
      
      logger.info('✅ test-quick风格连接测试成功');
      logger.info(`数据库版本: ${version?.substring(0, 50)}...`);
      
      res.json({
        success: true,
        message: '数据库连接成功 (test-quick风格)',
        server: server,
        database: database,
        version: version?.substring(0, 100) + '...',
        authType: authType || 'windows',
        connectionType: 'test-quick-style'
      });
      
    } catch (error: any) {
      if (pool) {
        try {
          await pool.close();
        } catch (closeError) {
          console.error('关闭连接池时出错:', closeError);
        }
      }
      
      logger.error('❌ test-quick风格连接测试失败:', error);
      console.error('连接失败:', error.message);
      
      res.status(500).json({
        success: false,
        error: '数据库连接失败 (test-quick风格)',
        details: error.message,
        errorCode: error.code,
        errorType: error.constructor.name,
        connectionType: 'test-quick-style'
      });
    }
    
  } catch (error: any) {
    logger.error('test-quick连接测试异常:', error);
    console.error('test-quick连接测试异常:', error);
    res.status(500).json({
      success: false,
      error: 'test-quick连接测试失败',
      details: error.message
    });
  }
});

// 测试数据库连接 - 使用与test-quick相同的连接方式
router.post('/test-connection', async (req, res) => {
  try {
    const { server, database, authentication } = req.body;
    
    // 验证必要参数
    if (!server || !database) {
      return res.status(400).json({
        success: false,
        error: '服务器和数据库名称不能为空'
      });
    }

    if (authentication.type === 'sql' && (!authentication.username || !authentication.password)) {
      return res.status(400).json({
        success: false,
        error: 'SQL认证需要提供用户名和密码'
      });
    }

    // 解析服务器地址和端口号
    const parsedServer2 = parseServerAddress(server as string);
    
    // 使用与test-quick完全相同的配置
    const config: any = {
      database: database,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        useUTC: false
      },
      connectionTimeout: 30000,
      requestTimeout: 30000
    };

    // 处理服务器地址和端口
    if (parsedServer2.server.includes(',')) {
      // 对于逗号格式，分离服务器和端口
      const parts = parsedServer2.server.split(',');
      config.server = parts[0];
      config.port = parseInt(parts[1], 10);
    } else {
      config.server = parsedServer2.server;
      if (parsedServer2.port !== -1) {
        config.port = parsedServer2.port;
      }
    }

    // 根据认证类型添加用户信息
    if (authentication.type === 'sql') {
      config.user = authentication.username;
      config.password = authentication.password;
    }

    logger.info('🚀 使用与test-quick相同的连接方式测试');
    logger.info(`目标服务器: ${parsedServer2.port === -1 ? parsedServer2.server : `${parsedServer2.server}:${parsedServer2.port}`}`);
    logger.info(`目标数据库: ${database}`);
    logger.info(`认证方式: ${authentication.type || 'windows'}`);

    let pool = null;
    
    try {
      console.log('创建连接池...');
      pool = new sql.ConnectionPool(config);
      
      console.log('连接中...');
      await pool.connect();
      
      console.log('✅ 连接成功! 执行测试查询...');
      const result = await pool.request().query('SELECT @@VERSION as version');
      const version = result.recordset[0]?.version;
      
      console.log('获取到数据库版本:', version?.substring(0, 100) + '...');
      
      await pool.close();
      
      logger.info('✅ 数据库连接测试成功');
      logger.info(`数据库版本: ${version?.substring(0, 50)}...`);
      
      res.json({
        success: true,
        message: '数据库连接成功',
        server: server,
        database: database,
        version: version?.substring(0, 100) + '...',
        authType: authentication.type || 'windows',
        connectionType: 'test-quick-style'
      });
      
    } catch (error: any) {
      if (pool) {
        try {
          await pool.close();
        } catch (closeError) {
          console.error('关闭连接池时出错:', closeError);
        }
      }
      
      logger.error('❌ 数据库连接测试失败:', error);
      console.error('连接失败:', error.message);
      
      res.status(500).json({
        success: false,
        error: '数据库连接失败',
        details: error.message,
        errorCode: error.code,
        errorType: error.constructor.name,
        connectionType: 'test-quick-style'
      });
    }
    
  } catch (error: any) {
    logger.error('数据库连接测试异常:', error);
    console.error('数据库连接测试异常:', error);
    res.status(500).json({
      success: false,
      error: '数据库连接测试失败',
      details: error.message
    });
  }
});

// 获取数据库对象列表
router.get('/objects', async (req, res) => {
  try {
    const { server, database, authType, username, password, objectType } = req.query;
    
    if (!server || !database) {
      return res.status(400).json({
        error: '缺少必要的数据库连接参数'
      });
    }

    const config: DatabaseConfig = {
      server: server as string,
      database: database as string,
      authentication: {
        type: (authType as string) === 'sql' ? 'sql' : 'windows',
        username: username as string,
        password: password as string
      }
    };

    let connection: DatabaseConnection | null = null;
    
    try {
      connection = new DatabaseConnection(config, logger);
      await connection.connect();
      
      let objects: any[] = [];
      
      switch (objectType) {
        case 'tables':
          const tableExtractor = new TableExtractor(connection, logger);
          const tables = await tableExtractor.extractAllTables();
          objects = tables.map(t => ({
            name: `${t.schemaName}.${t.tableName}`,
            schema: t.schemaName,
            objectName: t.tableName,
            type: 'table',
            columnCount: t.columns.length
          }));
          break;
          
        default:
          // 默认返回表列表
          const defaultExtractor = new TableExtractor(connection, logger);
          const defaultTables = await defaultExtractor.extractAllTables();
          objects = defaultTables.map(t => ({
            name: `${t.schemaName}.${t.tableName}`,
            schema: t.schemaName,
            objectName: t.tableName,
            type: 'table',
            columnCount: t.columns.length
          }));
      }
      
      await connection.close();
      
      res.json({
        success: true,
        objects,
        count: objects.length
      });
      
    } catch (error) {
      if (connection) {
        await connection.close();
      }
      throw error;
    }
    
  } catch (error: any) {
    logger.error('获取数据库对象失败:', error);
    console.error('获取数据库对象失败:', error);
    res.status(500).json({
      success: false,
      error: '获取数据库对象失败',
      details: error.message
    });
  }
});

// 获取数据库基本信息
router.get('/info', async (req, res) => {
  try {
    const { server, database, authType, username, password } = req.query;
    
    if (!server || !database) {
      return res.status(400).json({
        error: '缺少必要的数据库连接参数'
      });
    }

    const config: DatabaseConfig = {
      server: server as string,
      database: database as string,
      authentication: {
        type: (authType as string) === 'sql' ? 'sql' : 'windows',
        username: username as string,
        password: password as string
      }
    };

    let connection: DatabaseConnection | null = null;
    
    try {
      connection = new DatabaseConnection(config, logger);
      await connection.connect();
      
      // 获取基本信息
      const versionResult = await connection.executeQuery('SELECT @@VERSION as version');
      const dbInfoResult = await connection.executeQuery(`
        SELECT 
          name as database_name,
          database_id,
          create_date,
          compatibility_level
        FROM sys.databases 
        WHERE name = @database
      `, { database });
      
      await connection.close();
      
      res.json({
        success: true,
        info: {
          server: config.server,
          database: config.database,
          version: versionResult[0]?.version,
          databaseInfo: dbInfoResult[0] || null
        }
      });
      
    } catch (error) {
      if (connection) {
        await connection.close();
      }
      throw error;
    }
    
  } catch (error: any) {
    logger.error('获取数据库信息失败:', error);
    console.error('获取数据库信息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取数据库信息失败',
      details: error.message
    });
  }
});

export default router;