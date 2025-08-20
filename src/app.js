"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseCompareApp = void 0;
const connection_1 = require("./connections/connection");
const extractors_1 = require("./extractors");
const comparers_1 = require("./comparers");
const logger_1 = require("./utils/logger");
class DatabaseCompareApp {
    constructor(logger) {
        this.logger = logger || new logger_1.Logger();
    }
    async compareDatabase(sourceConfig, targetConfig) {
        this.logger.info('开始数据库比较...');
        const startTime = Date.now();
        const sourceConnection = new connection_1.DatabaseConnection(sourceConfig, this.logger);
        const targetConnection = new connection_1.DatabaseConnection(targetConfig, this.logger);
        try {
            await Promise.all([
                sourceConnection.connect(),
                targetConnection.connect()
            ]);
            const [sourceMetadata, targetMetadata] = await Promise.all([
                this.extractDatabaseMetadata(sourceConnection),
                this.extractDatabaseMetadata(targetConnection)
            ]);
            const differences = this.performComparison(sourceMetadata, targetMetadata);
            const summary = this.generateSummary(sourceMetadata, targetMetadata, differences);
            const result = {
                source: sourceMetadata,
                target: targetMetadata,
                differences,
                summary,
                timestamp: new Date()
            };
            const endTime = Date.now();
            this.logger.info(`数据库比较完成，耗时 ${endTime - startTime}ms`);
            return result;
        }
        finally {
            await Promise.all([
                sourceConnection.close(),
                targetConnection.close()
            ]);
        }
    }
    async extractDatabaseMetadata(connection) {
        this.logger.info(`开始提取数据库元数据: ${connection.getServerName()}/${connection.getDatabaseName()}`);
        const tableExtractor = new extractors_1.TableExtractor(connection, this.logger);
        const viewExtractor = new extractors_1.ViewExtractor(connection, this.logger);
        const procedureExtractor = new extractors_1.ProcedureExtractor(connection, this.logger);
        const functionExtractor = new extractors_1.FunctionExtractor(connection, this.logger);
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
    performComparison(sourceMetadata, targetMetadata) {
        this.logger.info('开始执行对象比较...');
        const tableComparer = new comparers_1.TableComparer(this.logger);
        const viewComparer = new comparers_1.ViewComparer(this.logger);
        const procedureComparer = new comparers_1.ProcedureComparer(this.logger);
        const functionComparer = new comparers_1.FunctionComparer(this.logger);
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
    generateSummary(sourceMetadata, targetMetadata, differences) {
        const summary = {
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
    determineOverallStatus(differences) {
        const hasChanges = differences.tables.added.length > 0 ||
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
exports.DatabaseCompareApp = DatabaseCompareApp;
async function testApp() {
    const logger = new logger_1.Logger('debug');
    const app = new DatabaseCompareApp(logger);
    const sourceConfig = {
        server: 'localhost',
        database: 'TestDB1',
        authentication: {
            type: 'windows'
        }
    };
    const targetConfig = {
        server: 'localhost',
        database: 'TestDB2',
        authentication: {
            type: 'windows'
        }
    };
    try {
        const result = await app.compareDatabase(sourceConfig, targetConfig);
        console.log('比较结果:', JSON.stringify(result.summary, null, 2));
    }
    catch (error) {
        logger.error('比较失败:', error);
    }
}
if (require.main === module) {
    testApp();
}
//# sourceMappingURL=app.js.map