import type { Request, Response, NextFunction } from 'express';
import { SharePermission } from '@prisma/client';
import { conflictPreviewSchema, saveScheduleSchema, updateScheduleSchema } from '../validators/import.validator';
import {
  createShare,
  deleteSchedule,
  deleteShare,
  getScheduleBySlug,
  listSchedules,
  listShares,
  previewConflicts,
  saveSchedule,
  updateSchedule,
  updateShare,
  getScheduleById,
} from '../services/schedule.service';

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

// ─── Public share endpoint (no auth) ───

export async function getSharedScheduleBySlugController(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = req.params as { slug: string };
    const result = await getScheduleBySlug(slug);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ─── Auth-required share endpoints ───

export async function createShareController(req: Request, res: Response, next: NextFunction) {
  try {
    const { scheduleId } = req.params as { scheduleId: string };
    const permission = (req.body?.permission as SharePermission) ?? SharePermission.VIEW;
    const share = await createShare(req.user!.id, scheduleId, permission);
    res.status(201).json({ share });
  } catch (error) {
    next(error);
  }
}

export async function listSharesController(req: Request, res: Response, next: NextFunction) {
  try {
    const { scheduleId } = req.params as { scheduleId: string };
    const shares = await listShares(req.user!.id, scheduleId);
    res.json({ shares });
  } catch (error) {
    next(error);
  }
}

export async function updateShareController(req: Request, res: Response, next: NextFunction) {
  try {
    const { shareId } = req.params as { shareId: string };
    const data = req.body as { permission?: SharePermission; expiresAt?: string | null };
    const share = await updateShare(req.user!.id, shareId, data);
    res.json({ share });
  } catch (error) {
    next(error);
  }
}

export async function deleteShareController(req: Request, res: Response, next: NextFunction) {
  try {
    const { shareId } = req.params as { shareId: string };
    const result = await deleteShare(req.user!.id, shareId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getScheduleDetailController(req: Request, res: Response, next: NextFunction) {
  try {
    const { scheduleId } = req.params as { scheduleId: string };
    const schedule = await getScheduleById(req.user!.id, scheduleId);
    res.json({ schedule });
  } catch (error) {
    next(error);
  }
}
