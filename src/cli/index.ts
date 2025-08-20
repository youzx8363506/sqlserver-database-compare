#!/usr/bin/env node

import { Command } from 'commander';
import { CompareCommand } from './commands/compare';
import { ConfigCommand } from './commands/config';
import { Logger } from '../utils/logger';
import chalk from 'chalk';

const program = new Command();
const logger = new Logger();

// 设置程序信息
program
  .name('sqldb-compare')
  .description('SQL Server 数据库比较工具')
  .version('1.0.0')
  .helpOption('-h, --help', '显示帮助信息');

// 比较命令
program
  .command('compare')
  .description('比较两个数据库')
  .option('-s, --source <source>', '源数据库连接字符串 (格式: server.database[;auth=sql;user=xxx;pass=xxx])')
  .option('-t, --target <target>', '目标数据库连接字符串')
  .option('-c, --config <config>', '配置文件路径')
  .option('-o, --output <output>', '输出目录', './reports')
  .option('-f, --format <format>', '报告格式 (html|excel|json)', 'html')
  .option('--tables-only', '只比较表')
  .option('--views-only', '只比较视图')
  .option('--procedures-only', '只比较存储过程')
  .option('--functions-only', '只比较函数')
  .option('-v, --verbose', '详细输出')
  .option('--silent', '静默模式')
  .action(async (options) => {
    try {
      // 设置日志级别
      if (options.verbose) {
        logger.setLevel('debug');
      } else if (options.silent) {
        logger.setLevel('error');
      }

      const compareCmd = new CompareCommand(logger);
      await compareCmd.execute(options);
    } catch (error) {
      console.error(chalk.red('❌ 命令执行失败:'), error);
      process.exit(1);
    }
  });

// 初始化配置命令
program
  .command('init')
  .description('初始化配置文件')
  .option('-o, --output <output>', '配置文件输出路径', './config.json')
  .action(async (options) => {
    try {
      const configCmd = new ConfigCommand(logger);
      await configCmd.init(options);
    } catch (error) {
      console.error(chalk.red('❌ 配置初始化失败:'), error);
      process.exit(1);
    }
  });

// 帮助命令
program
  .command('help [command]')
  .description('显示命令帮助')
  .action((command) => {
    if (command) {
      program.commands.find(cmd => cmd.name() === command)?.help();
    } else {
      program.help();
    }
  });

// 添加使用示例
program.on('--help', () => {
  console.log('');
  console.log(chalk.yellow('使用示例:'));
  console.log('');
  console.log('  # 初始化配置文件');
  console.log('  $ sqldb-compare init');
  console.log('');
  console.log('  # 使用配置文件比较');
  console.log('  $ sqldb-compare compare --config ./config.json');
  console.log('');
  console.log('  # 直接指定数据库比较');
  console.log('  $ sqldb-compare compare --source "localhost.DB1" --target "localhost.DB2"');
  console.log('');
  console.log('  # 使用SQL认证');
  console.log('  $ sqldb-compare compare \\');
  console.log('    --source "server1.db1;auth=sql;user=sa;pass=password" \\');
  console.log('    --target "server2.db2;auth=sql;user=sa;pass=password"');
  console.log('');
  console.log('  # 只比较表并生成Excel报告');
  console.log('  $ sqldb-compare compare --config ./config.json --tables-only --format excel');
  console.log('');
  console.log(chalk.yellow('配置文件格式:'));
  console.log('');
  console.log('  {');
  console.log('    "source": {');
  console.log('      "server": "localhost",');
  console.log('      "database": "Database1",');
  console.log('      "authentication": { "type": "windows" }');
  console.log('    },');
  console.log('    "target": {');
  console.log('      "server": "localhost",');
  console.log('      "database": "Database2",');
  console.log('      "authentication": {');
  console.log('        "type": "sql",');
  console.log('        "username": "sa",');
  console.log('        "password": "password"');
  console.log('      }');
  console.log('    }');
  console.log('  }');
  console.log('');
});

// 错误处理
process.on('uncaughtException', (error) => {
  console.error(chalk.red('💥 未捕获的异常:'), error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('💥 未处理的Promise拒绝:'), reason);
  process.exit(1);
});

// 解析命令行参数
program.parse();

// 如果没有提供任何命令，显示帮助
if (!process.argv.slice(2).length) {
  console.log(chalk.blue('📊 SQL Server 数据库比较工具'));
  console.log(chalk.gray('================================'));
  console.log('');
  console.log('请使用 --help 查看可用命令');
  console.log('');
  console.log(chalk.yellow('快速开始:'));
  console.log('  sqldb-compare init    # 创建配置文件');
  console.log('  sqldb-compare compare --help    # 查看比较命令帮助');
}