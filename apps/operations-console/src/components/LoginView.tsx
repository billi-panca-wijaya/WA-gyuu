import React, { useState } from 'react';
import { AlertCircle, Lock, User, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim() || !password) {
      setError('Nama pengguna atau email dan kata sandi wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/v1/ops/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json.error?.message ||
          json.message ||
          'Kredensial tidak valid. Silakan periksa username atau password Anda.'
        );
      }

      // Support direct object, wrapped data, or nested data
      const userData =
        json.data?.user ||
        json.data?.data?.user ||
        json.data?.data ||
        json.data;

      onLoginSuccess(userData);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat masuk.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wgy-login-wrapper">
      {/* Background ambient orbs & tech grid */}
      <div className="wgy-login-grid-bg" />
      <div className="wgy-glow-orb wgy-glow-orb-1" />
      <div className="wgy-glow-orb wgy-glow-orb-2" />

      {/* Glassmorphism Pro Max Card */}
      <div className={`wgy-login-card-promax ${error ? 'wgy-error-shake' : ''}`}>
        {/* Header with Glowing Logo & Radar Ping */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div className="wgy-logo-glow-wrap">
            <div className="wgy-logo-pulse-radar" />
            <img
              src="/wagyuu-logo.jpg"
              alt="WAgyuu Logo"
              className="wgy-logo-img"
            />
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#22c55e',
              boxShadow: '0 0 10px #22c55e',
              display: 'inline-block',
            }} />
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#86efac',
            }}>
              Portal Operasional IT
            </span>
          </div>

          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '-0.025em',
            marginBottom: '0.35rem',
          }}>
            WAgyuu Central
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.5 }}>
            Masuk untuk mengelola operasional gateway, multi-brand, sesi WhatsApp, dan kredensial API.
          </p>
        </div>

        {/* Error Feedback */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            backgroundColor: 'rgba(239, 68, 68, 0.16)',
            border: '1px solid rgba(239, 68, 68, 0.45)',
            color: '#fca5a5',
            padding: '0.75rem 1rem',
            borderRadius: '0.75rem',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0, color: '#f87171' }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="wgy-form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="wgy-label" htmlFor="username" style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
              Nama Pengguna atau Email
            </label>
            <div className="wgy-input-promax-wrap">
              <input
                id="username"
                type="text"
                className="wgy-input-promax"
                placeholder="mis. admin_it"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={loading}
                autoFocus
                required
              />
              <User size={18} className="wgy-input-icon" />
            </div>
          </div>

          <div className="wgy-form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="wgy-label" htmlFor="password" style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
              Kata Sandi
            </label>
            <div className="wgy-input-promax-wrap">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="wgy-input-promax"
                placeholder="••••••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
              <Lock size={18} className="wgy-input-icon" />
              <button
                type="button"
                className="wgy-toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="wgy-btn-promax"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} style={{ animation: 'spinLoader 1s linear infinite' }} />
                <span>Memverifikasi Sesi...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                <span>Masuk Portal IT</span>
              </>
            )}
          </button>
        </form>

        {/* Security Footer Note */}
        <div style={{
          marginTop: '1.75rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          fontSize: '0.775rem',
          color: '#64748b',
        }}>
          <span>🔒 Akses terotentikasi & diaudit terpusat</span>
        </div>
      </div>
    </div>
  );
};
