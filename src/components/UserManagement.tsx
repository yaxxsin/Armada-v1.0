import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/useAuth';
import InviteTokenCard from './InviteTokenCard';

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const [error, setError] = useState('');

  const loadUsers = async () => {
    try {
      const response = await api('/users');
      setUsers(response.users || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pengguna.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const toggleRole = async (id, currentRole) => {
    if (String(id) === String(currentUser?.id)) return;
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`Ubah role pengguna ini menjadi ${newRole}?`)) return;
    setBusyId(id);
    setError('');
    try {
      await api(`/users/${id}`, { method: 'PATCH', body: JSON.stringify({ role: newRole }) });
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah role pengguna.');
    } finally {
      setBusyId(null);
    }
  };

  const deleteUser = async (id) => {
    if (String(id) === String(currentUser?.id)) return;
    if (!confirm('Hapus pengguna ini? Tindakan ini tidak dapat dibatalkan.')) return;
    setBusyId(id);
    setError('');
    try {
      await api(`/users/${id}`, { method: 'DELETE' });
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus pengguna.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="loading">Memuat pengguna…</div>;

  return (
    <div className="panel-box">
      <div className="head">Pengguna</div>
      <InviteTokenCard />
      {error && <div className="auth-error" role="alert"><span>{error}</span><button type="button" className="link-btn" onClick={() => void loadUsers()}>Coba lagi</button></div>}
      <div className="list">
        {users.length === 0 ? (
          <div className="empty-rem">Tidak ada pengguna.</div>
        ) : (
          users.map((u) => {
            const isCurrentUser = String(u.id) === String(currentUser?.id);
            const busy = busyId === u.id;
            return (
              <div className="rem-item" key={u.id}>
                <span className="plat">{u.email}{isCurrentUser ? ' (Anda)' : ''}</span>
                <span className="msg">{u.name || '-'}</span>
                <button type="button" className="scope-badge shared" onClick={() => void toggleRole(u.id, u.role)} disabled={isCurrentUser || busy} title={isCurrentUser ? 'Anda tidak dapat mengubah role sendiri' : 'Klik untuk ganti role'}>
                  {busy ? 'Memproses…' : u.role}
                </button>
                {u.role !== 'admin' && !isCurrentUser && (
                  <button type="button" className="btn danger small" onClick={() => void deleteUser(u.id)} disabled={busy}>Hapus</button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
