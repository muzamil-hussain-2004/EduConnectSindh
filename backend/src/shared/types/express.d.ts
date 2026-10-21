import type { Role } from '../../database/generated/prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role };
    }
  }
}

export {};
