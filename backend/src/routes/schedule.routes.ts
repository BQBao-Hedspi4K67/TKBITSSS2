import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import { createShareController, deleteScheduleController, listSchedulesController, previewConflictsController, saveScheduleController, updateScheduleController } from '../controllers/schedule.controller';

const router = Router();

router.post('/conflicts/preview', requireAuth, previewConflictsController);
router.post('/', requireAuth, saveScheduleController);
router.get('/', requireAuth, listSchedulesController);
router.put('/:scheduleId', requireAuth, updateScheduleController);
router.delete('/:scheduleId', requireAuth, deleteScheduleController);
router.post('/:scheduleId/shares', requireAuth, createShareController);

export default router;
