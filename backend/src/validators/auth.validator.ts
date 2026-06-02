import { z } from 'zod';

export const loginSchema = z.object({
  login: z.string().min(1, 'Email hoac ma sinh vien khong duoc trong'),
  password: z.string().min(1, 'Mat khau khong duoc trong'),
});
