import type { Request, Response, NextFunction } from 'express';
import { searchUsers, sendMessage, getConversations, getMessages } from '../services/chat.service';

export async function searchUsersController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = (req.query.q as string) ?? '';
    const users = await searchUsers(query, req.user!.id);
    res.json({ users });
  } catch (error) {
    next(error);
  }
}

export async function sendMessageController(req: Request, res: Response, next: NextFunction) {
  try {
    const { receiverId, content, scheduleShareId } = req.body as {
      receiverId: string;
      content: string;
      scheduleShareId?: string;
    };
    const message = await sendMessage(req.user!.id, receiverId, content, scheduleShareId);
    res.status(201).json({ message });
  } catch (error) {
    next(error);
  }
}

export async function getConversationsController(req: Request, res: Response, next: NextFunction) {
  try {
    const conversations = await getConversations(req.user!.id);
    res.json({ conversations });
  } catch (error) {
    next(error);
  }
}

export async function getMessagesController(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params as { userId: string };
    const messages = await getMessages(req.user!.id, userId);
    res.json({ messages });
  } catch (error) {
    next(error);
  }
}
