import { Server, Socket } from 'socket.io';
import { Logger } from './logger';

const PAYLOAD_MAX_LENGTH = 500;

function formatPayload(args: readonly unknown[]): string {
  if (args.length === 0) {
    return '';
  }

  try {
    const value = args.length === 1 ? args[0] : args;
    const serialized = JSON.stringify(value);
    if (serialized.length <= PAYLOAD_MAX_LENGTH) {
      return serialized;
    }
    return `${serialized.slice(0, PAYLOAD_MAX_LENGTH)}…`;
  } catch {
    return '[unserializable]';
  }
}

function formatRooms(rooms: string | string[]): string {
  return Array.isArray(rooms) ? rooms.join(',') : rooms;
}

type EmitFn = (event: string, ...args: unknown[]) => boolean;

function wrapEmit(emit: EmitFn, direction: '→' | '←', target: string, logger: Logger): EmitFn {
  return (event: string, ...args: unknown[]) => {
    logger.debug(`${direction} ${target} ${event} ${formatPayload(args)}`.trim());
    return emit(event, ...args);
  };
}

function patchSocket(socket: Socket, logger: Logger): void {
  socket.onAny((event, ...args) => {
    logger.debug(`← ${socket.id} ${event} ${formatPayload(args)}`.trim());
  });
  socket.emit = wrapEmit(socket.emit.bind(socket), '→', socket.id, logger) as Socket['emit'];
}

export function attachSocketEventLogging(server: Server): void {
  const logger = Logger.create('WebSocket');

  server.on('connection', (socket) => patchSocket(socket, logger));

  server.emit = wrapEmit(server.emit.bind(server), '→', '*', logger) as Server['emit'];

  const originalTo = server.to.bind(server);
  server.to = ((rooms: string | string[]) => {
    const operator = originalTo(rooms);
    operator.emit = wrapEmit(
      operator.emit.bind(operator),
      '→',
      `room:${formatRooms(rooms)}`,
      logger,
    );
    return operator;
  }) as typeof server.to;
}
