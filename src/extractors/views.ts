import { BaseExtractor } from './base';
import { ViewInfo, DependencyInfo } from '../types';

export class ViewExtractor extends BaseExtractor {
  
  async extractAllViews(): Promise<ViewInfo[]> {
    this.logger.info('开始提取视图信息...');
    
    const views = await this.getViewList();
    const viewInfos: ViewInfo[] = [];

    for (const view of views) {
      try {
        const viewInfo = await this.extractViewInfo(view.schemaName, view.viewName);
        viewInfos.push(viewInfo);
        this.logger.debug(`已提取视图: ${view.schemaName}.${view.viewName}`);
      } catch (error) {
        this.logger.error(`提取视图 ${view.schemaName}.${view.viewName} 失败:`, error);
      }
    }

    this.logger.info(`视图提取完成，共 ${viewInfos.length} 个视图`);
    return viewInfos;
  }

  private async getViewList(): Promise<{ schemaName: string; viewName: string }[]> {
    const query = `
      SELECT 
        v.TABLE_SCHEMA as schemaName,
        v.TABLE_NAME as viewName
      FROM INFORMATION_SCHEMA.VIEWS v
      ORDER BY v.TABLE_SCHEMA, v.TABLE_NAME
    `;

    return await this.executeQuery(query);
  }

  private async extractViewInfo(schemaName: string, viewName: string): Promise<ViewInfo> {
    const [viewDetails, dependencies] = await Promise.all([
      this.getViewDetails(schemaName, viewName),
      this.getViewDependencies(schemaName, viewName),
    ]);

    const viewDetail = viewDetails[0];
    if (!viewDetail) {
      throw new Error(`视图 ${schemaName}.${viewName} 不存在`);
    }

    return {
      schemaName,
      viewName,
      definition: viewDetail.definition || '',
      checkOption: viewDetail.checkOption,
      isUpdatable: viewDetail.isUpdatable === 'YES',
      dependencies,
    };
  }

  private async getViewDetails(schemaName: string, viewName: string): Promise<any[]> {
    const query = `
      SELECT 
        v.VIEW_DEFINITION as definition,
        v.CHECK_OPTION as checkOption,
        v.IS_UPDATABLE as isUpdatable
      FROM INFORMATION_SCHEMA.VIEWS v
      WHERE v.TABLE_SCHEMA = @schemaName
        AND v.TABLE_NAME = @viewName
    `;

    return await this.executeQuery(query, { schemaName, viewName });
  }

  private async getViewDependencies(schemaName: string, viewName: string): Promise<DependencyInfo[]> {
    const query = `
      SELECT 
        rs.name as referencedSchema,
        ro.name as referencedObject,
        ro.type_desc as referencedType
      FROM sys.sql_dependencies d
      JOIN sys.objects o ON d.object_id = o.object_id
      JOIN sys.schemas s ON o.schema_id = s.schema_id
      JOIN sys.objects ro ON d.referenced_major_id = ro.object_id
      JOIN sys.schemas rs ON ro.schema_id = rs.schema_id
      WHERE o.type = 'V'
        AND s.name = @schemaName
        AND o.name = @viewName
      ORDER BY rs.name, ro.name
    `;

    try {
      return await this.executeQuery(query, { schemaName, viewName });
    } catch (error) {
      this.logger.warn(`获取视图依赖关系失败: ${error}`);
      return [];
    }
  }
}