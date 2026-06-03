import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { createShare, deleteShareFromSchedule, listShares, updateShare } from '../../services/timetableService';
import { searchUsers, sendMessage } from '../../services/chatService';
import type { UserSearchResult } from '../../services/chatService';
import type { SavedSchedule } from '../../types/schedule';
import { getCourseTheme } from '../../utils/timetable';

type ShareScheduleModalProps = {
  schedule: SavedSchedule;
  userName?: string;
  userId?: string;
  onClose: () => void;
  onStatusMessage?: (message: string) => void;
};

type ShareInfo = {
  id: string;
  slug: string;
  permission: 'VIEW' | 'COMMENT';
  createdAt: string;
  expiresAt: string | null;
};

const baseUrl = import.meta.env.VITE_APP_URL ?? window.location.origin;

const weekdayOrder = ['2', '3', '4', '5', '6', '7', 'CN'];
const weekdayLabels: Record<string, string> = {
  '2': 'T2', '3': 'T3', '4': 'T4', '5': 'T5', '6': 'T6', '7': 'T7', 'CN': 'CN',
};

export function ShareScheduleModal({ schedule, userName, userId, onClose, onStatusMessage }: ShareScheduleModalProps) {
  const [share, setShare] = useState<ShareInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [permission, setPermission] = useState<'VIEW' | 'COMMENT'>('VIEW');
  const [highlightConflicts, setHighlightConflicts] = useState(false);
  const [friendName, setFriendName] = useState('');
  const [friends, setFriends] = useState<Array<{ id: string; initials: string; name: string; studentCode: string | null; color: string }>>([]);
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const displayName = userName || 'Người dùng';

  const avatarColors = ['#B5D4F4', '#9FE1CB', '#CECBF6', '#FAC775', '#C0DD97'];

  // Build share link
  const shareLink = share ? `${baseUrl}/shared/${share.slug}` : '';

  // Generate real QR code
  useEffect(() => {
    if (shareLink) {
      QRCode.toDataURL(shareLink, {
        width: 160,
        margin: 2,
        color: { dark: '#1D2939', light: '#FFFFFF' },
      }).then(setQrDataUrl).catch(() => setQrDataUrl(null));
    } else {
      setQrDataUrl(null);
    }
  }, [shareLink]);

  // Get mini calendar preview
  const dayItems = useMemo(() => {
    const map = new Map<string, typeof schedule.items>();
    weekdayOrder.forEach((day) => map.set(day, [] as typeof schedule.items));
    schedule.items.forEach((item) => {
      const list = map.get(item.weekday);
      if (list) list.push(item);
    });
    return map;
  }, [schedule.items]);

  const uniqueCourses = useMemo(() => {
    const seen = new Set<string>();
    return schedule.items.filter((item) => {
      if (seen.has(item.courseCode)) return false;
      seen.add(item.courseCode);
      return true;
    });
  }, [schedule.items]);

  // Load or create share
  const loadOrCreateShare = useCallback(async () => {
    setLoading(true);
    try {
      const sharesResponse = await listShares(schedule.id);
      const activeShare = sharesResponse.shares[0] ?? null;

      if (activeShare) {
        setShare({
          id: activeShare.id,
          slug: activeShare.slug,
          permission: activeShare.permission,
          createdAt: activeShare.createdAt,
          expiresAt: activeShare.expiresAt,
        });
      } else {
        const response = await createShare(schedule.id, permission);
        setShare({
          id: response.share.id,
          slug: response.share.slug,
          permission: response.share.permission,
          createdAt: response.share.createdAt,
          expiresAt: response.share.expiresAt,
        });
      }
    } catch (error) {
      try {
        const response = await createShare(schedule.id, permission);
        setShare({
          id: response.share.id,
          slug: response.share.slug,
          permission: response.share.permission,
          createdAt: response.share.createdAt,
          expiresAt: response.share.expiresAt,
        });
      } catch (createError) {
        onStatusMessage?.('Không thể tạo link chia sẻ');
      }
    } finally {
      setLoading(false);
    }
  }, [schedule.id, permission, onStatusMessage]);

  useEffect(() => {
    void loadOrCreateShare();
  }, [loadOrCreateShare]);

  // User search with debounce
  const handleFriendNameChange = (value: string) => {
    setFriendName(value);
    if (searchTimer) clearTimeout(searchTimer);

    if (value.trim().length < 2) {
      setSearchResults([]);
      setShowUserDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchUsers(value.trim());
        // Filter out already-added friends
        const friendIds = new Set(friends.map((f) => f.id));
        const filtered = results.users.filter((u) => !friendIds.has(u.id));
        setSearchResults(filtered);
        setShowUserDropdown(filtered.length > 0);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    setSearchTimer(timer);
  };

  const handleSelectUser = (user: UserSearchResult) => {
    const color = avatarColors[friends.length % avatarColors.length];
    const initials = user.fullName
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
    setFriends((prev) => [...prev, { id: user.id, initials, name: user.fullName, studentCode: user.studentCode, color }]);
    setFriendName('');
    setSearchResults([]);
    setShowUserDropdown(false);
  };

  const handleRemoveFriend = (index: number) => {
    setFriends((prev) => prev.filter((_, i) => i !== index));
  };

  // Send share link to selected friends via chat
  const handleSendToFriends = async () => {
    if (!share || friends.length === 0) return;

    const messageText = `📅 Đã chia sẻ lịch "${schedule.name}" với bạn!`;
    let sentCount = 0;

    for (const friend of friends) {
      try {
        await sendMessage(friend.id, messageText, share.id);
        sentCount++;
      } catch {
        // silent
      }
    }

    if (sentCount > 0) {
      onStatusMessage?.(`Đã gửi link lịch đến ${sentCount} người bạn qua chat`);
    }
    setFriends([]);
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onStatusMessage?.('Không thể sao chép link');
    }
  };

  const handlePermissionChange = async (newPermission: 'VIEW' | 'COMMENT') => {
    setPermission(newPermission);
    if (!share) return;
    try {
      const response = await updateShare(schedule.id, share.id, { permission: newPermission });
      setShare((prev) => prev ? { ...prev, permission: response.share.permission } : prev);
    } catch {
      onStatusMessage?.('Không thể cập nhật quyền');
    }
  };

  const handleRevokeShare = async () => {
    if (!share) return;
    try {
      await deleteShareFromSchedule(schedule.id, share.id);
      setShare(null);
      setQrDataUrl(null);
      onStatusMessage?.('Đã thu hồi link chia sẻ');
    } catch {
      onStatusMessage?.('Không thể thu hồi link');
    }
  };

  return (
    <div className="tempo-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="tempo-modal-card tempo-share-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Chia sẻ thời khóa biểu"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="tempo-panel-toolbar tempo-modal-toolbar">
          <div>
            <h3>Chia sẻ thời khóa biểu</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
              {schedule.name} · {displayName}
            </p>
          </div>
          <button type="button" className="tempo-secondary-button" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Mini preview */}
        <div className="tempo-share-preview">
          <div className="tempo-share-preview-calendar">
            {weekdayOrder.map((weekday) => {
              const items = dayItems.get(weekday) ?? [];
              return (
                <div key={weekday} className="tempo-share-preview-day">
                  <div className="tempo-share-preview-day-label">{weekdayLabels[weekday]}</div>
                  <div className="tempo-share-preview-day-track">
                    {items.slice(0, 2).map((item) => {
                      const theme = getCourseTheme(item.courseCode);
                      return (
                        <div
                          key={item.id}
                          className="tempo-share-preview-block"
                          style={{ backgroundColor: theme.tint, borderColor: theme.border }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="tempo-share-preview-meta">
            {uniqueCourses.length} môn · {schedule.items.length} lớp
            {schedule.conflicts.length > 0 ? ` · ${schedule.conflicts.length} xung đột` : ''}
          </div>
        </div>

        {/* Share link */}
        <div className="tempo-share-link-section">
          <div className="tempo-share-section-label">Link chia sẻ</div>
          <div className="tempo-share-link-row">
            {loading ? (
              <div className="tempo-share-link-input tempo-share-loading">Đang tạo link...</div>
            ) : (
              <div className="tempo-share-link-input" title={shareLink}>
                {shareLink || 'Chưa có link'}
              </div>
            )}
            <button
              type="button"
              className={`tempo-primary-button tempo-share-copy-btn ${copied ? 'is-copied' : ''}`}
              onClick={handleCopyLink}
              disabled={!shareLink || loading}
            >
              {copied ? 'Đã sao chép!' : 'Sao chép'}
            </button>
          </div>
        </div>

        {/* QR + Permissions row */}
        <div className="tempo-share-row">
          {/* QR Code - REAL */}
          <div className="tempo-share-qr-section">
            <div className="tempo-share-section-label">QR Code</div>
            <div className="tempo-share-qr-box">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code" className="tempo-share-qr-img" />
              ) : (
                <div className="tempo-share-qr-placeholder">
                  {loading ? '...' : 'QR'}
                </div>
              )}
            </div>
          </div>

          {/* Permissions */}
          <div className="tempo-share-permissions">
            <div className="tempo-share-section-label">Quyền xem</div>
            <div className="tempo-share-permission-list">
              <label className="tempo-share-permission-option">
                <input
                  type="radio"
                  name="share-permission"
                  checked={permission === 'VIEW'}
                  onChange={() => handlePermissionChange('VIEW')}
                />
                <span>Chỉ xem</span>
              </label>
              <label className="tempo-share-permission-option">
                <input
                  type="radio"
                  name="share-permission"
                  checked={permission === 'COMMENT'}
                  onChange={() => handlePermissionChange('COMMENT')}
                />
                <span>Xem + Nhận xét</span>
              </label>
              
            </div>
          </div>
        </div>

        {/* Friends sharing - with user search */}
        <div className="tempo-share-friends-section">
          <div className="tempo-share-section-label">Chia sẻ cho bạn bè qua chat</div>
          <div className="tempo-share-friends-list">
            {friends.map((friend, index) => (
              <div key={friend.id} className="tempo-share-friend-chip">
                <div className="tempo-share-friend-avatar" style={{ backgroundColor: friend.color }}>
                  {friend.initials}
                </div>
                <span>{friend.name}</span>
                <button type="button" className="tempo-share-friend-remove" onClick={() => handleRemoveFriend(index)}>
                  ✕
                </button>
              </div>
            ))}
            {friends.length < 8 && (
              <div className="tempo-share-friend-add" style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="tempo-share-friend-input"
                  placeholder="Nhập tên bạn bè để tìm..."
                  value={friendName}
                  onChange={(e) => handleFriendNameChange(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowUserDropdown(true);
                  }}
                  onBlur={() => {
                    // Delay to allow click on dropdown
                    setTimeout(() => setShowUserDropdown(false), 200);
                  }}
                />
                {searching && <span className="tempo-share-search-spinner">⏳</span>}
                {showUserDropdown && (
                  <div className="tempo-share-user-dropdown">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        className="tempo-share-user-option"
                        onMouseDown={() => handleSelectUser(user)}
                      >
                        <div className="tempo-share-user-option-avatar">
                          {user.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="tempo-share-user-option-name">{user.fullName}</div>
                          <div className="tempo-share-user-option-code">{user.studentCode ?? user.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          {friends.length > 0 && (
            <div className="tempo-share-friends-send">
              <button
                type="button"
                className="tempo-primary-button"
                onClick={() => void handleSendToFriends()}
              >
                Gửi link cho {friends.length} bạn qua chat
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="tempo-share-actions">
          {share && (
            <button type="button" className="tempo-secondary-button tempo-share-revoke-btn" onClick={handleRevokeShare}>
              Thu hồi link
            </button>
          )}
          <div className="tempo-share-actions-right">
            <button type="button" className="tempo-secondary-button" onClick={onClose}>
              Đóng
            </button>
            <button
              type="button"
              className="tempo-primary-button"
              disabled={!shareLink || loading}
              onClick={() => {
                handleCopyLink();
                if (friends.length > 0) {
                  void handleSendToFriends();
                }
                onClose();
              }}
            >
              Hoàn tất
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
