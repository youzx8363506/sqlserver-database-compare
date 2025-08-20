import { BaseExtractor } from './base';
import { ProcedureInfo, ParameterInfo } from '../types';

export class ProcedureExtractor extends BaseExtractor {
  
  async extractAllProcedures(): Promise<ProcedureInfo[]> {
    this.logger.info('开始提取存储过程信息...');
    
    const procedures = await this.getProcedureList();
    const procedureInfos: ProcedureInfo[] = [];

    for (const procedure of procedures) {
      try {
        const procedureInfo = await this.extractProcedureInfo(procedure.schemaName, procedure.procedureName);
        procedureInfos.push(procedureInfo);
        this.logger.debug(`已提取存储过程: ${procedure.schemaName}.${procedure.procedureName}`);
      } catch (error) {
        this.logger.error(`提取存储过程 ${procedure.schemaName}.${procedure.procedureName} 失败:`, error);
      }
    }

    this.logger.info(`存储过程提取完成，共 ${procedureInfos.length} 个存储过程`);
    return procedureInfos;
  }

  private async getProcedureList(): Promise<{ schemaName: string; procedureName: string }[]> {
    const query = `
      SELECT 
        s.name as schemaName,
        p.name as procedureName
      FROM sys.procedures p
      JOIN sys.schemas s ON p.schema_id = s.schema_id
      ORDER BY s.name, p.name
    `;

    return await this.executeQuery(query);
  }

  private async extractProcedureInfo(schemaName: string, procedureName: string): Promise<ProcedureInfo> {
    const [procedureDetails, parameters] = await Promise.all([
      this.getProcedureDetails(schemaName, procedureName),
      this.getProcedureParameters(schemaName, procedureName),
    ]);

    const procedureDetail = procedureDetails[0];
    if (!procedureDetail) {
      throw new Error(`存储过程 ${schemaName}.${procedureName} 不存在`);
    }

    return {
      schemaName,
      procedureName,
      createDate: procedureDetail.createDate,
      modifyDate: procedureDetail.modifyDate,
      definition: procedureDetail.definition || '',
      parameters,
    };
  }

  private async getProcedureDetails(schemaName: string, procedureName: string): Promise<any[]> {
    const query = `
      SELECT 
        p.create_date as createDate,
        p.modify_date as modifyDate,
        m.definition as definition
      FROM sys.procedures p
      JOIN sys.schemas s ON p.schema_id = s.schema_id
      LEFT JOIN sys.sql_modules m ON p.object_id = m.object_id
      WHERE s.name = @schemaName
        AND p.name = @procedureName
    `;

    return await this.executeQuery(query, { schemaName, procedureName });
  }

  private async getProcedureParameters(schemaName: string, procedureName: string): Promise<ParameterInfo[]> {
    const query = `
      SELECT 
        pm.name as parameterName,
        pm.parameter_id as parameterId,
        t.name as dataType,
        pm.max_length as maxLength,
        pm.precision as precision,
        pm.scale as scale,
        pm.is_output as isOutput,
        pm.has_default_value as hasDefault,
        pm.default_value as defaultValue
      FROM sys.procedures p
      JOIN sys.schemas s ON p.schema_id = s.schema_id
      JOIN sys.parameters pm ON p.object_id = pm.object_id
      JOIN sys.types t ON pm.user_type_id = t.user_type_id
      WHERE s.name = @schemaName
        AND p.name = @procedureName
      ORDER BY pm.parameter_id
    `;

    const results = await this.executeQuery(query, { schemaName, procedureName });
    
    return results.map((row: any) => ({
      parameterName: row.parameterName,
      parameterId: row.parameterId,
      dataType: row.dataType,
      maxLength: row.maxLength,
      precision: row.precision,
      scale: row.scale,
      isOutput: row.isOutput,
      hasDefault: row.hasDefault,
      defaultValue: row.defaultValue,
    }));
  }
}