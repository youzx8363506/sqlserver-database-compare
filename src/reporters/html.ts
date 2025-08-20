import { BaseReporter } from './base';
import { ComparisonResult } from '../types';
import * as handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';

export class HtmlReporter extends BaseReporter {
  
  async generateReport(result: ComparisonResult, outputPath: string): Promise<string> {
    this.logger.info('生成HTML报告...');
    
    await this.ensureOutputDirectory(outputPath);
    
    const template = await this.getTemplate();
    const compiledTemplate = handlebars.compile(template);
    
    const templateData = this.prepareTemplateData(result);
    const html = compiledTemplate(templateData);
    
    // 使用传入的outputPath，而不是自己生成文件名
    await fs.writeFile(outputPath, html, 'utf-8');
    
    this.logger.info(`HTML报告已生成: ${outputPath}`);
    return outputPath;
  }

  private async getTemplate(): Promise<string> {
    // 如果没有自定义模板，使用内置模板
    return this.getDefaultTemplate();
  }

  private getDefaultTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>数据库比较报告</title>
    <style>
        body { 
            font-family: 'Microsoft YaHei', Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background-color: #f5f5f5; 
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            background: white; 
            padding: 30px; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #007acc; 
            padding-bottom: 20px; 
        }
        .header h1 { 
            color: #007acc; 
            margin: 0; 
        }
        .summary { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; 
            margin-bottom: 40px; 
        }
        .summary-card { 
            background: #f8f9fa; 
            padding: 20px; 
            border-radius: 6px; 
            border-left: 4px solid #007acc; 
        }
        .summary-card h3 { 
            margin: 0 0 10px 0; 
            color: #333; 
        }
        .status-badge { 
            display: inline-block; 
            padding: 4px 12px; 
            border-radius: 4px; 
            font-size: 12px; 
            font-weight: bold; 
        }
        .status-identical { 
            background: #d4edda; 
            color: #155724; 
        }
        .status-different { 
            background: #f8d7da; 
            color: #721c24; 
        }
        .change-added { 
            color: #28a745; 
        }
        .change-removed { 
            color: #dc3545; 
        }
        .change-modified { 
            color: #ffc107; 
        }
        .section { 
            margin-bottom: 30px; 
        }
        .section h2 { 
            color: #007acc; 
            border-bottom: 1px solid #ddd; 
            padding-bottom: 10px; 
        }
        .object-list { 
            margin-left: 20px; 
        }
        .object-item { 
            margin: 10px 0; 
            padding: 10px; 
            background: #f8f9fa; 
            border-radius: 4px; 
        }
        .object-name { 
            font-weight: bold; 
            color: #333; 
        }
        .change-details { 
            margin-top: 10px; 
            padding: 10px; 
            background: white; 
            border-radius: 4px; 
            border: 1px solid #ddd; 
        }
        .property-change { 
            margin: 5px 0; 
            font-family: monospace; 
            font-size: 12px; 
        }
        .metadata { 
            text-align: center; 
            margin-top: 40px; 
            padding-top: 20px; 
            border-top: 1px solid #ddd; 
            color: #666; 
            font-size: 12px; 
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 10px 0; 
        }
        th, td { 
            padding: 8px 12px; 
            text-align: left; 
            border-bottom: 1px solid #ddd; 
        }
        th { 
            background: #f8f9fa; 
            font-weight: bold; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>数据库比较报告</h1>
            <p>
                <strong>源数据库:</strong> {{source.server}}/{{source.databaseName}} &nbsp;&nbsp;&nbsp;
                <strong>目标数据库:</strong> {{target.server}}/{{target.databaseName}}
            </p>
            <p>
                <strong>比较时间:</strong> {{formatDate timestamp}} &nbsp;&nbsp;&nbsp;
                <span class="status-badge {{#if (eq summary.overallStatus 'identical')}}status-identical{{else}}status-different{{/if}}">
                    {{#if (eq summary.overallStatus 'identical')}}数据库结构相同{{else}}发现差异{{/if}}
                </span>
            </p>
        </div>

        <div class="summary">
            <div class="summary-card">
                <h3>表 (Tables)</h3>
                <p>源: {{summary.totalTables.source}} | 目标: {{summary.totalTables.target}}</p>
                <p>
                    <span class="change-added">+{{summary.totalTables.added}}</span> &nbsp;
                    <span class="change-removed">-{{summary.totalTables.removed}}</span> &nbsp;
                    <span class="change-modified">~{{summary.totalTables.modified}}</span>
                </p>
            </div>
            <div class="summary-card">
                <h3>视图 (Views)</h3>
                <p>源: {{summary.totalViews.source}} | 目标: {{summary.totalViews.target}}</p>
                <p>
                    <span class="change-added">+{{summary.totalViews.added}}</span> &nbsp;
                    <span class="change-removed">-{{summary.totalViews.removed}}</span> &nbsp;
                    <span class="change-modified">~{{summary.totalViews.modified}}</span>
                </p>
            </div>
            <div class="summary-card">
                <h3>存储过程 (Procedures)</h3>
                <p>源: {{summary.totalProcedures.source}} | 目标: {{summary.totalProcedures.target}}</p>
                <p>
                    <span class="change-added">+{{summary.totalProcedures.added}}</span> &nbsp;
                    <span class="change-removed">-{{summary.totalProcedures.removed}}</span> &nbsp;
                    <span class="change-modified">~{{summary.totalProcedures.modified}}</span>
                </p>
            </div>
            <div class="summary-card">
                <h3>函数 (Functions)</h3>
                <p>源: {{summary.totalFunctions.source}} | 目标: {{summary.totalFunctions.target}}</p>
                <p>
                    <span class="change-added">+{{summary.totalFunctions.added}}</span> &nbsp;
                    <span class="change-removed">-{{summary.totalFunctions.removed}}</span> &nbsp;
                    <span class="change-modified">~{{summary.totalFunctions.modified}}</span>
                </p>
            </div>
        </div>

        {{#if (hasChanges differences.tables)}}
        <div class="section">
            <h2>表变更详情</h2>
            
            {{#if differences.tables.added}}
            <h3 class="change-added">新增表 ({{differences.tables.added.length}})</h3>
            <div class="object-list">
                {{#each differences.tables.added}}
                <div class="object-item">
                    <div class="object-name">{{schemaName}}.{{tableName}}</div>
                </div>
                {{/each}}
            </div>
            {{/if}}

            {{#if differences.tables.removed}}
            <h3 class="change-removed">删除表 ({{differences.tables.removed.length}})</h3>
            <div class="object-list">
                {{#each differences.tables.removed}}
                <div class="object-item">
                    <div class="object-name">{{schemaName}}.{{tableName}}</div>
                </div>
                {{/each}}
            </div>
            {{/if}}

            {{#if differences.tables.modified}}
            <h3 class="change-modified">修改表 ({{differences.tables.modified.length}})</h3>
            <div class="object-list">
                {{#each differences.tables.modified}}
                <div class="object-item">
                    <div class="object-name">{{schemaName}}.{{tableName}}</div>
                    {{#if columnChanges.added}}
                    <div class="change-details">
                        <strong class="change-added">新增列:</strong>
                        {{#each columnChanges.added}}
                        <div class="property-change">+ {{columnName}} ({{dataType}})</div>
                        {{/each}}
                    </div>
                    {{/if}}
                    {{#if columnChanges.removed}}
                    <div class="change-details">
                        <strong class="change-removed">删除列:</strong>
                        {{#each columnChanges.removed}}
                        <div class="property-change">- {{columnName}} ({{dataType}})</div>
                        {{/each}}
                    </div>
                    {{/if}}
                    {{#if columnChanges.modified}}
                    <div class="change-details">
                        <strong class="change-modified">修改列:</strong>
                        {{#each columnChanges.modified}}
                        <div class="property-change">~ {{columnName}}</div>
                        {{#each changes}}
                        <div class="property-change">  {{property}}: {{sourceValue}} → {{targetValue}}</div>
                        {{/each}}
                        {{/each}}
                    </div>
                    {{/if}}
                </div>
                {{/each}}
            </div>
            {{/if}}
        </div>
        {{/if}}

        <div class="metadata">
            <p>报告生成时间: {{formatDate timestamp}}</p>
            <p>由 SQL Server 数据库比较工具生成</p>
        </div>
    </div>

    <script>
        // 添加一些交互功能
        document.addEventListener('DOMContentLoaded', function() {
            // 可以添加折叠/展开功能等
        });
    </script>
</body>
</html>
    `;
  }

  private prepareTemplateData(result: ComparisonResult): any {
    // 注册 Handlebars 助手函数
    handlebars.registerHelper('formatDate', function(date: Date) {
      return date.toLocaleString('zh-CN');
    });

    handlebars.registerHelper('eq', function(a: any, b: any) {
      return a === b;
    });

    handlebars.registerHelper('hasChanges', function(changes: any) {
      return changes.added.length > 0 || changes.removed.length > 0 || changes.modified.length > 0;
    });

    return result;
  }
}