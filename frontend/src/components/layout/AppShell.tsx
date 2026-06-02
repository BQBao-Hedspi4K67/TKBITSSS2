import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { logout } from '../../services/authService';

type AppShellProps = {
  children: ReactNode;
  sidebarTop?: ReactNode;
};

export function AppShell({ children, sidebarTop }: AppShellProps) {
  const { user, clearSession } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="tempo-app-shell">
      <aside className="tempo-sidebar">
        <div className="tempo-sidebar-top">
          <div className="tempo-brand">
            <strong>Tempo Schedule Builder</strong>
          </div>

          {sidebarTop ? <div className="tempo-surface-card tempo-sidebar-summary">{sidebarTop}</div> : null}
        </div>

        <div className="tempo-sidebar-footer">
          <div className="tempo-user-card">
            <div className="tempo-user-avatar">{user?.fullName?.slice(0, 2).toUpperCase() ?? 'ST'}</div>
            <div>
              <div className="tempo-user-name">{user?.fullName ?? 'Student'}</div>
              <div className="tempo-user-meta">{user?.studentCode ?? 'Student role'}</div>
            </div>
          </div>

          <button
            type="button"
            className="tempo-secondary-button tempo-sidebar-logout"
            onClick={async () => {
              try {
                await logout();
              } finally {
                clearSession();
                navigate('/login', { replace: true });
              }
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      <div className="tempo-main-shell">{children}</div>
    </div>
  );
}
