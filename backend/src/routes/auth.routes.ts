import { Router } from 'express';
import { loginController, logoutController, meController, registerController } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.post('/login', loginController);
router.post('/register', registerController);
router.post('/logout', requireAuth, logoutController);
router.get('/me', requireAuth, meController);

export default router;
