import type { NextFunction, Request, Response } from 'express';
import { getCurrentTimetable } from '../services/user-selection.service';

export async function getCurrentTimetableController(req: Request, res: Response, next: NextFunction) {
  try {
    const batch = await getCurrentTimetable(req.user!.id);
    res.json({ batch });
  } catch (error) {
    next(error);
  }
}
