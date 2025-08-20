import { BaseReporter } from './base';
import { ComparisonResult } from '../types';
import * as ExcelJS from 'exceljs';
import * as path from 'path';

export class ExcelReporter extends BaseReporter {
  
  async generateReport(result: ComparisonResult, outputPath: string): Promise<string> {
    this.logger.info('生成Excel报告...');
    
    await this.ensureOutputDirectory(outputPath);
    
    const workbook = new ExcelJS.Workbook();
    
    // 设置工作簿属性
    workbook.creator = 'SQL Server 数据库比较工具';
    workbook.created = result.timestamp;
    workbook.modified = result.timestamp;
    
    // 创建各个工作表
    this.createSummarySheet(workbook, result);
    this.createTableChangesSheet(workbook, result);
    this.createViewChangesSheet(workbook, result);
    this.createProcedureChangesSheet(workbook, result);
    this.createFunctionChangesSheet(workbook, result);
    
    // 使用传入的outputPath，而不是自己生成文件名
    await workbook.xlsx.writeFile(outputPath);
    
    this.logger.info(`Excel报告已生成: ${outputPath}`);
    return outputPath;
  }

  private createSummarySheet(workbook: ExcelJS.Workbook, result: ComparisonResult): void {
    const worksheet = workbook.addWorksheet('摘要');
    
    // 设置列宽
    worksheet.columns = [
      { header: '项目', key: 'item', width: 20 },
      { header: '源数据库', key: 'source', width: 15 },
      { header: '目标数据库', key: 'target', width: 15 },
      { header: '新增', key: 'added', width: 10 },
      { header: '删除', key: 'removed', width: 10 },
      { header: '修改', key: 'modified', width: 10 }
    ];

    // 添加标题
    worksheet.addRow(['数据库比较摘要']);
    worksheet.mergeCells('A1:F1');
    worksheet.getCell('A1').style = {
      font: { bold: true, size: 16 },
      alignment: { horizontal: 'center' }
    };

    // 添加基本信息
    worksheet.addRow([]);
    worksheet.addRow(['源数据库:', `${result.source.server}/${result.source.databaseName}`]);
    worksheet.addRow(['目标数据库:', `${result.target.server}/${result.target.databaseName}`]);
    worksheet.addRow(['比较时间:', result.timestamp.toLocaleString('zh-CN')]);
    worksheet.addRow(['总体状态:', result.summary.overallStatus === 'identical' ? '相同' : '有差异']);

    // 添加空行
    worksheet.addRow([]);

    // 添加表头
    worksheet.addRow(['项目', '源数据库', '目标数据库', '新增', '删除', '修改']);
    const headerRow = worksheet.lastRow;
    if (headerRow) {
      headerRow.eachCell((cell) => {
        cell.style = {
          font: { bold: true },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }
        };
      });
    }

    // 添加数据
    const summaryData = [
      ['表', result.summary.totalTables.source, result.summary.totalTables.target, 
       result.summary.totalTables.added, result.summary.totalTables.removed, result.summary.totalTables.modified],
      ['视图', result.summary.totalViews.source, result.summary.totalViews.target,
       result.summary.totalViews.added, result.summary.totalViews.removed, result.summary.totalViews.modified],
      ['存储过程', result.summary.totalProcedures.source, result.summary.totalProcedures.target,
       result.summary.totalProcedures.added, result.summary.totalProcedures.removed, result.summary.totalProcedures.modified],
      ['函数', result.summary.totalFunctions.source, result.summary.totalFunctions.target,
       result.summary.totalFunctions.added, result.summary.totalFunctions.removed, result.summary.totalFunctions.modified]
    ];

