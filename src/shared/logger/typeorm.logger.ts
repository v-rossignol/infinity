import {
  AbstractLogger,
  LogLevel as TypeOrmLogLevel,
  LogMessage,
  LoggerOptions,
  QueryRunner,
} from 'typeorm';
import { Logger } from './logger';

export class TypeOrmAppLogger extends AbstractLogger {
  private readonly logger = Logger.create('Postgres');

  constructor(options?: LoggerOptions) {
    super(options);
  }

  protected writeLog(
    level: TypeOrmLogLevel,
    logMessage: LogMessage | LogMessage[],
    _queryRunner?: QueryRunner,
  ): void {
    const messages = this.prepareLogMessages(logMessage, {
      highlightSql: false,
      appendParameterAsComment: true,
    });

    for (const message of messages) {
      const type = message.type ?? level;
      const text = message.prefix
        ? `${message.prefix}: ${message.message}`
        : String(message.message);

      switch (type) {
        case 'query':
        case 'schema-build':
        case 'info':
        case 'log':
        case 'migration':
          this.logger.debug(text);
          break;
        case 'query-error':
        case 'error':
          this.logger.error(text);
          break;
        case 'query-slow':
        case 'warn':
          this.logger.warn(text);
          break;
        default:
          this.logger.debug(text);
      }
    }
  }
}
