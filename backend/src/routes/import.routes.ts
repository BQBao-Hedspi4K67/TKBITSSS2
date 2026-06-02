import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middlewares/auth';
import { getImportBatchController, uploadTimetableController } from '../controllers/import.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const router = Router();

router.post('/timetable', requireAuth, upload.single('file'), uploadTimetableController);
router.get('/timetable/:batchId', requireAuth, getImportBatchController);

export default router;
