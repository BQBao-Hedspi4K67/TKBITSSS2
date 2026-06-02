import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
import { login } from '../services/authService';
import { useAuthStore } from '../store/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const token = useAuthStore((state) => state.token);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      navigate('/app', { replace: true });
    }
  }, [navigate, token]);

  return (
    <div className="tempo-login-page">
      <div className="tempo-login-card">
        <div className="tempo-login-copy">
          <h1>Tempo</h1>
          <p>Production foundation for schedule building, import and conflict handling.</p>
        </div>

        <LoginForm
          loading={loading}
          error={error}
          onSubmit={async ({ login: loginValue, password }) => {
            setLoading(true);
            setError(null);
            try {
              const response = await login(loginValue, password);
              setSession(response.token, response.user);
              navigate('/app', { replace: true });
            } catch (exception) {
              setError(exception instanceof Error ? exception.message : 'Dang nhap that bai');
            } finally {
              setLoading(false);
            }
          }}
        />
      </div>
    </div>
  );
}
