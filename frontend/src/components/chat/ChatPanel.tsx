import { useCallback, useEffect, useRef, useState } from 'react';
import { getConversations, getMessages, sendMessage } from '../../services/chatService';
import type { ChatMessage, Conversation } from '../../services/chatService';
import { ScheduleShareView } from '../schedule/ScheduleShareView';

type ChatPanelProps = {
  currentUserId: string;
  currentUserName?: string;
};

export function ChatPanel({ currentUserId, currentUserName }: ChatPanelProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewingShare, setViewingShare] = useState<{ slug: string; scheduleName: string; permission: 'VIEW' | 'COMMENT' } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const response = await getConversations();
      setConversations(response.conversations);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const uid = selectedUserId;
    if (!uid) return;
    let cancelled = false;
    async function load() {
      try {
        const response = await getMessages(uid);
        if (!cancelled) setMessages(response.messages);
      } catch {
        // silent
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [selectedUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const receiver = selectedUserId;
    if (!newMessage.trim() || !receiver) return;
    try {
      const response = await sendMessage(receiver, newMessage.trim());
      setMessages((prev) => [...prev, response.message]);
      setNewMessage('');
      void loadConversations();
    } catch {
      // silent
    }
  };

  const handleViewSharedSchedule = (slug: string, scheduleName: string, permission: 'VIEW' | 'COMMENT') => {
    setViewingShare({ slug, scheduleName, permission });
  };

  const selectConversation = (userId: string) => {
    setSelectedUserId(userId);
    setMessages([]);
    setViewingShare(null);
  };

  const selectedUser = conversations.find((c) => c.user.id === selectedUserId)?.user;

  return (
    <div className="tempo-chat-shell">
      {/* Conversations list */}
      <div className="tempo-chat-conversations">
        <div className="tempo-chat-conversations-header">
          <h3>Tin nhắn</h3>
        </div>
        <div className="tempo-chat-conversations-list">
          {loading ? (
            <div className="tempo-chat-empty">Đang tải...</div>
          ) : conversations.length === 0 ? (
            <div className="tempo-chat-empty">Chưa có tin nhắn nào</div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.user.id}
                type="button"
                className={`tempo-chat-conv-item ${selectedUserId === conv.user.id ? 'is-active' : ''}`}
                onClick={() => selectConversation(conv.user.id)}
              >
                <div className="tempo-chat-conv-avatar">
                  {conv.user.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="tempo-chat-conv-info">
                  <div className="tempo-chat-conv-name">{conv.user.fullName}</div>
                  <div className="tempo-chat-conv-preview">
                    {conv.lastMessage?.hasShare ? '📅 Đã chia sẻ lịch' : (conv.lastMessage?.content ?? '')}
                  </div>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="tempo-chat-unread-badge">{conv.unreadCount}</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="tempo-chat-main">
        {!selectedUserId ? (
          <div className="tempo-chat-placeholder">
            <div className="tempo-chat-placeholder-icon">💬</div>
            <div>Chọn một cuộc trò chuyện</div>
          </div>
        ) : (
          <>
            <div className="tempo-chat-main-header">
              <div className="tempo-chat-conv-avatar">
                {selectedUser?.fullName.charAt(0).toUpperCase() ?? '?'}
              </div>
              <div>
                <div className="tempo-chat-conv-name">{selectedUser?.fullName ?? 'Unknown'}</div>
                <div className="tempo-chat-conv-code">{selectedUser?.studentCode ?? ''}</div>
              </div>
            </div>

            {viewingShare ? (
              <ScheduleShareView
                slug={viewingShare.slug}
                scheduleName={viewingShare.scheduleName}
                permission={viewingShare.permission}
                onClose={() => setViewingShare(null)}
                onSendComment={async (comment: string) => {
                  const receiver = selectedUserId;
                  if (receiver) {
                    await sendMessage(receiver, comment);
                    void loadConversations();
                  }
                }}
              />
            ) : (
              <div className="tempo-chat-messages">
                {messages.length === 0 ? (
                  <div className="tempo-chat-empty">Chưa có tin nhắn. Hãy gửi lời chào!</div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.senderId === currentUserId;
                    return (
                      <div key={msg.id} className={`tempo-chat-msg ${isMine ? 'is-mine' : 'is-theirs'}`}>
                        <div className="tempo-chat-msg-sender">{msg.sender.fullName}</div>
                        {msg.scheduleShare ? (
                          <div className="tempo-chat-msg-share">
                            <div className="tempo-chat-msg-text">{msg.content}</div>
                            <button
                              type="button"
                              className="tempo-chat-share-link"
                              onClick={() => handleViewSharedSchedule(
                                msg.scheduleShare!.slug,
                                msg.scheduleShare!.schedule.name,
                                msg.scheduleShare!.permission,
                              )}
                            >
                              📅 Xem lịch: {msg.scheduleShare.schedule.name}
                            </button>
                          </div>
                        ) : (
                          <div className="tempo-chat-msg-text">{msg.content}</div>
                        )}
                        <div className="tempo-chat-msg-time">
                          {new Date(msg.createdAt).toLocaleString('vi-VN')}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            )}

            {!viewingShare && (
              <div className="tempo-chat-input-row">
                <input
                  type="text"
                  className="tempo-chat-input"
                  placeholder="Nhập tin nhắn..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSend();
                  }}
                />
                <button
                  type="button"
                  className="tempo-primary-button tempo-chat-send-btn"
                  onClick={handleSend}
                  disabled={!newMessage.trim()}
                >
                  Gửi
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
