import { ConfigService } from '@nestjs/config';
import { isWebSocketEventLoggingEnabled } from './socket.config';

function createConfigService(values: Record<string, string | undefined>): ConfigService {
  return {
    get: jest.fn((key: string, defaultValue?: string) => values[key] ?? defaultValue),
  } as unknown as ConfigService;
}

describe('isWebSocketEventLoggingEnabled', () => {
  it('returns true when WEBSOCKET_EVENT_LOGGING is true', () => {
    const configService = createConfigService({ WEBSOCKET_EVENT_LOGGING: 'true' });
    expect(isWebSocketEventLoggingEnabled(configService)).toBe(true);
  });

  it('returns false when WEBSOCKET_EVENT_LOGGING is false', () => {
    const configService = createConfigService({ WEBSOCKET_EVENT_LOGGING: 'false' });
    expect(isWebSocketEventLoggingEnabled(configService)).toBe(false);
  });

  it('defaults to true in development when unset', () => {
    const configService = createConfigService({ NODE_ENV: 'development' });
    expect(isWebSocketEventLoggingEnabled(configService)).toBe(true);
  });

  it('defaults to false in production when unset', () => {
    const configService = createConfigService({ NODE_ENV: 'production' });
    expect(isWebSocketEventLoggingEnabled(configService)).toBe(false);
  });
});
