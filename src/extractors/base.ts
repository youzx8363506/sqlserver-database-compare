import { DatabaseConnection } from '../connections/connection';
import { Logger } from '../utils/logger';

export abstract class BaseExtractor {
  protected connection: DatabaseConnection;
  protected logger: Logger;

  constructor(connection: DatabaseConnection, logger: Logger) {
    this.connection = connection;
    this.logger = logger;
  }

  protected async executeQuery<T = any>(query: string, parameters?: Record<string, any>): Promise<T[]> {
    return await this.connection.executeQuery<T>(query, parameters);
  }
}