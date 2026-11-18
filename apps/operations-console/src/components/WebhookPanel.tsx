import React from 'react';
import { motion } from 'framer-motion';
import { Send, ShieldCheck, Plus } from 'lucide-react';
import { SpotlightCard } from './ui/SpotlightCard';

export const WebhookPanel: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className="wgy-page-header">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Webhook &amp; Integrasi Event
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            Konfigurasi pengiriman notifikasi pengiriman pesan dan status OTP secara asinkron ke endpoint brand
          </p>
        </div>
      </div>

      {/* Clean Empty State */}
      <SpotlightCard spotlightColor="rgba(59, 130, 246, 0.12)" style={{ marginBottom: '1.5rem' }}>
        <div style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            color: '#60a5fa',
          }}>
            <Send size={28} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
            Belum Ada Webhook Dikonfigurasi
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', maxWidth: '460px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
            Isian webhook saat ini dikosongkan. Webhook dapat diatur per-brand ketika aplikasi web Anda membutuhkan notifikasi tanda centang (delivery receipt) atau callback pengiriman otomatis.
          </p>
        </div>
      </SpotlightCard>

      {/* SSRF & Security Specification */}
      <SpotlightCard spotlightColor="rgba(34, 197, 94, 0.08)">
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
            <ShieldCheck size={20} color="#22c55e" />
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>
              Keamanan &amp; Proteksi Anti-SSRF Webhook
            </h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6 }}>
            Setiap webhook akan diverifikasi secara kriptografis menggunakan algoritma HMAC-SHA256 dengan signature pada header <code style={{ color: '#86efac' }}>X-WAgyuu-Signature</code>. Gateway secara ketat memblokir percobaan pengiriman callback ke alamat loopback internal (<code>127.0.0.1</code>, <code>localhost</code>) atau subnet privat guna mencegah kerentanan Server-Side Request Forgery (SSRF).
          </p>
        </div>
      </SpotlightCard>
    </motion.div>
  );
};
