import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { HttpError } from '../utils/http-error';

type JwtPayload = {
  sub: string;
  email: string;
  role: string;
  fullName: string;
  studentCode: string | null;
};

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return next(new HttpError(401, 'Token không hợp lệ hoặc bị thiếu', { code: 'UNAUTHORIZED' }));
  }

  const token = authorization.slice(7);
  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role as any,
      fullName: payload.fullName,
      studentCode: payload.studentCode,
    };
    next();
  } catch {
    next(new HttpError(401, 'Token đã hết hạn hoặc không hợp lệ', { code: 'UNAUTHORIZED' }));
  }
}
