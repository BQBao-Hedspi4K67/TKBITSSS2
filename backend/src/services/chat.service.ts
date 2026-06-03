import { prisma } from '../config/prisma';
import { HttpError } from '../utils/http-error';

export async function searchUsers(query: string, excludeUserId: string) {
  if (!query || query.length < 2) {
    return [];
  }

  return prisma.user.findMany({
    where: {
      AND: [
        { id: { not: excludeUserId } },
        {
          OR: [
            { fullName: { contains: query } },
            { studentCode: { contains: query } },
            { email: { contains: query } },
          ],
        },
      ],
    },
    select: {
      id: true,
      fullName: true,
      studentCode: true,
      email: true,
    },
    take: 10,
    orderBy: { fullName: 'asc' },
  });
}

export async function sendMessage(
  senderId: string,
  receiverId: string,
  content: string,
  scheduleShareId?: string,
) {
  if (!content.trim()) {
    throw new HttpError(400, 'Nội dung tin nhắn không được để trống', { code: 'EMPTY_MESSAGE' });
  }

  // Verify receiver exists
  const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
  if (!receiver) {
    throw new HttpError(404, 'Không tìm thấy người nhận', { code: 'RECEIVER_NOT_FOUND' });
  }

  // If scheduleShareId provided, look up by id OR by slug (the frontend may pass slug)
  let resolvedShareId: string | null = null;
  if (scheduleShareId) {
    // First try to find by id
    let share = await prisma.scheduleShare.findUnique({
      where: { id: scheduleShareId },
      include: { schedule: { select: { userId: true } } },
    });
    // If not found by id, try to find by slug
    if (!share) {
      share = await prisma.scheduleShare.findUnique({
        where: { slug: scheduleShareId },
        include: { schedule: { select: { userId: true } } },
      });
    }
    if (share) {
      resolvedShareId = share.id;
    }
  }

  return prisma.message.create({
    data: {
      senderId,
      receiverId,
      content: content.trim(),
      scheduleShareId: resolvedShareId,
    },
    include: {
      sender: {
        select: { id: true, fullName: true, studentCode: true },
      },
      scheduleShare: {
        select: {
          id: true,
          slug: true,
          permission: true,
          schedule: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });
}

export async function getConversations(userId: string) {
  // Get all users the current user has exchanged messages with
  const sentMessages = await prisma.message.findMany({
    where: { senderId: userId },
    select: { receiverId: true },
    distinct: ['receiverId'],
  });

  const receivedMessages = await prisma.message.findMany({
    where: { receiverId: userId },
    select: { senderId: true },
    distinct: ['senderId'],
  });

  const userIds = [
    ...new Set([
      ...sentMessages.map((m) => m.receiverId),
      ...receivedMessages.map((m) => m.senderId),
    ]),
  ];

  const conversations = await Promise.all(
    userIds.map(async (otherUserId) => {
      const lastMessage = await prisma.message.findFirst({
        where: {
          OR: [
            { senderId: userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: userId },
          ],
        },
        orderBy: { createdAt: 'desc' },
        include: {
          sender: { select: { id: true, fullName: true } },
          scheduleShare: {
            select: { id: true, slug: true, schedule: { select: { name: true } } },
          },
        },
      });

      const otherUser = await prisma.user.findUnique({
        where: { id: otherUserId },
        select: { id: true, fullName: true, studentCode: true },
      });

      if (!otherUser) return null;

      // Count unread messages
      const unreadCount = await prisma.message.count({
        where: {
          senderId: otherUserId,
          receiverId: userId,
        },
      });

      return {
        user: otherUser,
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              createdAt: lastMessage.createdAt,
              senderId: lastMessage.senderId,
              hasShare: Boolean(lastMessage.scheduleShareId),
              shareSlug: lastMessage.scheduleShare?.slug ?? null,
              scheduleName: lastMessage.scheduleShare?.schedule.name ?? null,
            }
          : null,
        unreadCount,
      };
    }),
  );

  return conversations
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => {
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
    });
}

export async function getMessages(userId: string, otherUserId: string) {
  // Verify other user exists
  const otherUser = await prisma.user.findUnique({ where: { id: otherUserId } });
  if (!otherUser) {
    throw new HttpError(404, 'Không tìm thấy người dùng', { code: 'USER_NOT_FOUND' });
  }

  return prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    },
    orderBy: { createdAt: 'asc' },
    include: {
      sender: {
        select: { id: true, fullName: true, studentCode: true },
      },
      scheduleShare: {
        select: {
          id: true,
          slug: true,
          permission: true,
          schedule: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });
}
