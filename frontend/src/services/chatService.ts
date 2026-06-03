import { request } from './api';

export type UserSearchResult = {
  id: string;
  fullName: string;
  studentCode: string | null;
  email: string;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  scheduleShareId: string | null;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    fullName: string;
    studentCode: string | null;
  };
  scheduleShare: {
    id: string;
    slug: string;
    permission: 'VIEW' | 'COMMENT';
    schedule: { id: string; name: string };
  } | null;
};

export type Conversation = {
  user: { id: string; fullName: string; studentCode: string | null };
  lastMessage: {
    content: string;
    createdAt: string;
    senderId: string;
    hasShare: boolean;
    shareSlug: string | null;
    scheduleName: string | null;
  } | null;
  unreadCount: number;
};

export async function searchUsers(query: string) {
  return request<{ users: UserSearchResult[] }>(`/chat/search?q=${encodeURIComponent(query)}`);
}

export async function getConversations() {
  return request<{ conversations: Conversation[] }>('/chat/conversations');
}

export async function getMessages(userId: string) {
  return request<{ messages: ChatMessage[] }>(`/chat/messages/${userId}`);
}

export async function sendMessage(receiverId: string, content: string, scheduleShareId?: string) {
  return request<{ message: ChatMessage }>('/chat/messages', {
    method: 'POST',
    body: JSON.stringify({ receiverId, content, scheduleShareId }),
  });
}
