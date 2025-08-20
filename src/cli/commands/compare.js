"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompareCommand = void 0;
const app_1 = require("../../app");
const reporters_1 = require("../../reporters");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const colors = {
    blue: (text) => `\x1b[34m${text}\x1b[0m`,
    green: (text) => `\x1b[32m${text}\x1b[0m`,
    red: (text) => `\x1b[31m${text}\x1b[0m`,
    yellow: (text) => `\x1b[33m${text}\x1b[0m`,
    gray: (text) => `\x1b[90m${text}\x1b[0m`,
    cyan: (text) => `\x1b[36m${text}\x1b[0m`
};
class CompareCommand {
    constructor(logger) {
        this.logger = logger;
    }
    async execute(options) {
        try {
            this.validateOptions(options);
            const { sourceConfig, targetConfig } = await this.parseConfigs(options);
            const outputDir = options.output || './reports';
            await this.ensureOutputDirectory(outputDir);
            console.log(colors.blue('📊 SQL Server 数据库比较工具'));
            console.log(colors.gray('================================'));
            console.log(`源数据库: ${colors.green(sourceConfig.server)}/${colors.green(sourceConfig.database)}`);
            console.log(`目标数据库: ${colors.green(targetConfig.server)}/${colors.green(targetConfig.database)}`);
            console.log(`输出目录: ${colors.green(outputDir)}`);
            console.log('');
            console.log('正在连接数据库并提取元数据...');
            const app = new app_1.DatabaseCompareApp(this.logger);
            const result = await app.compareDatabase(sourceConfig, targetConfig);
            console.log(colors.green('✅ 数据库比较完成'));
            this.displaySummary(result);
            await this.generateReports(result, outputDir, options.format);
        }
        catch (error) {
            console.error(colors.red('❌ 比较失败:'), error);
            process.exit(1);
        }
    }
    validateOptions(options) {
        if (!options.config && (!options.source || !options.target)) {
            throw new Error('必须提供配置文件或源/目标数据库连接信息');
        }
    }
    async parseConfigs(options) {
        if (options.config) {
            return await this.loadConfigFile(options.config);
        }
        else {
            return {
                sourceConfig: this.parseConnectionString(options.source),
                targetConfig: this.parseConnectionString(options.target)
            };
        }
    }
    async loadConfigFile(configPath) {
        try {
            const configContent = await fs.readFile(configPath, 'utf-8');
            const config = JSON.parse(configContent);
            return {
                sourceConfig: config.source,
                targetConfig: config.target
            };
        }
        catch (error) {
            throw new Error(`无法加载配置文件 ${configPath}: ${error}`);
        }
    }
    parseConnectionString(connectionString) {
        const parts = connectionString.split(';');
        const [server, database] = parts[0]?.split('.') || [];
        if (!server || !database) {
            throw new Error(`无效的连接字符串格式: ${connectionString}`);
        }
        const config = {
            server,
            database,
            authentication: {
                type: 'windows'
            }
        };
        for (let i = 1; i < parts.length; i++) {
            const [key, value] = parts[i]?.split('=') || [];
            if (!key)
                continue;
            switch (key.toLowerCase()) {
                case 'auth':
                    config.authentication.type = value;
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
    async ensureOutputDirectory(outputDir) {
        try {
            await fs.access(outputDir);
        }
        catch {
            await fs.mkdir(outputDir, { recursive: true });
        }
    }
    displaySummary(result) {
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
                if (category.data.added > 0)
                    changes.push(colors.green(`+${category.data.added}`));
                if (category.data.removed > 0)
                    changes.push(colors.red(`-${category.data.removed}`));
                if (category.data.modified > 0)
                    changes.push(colors.yellow(`~${category.data.modified}`));
                console.log(`  变更: ${changes.join(' ')}`);
            }
            else {
                console.log(`  变更: ${colors.gray('无')}`);
            }
            console.log('');
        });
    }
    async generateReports(result, outputDir, format) {
        console.log('正在生成报告...');
        try {
            const formats = format ? [format] : ['html', 'json', 'excel'];
            const generatedFiles = [];
            for (const fmt of formats) {
                let reporter;
                switch (fmt) {
                    case 'html':
                        reporter = new reporters_1.HtmlReporter(this.logger);
                        break;
                    case 'json':
                        reporter = new reporters_1.JsonReporter(this.logger);
                        break;
                    case 'excel':
                        reporter = new reporters_1.ExcelReporter(this.logger);
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
        }
        catch (error) {
            console.log(colors.red('❌ 报告生成失败'));
            throw error;
        }
    }
}
exports.CompareCommand = CompareCommand;
//# sourceMappingURL=compare.js.map