import { z } from 'zod';

export const loginSchema = z.object({
  login: z.string().min(1, 'Email hoac ma sinh vien khong duoc trong'),
  password: z.string().min(1, 'Mat khau khong duoc trong'),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Ho va ten phai co it nhat 2 ky tu'),
  email: z.string().trim().email('Email khong hop le'),
  studentCode: z.string().trim().min(1, 'Ma sinh vien khong duoc trong').optional().or(z.literal('')),
  password: z.string().min(8, 'Mat khau phai co it nhat 8 ky tu'),
});
