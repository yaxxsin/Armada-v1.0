import { useEffect, useRef, useState } from 'react';

export type AppView = 'dashboard' | 'fleet' | 'reports' | 'users' | 'audit';
export type NavbarUser = {
  name?: string | null;
  email?: string | null;
  role?: 'admin' | 'user' | string | null;
} | null;

export type AppNavbarProps = {
  activeView: AppView;
  user: NavbarUser;
  reminderCount: number;
  notificationsOpen?: boolean;
  onNavigate: (view: AppView) => void;
  onLogout: () => void | Promise<void>;
  onOpenNotifications: () => void;
};

type NavigationItem = { view: AppView; label: string; adminOnly?: boolean };

const navigationItems: NavigationItem[] = [
  { view: 'dashboard', label: 'Dashboard' },
  { view: 'fleet', label: 'Armada' },
  { view: 'reports', label: 'Laporan' },
  { view: 'users', label: 'Pengguna', adminOnly: true },
  { view: 'audit', label: 'Audit Log', adminOnly: true },
];

const styles = `
  .ac-navbar {
    position: sticky;
    top: 0;
    z-index: 40;
    width: 100%;
    padding: 16px 24px 0;
    background: var(--bg);
  }
  .ac-navbar__inner {
    width: min(1420px, 100%);
    min-height: 64px;
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0 auto;
    padding: 6px 10px;
    border: 1px solid rgba(255, 255, 255, 0.72);
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.88);
    box-shadow: 0 10px 28px rgba(28, 37, 49, 0.06);
    backdrop-filter: blur(16px);
  }
  .ac-navbar__brand {
    display: inline-grid;
    place-items: center;
    width: 56px;
    height: 56px;
    flex: 0 0 56px;
    padding: 0;
    border: 0;
    border-radius: 14px;
    background: transparent;
    cursor: pointer;
    transition: transform 160ms ease;
  }
  .ac-navbar__brand:hover { transform: scale(1.04); }
  .ac-navbar__logo { display: block; width: 100%; height: 100%; object-fit: contain; }
  .ac-navbar__nav { display: flex; align-items: center; justify-content: center; flex: 1; min-width: 0; }
  .ac-navbar__links { display: flex; align-items: center; gap: 2px; padding: 3px; border: 1px solid var(--border); border-radius: 999px; background: var(--panel2); }
  .ac-navbar__link {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 0;
    border-radius: 999px;
    padding: 9px 15px;
    color: var(--text-dim);
    background: transparent;
    font: 600 12px 'Inter', sans-serif;
    cursor: pointer;
    transition: color 160ms ease, background 160ms ease, box-shadow 160ms ease;
  }
  .ac-navbar__link svg { width: 14px; height: 14px; }
  .ac-navbar__link:hover { color: var(--text); }
  .ac-navbar__link[aria-current='page'] { color: var(--text); background: #f1f79b; box-shadow: 0 2px 7px rgba(182, 192, 46, 0.12); }
  .ac-navbar__actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
  .ac-navbar__icon-btn,
  .ac-navbar__menu-btn {
    position: relative;
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border: 1px solid var(--border);
    border-radius: 50%;
    background: var(--panel);
    color: var(--text-dim);
    cursor: pointer;
  }
  .ac-navbar__icon-btn:hover,
  .ac-navbar__menu-btn:hover { color: var(--text); border-color: #b8c2ce; background: #f8fafc; }
  .ac-navbar__badge {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 17px;
    height: 17px;
    display: grid;
    place-items: center;
    border: 2px solid #fff;
    border-radius: 50%;
    background: var(--red);
    color: #fff;
    font: 700 8px 'Inter', sans-serif;
  }
  .ac-navbar__user { position: relative; }
  .ac-navbar__user-btn { display: flex; align-items: center; gap: 8px; border: 0; border-radius: 999px; padding: 2px; background: transparent; cursor: pointer; }
  .ac-navbar__avatar { width: 38px; height: 38px; display: grid; place-items: center; border: 2px solid #fff; border-radius: 50%; background: #22252b; color: #fff; font: 700 12px 'Inter', sans-serif; box-shadow: 0 2px 6px rgba(23, 32, 46, 0.1); }
  .ac-navbar__user-copy { display: grid; gap: 2px; text-align: left; }
  .ac-navbar__user-copy strong { max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text); font-size: 11px; }
  .ac-navbar__user-copy small { color: var(--text-faint); font-size: 9px; }
  .ac-navbar__caret { color: var(--text-faint); font-size: 10px; }
  .ac-navbar__dropdown { position: absolute; top: calc(100% + 10px); right: 0; width: 220px; padding: 10px; border: 1px solid var(--border); border-radius: 12px; background: var(--panel); box-shadow: 0 16px 34px rgba(23, 32, 46, 0.13); }
  .ac-navbar__user-head { display: grid; gap: 3px; padding: 6px 8px 10px; margin-bottom: 8px; border-bottom: 1px solid var(--border); }
  .ac-navbar__user-head strong { font-size: 12px; }
  .ac-navbar__user-head small { color: var(--text-faint); font-size: 10px; }
  .ac-navbar__logout { width: 100%; border: 1px solid var(--border); border-radius: 7px; padding: 8px 10px; background: transparent; color: var(--text-dim); font: 600 11px 'Inter', sans-serif; text-align: left; cursor: pointer; }
  .ac-navbar__logout:hover { color: var(--red); border-color: #f2bdc3; }
  .ac-navbar__menu-btn { display: none; }
  .ac-navbar__brand:focus-visible,
  .ac-navbar__link:focus-visible,
  .ac-navbar__icon-btn:focus-visible,
  .ac-navbar__user-btn:focus-visible,
  .ac-navbar__logout:focus-visible,
  .ac-navbar__menu-btn:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }
  @media (max-width: 900px) {
    .ac-navbar { padding: 10px 12px 0; }
    .ac-navbar__inner { min-height: 58px; padding: 7px; border-radius: 20px; }
    .ac-navbar__nav { position: absolute; top: 58px; left: 12px; right: 12px; display: none; }
    .ac-navbar__nav[data-open='true'] { display: block; }
    .ac-navbar__links { display: grid; gap: 3px; padding: 7px; border-radius: 16px; box-shadow: 0 14px 30px rgba(23, 32, 46, 0.12); }
    .ac-navbar__link { width: 100%; border-radius: 9px; text-align: left; }
    .ac-navbar__actions { margin-left: auto; }
    .ac-navbar__user-copy, .ac-navbar__caret { display: none; }
    .ac-navbar__menu-btn { display: grid; }
  }
`;

