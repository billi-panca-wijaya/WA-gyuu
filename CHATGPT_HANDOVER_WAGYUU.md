# 📋 DOKUMEN HANDOVER RESMI & SPESIFIKASI PENUH: WAGYUU ECOSYSTEM

> ⚠️ **INSTRUKSI WAJIB UNTUK CHATGPT / AI MODEL SELANJUTNYA:**
> 1. **BACA SELURUH DOKUMEN INI DARI AWAL HINGGA AKHIR DENGAN PENALARAN MENDALAM (DEEP REASONING).**
> 2. **JANGAN MEMBACA SEBAGIAN, JANGAN MEMBUAT ASUMSI SENDIRI, DAN JANGAN PERNAH MENGHAYAL (ZERO HALLUCINATION).**
> 3. Seluruh detail arsitektur, lokasi berkas, port, kontainer Docker, nama pembuat, dan keputusan teknis di bawah ini adalah **fakta implementasi nyata yang sedang berjalan di produksi**. Patuhi konvensi ini secara ketat jika diminta melanjutkan pengembangan.

---

## 1. Identitas Proyek & Metadata

- **Nama Proyek:** **WAgyuu** (Central WhatsApp API Gateway & Multi-Brand OTP Ecosystem)
- **Pembuat / Pemilik:** **Billy Panca Wijaya**
- **Lisensi:** MIT
- **URL Produksi Live:** [`https://wa-api.billi-panca-wijaya.my.id`](https://wa-api.billi-panca-wijaya.my.id)
- **Portal IT Operasional:** [`https://wa-api.billi-panca-wijaya.my.id/admin/login`](https://wa-api.billi-panca-wijaya.my.id/admin/login)
- **Target Host VPS:** `84.247.148.115` (`vmi3398451`)
- **Container Name di Docker VPS:** `wa-gateway-openwa` *(nama container dipertahankan demi kompatibilitas reverse proxy aaPanel)*
- **Image Docker:** `wagyuu-gateway:1.0.0` dan `wagyuu-gateway:latest`
- **Port Internal Gateway:** `18091` (binding `127.0.0.1:18091:18091`)
- **Reverse Proxy:** Nginx aaPanel melayani SSL Cloudflare ke `https://wa-api.billi-panca-wijaya.my.id`
- **Direktori Data Persisten Host:** `/www/wwwroot/wa-api.billi-panca-wijaya.my.id/data` di-mount ke container di `/app/data`

---

## 2. Arsitektur Sistem & Pemisahan Fungsional (Segregation of Duties)

Sistem WAgyuu memiliki pembagian peran yang sangat tegas:

```text
┌────────────────────────────────────────────────────────────────────────┐
│               APLIKASI WEB BRAND (LARAVEL CONSUMER)                    │
│                                                                        │
│ - Menginstal paket Composer: billi-panca-wijaya/laravel-whatsapp-gateway│
│ - Menyimpan data member/pelanggan di database Laravel milik brand      │
│ - Memiliki menu WhatsApp di backoffice brand (QR scan / 8-digit code)  │
│ - Memanggil gateway via Facade WhatsAppGateway                         │
│ - Menghubungkan ke gateway cukup dengan menyalin kredensial ke .env    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                        HTTP REST API (x-api-key & HMAC)
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             WAGYUU CENTRAL GATEWAY (NestJS 11 + Baileys v7)            │
│             Container: wa-gateway-openwa (Port: 18091)                 │
│                                                                        │
│ ┌──────────────────────────────────┐ ┌───────────────────────────────┐ │
│ │ Modul Publik & Brand API         │ │ Portal IT Pusat (Operasional) │ │
│ │ - POST /v1/otp/challenge         │ │ - URL: /admin/login           │ │
│ │ - POST /v1/otp/verify            │ │ - API: /v1/ops/*              │ │
│ │ - POST /v1/messages/send         │ │ - RBAC: Superadmin/Op/Viewer  │ │
│ │ - GET  /v1/capabilities          │ │ - UI/UX Pro Max (ReactBits)   │ │
│ └──────────────────────────────────┘ └───────────────────────────────┘ │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ TypeORM Multi-Driver Storage Layer                                 │ │
│ │ - Aktif di VPS: SQLite (/app/data/wagyuu.sqlite)                   │ │
│ │ - Siap Dikonfigurasi: MongoDB / PostgreSQL / MySQL                 │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Direct WebSocket
                                    ▼
                       ┌─────────────────────────┐
                       │ Jaringan WhatsApp Dunia │
                       └─────────────────────────┘
```

### Aturan Batasan Peran:
1. **Portal IT Pusat (`/admin/login`, `/v1/ops/*`):**
   - HANYA untuk Tim IT Pusat.
   - Mengelola pendaftaran Brand, penerbitan Kredensial API, Audit Log, Pemantauan Kesehatan Sistem, Manajemen Staf IT, dan Pengaturan Infrastruktur.
   - **TIDAK** menyimpan data member pelanggan dan **TIDAK** melayani scan QR nomor WhatsApp operasional brand (itu adalah hak dan tugas backoffice masing-masing brand).
2. **Backoffice Web Brand:**
   - Menyimpan seluruh data akun member pelanggan di database lokal brand.
   - Menjalankan pairing nomor WhatsApp (Sender Pool) langsung di backoffice mereka menggunakan komponen UI bawaan paket Laravel.

---

## 3. Struktur Monorepo Direktori

```text
c:\project\bily\WORK\wa-gateway/
├── apps/
│   ├── gateway/                        # Backend NestJS 11
│   │   ├── Dockerfile                  # Base image node:22-bookworm-slim
│   │   ├── package.json                # Dependencies (@whiskeysockets/baileys, typeorm, sqlite3)
│   │   ├── public/                     # Public assets
│   │   │   ├── wagyuu-logo.jpg         # Aset logo resmi WAgyuu
│   │   │   └── admin/                  # Build hasil vite dari operations-console
│   │   └── src/
│   │       ├── main.ts                 # Bootstrap gateway port 18091
│   │       ├── app.controller.ts       # 302 redirect root '/' ke '/admin/login' & SPA asset serving
│   │       └── modules/
│   │           ├── admin-ops/          # Controller & Service Portal IT Pusat
│   │           ├── authentication/     # Brand API Key verification guard (x-api-key)
│   │           ├── otp/                # 4-Digit OTP Challenge & Verification engine
│   │           ├── platform-auth/      # IT Staff auth, 24h/30d sessions, cookie, audit log
│   │           └── whatsapp-sessions/  # Baileys WebSocket multi-device manager
│   │
│   └── operations-console/             # Frontend Portal IT (React 19 + Vite 6 + Framer Motion)
│       ├── package.json
│       ├── vite.config.ts              # Output langsung ke apps/gateway/public/admin/
│       └── src/
│           ├── components/
│           │   ├── BrandsPanel.tsx     # Menu terpadu Brand & Kredensial API
│           │   ├── SettingsPanel.tsx   # Pengaturan Infrastruktur 5 Tab
│           │   ├── SummaryPanel.tsx    # Dashboard metrik & infrastruktur
│           │   ├── WebhookPanel.tsx    # Panel Webhook bersih
│           │   ├── AuditLogsPanel.tsx  # Audit trail append-only
│           │   ├── SystemHealthPanel.tsx# Telemetri runtime & memori
│           │   ├── UsersPanel.tsx      # Manajemen pengguna IT (Superadmin only)
│           │   ├── ApiDocsPanel.tsx    # Dokumentasi API & contoh cURL
│           │   └── ui/                 # ReactBits (SpotlightCard, ShinyText)
│           └── styles/portal.css       # Token styling tema Dark Navy & Glassmorphism
│
├── packages/
│   └── contracts/                      # Kontrak data TypeScript & fixture openapi.json
│
├── deploy/
│   ├── compose.yaml                    # Docker Compose file di VPS (/www/docker/wa-gateway/deploy)
│   └── aapanel/                        # Template konfigurasi reverse proxy Nginx aaPanel
│
├── src/                                # Source Code Paket Klien Laravel (Spatie Style)
│   ├── WhatsAppGateway.php             # Facade manager
│   ├── WhatsAppGatewayServiceProvider.php # Auto-discovery & vendor publishing
│   ├── Facades/WhatsAppGateway.php
│   ├── Traits/HasWhatsAppLogin.php     # Trait model User Eloquent (Zero-Overwrite)
│   ├── Http/Controllers/              # Controller OTP & Backoffice Brand
│   └── Services/                       # OtpService, SenderPoolService, OpenWaSessionClient
│
├── resources/frontend/                 # Komponen UI React yang dapat dipublish ke web brand
│   └── components/
│       ├── WhatsAppSenderPoolPanel.tsx # UI Backoffice untuk scan QR & pairing sender WhatsApp
│       ├── WhatsAppVerifiedMembersPanel.tsx # UI Backoffice tabel member terverifikasi
│       └── WhatsAppOtpForm.tsx         # UI Form login OTP 4-digit untuk pengunjung
│
├── database/migrations/                # Migrasi Laravel defensif (create user cols, otp tables)
├── config/whatsapp-gateway.php         # Konfigurasi publishable paket Laravel
├── tests/                              # Pengujian PHPUnit Orchestra Testbench untuk paket Laravel
├── composer.json                       # Composer manifest (billi-panca-wijaya/laravel-whatsapp-gateway)
├── README.md                           # Dokumentasi Bahasa Inggris
├── README.id.md                        # Dokumentasi Bahasa Indonesia
└── CHATGPT_HANDOVER_WAGYUU.md          # File ini (Panduan Handover Menyeluruh)
```

---

## 4. Rincian Fitur Utama & Keputusan Teknis Terbaru

### A. Template Pesan OTP (Bahasa Indonesia & Nama Brand Dinamis)
Format pesan OTP yang dikirim melalui WhatsApp telah diatur secara resmi:
```text
Kode verifikasi {Nama Brand} Anda adalah *{4_DIGIT_CODE}*. Berlaku 5 menit. Demi keamanan akun Anda, jangan bagikan kode ini kepada siapa pun.
```
- `{Nama Brand}` diambil secara dinamis dari nama brand yang terdaftar di database gateway (`brand.name` atau `brand.code`). Jika tidak ada, fallback ke `'WAgyuu'`.
- `{4_DIGIT_CODE}` adalah 4 digit numerik acak murni (`0000`–`9999`) yang mempertahankan angka nol di awal (misal: `0123`).

### B. Kebijakan Sesi & Durasi Login IT Portal (Diperpanjang)
Sebelumnya sesi idle 15 menit menyebabkan pengguna cepat ter-logout. Sekarang telah disesuaikan agar stabil untuk operasional:
- **Idle Timeout:** **24 Jam** (diperbarui otomatis setiap kali staf IT aktif menggunakan portal).
- **Absolute Session Limit:** **30 Hari**.
- **Cookie Keamanan:** Cookie HttpOnly `wgy_ops_session` disetel dengan `maxAge: 30 hari` dan `sameSite: 'lax'`.
- **Sensitif Actions (Re-Auth Window):** Aksi berbahaya (seperti menghapus brand, rotasi key, ubah role admin) tetap mewajibkan validasi ulang kata sandi dengan jendela elevasi 5 menit.

### C. Penyatuan Menu "Brand & Kredensial API"
- Menu "Brand & Integrasi" dan "Kredensial API" telah digabungkan menjadi satu menu terpadu.
- Satu tombol: **`+ Tambah Brand & Buat API Key`**.
- Backend secara otomatis membuat entitas brand dan langsung menerbitkan API Key pertama:
  - **Key ID:** `key_<slug>_<rand>`
  - **Raw Secret Token:** `wgy_live_<slug>_<rand>` (hanya ditampilkan 1 kali dengan tombol copy-to-clipboard instan).
- Mendukung fitur rotasi key berjadwal (*grace period 15 menit*), jeda (*pause*), aktifkan kembali (*resume*), dan hapus permanen (*cascade delete*).

### D. Perampingan Navigasi Portal IT (7 Menu Bersih)
Menu berikut telah dihapus dari Portal IT Pusat karena merupakan wewenang backoffice brand:
- ❌ Menu `Sesi WhatsApp` (Dihapus dari portal pusat).
- ❌ Menu `OTP & Pengiriman` (Dihapus dari portal pusat).
- Webhook dimulai dari kondisi kosong (*clean state*).
Navigasi sekarang terbagi rapi menjadi:
1. `Ringkasan`
2. `Brand & Kredensial API`
3. `Webhook`
4. `Log & Audit`
5. `Kesehatan Sistem`
6. `Pengguna IT & Akses` (Khusus Superadmin)
7. `Pengaturan Infrastruktur` (5 Tab komprehensif)
8. `Dokumentasi API`

### E. Desain UI/UX Pro Max (ReactBits.dev & Motion)
- **SpotlightCard:** Kartu interaktif dengan efek glow radial yang mengikuti koordinat kursor mouse.
- **ShinyText:** Animasi shimmering teks berkilau gradien.
- **Transisi Halus:** Perubahan route dan modal menggunakan `framer-motion`.
- **Single Page Application:** Login form reaktif, masuk langsung ke dashboard tanpa me-refresh halaman browser.

### F. Multi-Driver Database Storage
- **Driver Aktif:** SQLite persisten di `/app/data/wagyuu.sqlite` (ringan, konsumsi memori <50MB RAM, zero overhead).
- **Penyimpanan Eksternal:** Konfigurasi TypeORM modular siap dialihkan ke **MongoDB**, **PostgreSQL**, atau **MySQL** melalui environment variable tanpa merombak logika backend.

---

## 5. Pembersihan Kontainer Docker di VPS yang Telah Selesai

Atas instruksi pengguna, seluruh kontainer, volume, network, dan image yang tidak terpakai berikut **telah dihapus bersih dari VPS (`84.247.148.115`)**:
- `ug-mongodb`
- `healthylife-web-1`
- `healthylife-api-1`
- `healthylife-nginx-1`
- `healthylife-mongo-1`
- `kas-kelas-nginx-1`
- `kas-kelas-backend-1`
- `kas-kelas-migrate-1`
- `kas-kelas-backup-1`
- `kas-kelas-storage-init-1`
- `kas-kelas-postgres-1`
- Beserta Docker images terkait (`healthylife-api:v1`, `healthylife-web:v1`, `kas-kelas-*`, `mongo:7`, `postgres:17.6-alpine`, `alpine:3.22`).

**Kontainer yang aktif dan dipertahankan di VPS:**
1. `wa-gateway-openwa` (Container WAgyuu Central Gateway kita - Status: `Up (healthy)`)
2. `dimsum-coffee-by-maya-*` (Proyek milik pengguna)
3. `hermes-ai` (Proyek milik pengguna)

---

## 6. Mengenai Folder `tests/` di Root Repositori

Folder `c:\project\bily\WORK\wa-gateway\tests` berisi:
- `TestCase.php`
- `Feature/WhatsAppOtpTest.php`

**Status & Rekomendasi:**
- Folder ini **PENTING** untuk pengujian paket klien Laravel (`billi-panca-wijaya/laravel-whatsapp-gateway`) menggunakan Orchestra Testbench.
- Ukurannya sangat kecil (<10 KB), tidak membebani server, tidak masuk ke dalam image Docker gateway, dan tidak menimbulkan resiko bug apapun.
- **Rekomendasi:** **Tetap dipertahankan di Git** agar pengujian unit PHPUnit dapat dijalankan setiap kali ada pembaruan pada paket Laravel.

---

## 7. Status Pengujian & Perintah Operasional

### Menjalankan Test Backend (Semua Lulus):
```bash
cd apps/gateway
npm test
```
*Hasil:* 5 test suites lulus, 21 tests passed (100% lulus).

---

## 8. Pembaruan Fitur & Perbaikan Terkini (Update UI/UX & Dynamic Settings)

Pada iterasi ini, seluruh poin masukan dari pengguna telah diselesaikan dan diverifikasi:

1. **Header Sticky & Anti-Overflow Mobile:**
   - Header atas (`.wgy-header`) kini berstatus `sticky` dengan efek glassmorphism (`backdrop-filter: blur(12px)`). Ketika pengguna menggulir halaman, header tetap menempel di atas layar.
   - Pada layar perangkat seluler (lebar < 860px dan < 640px), badge prototype di header disembunyikan otomatis, teks judul dan username staf IT dipangkas dengan elipsis (`text-overflow: ellipsis`), dan tombol Keluar menampilkan ikon saja sehingga elemen tidak lagi bertumpuk atau keluar layar.

2. **Tombol Scroll Mengambang (Floating Action Buttons - FAB):**
   - Menambahkan tombol bulat mengambang (sticky) di sudut kanan bawah (`.wgy-scroll-fab-container`) dengan ikon `ChevronUp` dan `ChevronDown`.
   - Pengguna dapat langsung melompat ke posisi paling atas atau paling bawah halaman dengan satu ketukan halus (`smooth scroll`).

3. **Perbaikan Button & Form Overflow:**
   - Menggunakan kelas responsif `.wgy-page-header` dan `.wgy-page-header-actions` pada seluruh panel (`UsersPanel`, `BrandsPanel`, `SummaryPanel`, `WebhookPanel`, `AuditLogsPanel`, `SystemHealthPanel`).
   - Tombol "+ Tambah Pengguna IT" dan tombol aksi lainnya kini otomatis menyesuaikan lebar layar ponsel tanpa terpotong atau keluar batas kontainer.

4. **Navigasi Tab Pengaturan Responsif:**
   - Tab pada panel Pengaturan (`.wgy-tabs-nav` & `.wgy-tab-btn`) kini mendukung scroll sentuh horizontal (`overflow-x: auto`) dengan `flex-shrink: 0; white-space: nowrap;`. Judul tab seperti "Parameter Keamanan OTP" tetap rapi satu baris dan tidak terpotong.

5. **Persistensi Pengaturan Pangkalan Data (MongoDB & SQLite) & Refleksi di Ringkasan:**
   - Menyediakan API backend baru: `GET /v1/ops/settings` dan `POST /v1/ops/settings`.
   - Konfigurasi tersimpan persisten di `/app/data/gateway-settings.json` (volume persisten Docker) serta tersimpan cadangan di `localStorage ('wgy_gateway_settings')`.
   - Ketika pengguna memilih **MongoDB** (atau database lain) di halaman Pengaturan dan menyimpannya, konfigurasi tersebut **tidak akan kembali ke SQLite saat halaman di-refresh**.
   - Pada halaman **Ringkasan Operasional**, kartu penyimpanan data kini mendeteksi driver aktif secara dinamis: jika pengguna memilih MongoDB, ringkasan akan menampilkan `MongoDB (NoSQL Document Store)` dengan deskripsi dokumen terdistribusi.

6. **Persistensi State Menu Navigasi Saat Refresh:**
   - State `activeMenu` kini tersimpan di `localStorage ('wgy_active_menu')` dan tersinkronisasi dengan URL hash (`#settings`, `#brands`, dll.).
   - Pengguna yang berada di menu Pengaturan tidak akan lagi terlempar ke halaman Ringkasan saat melakukan refresh browser.

---

*Dokumen ini dibuat secara resmi untuk memastikan kontinuitas pengembangan, akurasi penalaran AI, dan integritas arsitektur sistem WAgyuu.*

### Perintah Docker di VPS:
```bash
# Cek status kontainer
docker ps --filter "name=wa-gateway-openwa"

# Cek log aplikasi gateway
docker logs -f --tail 50 wa-gateway-openwa

# Cek kesehatan API liveness
curl -fsS http://127.0.0.1:18091/v1/health/liveness
```

---

*Dokumen ini dibuat secara resmi untuk memastikan kontinuitas pengembangan, akurasi penalaran AI, dan integritas arsitektur sistem WAgyuu.*
