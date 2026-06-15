import { UserRole } from '../../users/users.service';

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};