function getInitials(user: NavbarUser) {
  const source = user?.name || user?.email || '';
  const parts = source.trim().split(/[\s@.]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0]?.[0] || '?').toUpperCase();
}

function NavIcon({ view }: { view: AppView }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (view === 'dashboard') return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>;
  if (view === 'fleet') return <svg {...common}><path d="M3 7h18M5 7l1-3h12l1 3M5 7v10h14V7M8 17v2M16 17v2" /></svg>;
  if (view === 'reports') return <svg {...common}><path d="M4 19V5M4 19h17" /><path d="M8 16v-4M12 16V8M16 16v-6M20 16v-9" /></svg>;
  if (view === 'users') return <svg {...common}><circle cx="9" cy="8" r="3" /><path d="M3 20c.5-3.3 2.4-5 6-5s5.5 1.7 6 5M16 11c2.8.1 4.4 1.5 5 4" /></svg>;
  return <svg {...common}><path d="M4 4h16v16H4z" /><path d="M8 9h8M8 13h5M8 17h3" /></svg>;
}

export default function AppNavbar({ activeView, user, reminderCount, notificationsOpen = false, onNavigate, onLogout, onOpenNotifications }: AppNavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const isAdmin = user?.role === 'admin';
  const visibleItems = navigationItems.filter((item) => !item.adminOnly || isAdmin);
  const safeReminderCount = Math.max(0, Number(reminderCount) || 0);

  useEffect(() => {
    if (!userMenuOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => { if (!userMenuRef.current?.contains(event.target as Node)) setUserMenuOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setUserMenuOpen(false); };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('mousedown', closeOnOutsideClick); document.removeEventListener('keydown', closeOnEscape); };
  }, [userMenuOpen]);

  const navigate = (view: AppView) => { setMobileOpen(false); onNavigate(view); };

  return (
    <>
      <style>{styles}</style>
      <header className="ac-navbar">
        <div className="ac-navbar__inner">
          <button type="button" className="ac-navbar__brand" onClick={() => navigate('dashboard')} aria-label="Buka dashboard Armada Control"><img className="ac-navbar__logo" src="/armada-navbar.png" alt="" width={56} height={56} /></button>
          <nav id="app-navbar-menu" className="ac-navbar__nav" aria-label="Navigasi utama" data-open={mobileOpen}>
            <div className="ac-navbar__links">
              {visibleItems.map((item) => (
                <button type="button" className="ac-navbar__link" key={item.view} onClick={() => navigate(item.view)} aria-current={activeView === item.view ? 'page' : undefined}>
                  <NavIcon view={item.view} /> {item.label}
                </button>
              ))}
            </div>
          </nav>
          <div className="ac-navbar__actions">
            <button type="button" className="ac-navbar__icon-btn" onClick={onOpenNotifications} aria-expanded={notificationsOpen} aria-controls="notification-drawer" aria-label={safeReminderCount > 0 ? `Buka notifikasi, ${safeReminderCount} pengingat` : 'Buka notifikasi'} title="Notifikasi">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
              {safeReminderCount > 0 && <span className="ac-navbar__badge">{safeReminderCount > 99 ? '99+' : safeReminderCount}</span>}
            </button>
            <div className="ac-navbar__user" ref={userMenuRef}>
              <button type="button" className="ac-navbar__user-btn" onClick={() => setUserMenuOpen((open) => !open)} aria-haspopup="menu" aria-expanded={userMenuOpen} aria-label="Buka menu pengguna">
                <span className="ac-navbar__avatar" aria-hidden="true">{getInitials(user)}</span>
                <span className="ac-navbar__user-copy"><strong>{user?.name || user?.email || 'Pengguna'}</strong><small>{isAdmin ? 'Fleet Manager' : 'Viewer'}</small></span>
                <span className="ac-navbar__caret" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg></span>
              </button>
              {userMenuOpen && <div className="ac-navbar__dropdown" role="menu"><div className="ac-navbar__user-head"><strong>{user?.name || user?.email || 'Pengguna'}</strong><small>{isAdmin ? 'Administrator' : 'Mode view only'}</small></div><button type="button" className="ac-navbar__logout" role="menuitem" onClick={() => { setUserMenuOpen(false); void onLogout(); }}>Keluar dari akun</button></div>}
            </div>
            <button type="button" className="ac-navbar__menu-btn" onClick={() => setMobileOpen((open) => !open)} aria-label={mobileOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'} aria-expanded={mobileOpen} aria-controls="app-navbar-menu">
              {mobileOpen ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
