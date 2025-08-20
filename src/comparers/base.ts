import { Logger } from '../utils/logger';

export abstract class BaseComparer {
  protected logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  protected normalizeString(value: string | null | undefined): string {
    if (!value) return '';
    return value.trim().replace(/\s+/g, ' ');
  }

  protected compareValues(sourceValue: any, targetValue: any): boolean {
    // 处理null和undefined
    if (sourceValue === null || sourceValue === undefined) {
      return targetValue === null || targetValue === undefined;
    }
    if (targetValue === null || targetValue === undefined) {
      return false;
    }

    // 字符串比较（忽略大小写和多余空格）
    if (typeof sourceValue === 'string' && typeof targetValue === 'string') {
      return this.normalizeString(sourceValue).toLowerCase() === 
             this.normalizeString(targetValue).toLowerCase();
    }

    // 其他类型直接比较
    return sourceValue === targetValue;
  }

  protected createPropertyChange(property: string, sourceValue: any, targetValue: any) {
    return {
      property,
      sourceValue,
      targetValue
    };
  }
}