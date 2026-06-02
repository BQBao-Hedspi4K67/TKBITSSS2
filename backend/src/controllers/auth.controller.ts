import type { Request, Response, NextFunction } from 'express';
import { loginSchema } from '../validators/auth.validator';
import { loginUser } from '../services/auth.service';

export async function loginController(req: Request, res: Response, next: NextFunction) {
  try {
    const { login, password } = loginSchema.parse(req.body);
    const result = await loginUser(login, password);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function logoutController(_req: Request, res: Response) {
  res.json({ success: true });
}

export async function meController(req: Request, res: Response) {
  res.json({ user: req.user });
}
