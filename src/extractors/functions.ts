import { BaseExtractor } from './base';
import { FunctionInfo, ParameterInfo } from '../types';

export class FunctionExtractor extends BaseExtractor {
  
  async extractAllFunctions(): Promise<FunctionInfo[]> {
    this.logger.info('开始提取函数信息...');
    
    const functions = await this.getFunctionList();
    const functionInfos: FunctionInfo[] = [];

    for (const func of functions) {
      try {
        const functionInfo = await this.extractFunctionInfo(func.schemaName, func.functionName);
        functionInfos.push(functionInfo);
        this.logger.debug(`已提取函数: ${func.schemaName}.${func.functionName}`);
      } catch (error) {
        this.logger.error(`提取函数 ${func.schemaName}.${func.functionName} 失败:`, error);
      }
    }

    this.logger.info(`函数提取完成，共 ${functionInfos.length} 个函数`);
    return functionInfos;
  }

  private async getFunctionList(): Promise<{ schemaName: string; functionName: string }[]> {
    const query = `
      SELECT 
        s.name as schemaName,
        f.name as functionName
      FROM sys.objects f
      JOIN sys.schemas s ON f.schema_id = s.schema_id
      WHERE f.type IN ('FN', 'IF', 'TF')  -- 标量函数、内联表值函数、表值函数
      ORDER BY s.name, f.name
    `;

    return await this.executeQuery(query);
  }

  private async extractFunctionInfo(schemaName: string, functionName: string): Promise<FunctionInfo> {
    const [functionDetails, parameters] = await Promise.all([
      this.getFunctionDetails(schemaName, functionName),
      this.getFunctionParameters(schemaName, functionName),
    ]);

    const functionDetail = functionDetails[0];
    if (!functionDetail) {
      throw new Error(`函数 ${schemaName}.${functionName} 不存在`);
    }

    return {
      schemaName,
      functionName,
      functionType: functionDetail.functionType,
      createDate: functionDetail.createDate,
      modifyDate: functionDetail.modifyDate,
      definition: functionDetail.definition || '',
      parameters,
    };
  }

  private async getFunctionDetails(schemaName: string, functionName: string): Promise<any[]> {
    const query = `
      SELECT 
        f.type_desc as functionType,
        f.create_date as createDate,
        f.modify_date as modifyDate,
        m.definition as definition
      FROM sys.objects f
      JOIN sys.schemas s ON f.schema_id = s.schema_id
      LEFT JOIN sys.sql_modules m ON f.object_id = m.object_id
      WHERE f.type IN ('FN', 'IF', 'TF')
        AND s.name = @schemaName
        AND f.name = @functionName
    `;

    return await this.executeQuery(query, { schemaName, functionName });
  }

  private async getFunctionParameters(schemaName: string, functionName: string): Promise<ParameterInfo[]> {
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
        pm.default_value as defaultValue,
        CASE 
          WHEN pm.parameter_id = 0 THEN 'RETURN'
          ELSE 'INPUT'
        END as parameterType
      FROM sys.objects f
      JOIN sys.schemas s ON f.schema_id = s.schema_id
      JOIN sys.parameters pm ON f.object_id = pm.object_id
      JOIN sys.types t ON pm.user_type_id = t.user_type_id
      WHERE f.type IN ('FN', 'IF', 'TF')
        AND s.name = @schemaName
        AND f.name = @functionName
      ORDER BY pm.parameter_id
    `;

    const results = await this.executeQuery(query, { schemaName, functionName });
    
    return results.map((row: any) => ({
      parameterName: row.parameterName || 'RETURN_VALUE',
      parameterId: row.parameterId,
      dataType: row.dataType,
      maxLength: row.maxLength,
      precision: row.precision,
      scale: row.scale,
      isOutput: row.parameterId === 0, // 返回值参数
      hasDefault: row.hasDefault,
      defaultValue: row.defaultValue,
    }));
  }
}