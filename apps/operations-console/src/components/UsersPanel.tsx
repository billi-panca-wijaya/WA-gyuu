import React, { useEffect, useState } from 'react';
import { UserCheck, Plus, RefreshCw, Shield, AlertTriangle } from 'lucide-react';

export const UsersPanel: React.FC<{ userRole: string }> = ({ userRole }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Create User
  const [showModal, setShowModal] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'superadmin' | 'operator' | 'viewer'>('viewer');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/v1/ops/users');
      if (!res.ok) throw new Error('Gagal memuat pengguna IT');
      const json = await res.json();
      setUsers(json.data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password) return;

    setSubmitting(true);
    try {
      const res = await fetch('/v1/ops/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          fullName: fullName.trim(),
          role,
          password,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.message || 'Gagal membuat pengguna');

      setShowModal(false);
      setUsername('');
      setEmail('');
      setFullName('');
      setPassword('');
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (user: any, newRole?: string, newStatus?: string) => {
    if (!window.confirm(`Perbarui pengguna '${user.username}'?`)) return;

    try {
      const res = await fetch(`/v1/ops/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: newRole || user.role,
          status: newStatus || user.status,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Gagal memperbarui pengguna');
      fetchUsers();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const isSuperadmin = userRole === 'superadmin';

  return (
    <div>
      <div className="wgy-page-header">
        <div>
          <h1 style={{ fontSize: 'var(--wgy-title)', fontWeight: 800, color: '#fff' }}>Pengguna IT &amp; Akses</h1>
          <p style={{ color: 'var(--wgy-text-muted)', fontSize: 'var(--wgy-text-sm)' }}>
            Manajemen akun teknis portal pusat, peran RBAC (Superadmin, Operator, Viewer), dan pembatasan sesi
          </p>
        </div>
        <div className="wgy-page-header-actions">
          <button className="wgy-btn wgy-btn-secondary wgy-btn-sm" onClick={fetchUsers} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Segarkan
          </button>
          {isSuperadmin && (
            <button className="wgy-btn wgy-btn-primary wgy-btn-sm" onClick={() => setShowModal(true)}>
              <Plus size={14} /> Tambah Pengguna IT
            </button>
          )}
        </div>
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
                <th>Pengguna</th>
                <th>Email</th>
                <th>Peran (Role)</th>
                <th>Status</th>
                <th>Login Terakhir</th>
                <th>IP Login</th>
                {isSuperadmin && <th style={{ textAlign: 'right' }}>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong style={{ color: '#fff' }}>{u.username}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--wgy-text-muted)' }}>{u.fullName}</div>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    {u.role === 'superadmin' && <span className="wgy-badge wgy-badge-danger">Superadmin</span>}
                    {u.role === 'operator' && <span className="wgy-badge wgy-badge-primary">Operator</span>}
                    {u.role === 'viewer' && <span className="wgy-badge wgy-badge-neutral">Viewer</span>}
                  </td>
                  <td>
                    {u.status === 'active' ? (
                      <span className="wgy-badge wgy-badge-primary">Aktif</span>
                    ) : (
                      <span className="wgy-badge wgy-badge-danger">Ditangguhkan</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--wgy-text-muted)' }}>
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('id-ID') : 'Belum pernah'}
                  </td>
                  <td style={{ fontFamily: 'var(--wgy-font-mono)', fontSize: '0.8rem' }}>
                    {u.lastLoginIp || '-'}
                  </td>
                  {isSuperadmin && (
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                        <select
                          className="wgy-select"
                          style={{ height: '1.85rem', fontSize: '0.75rem', padding: '0 0.5rem' }}
                          value={u.role}
                          onChange={(e) => handleUpdateUser(u, e.target.value)}
                        >
                          <option value="superadmin">Superadmin</option>
                          <option value="operator">Operator</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <button
                          className={`wgy-btn wgy-btn-sm ${u.status === 'active' ? 'wgy-btn-danger' : 'wgy-btn-secondary'}`}
                          style={{ height: '1.85rem', padding: '0 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => handleUpdateUser(u, undefined, u.status === 'active' ? 'suspended' : 'active')}
                        >
                          {u.status === 'active' ? 'Suspend' : 'Aktifkan'}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add User */}
      {showModal && (
        <div className="wgy-modal-overlay">
          <div className="wgy-modal">
            <h2 className="wgy-modal-title">Tambah Pengguna IT Baru</h2>
            <form onSubmit={handleCreateUser}>
              <div className="wgy-form-group">
                <label className="wgy-label">Nama Pengguna (Username) *</label>
                <input
                  type="text"
                  className="wgy-input"
                  placeholder="mis. operator_it"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  required
                />
              </div>

              <div className="wgy-form-group">
                <label className="wgy-label">Alamat Email *</label>
                <input
                  type="email"
                  className="wgy-input"
                  placeholder="operator@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="wgy-form-group">
                <label className="wgy-label">Nama Lengkap *</label>
                <input
                  type="text"
                  className="wgy-input"
                  placeholder="Nama Lengkap Staf IT"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="wgy-form-group">
                <label className="wgy-label">Peran Hak Akses (Role)</label>
                <select
                  className="wgy-select"
                  value={role}
                  onChange={(e: any) => setRole(e.target.value)}
                >
                  <option value="viewer">Viewer (Hanya Pemantauan Tersanitasi)</option>
                  <option value="operator">Operator (Monitor & Dukungan Sender)</option>
                  <option value="superadmin">Superadmin (Administrasi Penuh & Kredensial)</option>
                </select>
              </div>

              <div className="wgy-form-group">
                <label className="wgy-label">Kata Sandi (Min. 10 Karakter) *</label>
                <input
                  type="password"
                  className="wgy-input"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={10}
                  required
                />
              </div>

              <div className="wgy-modal-actions">
                <button
                  type="button"
                  className="wgy-btn wgy-btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="wgy-btn wgy-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Menyimpan...' : 'Buat Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
