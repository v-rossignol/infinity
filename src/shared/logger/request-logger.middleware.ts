import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { Logger } from './logger';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = Logger.create('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const { method, originalUrl, ip } = req;

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;
      this.logger.log(`${method} ${originalUrl} ${statusCode} ${duration}ms - ${ip}`);
    });

    next();
  }
}
