import type { NextFunction, Request, Response } from 'express';
import { userSelectionsSchema } from '../validators/selection.validator';
import { getUserSelections, replaceUserSelections } from '../services/user-selection.service';

export async function getUserSelectionsController(req: Request, res: Response, next: NextFunction) {
  try {
    const selections = await getUserSelections(req.user!.id);
    res.json(selections);
  } catch (error) {
    next(error);
  }
}

export async function saveUserSelectionsController(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = userSelectionsSchema.parse(req.body);
    const result = await replaceUserSelections(req.user!.id, payload.selections);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
