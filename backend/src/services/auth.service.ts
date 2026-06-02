import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { HttpError } from '../utils/http-error';

export async function loginUser(login: string, password: string) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: login.toLowerCase() }, { studentCode: login }],
    },
  });

  if (!user) {
    throw new HttpError(401, 'Thong tin dang nhap khong chinh xac', { code: 'INVALID_CREDENTIALS' });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new HttpError(401, 'Thong tin dang nhap khong chinh xac', { code: 'INVALID_CREDENTIALS' });
  }

  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      studentCode: user.studentCode,
    },
    env.jwtSecret as jwt.Secret,
    { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] },
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      studentCode: user.studentCode,
      role: user.role as UserRole,
    },
  };
}
