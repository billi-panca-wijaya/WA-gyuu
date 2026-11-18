<p align="center">
  <img src="apps/gateway/public/wagyuu-logo.jpg" alt="WAgyuu Logo" width="180" style="border-radius: 20px; box-shadow: 0 8px 24px rgba(34, 197, 94, 0.25);" />
</p>

# 🚀 WAgyuu — WhatsApp API Gateway & Multi-Brand OTP Service

[English](README.md) | [Bahasa Indonesia](README.id.md)

**Pembuat & Pengembang:** Billy Panca Wijaya  
**Lisensi:** MIT  
**Domain Live:** [`https://wa-api.billi-panca-wijaya.my.id`](https://wa-api.billi-panca-wijaya.my.id)  
**Dashboard Admin:** [`https://wa-api.billi-panca-wijaya.my.id/admin/login`](https://wa-api.billi-panca-wijaya.my.id/admin/login)

---

> ⚠️ **PEMBERITAHUAN: STATUS MASIH PROTOTYPE (DALAM PENGEMBANGAN AKTIF)**  
> Sistem WAgyuu saat ini masih berstatus **prototype**. Beberapa fitur masih belum lengkap, masih terdapat kemungkinan bug, dan terkadang dapat terjadi error. Sistem ini terus diperbaiki dan diuji coba secara berkala.

---

## 📑 Daftar Isi
1. [Ikhtisar Singkat](#-1-ikhtisar-singkat)
2. [Komponen Utama Sistem](#-2-komponen-utama-sistem)
3. [Tampilan Dashboard (Mobile & Desktop)](#-3-tampilan-dashboard-mobile--desktop)
4. [Pendaftaran Brand & Kredensial API](#-4-pendaftaran-brand--kredensial-api)
5. [Format Pesan OTP WhatsApp](#-5-format-pesan-otp-whatsapp)
6. [Penyimpanan Database](#-6-penyimpanan-database)
7. [Integrasi dengan Aplikasi Laravel](#-7-integrasi-dengan-aplikasi-laravel)
8. [Struktur Direktori Monorepo](#-8-struktur-direktori-monorepo)
9. [Menjalankan di Komputer Lokal](#-9-menjalankan-di-komputer-lokal)
10. [Panduan Docker di Server VPS](#-10-panduan-docker-di-server-vps)

---

## 🎯 1. Ikhtisar Singkat

**WAgyuu** adalah sistem gateway WhatsApp self-hosted yang dirancang untuk kebutuhan pengiriman pesan dan verifikasi kode OTP ke nomor pengguna. Sistem ini dibuat agar kita dapat mengelola pengiriman WhatsApp sendiri melalui server tanpa bergantung pada layanan pihak ketiga berbayar per pesan.

---

## 📦 2. Komponen Utama Sistem

Sistem ini terbagi menjadi 3 bagian:

1. **Gateway Server (`apps/gateway`)**:
   - Backend berbasis **NestJS 11** dan **Node.js 22**.
   - Menggunakan engine **Baileys v7** (koneksi WebSocket langsung, sangat hemat memori RAM < 50MB, tanpa browser Chromium).
   - Menyediakan API publik untuk request OTP, verifikasi kode, dan kirim pesan.

2. **Dashboard Web Admin (`apps/operations-console`)**:
   - Dibuat dengan **React 19** dan **Vite**.
   - Berfungsi untuk mendaftarkan brand, membuat API key, melihat log aktivitas, serta memantau kesehatan server.

3. **Paket Klien Laravel (`src/`)**:
   - Paket Composer (`billi-panca-wijaya/laravel-whatsapp-gateway`) yang bisa langsung dipasang ke aplikasi Laravel Anda.
   - Tidak menimpa file bawaan Laravel Anda (*zero-overwrite*).

---

## 📱 3. Tampilan Dashboard (Mobile & Desktop)

Dashboard admin dirancang agar nyaman digunakan baik di layar laptop/komputer maupun smartphone (mobile):

- **Menu Burger Bar (Drawer Animasi):**
  - Pada layar smartphone/mobile, menu navigasi tersembunyi secara otomatis dan dapat dibuka melalui tombol burger bar dengan animasi slide yang halus.
  - Terdapat latar gelap transparan (backdrop) yang bisa diklik untuk menutup menu.
  - Pada layar desktop, tombol burger dapat digunakan untuk menyembunyikan atau menampilkan sidebar navigasi agar ruang kerja lebih luas.
- **Transisi Cepat:** Navigasi antar halaman berjalan instan tanpa perlu me-refresh halaman browser.
- **Durasi Sesi Nyaman:** Masa aktif login admin diatur lebih panjang (idle 24 jam dan batas sesi 30 hari) agar Anda tidak sering ter-logout sendiri saat membuka dashboard.

---

## 🔑 4. Pendaftaran Brand & Kredensial API

Untuk memudahkan integrasi, proses pembuatan brand dan API key dilakukan dalam **satu langkah**:

1. Klik tombol **`+ Tambah Brand & Buat API Key`**.
2. Masukkan nama brand dan kode.
3. Sistem akan otomatis membuat brand sekaligus menerbitkan **API Key ID** dan **Secret Token**.
4. Salin Secret Token yang muncul (hanya ditampilkan 1 kali demi keamanan) dan masukkan ke file `.env` aplikasi web Anda.

---

## 💬 5. Format Pesan OTP WhatsApp

Pesan OTP dikirim dalam Bahasa Indonesia dan mencantumkan nama brand secara otomatis:

> *"Kode verifikasi **{Nama Brand}** Anda adalah \***{4_DIGIT_CODE}\***. Berlaku 5 menit. Demi keamanan akun Anda, jangan bagikan kode ini kepada siapa pun."*

- `{Nama Brand}`: Diambil sesuai nama brand yang Anda daftarkan di dashboard.
- `{4_DIGIT_CODE}`: 4 angka acak murni (`0000`–`9999`).
- Masa berlaku kode: 5 menit (300 detik).
- Jeda kirim ulang (*cooldown*): 30 detik.
- Batas salah tebak: maksimal 5 kali percobaan.

---

## 🗄️ 6. Penyimpanan Database

WAgyuu menggunakan TypeORM yang mendukung beberapa jenis database:

- **SQLite (Aktif Saat Ini):** Sangat ringan dan tersimpan di file `/app/data/wagyuu.sqlite`. Cocok untuk server mandiri tanpa perlu install database server tambahan.
- **MongoDB / PostgreSQL / MySQL:** Konfigurasi sudah disiapkan di sistem dan panel pengaturan jika di kemudian hari ingin dihubungkan ke server database eksternal.

---

## 🧩 7. Integrasi dengan Aplikasi Laravel

Jika Anda memiliki website berbasis Laravel, Anda cukup memasang paket Composer:

```bash
composer require billi-panca-wijaya/laravel-whatsapp-gateway
```

Lalu tambahkan URL gateway dan API key di file `.env` Laravel:
```env
OPENWA_BASE_URL=https://wa-api.billi-panca-wijaya.my.id
OPENWA_API_KEY=key_brand_anda_disini
WA_OTP_HMAC_SECRET=wgy_live_secret_token_anda
```

Pasang trait `HasWhatsAppLogin` di model User Anda:
```php
use BilliPancaWijaya\WhatsAppGateway\Traits\HasWhatsAppLogin;

class User extends Authenticatable
{
    use HasWhatsAppLogin;
}
```

---

## 📁 8. Struktur Direktori Monorepo

```text
wa-gateway/
├── apps/
│   ├── gateway/                 # Backend NestJS & Baileys engine
│   └── operations-console/      # Dashboard admin React (responsif mobile & desktop)
├── packages/
│   └── contracts/               # Definisi tipe dan kontrak data
├── src/                         # Kode paket klien Laravel
├── resources/frontend/          # Komponen tampilan UI untuk web klien
├── config/                      # File konfigurasi Laravel
├── database/migrations/         # Migrasi tabel Laravel
├── tests/                       # Pengujian otomatis paket Laravel
├── README.md                    # Dokumentasi Bahasa Inggris
└── README.id.md                 # Dokumentasi Bahasa Indonesia
```

---

## 🛠️ 9. Menjalankan di Komputer Lokal

```bash
# 1. Masuk ke folder backend & build
cd apps/gateway
npm install
npm run build

# 2. Masuk ke folder console admin & build
cd ../operations-console
npm install
npm run build

# 3. Jalankan backend secara lokal
cd ../gateway
npm run start:dev
```
Akses dashboard lokal di browser: `http://localhost:18091/admin/login`

---

## 🚢 10. Panduan Docker di Server VPS

- **Nama Kontainer:** `wa-gateway-openwa`
- **Port Internal:** `18091`
- **Volume Data Persisten:** `/www/wwwroot/wa-api.billi-panca-wijaya.my.id/data:/app/data`

### Perintah Cek Kontainer di VPS:
```bash
# Cek status kontainer
docker ps --filter "name=wa-gateway-openwa"

# Cek log gateway
docker logs -f --tail 50 wa-gateway-openwa

# Cek kesehatan endpoint
curl -fsS http://127.0.0.1:18091/v1/health/liveness
```

---

*Dikembangkan oleh **Billy Panca Wijaya** — Catatan: Proyek ini masih berstatus prototype dan dalam tahap pengembangan berkelanjutan.*
