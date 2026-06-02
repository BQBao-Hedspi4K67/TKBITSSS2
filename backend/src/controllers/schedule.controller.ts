import type { Request, Response, NextFunction } from 'express';
import { conflictPreviewSchema, saveScheduleSchema, updateScheduleSchema } from '../validators/import.validator';
import { createShare, deleteSchedule, listSchedules, previewConflicts, saveSchedule, updateSchedule } from '../services/schedule.service';

export async function previewConflictsController(req: Request, res: Response, next: NextFunction) {
  try {
    const { sectionIds } = conflictPreviewSchema.parse(req.body);
    const conflicts = await previewConflicts(req.user!.id, sectionIds);
    res.json({ conflicts });
  } catch (error) {
    next(error);
  }
}

export async function saveScheduleController(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = saveScheduleSchema.parse(req.body);
    const schedule = await saveSchedule(req.user!.id, payload);
    res.status(201).json({ schedule });
  } catch (error) {
    next(error);
  }
}

export async function updateScheduleController(req: Request, res: Response, next: NextFunction) {
  try {
    const { scheduleId } = req.params as { scheduleId: string };
    const payload = updateScheduleSchema.parse(req.body);
    const schedule = await updateSchedule(req.user!.id, scheduleId, payload);
    res.json({ schedule });
  } catch (error) {
    next(error);
  }
}

export async function listSchedulesController(req: Request, res: Response, next: NextFunction) {
  try {
    const schedules = await listSchedules(req.user!.id);
    res.json({ schedules });
  } catch (error) {
    next(error);
  }
}

export async function deleteScheduleController(req: Request, res: Response, next: NextFunction) {
  try {
    const { scheduleId } = req.params as { scheduleId: string };
    const result = await deleteSchedule(req.user!.id, scheduleId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createShareController(req: Request, res: Response, next: NextFunction) {
  try {
    const { scheduleId } = req.params as { scheduleId: string };
    const share = await createShare(req.user!.id, scheduleId);
    res.status(201).json({ share });
  } catch (error) {
    next(error);
  }
}
