import { BaseComparer } from './base';
import { 
  FunctionInfo, 
  FunctionDifferences, 
  FunctionModification,
  ParameterChanges,
  ParameterModification,
  ParameterInfo
} from '../types';

export class FunctionComparer extends BaseComparer {
  
  compareFunctions(sourceFunctions: FunctionInfo[], targetFunctions: FunctionInfo[]): FunctionDifferences {
    this.logger.info('开始比较函数...');

    const sourceMap = new Map(sourceFunctions.map(f => [`${f.schemaName}.${f.functionName}`, f]));
    const targetMap = new Map(targetFunctions.map(f => [`${f.schemaName}.${f.functionName}`, f]));

    const added: FunctionInfo[] = [];
    const removed: FunctionInfo[] = [];
    const modified: FunctionModification[] = [];

    // 查找新增的函数
    for (const [key, func] of targetMap) {
      if (!sourceMap.has(key)) {
        added.push(func);
      }
    }

    // 查找删除的函数和修改的函数
    for (const [key, sourceFunction] of sourceMap) {
      const targetFunction = targetMap.get(key);
      
      if (!targetFunction) {
        removed.push(sourceFunction);
      } else {
        const modification = this.compareFunctionDetails(sourceFunction, targetFunction);
        if (modification.definitionChanged || modification.parametersChanged) {
          modified.push(modification);
        }
      }
    }

    this.logger.info(`函数比较完成: 新增 ${added.length}, 删除 ${removed.length}, 修改 ${modified.length}`);

    return { added, removed, modified };
  }

  private compareFunctionDetails(sourceFunction: FunctionInfo, targetFunction: FunctionInfo): FunctionModification {
    const sourceDefinition = this.normalizeString(sourceFunction.definition);
    const targetDefinition = this.normalizeString(targetFunction.definition);
    
    const definitionChanged = !this.compareValues(sourceDefinition, targetDefinition);
    const parameterChanges = this.compareParameters(sourceFunction.parameters, targetFunction.parameters);
    const parametersChanged = this.hasParameterChanges(parameterChanges);

    return {
      functionName: sourceFunction.functionName,
      schemaName: sourceFunction.schemaName,
      definitionChanged,
      parametersChanged,
      sourceDefinition: sourceFunction.definition,
      targetDefinition: targetFunction.definition,
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