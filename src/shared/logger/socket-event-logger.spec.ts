import { Server, Socket } from 'socket.io';
import { attachSocketEventLogging } from './socket-event-logger';
import { Logger } from './logger';

describe('attachSocketEventLogging', () => {
  let debugSpy: jest.SpyInstance;

  beforeEach(() => {
    debugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    debugSpy.mockRestore();
  });

  it('logs received client events', () => {
    const connectionHandlers: Array<(socket: Socket) => void> = [];
    const onAnyHandlers: Array<(event: string, ...args: unknown[]) => void> = [];
    const emit = jest.fn().mockReturnValue(true);

    const socket = {
      id: 'socket-1',
      emit,
      onAny: jest.fn((handler: (event: string, ...args: unknown[]) => void) => {
        onAnyHandlers.push(handler);
      }),
    } as unknown as Socket;

    const server = {
      on: jest.fn((event: string, handler: (socket: Socket) => void) => {
        if (event === 'connection') {
          connectionHandlers.push(handler);
        }
      }),
      emit: jest.fn().mockReturnValue(true),
      to: jest.fn(),
    } as unknown as Server;

    attachSocketEventLogging(server);
    connectionHandlers[0](socket);
    onAnyHandlers[0]('GALAXY_MOVE', { x: 1, y: 2, z: 3 });

    expect(debugSpy).toHaveBeenCalledWith('← socket-1 GALAXY_MOVE {"x":1,"y":2,"z":3}');
  });

  it('logs client-bound emits', () => {
    const connectionHandlers: Array<(socket: Socket) => void> = [];
    const emit = jest.fn().mockReturnValue(true);

    const socket = {
      id: 'socket-1',
      emit,
      onAny: jest.fn(),
    } as unknown as Socket;

    const server = {
      on: jest.fn((event: string, handler: (socket: Socket) => void) => {
        if (event === 'connection') {
          connectionHandlers.push(handler);
        }
      }),
      emit: jest.fn().mockReturnValue(true),
      to: jest.fn(),
    } as unknown as Server;

    attachSocketEventLogging(server);
    connectionHandlers[0](socket);
    socket.emit('CUBE_DATA', { cube: { id: 'abc' } });

    expect(emit).toHaveBeenCalledWith('CUBE_DATA', { cube: { id: 'abc' } });
    expect(debugSpy).toHaveBeenCalledWith('→ socket-1 CUBE_DATA {"cube":{"id":"abc"}}');
  });

  it('logs server broadcasts and room emits', () => {
    const roomEmit = jest.fn().mockReturnValue(true);
    const serverEmit = jest.fn().mockReturnValue(true);

    const server = {
      on: jest.fn(),
      emit: serverEmit,
      to: jest.fn().mockReturnValue({ emit: roomEmit }),
    } as unknown as Server;

    attachSocketEventLogging(server);
    server.emit('GALAXY_UPDATE', { playerId: 'p1' });
    server.to('planet-1').emit('PLANET_UPDATE', { q: 1, r: 2 });

    expect(debugSpy).toHaveBeenCalledWith('→ * GALAXY_UPDATE {"playerId":"p1"}');
    expect(debugSpy).toHaveBeenCalledWith('→ room:planet-1 PLANET_UPDATE {"q":1,"r":2}');
  });
});
