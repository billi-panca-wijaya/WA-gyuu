import React from 'react';
import { BookOpen, Code, Terminal, Key } from 'lucide-react';

export const ApiDocsPanel: React.FC = () => {
  return (
    <div>
      <div style={{ marginBottom: 'var(--wgy-space-6)' }}>
        <h1 style={{ fontSize: 'var(--wgy-title)', fontWeight: 800, color: '#fff' }}>Dokumentasi Integrasi API</h1>
        <p style={{ color: 'var(--wgy-text-muted)', fontSize: 'var(--wgy-text-sm)' }}>
          Panduan integrasi backend Laravel untuk pengiriman OTP dan operasional WhatsApp
        </p>
      </div>

      <div className="wgy-card">
        <h2 className="wgy-card-title">1. Base URL & Otentikasi</h2>
        <p style={{ fontSize: 'var(--wgy-text-sm)', color: 'var(--wgy-text-muted)', marginBottom: 'var(--wgy-space-3)' }}>
          Seluruh request dari aplikasi web brand dikirim ke domain pusat tunggal dengan menyertakan token API pada header Authorization:
        </p>
        <div style={{ backgroundColor: '#070e1a', padding: 'var(--wgy-space-4)', borderRadius: 'var(--wgy-radius-control)', fontFamily: 'var(--wgy-font-mono)', fontSize: '0.85rem', color: '#86efac' }}>
          <div>BASE_URL = https://wa-api.billi-panca-wijaya.my.id</div>
          <div>Authorization: Bearer wgy_live_&lt;brand_code&gt;_&lt;secret_token&gt;</div>
          <div>Content-Type: application/json</div>
          <div>Accept: application/json</div>
        </div>
      </div>

      <div className="wgy-card">
        <h2 className="wgy-card-title">2. Contoh Kode Laravel HTTP Client</h2>
        <p style={{ fontSize: 'var(--wgy-text-sm)', color: 'var(--wgy-text-muted)', marginBottom: 'var(--wgy-space-3)' }}>
          Implementasi resmi menggunakan Laravel HTTP Client bawaan (tanpa dependensi Guzzle eksternal):
        </p>
        <div style={{ backgroundColor: '#070e1a', padding: 'var(--wgy-space-4)', borderRadius: 'var(--wgy-radius-control)', fontFamily: 'var(--wgy-font-mono)', fontSize: '0.85rem', color: '#e5edf5', overflowX: 'auto' }}>
          <pre>{`use Illuminate\\Support\\Facades\\Http;

// 1. Buat Tantangan OTP Baru
$response = Http::withToken(config('services.wagyuu.api_key'))
    ->acceptJson()
    ->post(config('services.wagyuu.base_url') . '/v1/otp/challenges', [
        'phone_e164' => '+628123456789',
        'action' => 'login',
    ]);

$challengeId = $response->json('data.challenge_id');

// 2. Verifikasi 4-Digit OTP yang Dimasukkan Pengguna
$verifyResponse = Http::withToken(config('services.wagyuu.api_key'))
    ->acceptJson()
    ->post(config('services.wagyuu.base_url') . "/v1/otp/challenges/{$challengeId}/verify", [
        'code' => '1234',
    ]);

if ($verifyResponse->json('data.verified')) {
    // Login berhasil diselesaikan di backend host
}`}</pre>
        </div>
      </div>

      <div className="wgy-card">
        <h2 className="wgy-card-title">3. Amplop Respons Standar (API Envelope)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--wgy-space-4)' }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--wgy-success-text)', marginBottom: '0.25rem' }}>Respons Berhasil (2xx):</div>
            <pre style={{ backgroundColor: '#070e1a', padding: '0.75rem', borderRadius: '6px', fontSize: '0.75rem', color: '#86efac' }}>
{`{
  "data": { ... },
  "meta": {
    "request_id": "req_...",
    "server_time": "2026-11-18T..."
  }
}`}
            </pre>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--wgy-danger-text)', marginBottom: '0.25rem' }}>Respons Kesalahan (4xx / 5xx):</div>
            <pre style={{ backgroundColor: '#070e1a', padding: '0.75rem', borderRadius: '6px', fontSize: '0.75rem', color: '#fca5a5' }}>
{`{
  "error": {
    "code": "ERROR_CODE",
    "message": "Pesan deskriptif",
    "retryable": false
  },
  "meta": {
    "request_id": "req_...",
    "server_time": "2026-11-18T..."
  }
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
