import { ComparisonResult } from '../types';
import { Logger } from '../utils/logger';
import * as path from 'path';
import * as fs from 'fs/promises';

export abstract class BaseReporter {
  protected logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  abstract generateReport(result: ComparisonResult, outputPath: string): Promise<string>;

  protected async ensureOutputDirectory(outputPath: string): Promise<void> {
    const dir = path.dirname(outputPath);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  protected formatTimestamp(date: Date): string {
    return date.toISOString().replace(/[:.]/g, '-');
  }

  protected generateFileName(baseName: string, extension: string, timestamp?: Date): string {
    const timeStr = timestamp ? `_${this.formatTimestamp(timestamp)}` : '';
    return `${baseName}${timeStr}.${extension}`;
  }
}