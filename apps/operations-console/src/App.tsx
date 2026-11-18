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
  Menu,
  X,
  ChevronUp,
  ChevronDown,
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
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '') as ActiveMenu;
      const validMenus: ActiveMenu[] = ['summary', 'brands', 'webhooks', 'logs', 'health', 'users', 'settings', 'docs'];
      if (validMenus.includes(hash)) return hash;
      const saved = localStorage.getItem('wgy_active_menu') as ActiveMenu;
      if (saved && validMenus.includes(saved)) return saved;
    }
    return 'summary';
  });
  const [isMobile, setIsMobile] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth <= 860 : false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth > 860 : true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('wgy_active_menu', activeMenu);
      window.location.hash = activeMenu;
    }
  }, [activeMenu]);

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

    const handleResize = () => {
      const mobile = window.innerWidth <= 860;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavClick = (menu: ActiveMenu) => {
    setActiveMenu(menu);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

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
      {/* Mobile Backdrop Overlay */}
      {isMobile && (
        <div
          className={`wgy-sidebar-backdrop ${sidebarOpen ? 'active' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar with Desktop Collapse & Mobile Drawer Animation */}
      <aside className={`wgy-sidebar ${sidebarOpen ? 'open' : isMobile ? 'closed' : 'collapsed'}`}>
        <div className="wgy-sidebar-header">
          <img
            src="/wagyuu-logo.jpg"
            alt="WAgyuu"
            className="wgy-sidebar-logo"
          />
          <div>
            <div className="wgy-sidebar-title">WAgyuu Portal</div>
            <span className="wgy-badge wgy-badge-neutral" style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem' }}>
              PROTOTYPE
            </span>
          </div>
          {isMobile && (
            <button
              className="wgy-burger-btn"
              onClick={() => setSidebarOpen(false)}
              style={{ marginLeft: 'auto', width: '2rem', height: '2rem' }}
              title="Tutup Menu"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <nav className="wgy-sidebar-content">
          <div className="wgy-nav-group-title">OPERASIONAL</div>
          <button
            className={`wgy-nav-item ${activeMenu === 'summary' ? 'active' : ''}`}
            onClick={() => handleNavClick('summary')}
          >
            <LayoutDashboard size={16} /> Ringkasan
          </button>
          <button
            className={`wgy-nav-item ${activeMenu === 'brands' ? 'active' : ''}`}
            onClick={() => handleNavClick('brands')}
          >
            <Layers size={16} /> Brand & Kredensial API
          </button>
          <button
            className={`wgy-nav-item ${activeMenu === 'webhooks' ? 'active' : ''}`}
            onClick={() => handleNavClick('webhooks')}
          >
            <Send size={16} /> Webhook
          </button>

          <div className="wgy-nav-group-title">PEMANTAUAN</div>
          <button
            className={`wgy-nav-item ${activeMenu === 'logs' ? 'active' : ''}`}
            onClick={() => handleNavClick('logs')}
          >
            <Shield size={16} /> Log & Audit
          </button>
          <button
            className={`wgy-nav-item ${activeMenu === 'health' ? 'active' : ''}`}
            onClick={() => handleNavClick('health')}
          >
            <Activity size={16} /> Kesehatan Sistem
          </button>

          <div className="wgy-nav-group-title">ADMINISTRASI</div>
          {user.role === 'superadmin' && (
            <button
              className={`wgy-nav-item ${activeMenu === 'users' ? 'active' : ''}`}
              onClick={() => handleNavClick('users')}
            >
              <Users size={16} /> Pengguna IT & Akses
            </button>
          )}
          <button
            className={`wgy-nav-item ${activeMenu === 'settings' ? 'active' : ''}`}
            onClick={() => handleNavClick('settings')}
          >
            <Settings size={16} /> Pengaturan Infrastruktur
          </button>
          <button
            className={`wgy-nav-item ${activeMenu === 'docs' ? 'active' : ''}`}
            onClick={() => handleNavClick('docs')}
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
            <button
              className="wgy-burger-btn"
              onClick={() => setSidebarOpen(prev => !prev)}
              aria-label="Toggle Menu"
              title={sidebarOpen ? "Sembunyikan Menu" : "Tampilkan Menu"}
            >
              <Menu size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0, overflow: 'hidden' }}>
              <img
                src="/wagyuu-logo.jpg"
                alt="WAgyuu"
                style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0 }}
              />
              <span className="wgy-header-brand-title" style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                WAgyuu Portal
              </span>
              <span className="wgy-badge wgy-badge-neutral wgy-header-prototype-badge" style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem', flexShrink: 0 }}>
                PROTOTYPE
              </span>
            </div>
          </div>

          <div className="wgy-header-right">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
              <div className="wgy-header-user-icon" style={{ display: 'flex', alignItems: 'center' }}>
                <User size={16} color="var(--wgy-text-muted)" />
              </div>
              <div style={{ textAlign: 'right', minWidth: 0, overflow: 'hidden' }}>
                <div className="wgy-header-username" style={{ fontSize: '0.825rem', fontWeight: 700, color: '#fff' }}>
                  {user.full_name || user.fullName || user.username}
                </div>
                <div>
                  <span className={`wgy-badge wgy-header-role-badge ${user.role === 'superadmin' ? 'wgy-badge-danger' : 'wgy-badge-primary'}`} style={{ padding: '0.05rem 0.35rem', whiteSpace: 'nowrap' }}>
                    {user.role}
                  </span>
                </div>
              </div>
            </div>

            <button
              className="wgy-btn wgy-btn-secondary wgy-btn-sm wgy-header-logout-btn"
              onClick={handleLogout}
              title="Keluar dari sesi portal"
            >
              <LogOut size={14} />
              <span className="wgy-logout-text">Keluar</span>
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

        {/* Sticky Scroll-to-Top and Scroll-to-Bottom Floating Buttons */}
        <div className="wgy-scroll-fab-container">
          <button
            className="wgy-scroll-fab"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            title="Scroll ke Paling Atas"
            aria-label="Scroll ke Atas"
          >
            <ChevronUp size={18} />
          </button>
          <button
            className="wgy-scroll-fab"
            onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })}
            title="Scroll ke Paling Bawah"
            aria-label="Scroll ke Bawah"
          >
            <ChevronDown size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
export default App;
