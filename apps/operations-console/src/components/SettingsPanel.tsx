import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  Cpu,
  ShieldCheck,
  Server,
  Lock,
  Network,
  Save,
  Check,
  HardDrive,
  Radio,
  Clock,
  Key,
} from 'lucide-react';
import { SpotlightCard } from './ui/SpotlightCard';
import { ShinyText } from './ui/ShinyText';

type SettingsTab = 'database' | 'engine' | 'otp' | 'portal_auth' | 'network';

export const SettingsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('database');
  const [savedNotice, setSavedNotice] = useState(false);

  // Database Form States
  const [dbType, setDbType] = useState<'sqlite' | 'mongodb' | 'postgres' | 'mysql'>('sqlite');
  const [dbHost, setDbHost] = useState('127.0.0.1');
  const [dbPort, setDbPort] = useState('27017');
  const [dbName, setDbName] = useState('wagyuu');
  const [dbUser, setDbUser] = useState('');
  const [dbPass, setDbPass] = useState('');
  const [dbUri, setDbUri] = useState('mongodb://127.0.0.1:27017/wagyuu');
  const [sqlitePath, setSqlitePath] = useState('/app/data/wagyuu.sqlite');

  // Engine States
  const [engineType, setEngineType] = useState('baileys');
  const [qrTimeout, setQrTimeout] = useState('60');
  const [maxReconnect, setMaxReconnect] = useState('5');
  const [sessionPath, setSessionPath] = useState('/app/data/sessions');
  const [messageRetention, setMessageRetention] = useState('1');

  // OTP States
  const [otpLength, setOtpLength] = useState('4');
  const [otpTtl, setOtpTtl] = useState('300');
  const [otpCooldown, setOtpCooldown] = useState('30');
  const [otpMaxAttempts, setOtpMaxAttempts] = useState('5');

  // Portal Security States
  const [idleTimeout, setIdleTimeout] = useState('15');
  const [maxSessionHours, setMaxSessionHours] = useState('8');
  const [elevateWindowMinutes, setElevateWindowMinutes] = useState('5');
  const [lockoutAttempts, setLockoutAttempts] = useState('5');

  const applySettings = (s: any) => {
    if (!s) return;
    if (s.dbType) setDbType(s.dbType);
    if (s.dbHost) setDbHost(s.dbHost);
    if (s.dbPort) setDbPort(s.dbPort);
    if (s.dbName) setDbName(s.dbName);
    if (s.dbUser !== undefined) setDbUser(s.dbUser);
    if (s.dbPass !== undefined) setDbPass(s.dbPass);
    if (s.dbUri) setDbUri(s.dbUri);
    if (s.sqlitePath) setSqlitePath(s.sqlitePath);
    if (s.engineType) setEngineType(s.engineType);
    if (s.qrTimeout) setQrTimeout(s.qrTimeout);
    if (s.maxReconnect) setMaxReconnect(s.maxReconnect);
    if (s.sessionPath) setSessionPath(s.sessionPath);
    if (s.messageRetention) setMessageRetention(s.messageRetention);
    if (s.otpLength) setOtpLength(s.otpLength);
    if (s.otpTtl) setOtpTtl(s.otpTtl);
    if (s.otpCooldown) setOtpCooldown(s.otpCooldown);
    if (s.otpMaxAttempts) setOtpMaxAttempts(s.otpMaxAttempts);
    if (s.idleTimeout) setIdleTimeout(s.idleTimeout);
    if (s.maxSessionHours) setMaxSessionHours(s.maxSessionHours);
    if (s.elevateWindowMinutes) setElevateWindowMinutes(s.elevateWindowMinutes);
    if (s.lockoutAttempts) setLockoutAttempts(s.lockoutAttempts);
  };

  useEffect(() => {
    // 1. Instant load from localStorage
    if (typeof window !== 'undefined') {
      try {
        const local = localStorage.getItem('wgy_gateway_settings');
        if (local) {
          applySettings(JSON.parse(local));
        }
      } catch {}
    }

    // 2. Fetch from backend API
    fetch('/v1/ops/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) {
          applySettings(json.data);
          if (typeof window !== 'undefined') {
            localStorage.setItem('wgy_gateway_settings', JSON.stringify(json.data));
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      dbType,
      dbHost,
      dbPort,
      dbName,
      dbUser,
      dbPass,
      dbUri,
      sqlitePath,
      engineType,
      qrTimeout,
      maxReconnect,
      sessionPath,
      messageRetention,
      otpLength,
      otpTtl,
      otpCooldown,
      otpMaxAttempts,
      idleTimeout,
      maxSessionHours,
      elevateWindowMinutes,
      lockoutAttempts,
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('wgy_gateway_settings', JSON.stringify(payload));
      window.dispatchEvent(new Event('storage'));
    }

    try {
      await fetch('/v1/ops/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // ignore
    }

    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {/* Page Title */}
      <div className="wgy-page-header">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Pengaturan &amp; Infrastruktur Gateway
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            Konfigurasi database penyimpanan (SQLite / MongoDB / PostgreSQL), engine protokol, dan kebijakan keamanan
          </p>
        </div>

        {savedNotice && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            backgroundColor: 'rgba(34, 197, 94, 0.2)',
            border: '1px solid #22c55e',
            color: '#86efac',
            fontSize: '0.85rem',
            fontWeight: 700,
          }}>
            <Check size={16} /> Pengaturan Berhasil Disimpan
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="wgy-tabs-nav">
        <button
          onClick={() => setActiveTab('database')}
          className={`wgy-btn wgy-btn-sm wgy-tab-btn ${activeTab === 'database' ? 'wgy-btn-primary' : 'wgy-btn-secondary'}`}
        >
          <Database size={15} /> Database &amp; Penyimpanan
        </button>

        <button
          onClick={() => setActiveTab('engine')}
          className={`wgy-btn wgy-btn-sm wgy-tab-btn ${activeTab === 'engine' ? 'wgy-btn-primary' : 'wgy-btn-secondary'}`}
        >
          <Cpu size={15} /> WhatsApp Engine
        </button>

        <button
          onClick={() => setActiveTab('otp')}
          className={`wgy-btn wgy-btn-sm wgy-tab-btn ${activeTab === 'otp' ? 'wgy-btn-primary' : 'wgy-btn-secondary'}`}
        >
          <Key size={15} /> Parameter Keamanan OTP
        </button>

        <button
          onClick={() => setActiveTab('portal_auth')}
          className={`wgy-btn wgy-btn-sm wgy-tab-btn ${activeTab === 'portal_auth' ? 'wgy-btn-primary' : 'wgy-btn-secondary'}`}
        >
          <Lock size={15} /> Sesi IT &amp; Autentikasi
        </button>

        <button
          onClick={() => setActiveTab('network')}
          className={`wgy-btn wgy-btn-sm wgy-tab-btn ${activeTab === 'network' ? 'wgy-btn-primary' : 'wgy-btn-secondary'}`}
        >
          <Network size={15} /> Jaringan &amp; Logging
        </button>
      </div>

      <form onSubmit={handleSave}>
        <AnimatePresence mode="wait">
          {/* TAB 1: DATABASE & PENYIMPANAN */}
          {activeTab === 'database' && (
            <motion.div
              key="tab-database"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <SpotlightCard spotlightColor="rgba(59, 130, 246, 0.12)" style={{ marginBottom: '1.5rem' }}>
                <div style={{ padding: '1.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <Database size={22} color="#60a5fa" />
                      <div>
                        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                          Konfigurasi Pangkalan Data (Database Storage)
                        </h2>
                        <p style={{ fontSize: '0.825rem', color: '#94a3b8' }}>
                          Tentukan driver database utama gateway untuk audit log, sesi, dan transaksi
                        </p>
                      </div>
                    </div>

                    <span className="wgy-badge wgy-badge-primary">
                      Status: Terhubung ({dbType.toUpperCase()})
                    </span>
                  </div>

                  {/* Driver Selector */}
                  <div className="wgy-form-group">
                    <label className="wgy-label">Tipe Driver Database</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                      {[
                        { id: 'sqlite', name: 'SQLite', desc: 'Bawaan VPS Standalone (File)' },
                        { id: 'mongodb', name: 'MongoDB', desc: 'NoSQL Document Store (Web Asli)' },
                        { id: 'postgres', name: 'PostgreSQL', desc: 'Enterprise Relational DB' },
                        { id: 'mysql', name: 'MySQL', desc: 'Relational DB Host' },
                      ].map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setDbType(item.id as any)}
                          style={{
                            padding: '1rem',
                            borderRadius: '0.75rem',
                            border: `2px solid ${dbType === item.id ? '#22c55e' : 'rgba(255, 255, 255, 0.08)'}`,
                            backgroundColor: dbType === item.id ? 'rgba(34, 197, 94, 0.12)' : 'rgba(11, 18, 32, 0.65)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          <div style={{ fontWeight: 800, color: dbType === item.id ? '#4ade80' : '#fff', fontSize: '0.95rem' }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                            {item.desc}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Conditional inputs */}
                  {dbType === 'sqlite' ? (
                    <div className="wgy-form-group">
                      <label className="wgy-label">Jalur Berkas SQLite (File Path)</label>
                      <input
                        type="text"
                        className="wgy-input"
                        value={sqlitePath}
                        onChange={(e) => setSqlitePath(e.target.value)}
                        placeholder="/app/data/wagyuu.sqlite"
                      />
                      <div className="wgy-help-text">
                        Lokasi berkas SQLite pada direktori volume Docker. Data tersimpan persisten di VPS.
                      </div>
                    </div>
                  ) : dbType === 'mongodb' ? (
                    <div>
                      <div className="wgy-form-group">
                        <label className="wgy-label">MongoDB Connection URI</label>
                        <input
                          type="text"
                          className="wgy-input"
                          value={dbUri}
                          onChange={(e) => setDbUri(e.target.value)}
                          placeholder="mongodb://127.0.0.1:27017/wagyuu"
                        />
                        <div className="wgy-help-text">
                          Mendukung URI MongoDB standar atau Atlas (mis. <code>mongodb+srv://...</code>).
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <div className="wgy-form-group">
                        <label className="wgy-label">Host Database</label>
                        <input
                          type="text"
                          className="wgy-input"
                          value={dbHost}
                          onChange={(e) => setDbHost(e.target.value)}
                        />
                      </div>
                      <div className="wgy-form-group">
                        <label className="wgy-label">Port</label>
                        <input
                          type="text"
                          className="wgy-input"
                          value={dbPort}
                          onChange={(e) => setDbPort(e.target.value)}
                        />
                      </div>
                      <div className="wgy-form-group">
                        <label className="wgy-label">Nama Database</label>
                        <input
                          type="text"
                          className="wgy-input"
                          value={dbName}
                          onChange={(e) => setDbName(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </SpotlightCard>
            </motion.div>
          )}

          {/* TAB 2: WHATSAPP ENGINE */}
          {activeTab === 'engine' && (
            <motion.div
              key="tab-engine"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <SpotlightCard spotlightColor="rgba(34, 197, 94, 0.12)" style={{ marginBottom: '1.5rem' }}>
                <div style={{ padding: '1.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
                    <Cpu size={22} color="#22c55e" />
                    <div>
                      <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                        Engine Protokol WhatsApp
                      </h2>
                      <p style={{ fontSize: '0.825rem', color: '#94a3b8' }}>
                        Pilihan engine koneksi WhatsApp multi-device (Baileys vs Chromium Puppeteer)
                      </p>
                    </div>
                  </div>

                  <div className="wgy-form-group">
                    <label className="wgy-label">Tipe Engine</label>
                    <select
                      className="wgy-select"
                      value={engineType}
                      onChange={(e) => setEngineType(e.target.value)}
                    >
                      <option value="baileys">Baileys (WebSockets Multi-Device - Rekomendasi, Hemat RAM &lt; 50MB)</option>
                      <option value="whatsapp-web.js">whatsapp-web.js (Headless Chromium - Membutuhkan RAM &gt; 1GB)</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div className="wgy-form-group">
                      <label className="wgy-label">Batas Waktu QR (Detik)</label>
                      <input
                        type="number"
                        className="wgy-input"
                        value={qrTimeout}
                        onChange={(e) => setQrTimeout(e.target.value)}
                      />
                    </div>
                    <div className="wgy-form-group">
                      <label className="wgy-label">Maksimal Percobaan Sambung Ulang</label>
                      <input
                        type="number"
                        className="wgy-input"
                        value={maxReconnect}
                        onChange={(e) => setMaxReconnect(e.target.value)}
                      />
                    </div>
                    <div className="wgy-form-group">
                      <label className="wgy-label">Retensi Riwayat Pesan (Hari)</label>
                      <input
                        type="number"
                        className="wgy-input"
                        value={messageRetention}
                        onChange={(e) => setMessageRetention(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="wgy-form-group">
                    <label className="wgy-label">Direktori Kredensial Sesi (Sessions Path)</label>
                    <input
                      type="text"
                      className="wgy-input"
                      value={sessionPath}
                      onChange={(e) => setSessionPath(e.target.value)}
                    />
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>
          )}

          {/* TAB 3: OTP PARAMETERS */}
          {activeTab === 'otp' && (
            <motion.div
              key="tab-otp"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <SpotlightCard spotlightColor="rgba(252, 211, 77, 0.12)" style={{ marginBottom: '1.5rem' }}>
                <div style={{ padding: '1.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
                    <Key size={22} color="#fde047" />
                    <div>
                      <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                        Parameter Keamanan Kode OTP
                      </h2>
                      <p style={{ fontSize: '0.825rem', color: '#94a3b8' }}>
                        Standar penerbitan kode verifikasi passwordless 4-digit numerik melalui WhatsApp
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div className="wgy-form-group">
                      <label className="wgy-label">Panjang Digit Kode</label>
                      <input
                        type="text"
                        className="wgy-input"
                        value={otpLength + ' Digit (Numerik 0000-9999)'}
                        disabled
                      />
                      <div className="wgy-help-text">Sesuai standar login WhatsApp: strictly 4 digit.</div>
                    </div>

                    <div className="wgy-form-group">
                      <label className="wgy-label">Masa Berlaku Kode (TTL - Detik)</label>
                      <input
                        type="number"
                        className="wgy-input"
                        value={otpTtl}
                        onChange={(e) => setOtpTtl(e.target.value)}
                      />
                      <div className="wgy-help-text">Default 300 detik (5 menit).</div>
                    </div>

                    <div className="wgy-form-group">
                      <label className="wgy-label">Jeda Kirim Ulang (Cooldown - Detik)</label>
                      <input
                        type="number"
                        className="wgy-input"
                        value={otpCooldown}
                        onChange={(e) => setOtpCooldown(e.target.value)}
                      />
                      <div className="wgy-help-text">Mencegah spam permintaan OTP.</div>
                    </div>

                    <div className="wgy-form-group">
                      <label className="wgy-label">Batas Maksimal Percobaan Salah</label>
                      <input
                        type="number"
                        className="wgy-input"
                        value={otpMaxAttempts}
                        onChange={(e) => setOtpMaxAttempts(e.target.value)}
                      />
                      <div className="wgy-help-text">Setelah 5 kali salah, challenge dibatalkan.</div>
                    </div>
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>
          )}

          {/* TAB 4: PORTAL AUTH & SESSIONS */}
          {activeTab === 'portal_auth' && (
            <motion.div
              key="tab-auth"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <SpotlightCard spotlightColor="rgba(239, 68, 68, 0.12)" style={{ marginBottom: '1.5rem' }}>
                <div style={{ padding: '1.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
                    <Lock size={22} color="#f87171" />
                    <div>
                      <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                        Kebijakan Sesi &amp; Keamanan Portal IT
                      </h2>
                      <p style={{ fontSize: '0.825rem', color: '#94a3b8' }}>
                        Pengaturan batas sesi staf IT, jendela re-autentikasi, dan proteksi akun superadmin
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div className="wgy-form-group">
                      <label className="wgy-label">Idle Session Timeout (Menit)</label>
                      <input
                        type="number"
                        className="wgy-input"
                        value={idleTimeout}
                        onChange={(e) => setIdleTimeout(e.target.value)}
                      />
                      <div className="wgy-help-text">Sesi otomatis keluar jika tidak aktif.</div>
                    </div>

                    <div className="wgy-form-group">
                      <label className="wgy-label">Batas Sesi Absolut (Jam)</label>
                      <input
                        type="number"
                        className="wgy-input"
                        value={maxSessionHours}
                        onChange={(e) => setMaxSessionHours(e.target.value)}
                      />
                      <div className="wgy-help-text">Wajib login ulang setelah 8 jam.</div>
                    </div>

                    <div className="wgy-form-group">
                      <label className="wgy-label">Jendela Re-autentikasi (Menit)</label>
                      <input
                        type="number"
                        className="wgy-input"
                        value={elevateWindowMinutes}
                        onChange={(e) => setElevateWindowMinutes(e.target.value)}
                      />
                      <div className="wgy-help-text">Untuk aksi sensitif (rotasi/cabut key).</div>
                    </div>

                    <div className="wgy-form-group">
                      <label className="wgy-label">Lockout Percobaan Gagal (Kali)</label>
                      <input
                        type="number"
                        className="wgy-input"
                        value={lockoutAttempts}
                        onChange={(e) => setLockoutAttempts(e.target.value)}
                      />
                      <div className="wgy-help-text">Kunci akun 15 menit jika 5x salah sandi.</div>
                    </div>
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>
          )}

          {/* TAB 5: NETWORK & LOGGING */}
          {activeTab === 'network' && (
            <motion.div
              key="tab-net"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <SpotlightCard spotlightColor="rgba(168, 85, 247, 0.12)" style={{ marginBottom: '1.5rem' }}>
                <div style={{ padding: '1.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
                    <Network size={22} color="#c084fc" />
                    <div>
                      <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                        Jaringan, Reverse Proxy &amp; Logging
                      </h2>
                      <p style={{ fontSize: '0.825rem', color: '#94a3b8' }}>
                        Parameter port kontainer, integrasi reverse proxy aaPanel, dan level log operasional
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div className="wgy-form-group">
                      <label className="wgy-label">Port Loopback Host</label>
                      <input
                        type="text"
                        className="wgy-input"
                        value="18091 (127.0.0.1:18091)"
                        disabled
                      />
                    </div>

                    <div className="wgy-form-group">
                      <label className="wgy-label">Domain Publik TLS / SSL</label>
                      <input
                        type="text"
                        className="wgy-input"
                        value="https://wa-api.billi-panca-wijaya.my.id"
                        disabled
                      />
                    </div>

                    <div className="wgy-form-group">
                      <label className="wgy-label">Level Logging</label>
                      <select className="wgy-select" defaultValue="info">
                        <option value="info">Info (Rekomendasi Produksi)</option>
                        <option value="warn">Warn (Hanya Peringatan &amp; Error)</option>
                        <option value="debug">Debug (Verbose Diagnostik)</option>
                      </select>
                    </div>

                    <div className="wgy-form-group">
                      <label className="wgy-label">Format Signature Webhook</label>
                      <input
                        type="text"
                        className="wgy-input"
                        value="HMAC-SHA256 (Header: X-WAgyuu-Signature)"
                        disabled
                      />
                    </div>
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Save Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="submit"
            className="wgy-btn wgy-btn-primary"
            style={{ borderRadius: '0.625rem', padding: '0.65rem 1.75rem', fontWeight: 700 }}
          >
            <Save size={16} /> Simpan Pengaturan
          </button>
        </div>
      </form>
    </motion.div>
  );
};
