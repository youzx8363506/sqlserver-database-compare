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
exports.ConfigCommand = void 0;
const fs = __importStar(require("fs/promises"));
const colors = {
    blue: (text) => `\x1b[34m${text}\x1b[0m`,
    green: (text) => `\x1b[32m${text}\x1b[0m`,
    red: (text) => `\x1b[31m${text}\x1b[0m`,
    yellow: (text) => `\x1b[33m${text}\x1b[0m`,
    gray: (text) => `\x1b[90m${text}\x1b[0m`,
    cyan: (text) => `\x1b[36m${text}\x1b[0m`
};
class ConfigCommand {
    constructor(logger) {
        this.logger = logger;
    }
    async init(options) {
        console.log(colors.blue('🔧 SQL Server 数据库比较工具 - 配置模板'));
        console.log(colors.gray('=========================================='));
        console.log('');
        try {
            const config = this.createDefaultConfig();
            const outputPath = options.output || './config.json';
            await fs.writeFile(outputPath, JSON.stringify(config, null, 2), 'utf-8');
            console.log(colors.green('✅ 配置模板已创建:'), colors.cyan(outputPath));
            console.log('');
            console.log(colors.yellow('💡 请编辑配置文件后使用:'));
            console.log(`  sqldb-compare compare --config ${outputPath}`);
            console.log('');
            console.log(colors.gray('配置说明:'));
            console.log('  - 修改 source 和 target 数据库连接信息');
            console.log('  - 根据需要调整比较选项和输出设置');
        }
        catch (error) {
            console.error(colors.red('❌ 配置创建失败:'), error);
            process.exit(1);
        }
    }
    createDefaultConfig() {
        return {
            source: {
                server: 'localhost',
                database: 'Database1',
                authentication: {
                    type: 'windows'
                },
                options: {
                    encrypt: true,
                    trustServerCertificate: true,
                    connectionTimeout: 30000
                }
            },
            target: {
                server: 'localhost',
                database: 'Database2',
                authentication: {
                    type: 'sql',
                    username: 'sa',
                    password: 'your_password'
                },
                options: {
                    encrypt: true,
                    trustServerCertificate: true,
                    connectionTimeout: 30000
                }
            },
            comparison: {
                includeObjects: ['tables', 'indexes', 'views', 'procedures', 'functions'],
                ignoreCase: true,
                ignoreWhitespace: true
            },
            output: {
                directory: './reports',
                formats: ['html', 'excel', 'json'],
                filename: 'database-comparison',
                includeTimestamp: true
            },
            logging: {
                level: 'info',
                console: true
            }
        };
    }
}
exports.ConfigCommand = ConfigCommand;
//# sourceMappingURL=config.js.map