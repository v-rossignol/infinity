import { UserRole } from '../../modules/auth/constants/user-role';

export interface AuthenticatedUser {
  id: string;
  username: string;
  role?: UserRole;
}
