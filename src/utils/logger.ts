import winston from 'winston';
import { LogLevel } from '../types';

export class Logger {
  private logger: winston.Logger;

  constructor(level: LogLevel = 'info', logFile?: string) {
    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
          winston.format.printf(({ level, message, timestamp }) => {
            return `${timestamp} [${level}]: ${message}`;
          })
        )
      })
    ];

    if (logFile) {
      transports.push(
        new winston.transports.File({
          filename: logFile,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      );
    }

    this.logger = winston.createLogger({
      level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true })
      ),
      transports
    });
  }

  error(message: string, error?: any): void {
    if (error) {
      this.logger.error(message, { error: error.message, stack: error.stack });
    } else {
      this.logger.error(message);
    }
  }

  warn(message: string): void {
    this.logger.warn(message);
  }

  info(message: string): void {
    this.logger.info(message);
  }

  debug(message: string, data?: any): void {
    if (data) {
      this.logger.debug(message, data);
    } else {
      this.logger.debug(message);
    }
  }

  setLevel(level: LogLevel): void {
    this.logger.level = level;
  }
}