import type { Request, Response, NextFunction } from 'express';
import { importTimetableFile, getImportBatch } from '../services/import.service';

export async function uploadTimetableController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'File upload khong duoc trong',
        code: 'FILE_REQUIRED',
      });
    }

    const result = await importTimetableFile(req.file, req.user?.id);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getImportBatchController(req: Request, res: Response, next: NextFunction) {
  try {
    const { batchId } = req.params as { batchId: string };
    const batch = await getImportBatch(batchId);
    res.json({ batch });
  } catch (error) {
    next(error);
  }
}
