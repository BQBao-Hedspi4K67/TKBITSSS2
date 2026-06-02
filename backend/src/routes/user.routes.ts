import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import { getUserSelectionsController, saveUserSelectionsController } from '../controllers/user.controller';

const router = Router();

router.get('/selections', requireAuth, getUserSelectionsController);
router.post('/selections', requireAuth, saveUserSelectionsController);

export default router;
