import { ConsoleLogger, LogLevel } from '@nestjs/common';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  fatal: 0,
  error: 1,
  warn: 2,
  log: 3,
  debug: 4,
  verbose: 5,
};

const ALL_LOG_LEVELS = Object.keys(LEVEL_PRIORITY) as LogLevel[];

function resolveLogLevels(): LogLevel[] {
  const configured = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
  const defaultLevel: LogLevel = process.env.NODE_ENV === 'production' ? 'log' : 'verbose';
  const minLevel = configured ?? defaultLevel;
  const minPriority = LEVEL_PRIORITY[minLevel] ?? LEVEL_PRIORITY.log;

  return ALL_LOG_LEVELS.filter((level) => LEVEL_PRIORITY[level] <= minPriority);
}

export class Logger extends ConsoleLogger {
  constructor(context?: string) {
    super(context ?? 'Infinity', { logLevels: resolveLogLevels() });
  }

  static create(context: string): Logger {
    return new Logger(context);
  }
}
