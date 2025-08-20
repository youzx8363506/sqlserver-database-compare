import * as sql from 'mssql';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseConfig } from '../types';
import { Logger } from '../utils/logger';

export class DatabaseConnection {
  private config: sql.config;
  private originalConfig: DatabaseConfig;
  private pool: sql.ConnectionPool | null = null;
  private logger: Logger;
  private connectionLogFile: string;

  constructor(config: DatabaseConfig, logger: Logger) {
    console.log('🚀 [DatabaseConnection-NEW] 创建数据库连接实例 - 版本:2025-08-19-修复SSL');
    this.logger = logger;
    this.originalConfig = config;
    this.config = this.buildConnectionConfig(config);
    
    // 记录连接初始化信息到主日志
    this.logger.info(`初始化数据库连接配置 - 服务器: ${config.server}:${config.port || 1433}`);
    this.logger.info(`目标数据库: ${config.database}`);
    this.logger.info(`认证方式: ${config.authentication.type}`);
    this.logger.info(`连接超时: ${config.options?.connectionTimeout ?? 30000}ms, 请求超时: ${config.options?.requestTimeout ?? 60000}ms`);
    
    // 创建连接日志文件 - 使用项目根目录下的logs文件夹
    console.log('🔍 开始创建连接日志文件...');
    console.log('📍 步骤1: 查找项目根目录');
    
    const projectRoot = this.findProjectRoot();
    console.log('✅ 项目根目录查找完成:', projectRoot);
    
    console.log('📍 步骤2: 计算日志目录路径');
    const logDir = path.join(projectRoot, 'logs');
    console.log('✅ 日志目录路径:', logDir);
    
    // 详细调试信息
    console.log('=== 连接日志调试信息 ===');
    console.log('当前 __dirname:', __dirname);
    console.log('当前 process.cwd():', process.cwd());
    console.log('找到的项目根目录:', projectRoot);
    console.log('计算的日志目录:', logDir);
    console.log('日志目录是否存在:', fs.existsSync(logDir));
    
    console.log('📍 步骤3: 检查并创建日志目录');
    if (!fs.existsSync(logDir)) {
      console.log('📁 日志目录不存在，开始创建...');
      console.log('🔧 使用 fs.mkdirSync 创建目录:', logDir);
      console.log('⚙️ 创建参数: { recursive: true }');
      
      try {
        const startTime = Date.now();
        fs.mkdirSync(logDir, { recursive: true });
        const endTime = Date.now();
        
        console.log('✅ 日志目录创建成功!');
        console.log('⏱️ 创建耗时:', (endTime - startTime), 'ms');
        console.log('🔍 验证目录是否存在:', fs.existsSync(logDir));
        
        // 检查目录权限
        try {
          const stats = fs.statSync(logDir);
          console.log('📊 目录统计信息:');
          console.log('  - 是否为目录:', stats.isDirectory());
          console.log('  - 创建时间:', stats.birthtime.toLocaleString());
          console.log('  - 修改时间:', stats.mtime.toLocaleString());
        } catch (statError: any) {
          console.log('⚠️ 无法获取目录统计信息:', statError.message);
        }
        
      } catch (createError: any) {
        console.error('❌ 创建日志目录失败!');
        console.error('错误类型:', createError.constructor.name);
        console.error('错误代码:', createError.code || 'N/A');
        console.error('错误消息:', createError.message);
        console.error('错误路径:', createError.path || 'N/A');
        throw createError;
      }
    } else {
      console.log('📁 日志目录已存在');
      
      // 检查现有目录的权限
      try {
        const stats = fs.statSync(logDir);
        console.log('📊 现有目录信息:');
        console.log('  - 是否为目录:', stats.isDirectory());
        console.log('  - 修改时间:', stats.mtime.toLocaleString());
      } catch (statError: any) {
        console.log('⚠️ 无法获取目录信息:', statError.message);
      }
    }
    
    console.log('📍 步骤4: 生成日志文件路径');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.connectionLogFile = path.join(logDir, `connection-${timestamp}.log`);
    console.log('✅ 日志文件路径:', this.connectionLogFile);
    
    console.log('📍 步骤5: 准备写入第一条日志');
    console.log('🎯 即将调用 this.logToFile() 创建日志文件...');
    
    this.logToFile('='.repeat(80));
    this.logToFile(`连接日志开始 - ${new Date().toLocaleString()}`);
    this.logToFile(`目标服务器: ${config.server}:${config.port || 1433}`);
    this.logToFile(`目标数据库: ${config.database}`);
    this.logToFile(`认证类型: ${config.authentication.type}`);
    this.logToFile('='.repeat(80));
  }

