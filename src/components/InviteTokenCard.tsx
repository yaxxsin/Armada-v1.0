import { useState } from 'react';
import { api } from '../api/client';

type InviteTokenCardProps = {
  compact?: boolean;
};

export default function InviteTokenCard({ compact = false }: InviteTokenCardProps) {
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const createInvite = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await api('/users/invites', {
        method: 'POST',
        body: JSON.stringify({ expiresHours: 24, role: 'user' }),
      });
      setInvite(response.invite);
      setCopied(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat token undangan.');
    } finally {
      setBusy(false);
    }
  };

  const copyInvite = async () => {
    if (!invite?.code) return;
    try {
      await navigator.clipboard.writeText(invite.code);
      setCopied(true);
    } catch {
      setError('Token tidak bisa disalin otomatis. Salin manual dari layar.');
    }
  };

  return (
    <section className={`invite-token-card${compact ? ' invite-token-card--compact' : ''}`} aria-labelledby={compact ? 'dashboard-invite-title' : 'users-invite-title'}>
      <div className="invite-token-card__head">
        <div>
          <h2 id={compact ? 'dashboard-invite-title' : 'users-invite-title'}>Token registrasi</h2>
          <p>Buat token sekali pakai untuk mendaftarkan user baru.</p>
        </div>
        <button type="button" className="btn secondary small" onClick={() => void createInvite()} disabled={busy}>
          {busy ? 'Membuat…' : 'Buat token'}
        </button>
      </div>
      {invite && (
        <div className="invite-token-card__token" role="status">
          <div><span>Token hanya ditampilkan sekali</span><code>{invite.code}</code></div>
          <button type="button" className="btn ghost small" onClick={() => void copyInvite()}>{copied ? 'Tersalin' : 'Salin token'}</button>
          <small>Berlaku sampai {new Date(invite.expires_at).toLocaleString('id-ID')}</small>
        </div>
      )}
      {error && <div className="auth-error" role="alert">{error}</div>}
    </section>
  );
}
