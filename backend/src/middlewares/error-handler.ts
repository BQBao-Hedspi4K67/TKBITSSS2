import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { HttpError } from '../utils/http-error';

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: 'Dữ liệu đầu vào không hợp lệ',
      code: 'VALIDATION_ERROR',
      errors: error.flatten(),
    });
  }

  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({
      message: error.message,
      code: error.code ?? 'HTTP_ERROR',
      details: error.details,
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'Dữ liệu đã tồn tại',
        code: error.code,
      });
    }

    return res.status(400).json({
      message: 'Dữ liệu vi phạm ràng buộc cơ sở dữ liệu',
      code: error.code,
    });
  }

  console.error(error);
  return res.status(500).json({
    message: 'Lỗi máy chủ nội bộ',
    code: 'INTERNAL_SERVER_ERROR',
  });
}
