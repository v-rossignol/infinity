import { Injectable } from '@nestjs/common';
import { appConfig } from './config/app.config';

@Injectable()
export class AppService {
  getHealth() {
    return {
      name: appConfig.name,
      version: appConfig.version,
      status: 'OK',
    };
  }
}
