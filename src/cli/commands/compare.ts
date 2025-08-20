import { DatabaseConfig, CliOptions, OutputFormat } from '../../types';
import { DatabaseCompareApp } from '../../app';
import { HtmlReporter, JsonReporter, ExcelReporter } from '../../reporters';
import { Logger } from '../../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';
// 简单的控制台彩色输出函数
const colors = {
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`
};

export class CompareCommand {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async execute(options: CliOptions): Promise<void> {
    try {
      // 验证选项
      this.validateOptions(options);

      // 解析数据库配置
      const { sourceConfig, targetConfig } = await this.parseConfigs(options);

      // 创建输出目录
      const outputDir = options.output || './reports';
      await this.ensureOutputDirectory(outputDir);

      console.log(colors.blue('📊 SQL Server 数据库比较工具'));
      console.log(colors.gray('================================'));
      console.log(`源数据库: ${colors.green(sourceConfig.server)}/${colors.green(sourceConfig.database)}`);
      console.log(`目标数据库: ${colors.green(targetConfig.server)}/${colors.green(targetConfig.database)}`);
      console.log(`输出目录: ${colors.green(outputDir)}`);
      console.log('');

      // 开始比较
      console.log('正在连接数据库并提取元数据...');
      
      const app = new DatabaseCompareApp(this.logger);
      const result = await app.compareDatabase(sourceConfig, targetConfig);

      console.log(colors.green('✅ 数据库比较完成'));

      // 显示摘要
      this.displaySummary(result);

      // 生成报告
      await this.generateReports(result, outputDir, options.format);

    } catch (error) {
      console.error(colors.red('❌ 比较失败:'), error);
      process.exit(1);
    }
  }

  private validateOptions(options: CliOptions): void {
    if (!options.config && (!options.source || !options.target)) {
      throw new Error('必须提供配置文件或源/目标数据库连接信息');
    }
  }

  private async parseConfigs(options: CliOptions): Promise<{
    sourceConfig: DatabaseConfig;
    targetConfig: DatabaseConfig;
  }> {
    if (options.config) {
      return await this.loadConfigFile(options.config);
    } else {
      return {
        sourceConfig: this.parseConnectionString(options.source!),
        targetConfig: this.parseConnectionString(options.target!)
      };
    }
  }

  private async loadConfigFile(configPath: string): Promise<{
    sourceConfig: DatabaseConfig;
    targetConfig: DatabaseConfig;
  }> {
    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      
      return {
        sourceConfig: config.source,
        targetConfig: config.target
      };
    } catch (error) {
      throw new Error(`无法加载配置文件 ${configPath}: ${error}`);
    }
  }

  private parseConnectionString(connectionString: string): DatabaseConfig {
    // 简单的连接字符串解析
    // 格式: server.database 或 server.database;auth=sql;user=xxx;pass=xxx
    const parts = connectionString.split(';');
    const [server, database] = parts[0]?.split('.') || [];
    
    if (!server || !database) {
      throw new Error(`无效的连接字符串格式: ${connectionString}`);
    }

    const config: DatabaseConfig = {
      server,
      database,
      authentication: {
        type: 'windows'
      }
    };

    // 解析认证信息
    for (let i = 1; i < parts.length; i++) {
      const [key, value] = parts[i]?.split('=') || [];
      if (!key) continue;
      switch (key.toLowerCase()) {
        case 'auth':
          config.authentication.type = value as 'sql' | 'windows';
          break;
        case 'user':
          config.authentication.username = value;
          break;
        case 'pass':
          config.authentication.password = value;
          break;
      }
    }

    return config;
  }

  private async ensureOutputDirectory(outputDir: string): Promise<void> {
    try {
      await fs.access(outputDir);
    } catch {
      await fs.mkdir(outputDir, { recursive: true });
    }
  }

  private displaySummary(result: any): void {
    console.log(colors.yellow('📋 比较摘要'));
    console.log(colors.gray('============'));
    
    const status = result.summary.overallStatus === 'identical' 
      ? colors.green('✅ 数据库结构相同') 
      : colors.red('⚠️  发现差异');
    
    console.log(`状态: ${status}`);
    console.log('');

    const categories = [
      { name: '表', data: result.summary.totalTables },
      { name: '视图', data: result.summary.totalViews },
      { name: '存储过程', data: result.summary.totalProcedures },
      { name: '函数', data: result.summary.totalFunctions }
    ];

    categories.forEach(category => {
      console.log(`${category.name}:`);
      console.log(`  源: ${category.data.source} | 目标: ${category.data.target}`);
      if (category.data.added > 0 || category.data.removed > 0 || category.data.modified > 0) {
        const changes = [];
        if (category.data.added > 0) changes.push(colors.green(`+${category.data.added}`));
        if (category.data.removed > 0) changes.push(colors.red(`-${category.data.removed}`));
        if (category.data.modified > 0) changes.push(colors.yellow(`~${category.data.modified}`));
        console.log(`  变更: ${changes.join(' ')}`);
      } else {
        console.log(`  变更: ${colors.gray('无')}`);
      }
      console.log('');
    });
  }

  private async generateReports(result: any, outputDir: string, format?: OutputFormat): Promise<void> {
    console.log('正在生成报告...');
    
    try {
      const formats = format ? [format] : ['html', 'json', 'excel'] as OutputFormat[];
      const generatedFiles: string[] = [];

      for (const fmt of formats) {
        let reporter;
        switch (fmt) {
          case 'html':
            reporter = new HtmlReporter(this.logger);
            break;
          case 'json':
            reporter = new JsonReporter(this.logger);
            break;
          case 'excel':
            reporter = new ExcelReporter(this.logger);
            break;
          default:
            continue;
        }

        const outputPath = path.join(outputDir, 'report');
        const filePath = await reporter.generateReport(result, outputPath);
        generatedFiles.push(filePath);
      }

      console.log(colors.green('✅ 报告生成完成'));
      
      console.log(colors.green('📄 生成的报告:'));
      generatedFiles.forEach(file => {
        console.log(`  ${colors.cyan(file)}`);
      });

    } catch (error) {
      console.log(colors.red('❌ 报告生成失败'));
      throw error;
    }
  }
}