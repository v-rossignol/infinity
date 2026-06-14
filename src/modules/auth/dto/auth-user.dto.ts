import { User } from '../entities/user.entity';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
}

export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
  };
}
