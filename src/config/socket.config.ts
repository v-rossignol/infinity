import { ConfigService } from '@nestjs/config';
import { ServerOptions } from 'socket.io';

/** Socket.IO HTTP path; aligned with REST global prefix `/infinity`. */
export const SOCKET_IO_PATH = '/infinity/socket.io';

export const socketConfig: Partial<ServerOptions> = {
  path: SOCKET_IO_PATH,
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket'],
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
};

export function isWebSocketEventLoggingEnabled(configService: ConfigService): boolean {
  const configured = configService.get<string>('WEBSOCKET_EVENT_LOGGING');
  if (configured !== undefined) {
    return configured === 'true';
  }
  return configService.get<string>('NODE_ENV', 'development') !== 'production';
}
