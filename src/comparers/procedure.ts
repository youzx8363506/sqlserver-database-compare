import { BaseComparer } from './base';
import { 
  ProcedureInfo, 
  ProcedureDifferences, 
  ProcedureModification,
  ParameterChanges,
  ParameterModification,
  ParameterInfo
} from '../types';

export class ProcedureComparer extends BaseComparer {
  
  compareProcedures(sourceProcedures: ProcedureInfo[], targetProcedures: ProcedureInfo[]): ProcedureDifferences {
    this.logger.info('开始比较存储过程...');

    const sourceMap = new Map(sourceProcedures.map(p => [`${p.schemaName}.${p.procedureName}`, p]));
    const targetMap = new Map(targetProcedures.map(p => [`${p.schemaName}.${p.procedureName}`, p]));

    const added: ProcedureInfo[] = [];
    const removed: ProcedureInfo[] = [];
    const modified: ProcedureModification[] = [];

    // 查找新增的存储过程
    for (const [key, procedure] of targetMap) {
      if (!sourceMap.has(key)) {
        added.push(procedure);
      }
    }

    // 查找删除的存储过程和修改的存储过程
    for (const [key, sourceProcedure] of sourceMap) {
      const targetProcedure = targetMap.get(key);
      
      if (!targetProcedure) {
        removed.push(sourceProcedure);
      } else {
        const modification = this.compareProcedureDetails(sourceProcedure, targetProcedure);
        if (modification.definitionChanged || modification.parametersChanged) {
          modified.push(modification);
        }
      }
    }

    this.logger.info(`存储过程比较完成: 新增 ${added.length}, 删除 ${removed.length}, 修改 ${modified.length}`);

    return { added, removed, modified };
  }

  private compareProcedureDetails(sourceProcedure: ProcedureInfo, targetProcedure: ProcedureInfo): ProcedureModification {
    const sourceDefinition = this.normalizeString(sourceProcedure.definition);
    const targetDefinition = this.normalizeString(targetProcedure.definition);
    
    const definitionChanged = !this.compareValues(sourceDefinition, targetDefinition);
    const parameterChanges = this.compareParameters(sourceProcedure.parameters, targetProcedure.parameters);
    const parametersChanged = this.hasParameterChanges(parameterChanges);

    return {
      procedureName: sourceProcedure.procedureName,
      schemaName: sourceProcedure.schemaName,
      definitionChanged,
      parametersChanged,
      sourceDefinition: sourceProcedure.definition,
      targetDefinition: targetProcedure.definition,
      parameterChanges
    };
  }

  private compareParameters(sourceParameters: ParameterInfo[], targetParameters: ParameterInfo[]): ParameterChanges {
    const sourceMap = new Map(sourceParameters.map(p => [p.parameterName.toLowerCase(), p]));
    const targetMap = new Map(targetParameters.map(p => [p.parameterName.toLowerCase(), p]));

    const added: ParameterInfo[] = [];
    const removed: ParameterInfo[] = [];
    const modified: ParameterModification[] = [];

    // 查找新增的参数
    for (const [name, parameter] of targetMap) {
      if (!sourceMap.has(name)) {
        added.push(parameter);
      }
    }

    // 查找删除的参数和修改的参数
    for (const [name, sourceParameter] of sourceMap) {
      const targetParameter = targetMap.get(name);
      
      if (!targetParameter) {
        removed.push(sourceParameter);
      } else {
        const changes = this.compareParameterProperties(sourceParameter, targetParameter);
        if (changes.length > 0) {
          modified.push({
            parameterName: sourceParameter.parameterName,
            changes
          });
        }
      }
    }

    return { added, removed, modified };
  }

  private compareParameterProperties(sourceParameter: ParameterInfo, targetParameter: ParameterInfo) {
    const changes = [];

    const properties = [
      'dataType', 'maxLength', 'precision', 'scale', 
      'isOutput', 'hasDefault', 'defaultValue'
    ];

    for (const prop of properties) {
      const sourceValue = (sourceParameter as any)[prop];
      const targetValue = (targetParameter as any)[prop];
      
      if (!this.compareValues(sourceValue, targetValue)) {
        changes.push(this.createPropertyChange(prop, sourceValue, targetValue));
      }
    }

    return changes;
  }

  private hasParameterChanges(parameterChanges: ParameterChanges): boolean {
    return parameterChanges.added.length > 0 ||
           parameterChanges.removed.length > 0 ||
           parameterChanges.modified.length > 0;
  }
}