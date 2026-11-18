# SOURCE MAP — WAgyuu & Laravel Headless Ecosystem

Tanggal Audit Baseline: 16 November 2026.
Status: Terverifikasi pada Disk (M0 Baseline).

---

## 1. Inventaris dan Peran Folder

| Folder | Status Git | Peran & Keputusan | Alasan Pemilihan |
|---|---|---|---|
| `C:\project\bily\WORK\wa-gateway` | Git HEAD `80c3072`, working tree: `deleted: WA_LOGIN_SYSTEM.md` | **Pusat API WAgyuu (Target Central)**: Akan direstrukturisasi menjadi gateway API mandiri (NestJS / TypeScript terisolasi) + paket kontrak (`packages/contracts`) + client PHP tipis (`packages/laravel-client`). | Merupakan repositori resmi WAgyuu yang dikembalikan pengguna ke versi bersih; memiliki riwayat commit dan repositori upstream. |
| `C:\project\bily\WORK\laravel-headless-starter` | Non-Git (Workspace lokal) | **Host Aplikasi Utama (Primary Host)**: Laravel 13.x (API) + React 18 / Vite (SPA) + MySQL member store. | Memiliki struktur aplikasi Laravel modern (Laravel 13.35, Sanctum 4.3, Predis 3.6), suite test PHPUnit lengkap yang berjalan lancar (SQLite in-memory), dan frontend lengkap. |
| `C:\project\bily\WORK\WA-api-otp` | Non-Git (Workspace lokal) | **Sumber Pembanding & Referensi Historis (Read-Only)**: Jangan ditimpa. Memuat eksperimen daemon native PHP (`bin/wa-gateway-daemon`) dan patch aaPanel. | Digunakan hanya untuk memverifikasi perbaikan UI atau adapter yang pernah dicoba di aaPanel tanpa membawa arsitektur native daemon yang rumit. |
| `C:\project\bily\WORK\OpenWA` | Git HEAD `f17c6d1e9` (v0.30.0) | **Referensi Upstream Engine (Strictly Read-Only)**: Jangan diubah. Memuat arsitektur NestJS, adapter Baileys / WWebJS, dan penanganan session engine WhatsApp. | Sumber inspirasi dan referensi teknis untuk koneksi sesi WhatsApp multi-device tanpa menulis ulang protokol WhatsApp di PHP. |

---

## 2. Pemetaan Komponen & Jalur Runtime

### 2.1 Backend Gateway (Pusat)
- **Status Saat Ini**: `wa-gateway` masih berisi paket PHP monolitik Spatie-style lama (`BilliPancaWijaya\WhatsAppGateway`) dengan driver mock/openwa.
- **Target (M2-M3)**: Menjadi runtime NestJS mandiri yang mengekspos endpoint API RESTful (`/v1/...`), mengelola session WhatsApp via adapter Baileys, outbox queue (Redis), dan tabel transaksi challenge OTP (SQLite untuk demo).

### 2.2 Host Laravel (Client)
- **Status Saat Ini**: `laravel-headless-starter/api` memiliki `WhatsAppOtpServiceProvider` lokal yang mengikat mock/openwa transport dan controller admin lama (`SenderPoolController`, `WhatsAppGatewayController`).
- **Target (M4)**: Mengintegrasikan `CentralGatewayClient` PHP tipis berbasis Laravel HTTP Client, bot protection (Turnstile), local attempt binding, adapter member lokal, dan session Sanctum SPA.

### 2.3 Frontend Backoffice & Login Pelanggan
- **Status Saat Ini**: `laravel-headless-starter/apps/react` memiliki modul login `AuthModal` dan dashboard admin yang mengimpor `src/openwa` (salinan dashboard OpenWA lama dengan isolasi CSS khusus).
- **Target (M5)**: Mengganti menu teknis OpenWA dengan 5 menu backoffice mandiri sesuai PRD:
  1. Sesi WhatsApp
  2. Tampilan Login
  3. Uji OTP & Pesan
  4. Log
  5. Member Terverifikasi (filter dari tabel users lokal)
- **Login Pelanggan**: Form nomor WhatsApp, verifikasi Turnstile, input 4 digit OTP acak dengan auto-submit, resend cooldown 30 detik.

---

## 3. Lingkungan Eksekusi yang Terverifikasi
- **PHP CLI**: `8.5.0` (Beyond Code / Herd-lite)
- **Composer**: `2.8.12`
- **Node.js**: `v24.17.0`
- **npm**: `11.13.0`
- **Database Host Test**: SQLite `:memory:` (terisolasi)
- **Database Host Dev/Prod**: MySQL (aaPanel)
- **Database Pusat Target**: SQLite (single-instance demo) + Redis (BullMQ / Queue)
