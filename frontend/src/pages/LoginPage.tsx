import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
import { login, register } from '../services/authService';
import { useAuthStore } from '../store/authStore';

type LoginPayload = { login: string; password: string };
type RegisterPayload = { fullName: string; email: string; studentCode: string; password: string; confirmPassword: string };

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const token = useAuthStore((state) => state.token);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const handleModeChange = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setError(null);
  };

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
          mode={mode}
          onModeChange={handleModeChange}
          loading={loading}
          error={error}
          onSubmit={async (payload: LoginPayload | RegisterPayload) => {
            setLoading(true);
            setError(null);
            try {
              let response;
              if (mode === 'register') {
                const registerPayload = payload as RegisterPayload;
                if (registerPayload.password !== registerPayload.confirmPassword) {
                  throw new Error('Mat khau xac nhan khong khop');
                }

                response = await register({
                  fullName: registerPayload.fullName,
                  email: registerPayload.email,
                  studentCode: registerPayload.studentCode || undefined,
                  password: registerPayload.password,
                });
              } else {
                const loginPayload = payload as LoginPayload;
                response = await login(loginPayload.login, loginPayload.password);
              }

              setSession(response.token, response.user);
              navigate('/app', { replace: true });
            } catch (exception) {
              setError(exception instanceof Error ? exception.message : mode === 'register' ? 'Dang ky that bai' : 'Dang nhap that bai');
            } finally {
              setLoading(false);
            }
          }}
        />
      </div>
    </div>
  );
}
