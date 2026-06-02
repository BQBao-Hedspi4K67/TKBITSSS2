import { Router } from 'express';
import { loginController, logoutController, meController } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.post('/login', loginController);
router.post('/logout', requireAuth, logoutController);
router.get('/me', requireAuth, meController);

export default router;
