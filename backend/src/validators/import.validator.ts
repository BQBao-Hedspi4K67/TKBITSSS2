import { z } from 'zod';

export const saveScheduleSchema = z.object({
  name: z.string().min(1),
  semester: z.string().optional(),
  academicYear: z.string().optional(),
  sourceBatchId: z.string().optional(),
  sectionIds: z.array(z.string().min(1)).min(1, 'Phai chon it nhat 1 lop'),
});

export const updateScheduleSchema = saveScheduleSchema;

export const conflictPreviewSchema = z.object({
  sectionIds: z.array(z.string().min(1)).min(1),
});
