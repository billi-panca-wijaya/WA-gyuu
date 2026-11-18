import React, { useEffect, useState } from 'react';
import { Shield, RefreshCw, Filter, FileText } from 'lucide-react';

export const AuditLogsPanel: React.FC = () => {
  const [category, setCategory] = useState<'admin' | 'security' | 'api'>('admin');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/v1/ops/logs/${category}?limit=50`);
      const json = await res.json();
      setLogs(json.data?.items || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [category]);

  return (
    <div>
      <div className="wgy-page-header">
        <div>
          <h1 style={{ fontSize: 'var(--wgy-title)', fontWeight: 800, color: '#fff' }}>Log &amp; Audit Jejak Rekam</h1>
          <p style={{ color: 'var(--wgy-text-muted)', fontSize: 'var(--wgy-text-sm)' }}>
            Jejak aktivitas administratif, keamanan autentikasi, dan audit operasional gateway (tersanitasi)
          </p>
        </div>
        <div className="wgy-page-header-actions">
          <button className="wgy-btn wgy-btn-secondary wgy-btn-sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Segarkan
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--wgy-space-2)', marginBottom: 'var(--wgy-space-4)' }}>
        <button
          className={`wgy-btn wgy-btn-sm ${category === 'admin' ? 'wgy-btn-primary' : 'wgy-btn-secondary'}`}
          onClick={() => setCategory('admin')}
        >
          Aktivitas Admin
        </button>
        <button
          className={`wgy-btn wgy-btn-sm ${category === 'security' ? 'wgy-btn-primary' : 'wgy-btn-secondary'}`}
          onClick={() => setCategory('security')}
        >
          Login & Keamanan
        </button>
        <button
          className={`wgy-btn wgy-btn-sm ${category === 'api' ? 'wgy-btn-primary' : 'wgy-btn-secondary'}`}
          onClick={() => setCategory('api')}
        >
          Aktivitas API
        </button>
      </div>

      {error && (
        <div className="wgy-card" style={{ borderColor: 'var(--wgy-danger-text)', color: 'var(--wgy-danger-text)' }}>
          {error}
        </div>
      )}

      <div className="wgy-card" style={{ padding: 0 }}>
        <div className="wgy-table-wrapper">
          <table className="wgy-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Aktor</th>
                <th>Tindakan</th>
                <th>Entitas</th>
                <th>Status</th>
                <th>IP Address</th>
                <th>Detail (Sanitized)</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--wgy-text-muted)', padding: 'var(--wgy-space-6)' }}>
                    {loading ? 'Memuat log aktivitas...' : 'Belum ada log yang tercatat pada kategori ini.'}
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id}>
                    <td style={{ fontSize: '0.8rem', color: 'var(--wgy-text-muted)' }}>
                      {new Date(l.createdAt).toLocaleString('id-ID')}
                    </td>
                    <td>
                      <strong style={{ color: '#fff' }}>{l.actorUsername}</strong>
                    </td>
                    <td>
                      <code style={{ color: 'var(--wgy-info-text)' }}>{l.action}</code>
                    </td>
                    <td>
                      <span className="wgy-badge wgy-badge-neutral">{l.entityType}</span>
                    </td>
                    <td>
                      {l.status === 'success' && <span className="wgy-badge wgy-badge-primary">Berhasil</span>}
                      {l.status === 'failed' && <span className="wgy-badge wgy-badge-danger">Gagal</span>}
                      {l.status === 'denied' && <span className="wgy-badge wgy-badge-warning">Ditolak</span>}
                    </td>
                    <td style={{ fontFamily: 'var(--wgy-font-mono)', fontSize: '0.8rem' }}>{l.ipAddress}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--wgy-text-muted)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {l.details || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
