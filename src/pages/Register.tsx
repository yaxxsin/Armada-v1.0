import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../context/useAuth';

type RegisterProps = {
  onRegistered?: () => void;
};

export default function Register({ onRegistered }: RegisterProps) {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (password.length < 12) {
      setError('Password minimal 12 karakter.');
      return;
    }
    if (!accessCode.trim()) {
      setError('Masukkan kode owner atau kode undangan.');
      return;
    }
    setBusy(true);
    try {
      await register(email, password, name, accessCode.trim());
      onRegistered?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pendaftaran gagal. Coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <h1>Buat Akun</h1>
        <div className="auth-sub">
          Registrasi membutuhkan kode owner untuk akun pertama atau kode undangan dari admin.
        </div>

        <div className="field">
          <label htmlFor="register-name">Nama</label>
          <input id="register-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="PIC Armada" />
        </div>
        <div className="field">
          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            type="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
          />
        </div>
        <div className="field">
          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="minimal 12 karakter"
          />
        </div>
        <div className="field">
          <label htmlFor="register-access-code">Kode owner / undangan</label>
          <input
            id="register-access-code"
            type="password"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder="Masukkan kode dari admin"
            autoComplete="one-time-code"
          />
        </div>

        {error && <div className="auth-error" role="alert">{error}</div>}

        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Memproses…' : 'Daftar'}
        </button>
      </form>
    </div>
  );
}
