import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import {
  searchUsersController,
  sendMessageController,
  getConversationsController,
  getMessagesController,
} from '../controllers/chat.controller';

const router = Router();

router.get('/search', requireAuth, searchUsersController);
router.get('/conversations', requireAuth, getConversationsController);
router.get('/messages/:userId', requireAuth, getMessagesController);
router.post('/messages', requireAuth, sendMessageController);

export default router;
