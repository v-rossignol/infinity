import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, ServerOptions } from 'socket.io';
import { isWebSocketEventLoggingEnabled, socketConfig } from '../../config/socket.config';
import { attachSocketEventLogging } from '../../shared/logger/socket-event-logger';

export class SocketAdapter extends IoAdapter {
  constructor(private readonly nestApp: INestApplication) {
    super(nestApp);
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, { ...socketConfig, ...options }) as Server;
    const configService = this.nestApp.get(ConfigService);
    if (isWebSocketEventLoggingEnabled(configService)) {
      attachSocketEventLogging(server);
    }
    return server;
  }
}
