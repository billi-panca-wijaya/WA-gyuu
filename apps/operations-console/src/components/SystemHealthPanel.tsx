import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw, Cpu, Database, Server, Radio } from 'lucide-react';

export const SystemHealthPanel: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/v1/ops/system-health');
      if (!res.ok) throw new Error('Gagal memuat status kesehatan sistem');
      const json = await res.json();
      setHealth(json.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--wgy-space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--wgy-title)', fontWeight: 800, color: '#fff' }}>Kesehatan Sistem & Infrastruktur</h1>
          <p style={{ color: 'var(--wgy-text-muted)', fontSize: 'var(--wgy-text-sm)' }}>
            Status internal proses Node.js, memori, engine WhatsApp Baileys, dan basis data SQLite
          </p>
        </div>
        <button className="wgy-btn wgy-btn-secondary wgy-btn-sm" onClick={fetchHealth} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Segarkan
        </button>
      </div>

      {error && (
        <div className="wgy-card" style={{ borderColor: 'var(--wgy-danger-text)', color: 'var(--wgy-danger-text)' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--wgy-space-4)' }}>
        {/* Node Process */}
        <div className="wgy-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--wgy-space-2)', marginBottom: 'var(--wgy-space-4)' }}>
            <Server size={20} color="var(--wgy-primary)" />
            <h2 className="wgy-card-title">Proses Node.js Gateway</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--wgy-space-2)', fontSize: 'var(--wgy-text-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--wgy-text-muted)' }}>Versi Runtime:</span>
              <strong style={{ color: '#fff' }}>{health?.process?.node_version || '-'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--wgy-text-muted)' }}>Process ID (PID):</span>
              <code>{health?.process?.pid || '-'}</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--wgy-text-muted)' }}>Platform / Arch:</span>
              <span>{health?.process?.platform} ({health?.process?.arch})</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--wgy-text-muted)' }}>Uptime:</span>
              <span>{Math.floor((health?.process?.uptime_seconds || 0) / 60)} menit</span>
            </div>
          </div>
        </div>

        {/* Memory Usage */}
        <div className="wgy-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--wgy-space-2)', marginBottom: 'var(--wgy-space-4)' }}>
            <Cpu size={20} color="var(--wgy-info-text)" />
            <h2 className="wgy-card-title">Alokasi Memori</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--wgy-space-2)', fontSize: 'var(--wgy-text-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--wgy-text-muted)' }}>Resident Set Size (RSS):</span>
              <strong style={{ color: '#fff' }}>{health?.memory?.rss_mb || 0} MB</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--wgy-text-muted)' }}>Heap Total:</span>
              <span>{health?.memory?.heap_total_mb || 0} MB</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--wgy-text-muted)' }}>Heap Digunakan:</span>
              <span>{health?.memory?.heap_used_mb || 0} MB</span>
            </div>
          </div>
        </div>

        {/* SQLite Database */}
        <div className="wgy-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--wgy-space-2)', marginBottom: 'var(--wgy-space-4)' }}>
            <Database size={20} color="var(--wgy-warning-text)" />
            <h2 className="wgy-card-title">Penyimpanan Basis Data</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--wgy-space-2)', fontSize: 'var(--wgy-text-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--wgy-text-muted)' }}>Tipe Mesin:</span>
              <span>SQLite (TypeORM Driver)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--wgy-text-muted)' }}>Status Koneksi:</span>
              <span className={`wgy-badge ${health?.database?.status === 'healthy' ? 'wgy-badge-primary' : 'wgy-badge-danger'}`}>
                {health?.database?.status === 'healthy' ? 'Sehat (Terkoneksi)' : 'Terganggu'}
              </span>
            </div>
          </div>
        </div>

        {/* Baileys Engine */}
        <div className="wgy-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--wgy-space-2)', marginBottom: 'var(--wgy-space-4)' }}>
            <Radio size={20} color="var(--wgy-success-text)" />
            <h2 className="wgy-card-title">Mesin WhatsApp (Engine)</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--wgy-space-2)', fontSize: 'var(--wgy-text-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--wgy-text-muted)' }}>Adapter:</span>
              <strong style={{ color: '#fff' }}>Baileys Multi-Device Native</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--wgy-text-muted)' }}>Sesi Aktif Ready:</span>
              <span className="wgy-badge wgy-badge-primary">{health?.engine?.active_sessions_count || 0} Sesi</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