    summaryData.forEach(row => {
      worksheet.addRow(row);
    });
  }

  private createTableChangesSheet(workbook: ExcelJS.Workbook, result: ComparisonResult): void {
    const worksheet = workbook.addWorksheet('表变更');
    
    worksheet.columns = [
      { header: '变更类型', key: 'changeType', width: 12 },
      { header: '架构名', key: 'schemaName', width: 15 },
      { header: '表名', key: 'tableName', width: 20 },
      { header: '详细信息', key: 'details', width: 50 }
    ];

    // 添加表头样式
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.style = {
        font: { bold: true },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }
      };
    });

    // 添加新增的表
    result.differences.tables.added.forEach(table => {
      worksheet.addRow(['新增', table.schemaName, table.tableName, `列数: ${table.columns.length}`]);
    });

    // 添加删除的表
    result.differences.tables.removed.forEach(table => {
      worksheet.addRow(['删除', table.schemaName, table.tableName, `列数: ${table.columns.length}`]);
    });

    // 添加修改的表
    result.differences.tables.modified.forEach(table => {
      const details = [];
      if (table.columnChanges.added.length > 0) {
        details.push(`新增列: ${table.columnChanges.added.length}`);
      }
      if (table.columnChanges.removed.length > 0) {
        details.push(`删除列: ${table.columnChanges.removed.length}`);
      }
      if (table.columnChanges.modified.length > 0) {
        details.push(`修改列: ${table.columnChanges.modified.length}`);
      }
      worksheet.addRow(['修改', table.schemaName, table.tableName, details.join(', ')]);
    });
  }

  private createViewChangesSheet(workbook: ExcelJS.Workbook, result: ComparisonResult): void {
    const worksheet = workbook.addWorksheet('视图变更');
    
    worksheet.columns = [
      { header: '变更类型', key: 'changeType', width: 12 },
      { header: '架构名', key: 'schemaName', width: 15 },
      { header: '视图名', key: 'viewName', width: 20 },
      { header: '变更详情', key: 'details', width: 30 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.style = {
        font: { bold: true },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }
      };
    });

    // 添加视图变更
    result.differences.views.added.forEach(view => {
      worksheet.addRow(['新增', view.schemaName, view.viewName, '']);
    });

    result.differences.views.removed.forEach(view => {
      worksheet.addRow(['删除', view.schemaName, view.viewName, '']);
    });

    result.differences.views.modified.forEach(view => {
      worksheet.addRow(['修改', view.schemaName, view.viewName, '定义已更改']);
    });
  }

  private createProcedureChangesSheet(workbook: ExcelJS.Workbook, result: ComparisonResult): void {
    const worksheet = workbook.addWorksheet('存储过程变更');
    
    worksheet.columns = [
      { header: '变更类型', key: 'changeType', width: 12 },
      { header: '架构名', key: 'schemaName', width: 15 },
      { header: '存储过程名', key: 'procedureName', width: 25 },
      { header: '变更详情', key: 'details', width: 30 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.style = {
        font: { bold: true },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }
      };
    });

    // 添加存储过程变更
    result.differences.procedures.added.forEach(proc => {
      worksheet.addRow(['新增', proc.schemaName, proc.procedureName, `参数数: ${proc.parameters.length}`]);
    });

    result.differences.procedures.removed.forEach(proc => {
      worksheet.addRow(['删除', proc.schemaName, proc.procedureName, `参数数: ${proc.parameters.length}`]);
    });

    result.differences.procedures.modified.forEach(proc => {
      const details = [];
      if (proc.definitionChanged) details.push('定义变更');
      if (proc.parametersChanged) details.push('参数变更');
      worksheet.addRow(['修改', proc.schemaName, proc.procedureName, details.join(', ')]);
    });
  }

  private createFunctionChangesSheet(workbook: ExcelJS.Workbook, result: ComparisonResult): void {
    const worksheet = workbook.addWorksheet('函数变更');
    
    worksheet.columns = [
      { header: '变更类型', key: 'changeType', width: 12 },
      { header: '架构名', key: 'schemaName', width: 15 },
      { header: '函数名', key: 'functionName', width: 25 },
      { header: '函数类型', key: 'functionType', width: 20 },
      { header: '变更详情', key: 'details', width: 30 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.style = {
        font: { bold: true },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }
      };
    });

    // 添加函数变更
    result.differences.functions.added.forEach(func => {
      worksheet.addRow(['新增', func.schemaName, func.functionName, func.functionType, `参数数: ${func.parameters.length}`]);
    });

    result.differences.functions.removed.forEach(func => {
      worksheet.addRow(['删除', func.schemaName, func.functionName, func.functionType, `参数数: ${func.parameters.length}`]);
    });

    result.differences.functions.modified.forEach(func => {
      const details = [];
      if (func.definitionChanged) details.push('定义变更');
      if (func.parametersChanged) details.push('参数变更');
      worksheet.addRow(['修改', func.schemaName, func.functionName, '', details.join(', ')]);
    });
  }
}