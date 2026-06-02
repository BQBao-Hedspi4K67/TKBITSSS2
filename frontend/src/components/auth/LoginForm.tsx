import { useState } from 'react';

type LoginFormProps = {
  onSubmit: (payload: { login: string; password: string }) => Promise<void>;
  loading?: boolean;
  error?: string | null;
};

export function LoginForm({ onSubmit, loading = false, error = null }: LoginFormProps) {
  const [login, setLogin] = useState('student@tempo.local');
  const [password, setPassword] = useState('Password@123');

  return (
    <form
      className="tempo-login-form"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit({ login, password });
      }}
    >
      <label className="tempo-field">
        <span>Email or Student Code</span>
        <input value={login} onChange={(event) => setLogin(event.target.value)} placeholder="student@tempo.local" />
      </label>

      <label className="tempo-field">
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password@123"
        />
      </label>

      {error ? <div className="tempo-error-banner">{error}</div> : null}

      <button type="submit" className="tempo-primary-button" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}