  private findProjectRoot(): string {
    // 从当前文件位置开始，向上查找项目根目录
    let currentDir = __dirname;
    
    while (currentDir !== path.dirname(currentDir)) {
      const packageJsonPath = path.join(currentDir, 'package.json');
      
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          // 主项目的 package.json 包含 sqlserver-database-compare 名称
          if (packageJson.name === 'sqlserver-database-compare') {
            return currentDir;
          }
        } catch (error) {
          // 忽略无效的 package.json 文件
        }
      }
      
      currentDir = path.dirname(currentDir);
    }
    
    // 如果找不到主项目的 package.json，则查找包含特定文件结构的目录
    currentDir = __dirname;
    while (currentDir !== path.dirname(currentDir)) {
      // 检查是否存在典型的项目文件结构
      const srcDir = path.join(currentDir, 'src');
      const connectionsDir = path.join(srcDir, 'connections');
      const packageJsonPath = path.join(currentDir, 'package.json');
      
      if (fs.existsSync(srcDir) && fs.existsSync(connectionsDir) && fs.existsSync(packageJsonPath)) {
        return currentDir;
      }
      
      currentDir = path.dirname(currentDir);
    }
    
    // 最后回退：查找当前工作目录或其父目录中的 logs 目录
    const possibleRoots = [
      process.cwd(),
      path.dirname(process.cwd()),
      path.resolve(process.cwd(), '..'),
      path.resolve(process.cwd(), '..')
    ];
    
    for (const root of possibleRoots) {
      if (fs.existsSync(root)) {
        return root;
      }
    }
    
    // 最终回退到当前工作目录
    return process.cwd();
  }

  private logToFile(message: string, error?: any): void {
    console.log('📝 logToFile() 被调用');
    console.log('📄 日志消息:', message);
    console.log('📁 目标文件:', this.connectionLogFile);
    
    const timestamp = new Date().toISOString();
    let logEntry = `[${timestamp}] ${message}`;
    
    if (error) {
      logEntry += '\n' + JSON.stringify(error, null, 2);
      if (error.stack) {
        logEntry += '\n堆栈跟踪:\n' + error.stack;
      }
    }
    
    logEntry += '\n';
    
    console.log('📝 准备写入日志内容 (前100字符):', logEntry.substring(0, 100) + '...');
    console.log('💾 使用 fs.appendFileSync 写入文件...');
    
    try {
      const startTime = Date.now();
      
      // 检查文件是否存在
      const fileExists = fs.existsSync(this.connectionLogFile);
      console.log('🔍 日志文件是否已存在:', fileExists);
      
      fs.appendFileSync(this.connectionLogFile, logEntry, 'utf8');
      
      const endTime = Date.now();
      console.log('✅ 日志写入成功!');
      console.log('⏱️ 写入耗时:', (endTime - startTime), 'ms');
      
      // 验证文件是否创建成功
      const fileExistsAfter = fs.existsSync(this.connectionLogFile);
      console.log('🔍 写入后文件是否存在:', fileExistsAfter);
      
      if (fileExistsAfter) {
        try {
          const stats = fs.statSync(this.connectionLogFile);
          console.log('📊 日志文件信息:');
          console.log('  - 文件大小:', stats.size, 'bytes');
          console.log('  - 修改时间:', stats.mtime.toLocaleString());
        } catch (statError: any) {
          console.log('⚠️ 无法获取文件统计信息:', statError.message);
        }
      }
      
    } catch (writeError: any) {
      console.error('❌ 写入日志文件失败!');
      console.error('错误类型:', writeError.constructor.name);
      console.error('错误代码:', writeError.code || 'N/A');
      console.error('错误消息:', writeError.message);
      console.error('错误路径:', writeError.path || 'N/A');
      console.error('目标文件:', this.connectionLogFile);
    }
  }

  private buildConnectionConfig(config: DatabaseConfig): sql.config {
    console.log('🔧 [DatabaseConnection] 构建连接配置开始');
    console.log('🔧 [DatabaseConnection] 输入配置:', JSON.stringify(config, null, 2));
    
    // 完全按照test-quick.js成功配置的格式 - 确保SSL完全禁用
    const sqlConfig: sql.config = {
      server: config.server,
      database: config.database,
      port: config.port || 1433,
      options: {
        encrypt: false,           // 禁用加密
        trustServerCertificate: true,  // 信任服务器证书
        enableArithAbort: true,
        useUTC: false
      },
      connectionTimeout: config.options?.connectionTimeout ?? 10000,
      requestTimeout: config.options?.requestTimeout ?? 10000
    };

    if (config.authentication.type === 'sql') {
      if (!config.authentication.username || !config.authentication.password) {
        throw new Error('SQL认证需要提供用户名和密码');
      }
      // 使用与test-quick.js相同的字段名
      sqlConfig.user = config.authentication.username;
      sqlConfig.password = config.authentication.password;
    } else {
      // Windows认证 - 移除复杂的authentication配置
      // 让mssql使用默认的Windows认证方式
    }

    console.log('🔧 [DatabaseConnection] 最终生成的连接配置:', JSON.stringify(sqlConfig, null, 2));
    return sqlConfig;
  }

  async connect(): Promise<void> {
    const connectionStrategies = this.getConnectionStrategies();
    this.logToFile(`开始尝试 ${connectionStrategies.length} 种连接策略`);
    
    // 记录连接开始信息到主日志
    this.logger.info(`开始数据库连接 - 服务器: ${this.config.server}, 数据库: ${this.config.database}`);
    this.logger.info(`连接认证类型: ${this.originalConfig.authentication.type || 'windows'}`);
    this.logger.info(`可用连接策略: ${connectionStrategies.length} 种`);
    
    for (let i = 0; i < connectionStrategies.length; i++) {
      const strategy = connectionStrategies[i];
      if (!strategy) continue;
      
      this.logToFile(`\n策略 ${i + 1}/${connectionStrategies.length}: ${strategy.name}`);
      this.logToFile(`配置详情: ${JSON.stringify(strategy.config, null, 2)}`);
      
      try {
        console.log(`🔧 [DatabaseConnection-NEW] 尝试连接策略: ${strategy.name}`);
        this.logger.info(`尝试连接策略 ${i + 1}/${connectionStrategies.length}: ${strategy.name}`);
        this.logToFile(`开始建立连接池...`);
        
        this.pool = new sql.ConnectionPool(strategy.config);
        
        // 监听连接事件
        this.pool.on('connect', () => {
          this.logToFile(`连接池连接事件触发`);
        });
        
        this.pool.on('error', (err) => {
          this.logToFile(`连接池错误事件`, err);
        });
        
        console.log('🔧 [DatabaseConnection-NEW] 开始执行 pool.connect()...');
        this.logToFile(`调用 pool.connect()...`);
        await this.pool.connect();
        console.log('✅ [DatabaseConnection-NEW] pool.connect() 成功完成');
        this.logToFile(`pool.connect() 成功完成`);
        
        // 测试连接
        this.logToFile(`测试简单查询...`);
        const testResult = await this.pool.request().query('SELECT 1 as test');
        this.logToFile(`测试查询成功: ${JSON.stringify(testResult.recordset)}`);
        
        // 获取数据库版本信息
        try {
          const versionResult = await this.pool.request().query('SELECT @@VERSION as version');
          const dbVersion = versionResult.recordset[0]?.version;
          this.logger.info(`数据库版本: ${dbVersion?.substring(0, 100)}...`);
        } catch (versionError) {
          this.logger.warn('无法获取数据库版本信息');
        }
        
        this.logger.info(`✅ 数据库连接成功！使用策略: ${strategy.name}`);
        this.logger.info(`已连接到数据库: ${this.config.server}/${this.config.database}`);
        this.logger.info(`连接池状态: 已建立, 端口: ${this.config.port || 1433}`);
        this.logger.info(`详细连接日志文件: ${this.connectionLogFile}`);
        this.logToFile(`✅ 连接策略 "${strategy.name}" 成功!`);
        this.logToFile(`日志文件位置: ${this.connectionLogFile}`);
        return;
        
      } catch (error: any) {
        this.logger.warn(`❌ 连接策略 "${strategy.name}" 失败: ${error.message}`);
        this.logger.warn(`错误类型: ${error.constructor.name}, 错误代码: ${error.code || 'N/A'}`);
        this.logToFile(`❌ 策略 "${strategy.name}" 失败`, error);
        
        // 记录详细错误信息
        this.logToFile(`错误类型: ${error.constructor.name}`);
        this.logToFile(`错误代码: ${error.code || 'N/A'}`);
        this.logToFile(`错误消息: ${error.message}`);
        
        if (error.originalError) {
          this.logToFile(`原始错误`, error.originalError);
        }
        
        if (this.pool) {
          try {
            this.logToFile(`关闭失败的连接池...`);
            await this.pool.close();
            this.logToFile(`连接池已关闭`);
          } catch (closeError) {
            this.logToFile(`关闭连接池时出错`, closeError);
          }
          this.pool = null;
        }
        
        // 如果是最后一个策略，抛出错误
        if (i === connectionStrategies.length - 1) {
          this.logger.error(`💀 数据库连接彻底失败 - 所有 ${connectionStrategies.length} 种连接策略都失败了`);
          this.logger.error(`目标服务器: ${this.config.server}:${this.config.port || 1433}`);
          this.logger.error(`目标数据库: ${this.config.database}`);
          this.logger.error(`最终错误: ${error.message}`);
          this.logger.error(`详细连接日志文件: ${this.connectionLogFile}`);
          this.logToFile(`\n💀 所有 ${connectionStrategies.length} 种连接策略都失败了!`);
          this.logToFile(`最终错误`, error);
          this.logToFile(`=`.repeat(80));
          this.logToFile(`连接尝试结束 - ${new Date().toLocaleString()}`);
          this.logToFile(`日志文件: ${this.connectionLogFile}`);
          this.logToFile(`=`.repeat(80));
          throw error;
        }
      }
    }
  }

  private getConnectionStrategies() {
    // 直接使用已验证的成功配置，无需多策略尝试
    return [
      {
        name: '基于test-quick.js验证的成功配置',
        config: this.config // 直接使用buildConnectionConfig生成的配置
      }
    ];
  }

  async executeQuery<T = any>(query: string, parameters?: Record<string, any>): Promise<T[]> {
    if (!this.pool) {
      const errorMsg = '数据库未连接，无法执行查询';
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      const request = this.pool.request();
      
      // 添加参数
      if (parameters) {
        Object.keys(parameters).forEach(key => {
          request.input(key, parameters[key]);
        });
      }

      // 对重要查询记录到info级别
      const isImportantQuery = query.toLowerCase().includes('information_schema') || 
                              query.toLowerCase().includes('sys.') ||
                              query.toLowerCase().includes('@@version');
      
      if (isImportantQuery) {
        this.logger.info(`执行重要查询: ${query.substring(0, 100)}...`);
      } else {
        this.logger.debug('执行SQL查询', { query, parameters });
      }
      
      const startTime = Date.now();
      const result = await request.query(query);
      const duration = Date.now() - startTime;
      
      if (isImportantQuery) {
        this.logger.info(`查询完成，返回 ${result.recordset.length} 条记录，耗时 ${duration}ms`);
      } else {
        this.logger.debug(`查询返回 ${result.recordset.length} 条记录，耗时 ${duration}ms`);
      }
      
      return result.recordset;
    } catch (error: any) {
      this.logger.error(`查询执行失败: ${error.message}`, error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      this.logger.info(`正在关闭数据库连接 - 服务器: ${this.config.server}, 数据库: ${this.config.database}`);
      this.logToFile(`开始关闭数据库连接...`);
      
      try {
        await this.pool.close();
        this.pool = null;
        this.logger.info(`✅ 数据库连接已成功关闭`);
        this.logToFile(`✅ 数据库连接已成功关闭`);
      } catch (error: any) {
        this.logger.error('关闭数据库连接时发生错误:', error);
        this.logToFile(`❌ 关闭数据库连接时出错`, error);
        this.pool = null;
        throw error;
      }
    } else {
      this.logger.debug('数据库连接已经是关闭状态，无需重复关闭');
    }
  }

  isConnected(): boolean {
    return this.pool !== null && this.pool.connected;
  }

  getDatabaseName(): string {
    return this.config.database || '';
  }

  getServerName(): string {
    return this.config.server || '';
  }

  getConnectionLogFile(): string {
    return this.connectionLogFile;
  }
}