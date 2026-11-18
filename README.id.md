<p align="center">
  <img src="apps/gateway/public/wagyuu-logo.jpg" alt="WAgyuu Logo" width="180" style="border-radius: 20px; box-shadow: 0 8px 24px rgba(34, 197, 94, 0.25);" />
</p>

# 🚀 WAgyuu — Central WhatsApp API Gateway & Multi-Brand OTP Ecosystem

[English](README.md) | [Bahasa Indonesia](README.id.md)

**Pembuat & Pengembang:** Billy Panca Wijaya  
**Lisensi:** MIT  
**Domain Produksi Live:** [`https://wa-api.billi-panca-wijaya.my.id`](https://wa-api.billi-panca-wijaya.my.id)  
**Portal IT Operasional:** [`https://wa-api.billi-panca-wijaya.my.id/admin/login`](https://wa-api.billi-panca-wijaya.my.id/admin/login)

---

## 📑 Daftar Isi
1. [Ikhtisar Proyek & Arsitektur](#-1-ikhtisar-proyek--arsitektur)
2. [Pemisahan Fungsional: Portal IT Pusat vs Backoffice Brand](#-2-pemisahan-fungsional-portal-it-pusat-vs-backoffice-brand)
3. [Arsitektur Monorepo](#-3-arsitektur-monorepo)
4. [Portal IT Pusat (Operations Console Pro Max)](#-4-portal-it-pusat-operations-console-pro-max)
5. [Manajemen Terpadu Brand & Kredensial API](#-5-manajemen-terpadu-brand--kredensial-api)
6. [Engine WhatsApp & Protokol OTP 4-Digit](#-6-engine-whatsapp--protokol-otp-4-digit)
7. [Dukungan Multi-Driver Database (SQLite, MongoDB, PostgreSQL, MySQL)](#-7-dukungan-multi-driver-database)
8. [Paket Klien Laravel (Standar Spatie & Zero-Overwrite)](#-8-paket-klien-laravel-standar-spatie)
9. [Struktur Direktori Proyek](#-9-struktur-direktori-proyek)
10. [Panduan Instalasi & Menjalankan Lokal](#-10-panduan-instalasi--menjalankan-lokal)
11. [Deployment Docker & Reverse Proxy aaPanel di VPS](#-11-deployment-docker--reverse-proxy-aapanel-di-vps)
12. [Pengujian Otomatis (Test Suite)](#-12-pengujian-otomatis-test-suite)
13. [Keamanan & Matriks Hak Akses (RBAC)](#-13-keamanan--matriks-hak-akses-rbac)

---

## 🎯 1. Ikhtisar Proyek & Arsitektur

**WAgyuu** adalah ekosistem WhatsApp API Gateway dan layanan verifikasi nomor telepon terpusat yang dirancang untuk skala multi-brand enterprise. Sistem ini dibangun untuk memecahkan beban operasional pengiriman kode OTP WhatsApp massal, menghilangkan ketergantungan pada API cloud berbayar mahal per pesan, dan memberikan pemisahan wewenang yang tegas antara **Tim IT Operasional Pusat** dan **Aplikasi Web Brand**.

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           APLIKASI WEB BRAND (LARAVEL)                          │
│                                                                                 │
│   ┌───────────────────────────┐                ┌────────────────────────────┐   │
│   │ Brand A (e.g. Portal Web) │                │ Brand B (e.g. Mobile Apps) │   │
│   │ Laravel Client Package    │                │ Laravel Client Package     │   │
│   │ Backoffice: WhatsApp Menu │                │ Backoffice: WhatsApp Menu  │   │
│   └─────────────┬─────────────┘                └─────────────┬──────────────┘   │
└─────────────────┼────────────────────────────────────────────┼──────────────────┘
                  │ API Key (Header: x-api-key)                │
                  │ Raw Secret Token (HMAC-SHA256)             │
                  ▼                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│               WAGYUU CENTRAL GATEWAY (NestJS 11 + Baileys Engine)               │
│                                                                                 │
│   Domain Publik: https://wa-api.billi-panca-wijaya.my.id                        │
│   Internal Port: 18091 (Docker Container: wa-gateway-openwa)                    │
│                                                                                 │
│   ┌────────────────────────────────┐     ┌──────────────────────────────────┐   │
│   │    Modul Publik & Brand API    │     │       Portal IT Pusat Operasi    │   │
│   │    - POST /v1/otp/challenge    │     │       - Path: /admin/login       │   │
│   │    - POST /v1/otp/verify       │     │       - Route: /v1/ops/*         │   │
│   │    - POST /v1/messages/send    │     │       - HttpOnly Cookie Session  │   │
│   │    - GET  /v1/capabilities     │     │       - UI/UX Pro Max (ReactBits)│   │
│   └─────────────┬──────────────────┘     └─────────────────┬────────────────┘   │
│                 │                                          │                    │
│                 ▼                                          ▼                    │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │              TypeORM Data Layer (Multi-Driver Ready)                    │   │
│   │   - SQLite (Default Standalone Volume Host: /app/data/wagyuu.sqlite)    │   │
│   │   - MongoDB / PostgreSQL / MySQL (Opsi Terkonfigurasi via Settings)     │   │
│   └─────────────────────────────────────┬───────────────────────────────────┘   │
└─────────────────────────────────────────┼───────────────────────────────────────┘
                                          │ Direct WebSocket
                                          ▼
                             ┌─────────────────────────┐
                             │ Jaringan WhatsApp Dunia │
                             └─────────────────────────┘
```

---

## 🏢 2. Pemisahan Fungsional: Portal IT Pusat vs Backoffice Brand

Sistem menerapkan prinsip pemisahan wewenang yang tegas:

1. **Portal IT Pusat (`/admin/login`, `/v1/ops/*`):**
   - Dikelola khusus oleh Tim IT Operasional Pusat.
   - Berfungsi untuk: pendaftaran brand, penerbitan & rotasi kredensial API, pemantauan kesehatan runtime & memori gateway, konfigurasi parameter infrastruktur, dan inspeksi audit log.
   - **Bebas Data Pelanggan:** Tidak menyimpan data member pelanggan dan tidak melayani pairing nomor WhatsApp operasional brand.

2. **Backoffice Web Brand (Aplikasi Laravel Masing-Masing):**
   - Dikelola oleh masing-masing pengelola brand.
   - Seluruh data akun member, riwayat verifikasi nomor, dan menu pairing nomor WhatsApp pengirim (Sender Device Pool via QR code atau kode 8 karakter) dioperasikan langsung dari backoffice brand.

---

## 📦 3. Arsitektur Monorepo

Repositori ini tersusun dalam struktur monorepo terpadu:

- **`apps/gateway`**: Service backend mandiri berbasis **NestJS 11** dan **Node.js 22**. Menyediakan REST API gateway, engine Baileys WebSocket v7, verifikasi HMAC, audit log, RBAC guard, dan TypeORM storage layer.
- **`apps/operations-console`**: Antarmuka web modern Single-Page Application (SPA) berbasis **React 19**, **Vite 6**, **framer-motion**, dan pustaka animasi **reactbits.dev**. Mengkompilasi aset langsung ke `apps/gateway/public/admin/`.
- **`packages/contracts`**: Paket pustaka definisi tipe TypeScript bersama, antarmuka DTO, dan skema kontrak API.
- **`src/` & Root**: Paket klien Laravel (`billi-panca-wijaya/laravel-whatsapp-gateway`) berstandar Spatie dengan fitur zero-overwrite.

---

## ✨ 4. Portal IT Pusat (Operations Console Pro Max)

Portal IT dapat diakses pada URL [`https://wa-api.billi-panca-wijaya.my.id/admin/login`](https://wa-api.billi-panca-wijaya.my.id/admin/login).

### Keunggulan Desain UI/UX:
- **Pola Animasi ReactBits.dev:**
  - `SpotlightCard`: Kartu interaktif dengan efek *radial tracking glow* yang bergerak dinamis mengikuti posisi kursor mouse.
  - `ShinyText`: Efek teks berkilau animasi gradien (*shimmering highlight*).
- **Glassmorphism Navy Pro:** Warna latar `#070d18` / `#0b1220` berpadu dengan border transparan beraksen hijau WAgyuu `#22c55e`.
- **Radar Pulse Logo:** Aset resmi logo WAgyuu dihiasi ring radar berdenyut yang menunjukkan status sistem aktif.
- **Transisi Instan Tanpa Refresh:** Sesi login masuk dan keluar langsung mengubah tampilan dashboard secara reaktif tanpa perlu me-refresh halaman web secara manual.

### 7 Menu Navigasi Terfokus:
- **OPERASIONAL:**
  1. `Ringkasan`: Indikator memori gateway (<50MB RAM), status Baileys WebSocket v7, total brand aktif, dan kapabilitas infrastruktur.
  2. `Brand & Kredensial API`: Manajemen brand terpadu beserta penerbitan API key otomatis.
  3. `Webhook`: Pemantauan status pengiriman event webhook dan panduan keamanan SSRF.
- **PEMANTAUAN:**
  4. `Log & Audit`: Audit trail *append-only* dari setiap aktivitas staf IT dan panggilan API dengan sanitasi payload otomatis.
  5. `Kesehatan Sistem`: Telemetri real-time penggunaan CPU, Heap Memory, RSS, dan status koneksi storage.
- **ADMINISTRASI:**
  6. `Pengguna IT & Akses`: Manajemen akun staf IT (Superadmin, Operator, Viewer) dengan proteksi anti-lockout superadmin terakhir.
  7. `Pengaturan Infrastruktur`: Panel konfigurasi 5 tab (Database, WhatsApp Engine, Keamanan OTP, Sesi IT, Jaringan & Log).
  8. `Dokumentasi API`: Panduan integrasi cURL dan referensi endpoint.

---

## 🔑 5. Manajemen Terpadu Brand & Kredensial API

Untuk efisiensi kerja tim operasional, proses pendaftaran brand dan penerbitan API key digabungkan dalam satu langkah:

1. **Tombol Tunggal:** Klik **`+ Tambah Brand & Buat API Key`**.
2. **Penerbitan Kredensial Otomatis:** Sistem membuat data brand dan secara bersamaan menerbitkan API key aktif:
   - **Key ID:** `key_<slug_brand>_<random>` (disimpan di database).
   - **Raw Secret Token:** `wgy_live_<slug_brand>_<random>` (diberikan salt & di-hash dengan SHA-256).
3. **One-Time Secret Reveal:** Rahasia token hanya ditampilkan **satu kali** saat pembuatan atau rotasi dengan tombol salin cepat (*copy-to-clipboard*).
4. **Rotasi Kredensial Fleksibel:** Mendukung masa tenggang rotasi (*grace period*) default 15 menit agar brand tidak mengalami *downtime* saat memperbarui konfigurasi di server mereka.

---

## ⚡ 6. Engine WhatsApp & Protokol OTP 4-Digit

### Engine WhatsApp (Baileys v7 WebSocket):
- **Bebas Chromium:** Berjalan melalui protokol socket WebSocket native (`@whiskeysockets/baileys`).
- **Efisiensi Ekstrem:** Mengonsumsi memori <50MB RAM (jauh lebih hemat dibandingkan headless browser yang membutuhkan 500MB–1GB RAM per sesi).
- **Multi-Device Multi-Session:** Mendukung penautan multi-nomor pengirim secara independen.

### Spesifikasi Protokol OTP 4-Digit:
- **Format:** 4 digit numerik acak murni (`0000` s/d `9999`) dengan preservasi angka nol di awal.
- **Masa Berlaku (TTL):** Default 300 detik (5 menit).
- **Jeda Kirim Ulang (Cooldown):** 30 detik untuk menghindari *spamming*.
- **Toleransi Kesalahan:** Maksimal 5 kali percobaan verifikasi kode salah sebelum sesi tantangan dikunci (*lockout*).
- **Masking Nomor:** Masking format E.164 (contoh: `+6281****7890`) di seluruh log dan UI console.
- **Kriptografi Verifier:** Hash HMAC-SHA256 dengan *timing-safe comparison* untuk menangkal serangan *timing attack*.

---

## 🗄️ 7. Dukungan Multi-Driver Database

WAgyuu menggunakan TypeORM yang dirancang modular untuk mendukung berbagai kebutuhan arsitektur:

| Driver Database | Status Saat Ini | Kebutuhan & Rekomendasi Penggunaan |
|---|:---:|---|
| **SQLite (Default)** | ✅ **Aktif di Produksi** | Sangat ideal untuk server standalone/single-container. Tersimpan persisten di `/app/data/wagyuu.sqlite` pada host volume tanpa overhead server terpisah. |
| **MongoDB** | ⚙️ **Siap Dikonfigurasi** | Cocok untuk deployment berskala besar berbasis dokumen yang terintegrasi langsung dengan database cluster NoSQL. |
| **PostgreSQL** | ⚙️ **Siap Dikonfigurasi** | Pilihan terbaik untuk klaster enterprise relasional dengan konkurensi data tingkat tinggi. |
| **MySQL / MariaDB** | ⚙️ **Siap Dikonfigurasi** | Didukung penuh untuk infrastruktur enterprise SQL standar. |

Pengaturan koneksi database, ukuran pool koneksi, dan kredensial dapat ditinjau dan dikelola melalui tab **Database Storage** di menu Pengaturan Portal IT.

---

## 🧩 8. Paket Klien Laravel (Standar Spatie)

Paket klien di dalam repositori ini (`billi-panca-wijaya/laravel-whatsapp-gateway`) dibangun mengikuti standar paket open-source Spatie:

### Jaminan Zero-Overwrite:
Kode aplikasi Laravel Anda tidak akan pernah tertimpa. Integrasi dilakukan melalui traits dan service provider:
- **Model User:** Cukup tambahkan `use HasWhatsAppLogin;` di `app/Models/User.php`.
- **Package Auto-Discovery:** `WhatsAppGatewayServiceProvider` dan Facade `WhatsAppGateway` terdaftar otomatis oleh Composer.
- **Defensive Migrations:** File migrasi mengecek keberadaan kolom secara defensif sebelum menambahkan atribut `phone_e164`, `phone_verified_at`, dll.

### Contoh Pemanggilan via Facade:
```php
use BilliPancaWijaya\WhatsAppGateway\Facades\WhatsAppGateway;

// 1. Meminta tantangan kode OTP ke nomor pengguna
$challenge = WhatsAppGateway::requestOtp('+6281234567890');
// Mengembalikan: ['challenge_id' => '...', 'state' => 'queued', 'masked_phone' => '+6281****7890']

// 2. Memverifikasi kode OTP yang diinput pengguna
$result = WhatsAppGateway::verifyOtp($challenge['challenge_id'], '1234');
// Mengembalikan: ['user' => $userInstance, 'created' => true/false]

// 3. Mengirim pesan teks kustom melalui nomor pengirim aktif
WhatsAppGateway::sendMessage('+6281234567890', 'Halo, pesanan Anda telah dikonfirmasi!');
```

---

## 📁 9. Struktur Direktori Proyek

```text
wa-gateway/
├── apps/
│   ├── gateway/                        # Backend NestJS 11 Gateway
│   │   ├── Dockerfile                  # Production Docker Image (Node 22 Bookworm Slim)
│   │   ├── package.json                # Dependencies Gateway (NestJS, Baileys, TypeORM)
│   │   ├── public/                     # Aset Publik (wagyuu-logo.jpg, admin/ build)
│   │   └── src/
│   │       ├── main.ts                 # Bootstrap server (Port 18091)
│   │       ├── app.controller.ts       # Root / redirect & SPA handler
│   │       └── modules/
│   │           ├── admin-ops/          # Modul Portal IT Pusat (Brands, Keys, Health, Logs)
│   │           ├── authentication/     # Guard API Key Brand (x-api-key HMAC)
│   │           ├── otp/                # Engine Tantangan & Verifikasi OTP 4-Digit
│   │           ├── platform-auth/      # Autentikasi Staf IT, Sesi Cookie & Audit Trail
│   │           └── whatsapp-sessions/  # Adapter Baileys Multi-Device
│   │
│   └── operations-console/             # Frontend Portal IT (React 19 + Vite 6 + Framer Motion)
│       ├── package.json                # Dependencies Console UI
│       ├── vite.config.ts              # Konfigurasi build ke apps/gateway/public/admin/
│       └── src/
│           ├── components/
│           │   ├── BrandsPanel.tsx     # Panel Terpadu Brand & Kredensial API
│           │   ├── SettingsPanel.tsx   # Panel Pengaturan 5 Tab (OpenWA style)
│           │   ├── SummaryPanel.tsx    # Dashboard Metrik & Infrastruktur
│           │   ├── WebhookPanel.tsx    # Panel Webhook Bersih
│           │   └── ui/                 # Komponen ReactBits (SpotlightCard, ShinyText)
│           └── styles/portal.css       # Token Desain Dark Navy & Animasi
│
├── packages/
│   └── contracts/                      # Kontrak Data & TypeScript Interfaces Bersama
│
├── deploy/
│   ├── compose.yaml                    # Docker Compose Produksi (wa-gateway-openwa)
│   └── aapanel/                        # Template Konfigurasi Nginx Reverse Proxy
│
├── src/                                # Source Code Paket Laravel (Standar Spatie)
│   ├── WhatsAppGateway.php             # Service Manager Utama
│   ├── WhatsAppGatewayServiceProvider.php
│   ├── Facades/WhatsAppGateway.php     # Laravel Facade
│   ├── Traits/HasWhatsAppLogin.php     # Trait Model User
│   └── Http/Controllers/              # Controller OTP & Backoffice Brand
│
├── database/migrations/                # Migrasi Laravel Defensif
├── config/whatsapp-gateway.php         # Konfigurasi Paket Laravel
├── composer.json                       # Composer Manifest Paket Laravel
├── README.md                           # Dokumentasi Bahasa Inggris
└── README.id.md                        # Dokumentasi Bahasa Indonesia
```

---

## 🛠️ 10. Panduan Instalasi & Menjalankan Lokal

### Prasyarat:
- Node.js versi 22+ & npm
- PHP 8.2+ & Composer (untuk pengujian paket Laravel)

### Menjalankan Gateway & Console Lokal:
```bash
# 1. Masuk ke backend gateway & install dependensi
cd apps/gateway
npm install

# 2. Build backend
npm run build

# 3. Masuk ke frontend console & build UI
cd ../operations-console
npm install
npm run build

# 4. Jalankan gateway backend secara lokal
cd ../gateway
npm run start:dev
```
Akses portal IT lokal pada browser di: `http://localhost:18091/admin/login`

---

## 🚢 11. Deployment Docker & Reverse Proxy aaPanel di VPS

### Spesifikasi Server Produksi:
- **Host VPS:** `84.247.148.115`
- **Container Name:** `wa-gateway-openwa`
- **Image Docker:** `wagyuu-gateway:1.0.0` (dan tag `latest`)
- **Port:** `127.0.0.1:18091:18091`
- **Volume Data:** `/www/wwwroot/wa-api.billi-panca-wijaya.my.id/data:/app/data`

### Konfigurasi Reverse Proxy Nginx aaPanel:
Pada domain `wa-api.billi-panca-wijaya.my.id` di panel Nginx:
```nginx
location / {
    proxy_pass http://127.0.0.1:18091;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_connect_timeout 60s;
    proxy_read_timeout 60s;
}
```

### Mengelola Container di VPS:
```bash
# Mengecek status container
docker ps --filter "name=wa-gateway-openwa"

# Memeriksa log aktivitas gateway
docker logs -f --tail 100 wa-gateway-openwa

# Memeriksa kesehatan liveness API
curl -fsS http://127.0.0.1:18091/v1/health/liveness
```

---

## 🧪 12. Pengujian Otomatis (Test Suite)

Seluruh pengujian unit dan kontrak gateway dapat dijalankan dengan:
```bash
cd apps/gateway
npm test
```

Hasil verifikasi:
```text
PASS src/modules/otp/otp.contract.spec.ts
PASS src/modules/admin-ops/admin-ops.service.spec.ts
PASS src/modules/whatsapp-sessions/whatsapp-sessions.service.spec.ts
PASS src/modules/otp/otp.service.spec.ts
PASS src/modules/platform-auth/platform-auth.service.spec.ts

Test Suites: 5 passed, 5 total
Tests:       21 passed, 21 total
```

---

## 🛡️ 13. Keamanan & Matriks Hak Akses (RBAC)

Portal IT menerapkan pembagian hak akses bertingkat:

| Fitur / Aksi Operasional | Superadmin | Operator | Viewer |
|---|:---:|:---:|:---:|
| **Melihat Ringkasan Sistem & Infrastruktur** | ✅ Ya | ✅ Ya | ✅ Ya |
| **Melihat Daftar Brand & Metadata** | ✅ Ya | ✅ Ya | ✅ Ya |
| **Tambah Brand & Buat API Key Baru\*** | ✅ Ya | ❌ Tidak | ❌ Tidak |
| **Rotasi Kredensial API (Grace Period)\*** | ✅ Ya | ❌ Tidak | ❌ Tidak |
| **Pencabutan Kredensial API (Revoke)\*** | ✅ Ya | ❌ Tidak | ❌ Tidak |
| **Jeda / Aktifkan Kembali Brand (Pause/Resume)\*** | ✅ Ya | ❌ Tidak | ❌ Tidak |
| **Hapus Brand Beserta Kredensial Terkait\*** | ✅ Ya | ❌ Tidak | ❌ Tidak |
| **Melihat Audit Log Aktivitas IT & API** | ✅ Ya | ✅ Ya | ✅ Ya |
| **Melihat Log Keamanan & Percobaan Login** | ✅ Ya | ❌ Tidak | ❌ Tidak |
| **Melihat Pengaturan Infrastruktur** | ✅ Ya | ✅ Ya | ❌ Tidak |
| **Ubah Pengaturan Infrastruktur\*** | ✅ Ya | ❌ Tidak | ❌ Tidak |
| **Manajemen Pengguna IT (Tambah/Suspend)\*** | ✅ Ya | ❌ Tidak | ❌ Tidak |
| **Proteksi Anti-Lockout Superadmin Terakhir** | 🔒 Dilindungi | — | — |

*\* Aksi sensitif memerlukan validasi kata sandi (jendela elevasi re-autentikasi 5 menit).*

---

*Dikembangkan oleh **Billy Panca Wijaya** untuk keandalan infrastruktur WhatsApp Gateway enterprise yang aman, terisolasi, dan efisien.*
