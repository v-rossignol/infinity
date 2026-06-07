import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'infinity-server',
      timestamp: new Date().toISOString(),
    };
  }
}
