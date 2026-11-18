import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Key,
  Globe,
  Trash2,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
  RotateCw,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { SpotlightCard } from './ui/SpotlightCard';
import { ShinyText } from './ui/ShinyText';

interface BrandsPanelProps {
  userRole?: string;
}

export const BrandsPanel: React.FC<BrandsPanelProps> = ({ userRole = 'viewer' }) => {
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBrand, setNewBrand] = useState({
    code: '',
    name: '',
    domain: '',
    environment: 'production',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [revealedKey, setRevealedKey] = useState<any | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Rotation & Delete states
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchBrands = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/v1/ops/brands');
      if (!res.ok) throw new Error('Gagal mengambil daftar brand');
      const json = await res.json();
      setBrands(json.data?.data || json.data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrand.name.trim() || !newBrand.code.trim()) {
      alert('Nama brand dan kode wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/v1/ops/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBrand),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.message || 'Gagal membuat brand');

      const created = json.data?.data || json.data;
      if (created.initial_api_key) {
        setRevealedKey(created.initial_api_key);
      } else {
        setShowAddModal(false);
        fetchBrands();
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (brand: any) => {
    const action = brand.enabled ? 'pause' : 'resume';
    if (!confirm(`Apakah Anda yakin ingin ${brand.enabled ? 'menjeda' : 'mengaktifkan kembali'} brand ${brand.name}?`)) {
      return;
    }
    setActionLoading(brand.id);
    try {
      const res = await fetch(`/v1/ops/brands/${brand.id}/${action}`, { method: 'POST' });
      if (!res.ok) throw new Error('Gagal mengubah status brand');
      await fetchBrands();
    } catch (e: any) {
      alert(`Gagal: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteBrand = async (brand: any) => {
    if (!confirm(`PERINGATAN: Hapus brand "${brand.name}" beserta seluruh kredensial API-nya? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    setActionLoading(brand.id);
    try {
      const res = await fetch(`/v1/ops/brands/${brand.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus brand');
      await fetchBrands();
    } catch (e: any) {
      alert(`Gagal: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRotateKey = async (keyId: string, brandName: string) => {
    if (!confirm(`Rotasi kredensial API untuk brand ${brandName}? Kredensial baru akan diterbitkan dengan grace period 15 menit.`)) {
      return;
    }
    try {
      const res = await fetch(`/v1/ops/api-keys/${keyId}/rotate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grace_period_minutes: 15 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.message || 'Gagal merotasi key');
      const rotated = json.data?.data || json.data;
      if (rotated.new_key) {
        setRevealedKey(rotated.new_key);
        setShowAddModal(true);
      }
      await fetchBrands();
    } catch (e: any) {
      alert(`Gagal rotasi: ${e.message}`);
    }
  };

  const copyText = (text: string, id?: string) => {
    navigator.clipboard.writeText(text);
    if (id) {
      setCopiedKeyId(id);
      setTimeout(() => setCopiedKeyId(null), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Brand &amp; Kredensial API
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            Kelola aplikasi web brand terintegrasi dan penerbitan API key otomatis dalam satu langkah terpadu
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className="wgy-btn wgy-btn-secondary wgy-btn-sm"
            onClick={fetchBrands}
            disabled={loading}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spinLoader 1s linear infinite' : 'none' }} />
            <span>Segarkan</span>
          </button>

          {userRole === 'superadmin' && (
            <button
              className="wgy-btn wgy-btn-primary"
              onClick={() => {
                setRevealedKey(null);
                setNewBrand({ code: '', name: '', domain: '', environment: 'production', notes: '' });
                setShowAddModal(true);
              }}
              style={{
                borderRadius: '0.625rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)',
              }}
            >
              <Plus size={16} />
              <span>Tambah Brand &amp; Buat API Key</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="wgy-card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#fca5a5', backgroundColor: 'rgba(239, 68, 68, 0.1)', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Brand Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#94a3b8' }}>
          <RefreshCw size={24} style={{ animation: 'spinLoader 1s linear infinite', margin: '0 auto 0.75rem' }} />
          <div>Memuat data brand...</div>
        </div>
      ) : brands.length === 0 ? (
        /* Clean Empty State */
        <SpotlightCard spotlightColor="rgba(34, 197, 94, 0.1)">
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              color: '#4ade80',
            }}>
              <Layers size={32} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
              Belum Ada Brand Terdaftar
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', maxWidth: '440px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
              Pangkalan data saat ini dalam kondisi bersih (0 brand). Klik tombol di bawah untuk mendaftarkan aplikasi web brand Anda dan menerbitkan kredensial API otomatis.
            </p>
            {userRole === 'superadmin' && (
              <button
                className="wgy-btn wgy-btn-primary"
                onClick={() => {
                  setRevealedKey(null);
                  setNewBrand({ code: '', name: '', domain: '', environment: 'production', notes: '' });
                  setShowAddModal(true);
                }}
                style={{ borderRadius: '0.5rem', padding: '0.6rem 1.25rem', fontWeight: 700 }}
              >
                <Plus size={16} /> Tambah Brand Sekarang
              </button>
            )}
          </div>
        </SpotlightCard>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '1.25rem' }}>
          {brands.map((b) => (
            <SpotlightCard key={b.id} spotlightColor="rgba(34, 197, 94, 0.12)">
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                <div>
                  {/* Brand Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
                          {b.name}
                        </h3>
                        <span className={`wgy-badge ${b.enabled ? 'wgy-badge-primary' : 'wgy-badge-warning'}`}>
                          {b.enabled ? 'Aktif' : 'Dijeda'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#4ade80', backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '0.25rem' }}>
                          {b.code}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Lingkungan: {b.environment || 'production'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    {userRole === 'superadmin' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <button
                          className="wgy-btn wgy-btn-secondary wgy-btn-sm"
                          onClick={() => handleToggleStatus(b)}
                          title={b.enabled ? 'Jeda Brand' : 'Aktifkan Brand'}
                          disabled={actionLoading === b.id}
                          style={{ padding: '0.35rem' }}
                        >
                          {b.enabled ? <PauseCircle size={15} color="#fde047" /> : <PlayCircle size={15} color="#4ade80" />}
                        </button>
                        <button
                          className="wgy-btn wgy-btn-danger wgy-btn-sm"
                          onClick={() => handleDeleteBrand(b)}
                          title="Hapus Brand"
                          disabled={actionLoading === b.id}
                          style={{ padding: '0.35rem' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Metadata */}
                  {b.domain && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>
                      <Globe size={14} />
                      <a href={b.domain.startsWith('http') ? b.domain : `https://${b.domain}`} target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>
                        {b.domain}
                      </a>
                    </div>
                  )}

                  {/* API Key Box */}
                  <div style={{
                    marginTop: '1rem',
                    padding: '0.85rem',
                    backgroundColor: 'rgba(9, 14, 26, 0.7)',
                    borderRadius: '0.625rem',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.775rem', fontWeight: 700, color: '#cbd5e1' }}>
                        <Key size={13} color="#22c55e" />
                        <span>Kredensial API Brand</span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {b.keys?.length || 0} Key Aktif
                      </span>
                    </div>

                    {b.keys && b.keys.length > 0 ? (
                      b.keys.map((k: any) => (
                        <div key={k.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.35rem' }}>
                          <span style={{ fontSize: '0.775rem', fontFamily: 'monospace', color: '#86efac', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {k.key_id}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button
                              onClick={() => copyText(k.key_id, k.id)}
                              className="wgy-btn wgy-btn-secondary wgy-btn-sm"
                              title="Salin Key ID"
                              style={{ height: '1.75rem', padding: '0 0.5rem', fontSize: '0.7rem' }}
                            >
                              {copiedKeyId === k.id ? <Check size={12} color="#4ade80" /> : <Copy size={12} />}
                            </button>
                            {userRole === 'superadmin' && (
                              <button
                                onClick={() => handleRotateKey(k.id, b.name)}
                                className="wgy-btn wgy-btn-secondary wgy-btn-sm"
                                title="Rotasi Kredensial (Grace period 15m)"
                                style={{ height: '1.75rem', padding: '0 0.5rem', fontSize: '0.7rem' }}
                              >
                                <RotateCw size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Belum ada key aktif
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer notes */}
                <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Dibuat: {new Date(b.created_at).toLocaleDateString('id-ID')}</span>
                  <span>Auth: Header X-API-Key</span>
                </div>
              </div>
            </SpotlightCard>
          ))}
        </div>
      )}

      {/* Unified Add Brand & Reveal Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="wgy-modal-overlay">
            <motion.div
              className="wgy-modal"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25 }}
              style={{ maxWidth: '520px', borderRadius: '1.25rem', border: '1px solid rgba(255, 255, 255, 0.12)' }}
            >
              {revealedKey ? (
                /* Secret Reveal State */
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(34, 197, 94, 0.15)',
                      border: '2px solid #22c55e',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 1rem',
                      color: '#4ade80',
                    }}>
                      <ShieldCheck size={28} />
                    </div>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', marginBottom: '0.35rem' }}>
                      <ShinyText text="Brand &amp; Kredensial Berhasil Dibuat!" shimmerColor="#4ade80" />
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                      Kredensial API telah diterbitkan secara otomatis untuk integrasi aplikasi web Anda.
                    </p>
                  </div>

                  <div style={{
                    padding: '1rem',
                    backgroundColor: 'rgba(9, 14, 26, 0.85)',
                    borderRadius: '0.75rem',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    marginBottom: '1.25rem',
                  }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                      Key ID (Pengenal Kredensial):
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#e2e8f0', marginBottom: '0.85rem', userSelect: 'all' }}>
                      {revealedKey.key_id}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                      Token Rahasia API (Raw Secret Token):
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(34, 197, 94, 0.2)',
                    }}>
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: '0.825rem',
                        color: '#86efac',
                        wordBreak: 'break-all',
                        userSelect: 'all',
                      }}>
                        {revealedKey.secret_token}
                      </span>
                      <button
                        className="wgy-btn wgy-btn-primary wgy-btn-sm"
                        onClick={() => copyText(revealedKey.secret_token)}
                        style={{ height: '2rem', padding: '0 0.75rem', borderRadius: '0.375rem', flexShrink: 0, marginLeft: '0.5rem' }}
                      >
                        {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                        <span style={{ marginLeft: '0.3rem' }}>{copiedKey ? 'Disalin' : 'Salin'}</span>
                      </button>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    backgroundColor: 'rgba(252, 211, 77, 0.1)',
                    border: '1px solid rgba(252, 211, 77, 0.3)',
                    borderRadius: '0.5rem',
                    color: '#fef08a',
                    fontSize: '0.8rem',
                    marginBottom: '1.5rem',
                  }}>
                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                    <span>
                      <strong>PENTING:</strong> Token rahasia ini hanya ditampilkan <strong>SEKALI INI</strong>. Salin dan simpan ke file <code>.env</code> aplikasi web Anda (<code>WA_GATEWAY_API_KEY</code>).
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <button
                      className="wgy-btn wgy-btn-primary"
                      onClick={() => {
                        setRevealedKey(null);
                        setShowAddModal(false);
                        fetchBrands();
                      }}
                      style={{ borderRadius: '0.5rem', width: '100%', fontWeight: 700 }}
                    >
                      Selesai &amp; Tutup
                    </button>
                  </div>
                </div>
              ) : (
                /* Create Brand Form */
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>
                    Tambah Brand &amp; Buat Kredensial API
                  </h2>
                  <p style={{ fontSize: '0.825rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
                    Mendaftarkan aplikasi web baru dan secara otomatis menerbitkan satu API Key siap pakai.
                  </p>

                  <form onSubmit={handleCreateBrand}>
                    <div className="wgy-form-group">
                      <label className="wgy-label">Nama Brand</label>
                      <input
                        type="text"
                        className="wgy-input"
                        placeholder="mis. INTERWIN atau WARUNGWOWO"
                        value={newBrand.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewBrand({
                            ...newBrand,
                            name: val,
                            // Auto-generate clean slug if not manually touched
                            code: newBrand.code || val.toLowerCase().replace(/[^a-z0-9]/g, ''),
                          });
                        }}
                        required
                      />
                    </div>

                    <div className="wgy-form-group">
                      <label className="wgy-label">Kode Slug Brand (Unik, huruf kecil tanpa spasi)</label>
                      <input
                        type="text"
                        className="wgy-input"
                        placeholder="mis. interwin"
                        value={newBrand.code}
                        onChange={(e) => setNewBrand({ ...newBrand, code: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                        required
                      />
                    </div>

                    <div className="wgy-form-group">
                      <label className="wgy-label">Domain Web Aplikasi (Opsional)</label>
                      <input
                        type="text"
                        className="wgy-input"
                        placeholder="mis. interwin.com atau https://warungwowo.shop"
                        value={newBrand.domain}
                        onChange={(e) => setNewBrand({ ...newBrand, domain: e.target.value })}
                      />
                    </div>

                    <div className="wgy-form-group">
                      <label className="wgy-label">Lingkungan Deployment</label>
                      <select
                        className="wgy-select"
                        value={newBrand.environment}
                        onChange={(e) => setNewBrand({ ...newBrand, environment: e.target.value })}
                      >
                        <option value="production">Production (Operasional Live)</option>
                        <option value="staging">Staging (Uji Coba)</option>
                        <option value="development">Development (Pengembangan)</option>
                      </select>
                    </div>

                    <div className="wgy-form-group">
                      <label className="wgy-label">Catatan Operasional (Opsional)</label>
                      <textarea
                        className="wgy-textarea"
                        rows={2}
                        placeholder="Catatan tim IT untuk brand ini..."
                        value={newBrand.notes}
                        onChange={(e) => setNewBrand({ ...newBrand, notes: e.target.value })}
                      />
                    </div>

                    <div className="wgy-modal-actions" style={{ marginTop: '1.5rem' }}>
                      <button
                        type="button"
                        className="wgy-btn wgy-btn-secondary"
                        onClick={() => setShowAddModal(false)}
                        disabled={submitting}
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="wgy-btn wgy-btn-primary"
                        disabled={submitting}
                        style={{ fontWeight: 700 }}
                      >
                        {submitting ? 'Membuat Brand & Key...' : 'Simpan & Terbitkan Key'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
