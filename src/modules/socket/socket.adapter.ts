import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { socketConfig } from '../../config/socket.config';

export class SocketAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, { ...socketConfig, ...options });
    return server;
  }
}
