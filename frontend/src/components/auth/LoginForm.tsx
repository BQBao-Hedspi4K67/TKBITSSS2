import { useState } from 'react';

type LoginPayload = { login: string; password: string };
type RegisterPayload = { fullName: string; email: string; studentCode: string; password: string; confirmPassword: string };

type LoginFormProps = {
  mode: 'login' | 'register';
  onSubmit: (payload: LoginPayload | RegisterPayload) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  onModeChange: (mode: 'login' | 'register') => void;
};

export function LoginForm({ mode, onSubmit, loading = false, error = null, onModeChange }: LoginFormProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [login, setLogin] = useState('student@tempo.local');
  const [password, setPassword] = useState('Password@123');
  const [confirmPassword, setConfirmPassword] = useState('Password@123');

  return (
    <form
      className="tempo-login-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (mode === 'register') {
          await onSubmit({
            fullName: fullName.trim(),
            email: email.trim(),
            studentCode: studentCode.trim(),
            password,
            confirmPassword,
          });
          return;
        }

        await onSubmit({ login: login.trim(), password });
      }}
    >
      <div className="tempo-auth-toggle">
        <button
          type="button"
          className={mode === 'login' ? 'is-active' : ''}
          onClick={() => onModeChange('login')}
        >
          Dang nhap
        </button>
        <button
          type="button"
          className={mode === 'register' ? 'is-active' : ''}
          onClick={() => onModeChange('register')}
        >
          Dang ky
        </button>
      </div>

      {mode === 'register' ? (
        <>
          <label className="tempo-field">
            <span>Ho va ten</span>
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Nguyen Van A" />
          </label>

          <label className="tempo-field">
            <span>Email</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="student@tempo.local" />
          </label>

          <label className="tempo-field">
            <span>Ma sinh vien (tuy chon)</span>
            <input
              value={studentCode}
              onChange={(event) => setStudentCode(event.target.value)}
              placeholder="20251234"
            />
          </label>
        </>
      ) : (
        <label className="tempo-field">
          <span>Email or Student Code</span>
          <input value={login} onChange={(event) => setLogin(event.target.value)} placeholder="student@tempo.local" />
        </label>
      )}

      <label className="tempo-field">
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password@123"
        />
      </label>

      {mode === 'register' ? (
        <label className="tempo-field">
          <span>Confirm password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Password@123"
          />
        </label>
      ) : null}

      {error ? <div className="tempo-error-banner">{error}</div> : null}

      <button type="submit" className="tempo-primary-button" disabled={loading}>
        {loading ? (mode === 'register' ? 'Creating account...' : 'Signing in...') : mode === 'register' ? 'Create account' : 'Sign in'}
      </button>
    </form>
  );
}
