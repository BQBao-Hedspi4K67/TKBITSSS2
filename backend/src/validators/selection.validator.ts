import { z } from 'zod';

export const userSelectionsSchema = z.object({
  selections: z.array(
    z.object({
      courseCode: z.string().min(1),
      classCode: z.string().trim().min(1).nullable(),
    }),
  ),
});
