import { BaseReporter } from './base';
import { ComparisonResult } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class JsonReporter extends BaseReporter {
  
  async generateReport(result: ComparisonResult, outputPath: string): Promise<string> {
    this.logger.info('生成JSON报告...');
    
    await this.ensureOutputDirectory(outputPath);
    
    // 生成格式化的JSON
    const jsonContent = JSON.stringify(result, null, 2);
    
    // 使用传入的outputPath，而不是自己生成文件名
    await fs.writeFile(outputPath, jsonContent, 'utf-8');
    
    this.logger.info(`JSON报告已生成: ${outputPath}`);
    return outputPath;
  }
}