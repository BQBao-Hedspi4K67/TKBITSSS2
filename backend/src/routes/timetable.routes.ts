import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import { getCurrentTimetableController } from '../controllers/timetable.controller';

const router = Router();

router.get('/current', requireAuth, getCurrentTimetableController);

export default router;
