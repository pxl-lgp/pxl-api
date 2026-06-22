import { UserRole, UserStatus } from '../../users/users.service';

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
};
