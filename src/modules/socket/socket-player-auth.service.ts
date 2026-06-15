import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { AUTH_COOKIE_NAME } from '../auth/constants/auth-cookie';
import { PlayersService } from '../players/players.service';

export const SOCKET_PLAYER_ID_KEY = 'playerId';

@Injectable()
export class SocketPlayerAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly playersService: PlayersService,
  ) {}

  async attachPlayer(client: Socket): Promise<void> {
    const existingPlayerId = client.data[SOCKET_PLAYER_ID_KEY];
    if (typeof existingPlayerId === 'string' && existingPlayerId.length > 0) {
      return;
    }

    const token = this.extractToken(client);
    if (!token) {
      throw new UnauthorizedException('Socket authentication required');
    }

    let payload: { sub: string };
    try {
      payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: this.configService.get<string>('JWT_SECRET', 'secret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid socket token');
    }

    const player = await this.playersService.findByUserId(payload.sub);
    if (!player) {
      throw new UnauthorizedException('Player not found for authenticated user');
    }

    client.data[SOCKET_PLAYER_ID_KEY] = player.id;
  }

  getPlayerId(client: Socket): string {
    const playerId = client.data[SOCKET_PLAYER_ID_KEY];
    if (typeof playerId !== 'string' || playerId.length === 0) {
      throw new UnauthorizedException('Socket is not authenticated');
    }
    return playerId;
  }

  extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice('Bearer '.length);
    }

    const cookieHeader = client.handshake.headers.cookie;
    if (typeof cookieHeader === 'string') {
      const match = cookieHeader.match(new RegExp(`(?:^|; )${AUTH_COOKIE_NAME}=([^;]*)`));
      if (match?.[1]) {
        return decodeURIComponent(match[1]);
      }
    }

    return null;
  }
}
