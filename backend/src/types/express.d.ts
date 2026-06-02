import type { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface UserContext {
      id: string;
      email: string;
      role: UserRole;
      fullName: string;
      studentCode: string | null;
    }

    interface Request {
      user?: UserContext;
    }
  }
}

export {};
