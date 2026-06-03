import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import {
  createShareController,
  deleteScheduleController,
  deleteShareController,
  getSharedScheduleBySlugController,
  listSchedulesController,
  listSharesController,
  previewConflictsController,
  saveScheduleController,
  updateScheduleController,
  updateShareController,
  getScheduleDetailController,
} from '../controllers/schedule.controller';

const router = Router();

// ── Public route (no auth) ──
router.get('/shared/:slug', getSharedScheduleBySlugController);

// ── Auth required ──
router.post('/conflicts/preview', requireAuth, previewConflictsController);
router.post('/', requireAuth, saveScheduleController);
router.get('/', requireAuth, listSchedulesController);
router.put('/:scheduleId', requireAuth, updateScheduleController);
router.delete('/:scheduleId', requireAuth, deleteScheduleController);
router.get('/:scheduleId', requireAuth, getScheduleDetailController);

// Share sub-resources
router.post('/:scheduleId/shares', requireAuth, createShareController);
router.get('/:scheduleId/shares', requireAuth, listSharesController);
router.put('/:scheduleId/shares/:shareId', requireAuth, updateShareController);
router.delete('/:scheduleId/shares/:shareId', requireAuth, deleteShareController);

export default router;
