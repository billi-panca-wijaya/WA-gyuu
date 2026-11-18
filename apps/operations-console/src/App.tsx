import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Layers,
  Send,
  Shield,
  Activity,
  Users,
  Settings,
  BookOpen,
  LogOut,
  User,
  Loader2,
} from 'lucide-react';
import { LoginView } from './components/LoginView';
import { SummaryPanel } from './components/SummaryPanel';
import { BrandsPanel } from './components/BrandsPanel';
import { WebhookPanel } from './components/WebhookPanel';
import { AuditLogsPanel } from './components/AuditLogsPanel';
import { SystemHealthPanel } from './components/SystemHealthPanel';
import { UsersPanel } from './components/UsersPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { ApiDocsPanel } from './components/ApiDocsPanel';
import './styles/portal.css';

type ActiveMenu =
  | 'summary'
  | 'brands'
  | 'webhooks'
  | 'logs'
  | 'health'
  | 'users'
  | 'settings'
  | 'docs';

export const App: React.FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>('summary');

  const checkAuth = async (): Promise<boolean> => {
    try {
      const res = await fetch('/v1/ops/auth/me');
      if (res.ok) {
        const json = await res.json();
        const userData = json.data?.data || json.data?.user || json.data;
        if (userData && (userData.id || userData.username)) {
          setUser(userData);
          return true;
        }
      }
      setUser(null);
      return false;
    } catch {
      setUser(null);
      return false;
    } finally {
      setCheckingAuth(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLoginSuccess = async (loggedInUser: any) => {
    if (loggedInUser && (loggedInUser.id || loggedInUser.username)) {
      setUser(loggedInUser);
    }
    await checkAuth();
  };

  const handleLogout = async () => {
    try {
      await fetch('/v1/ops/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setUser(null);
    window.location.href = '/admin/login';
  };

  if (checkingAuth) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#070d18',
        color: '#94a3b8',
        gap: '1rem',
      }}>
        <Loader2 size={32} style={{ animation: 'spinLoader 1s linear infinite', color: '#22c55e' }} />
        <span style={{ fontSize: '0.9rem', fontWeight: 600, letterSpacing: '0.02em' }}>
          Menghubungkan ke Portal IT...
        </span>
      </div>
    );
  }

  // Not authenticated: Show Login View
  if (!user) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="wgy-app-layout">
      {/* Sidebar */}
      <aside className="wgy-sidebar">
        <div className="wgy-sidebar-header">
          <img
            src="/wagyuu-logo.jpg"
            alt="WAgyuu"
            className="wgy-sidebar-logo"
          />
          <div>
            <div className="wgy-sidebar-title">WAgyuu Portal IT</div>
            <span className="wgy-badge wgy-badge-neutral" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
              PROTOTYPE
            </span>
          </div>
        </div>

        <nav className="wgy-sidebar-content">
          <div className="wgy-nav-group-title">OPERASIONAL</div>
          <button
            className={`wgy-nav-item ${activeMenu === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveMenu('summary')}
          >
            <LayoutDashboard size={16} /> Ringkasan
          </button>
          <button
            className={`wgy-nav-item ${activeMenu === 'brands' ? 'active' : ''}`}
            onClick={() => setActiveMenu('brands')}
          >
            <Layers size={16} /> Brand & Kredensial API
          </button>
          <button
            className={`wgy-nav-item ${activeMenu === 'webhooks' ? 'active' : ''}`}
            onClick={() => setActiveMenu('webhooks')}
          >
            <Send size={16} /> Webhook
          </button>

          <div className="wgy-nav-group-title">PEMANTAUAN</div>
          <button
            className={`wgy-nav-item ${activeMenu === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveMenu('logs')}
          >
            <Shield size={16} /> Log & Audit
          </button>
          <button
            className={`wgy-nav-item ${activeMenu === 'health' ? 'active' : ''}`}
            onClick={() => setActiveMenu('health')}
          >
            <Activity size={16} /> Kesehatan Sistem
          </button>

          <div className="wgy-nav-group-title">ADMINISTRASI</div>
          {user.role === 'superadmin' && (
            <button
              className={`wgy-nav-item ${activeMenu === 'users' ? 'active' : ''}`}
              onClick={() => setActiveMenu('users')}
            >
              <Users size={16} /> Pengguna IT & Akses
            </button>
          )}
          <button
            className={`wgy-nav-item ${activeMenu === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveMenu('settings')}
          >
            <Settings size={16} /> Pengaturan Infrastruktur
          </button>
          <button
            className={`wgy-nav-item ${activeMenu === 'docs' ? 'active' : ''}`}
            onClick={() => setActiveMenu('docs')}
          >
            <BookOpen size={16} /> Dokumentasi API
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="wgy-main">
        {/* Top Header */}
        <header className="wgy-header">
          <div className="wgy-header-left">
            <span style={{ fontSize: 'var(--wgy-text-sm)', color: 'var(--wgy-text-muted)' }}>
              Portal Pusat · Tim IT Operasional
            </span>
          </div>

          <div className="wgy-header-right">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <User size={16} color="var(--wgy-text-muted)" />
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                  {user.full_name || user.fullName || user.username}
                </div>
                <div style={{ fontSize: '0.7rem' }}>
                  <span className={`wgy-badge ${user.role === 'superadmin' ? 'wgy-badge-danger' : 'wgy-badge-primary'}`} style={{ padding: '0.1rem 0.35rem' }}>
                    {user.role}
                  </span>
                </div>
              </div>
            </div>

            <button
              className="wgy-btn wgy-btn-secondary wgy-btn-sm"
              onClick={handleLogout}
              title="Keluar dari sesi portal"
            >
              <LogOut size={14} /> Keluar
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="wgy-content">
          {activeMenu === 'summary' && <SummaryPanel />}
          {activeMenu === 'brands' && <BrandsPanel userRole={user.role} />}
          {activeMenu === 'webhooks' && <WebhookPanel />}
          {activeMenu === 'logs' && <AuditLogsPanel />}
          {activeMenu === 'health' && <SystemHealthPanel />}
          {activeMenu === 'users' && <UsersPanel userRole={user.role} />}
          {activeMenu === 'settings' && <SettingsPanel />}
          {activeMenu === 'docs' && <ApiDocsPanel />}
        </main>
      </div>
    </div>
  );
};
export default App;
