import { Router } from 'express';
import authRoutes from './auth.routes';
import importRoutes from './import.routes';
import scheduleRoutes from './schedule.routes';
import timetableRoutes from './timetable.routes';
import userRoutes from './user.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/timetable', timetableRoutes);
router.use('/user', userRoutes);
router.use('/imports', importRoutes);
router.use('/schedules', scheduleRoutes);

export default router;
