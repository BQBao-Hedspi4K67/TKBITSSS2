import { z } from 'zod';

export const loginSchema = z.object({
  login: z.string().min(1, 'Email hoặc mã sinh viên không được trống'),
  password: z.string().min(1, 'Mật khẩu không được trống'),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Họ và tên phải có ít nhất 2 ký tự'),
  email: z.string().trim().email('Email không hợp lệ'),
  studentCode: z.string().trim().min(1, 'Mã sinh viên không được trống').optional().or(z.literal('')),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
});
