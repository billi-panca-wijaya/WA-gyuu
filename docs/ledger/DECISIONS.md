# ARCHITECTURE DECISIONS (ADR) — WAgyuu

Tanggal: 16 November 2026.
Status: Disetujui (Approved).

---

### D-01: Penamaan Produk adalah WAgyuu
- **Konteks**: Nama produk sebelumnya berganti-ganti antara `wa-gateway`, `WA-api-otp`, `openwa`, dan repositori GitHub `WA-gyuu`.
- **Keputusan**: Gunakan merek tunggal **WAgyuu** untuk label UI, dokumentasi aktif, dan paket integrasi baru. Repositori upstream dan nama akun GitHub yang sah tetap dihormati tanpa penghapusan paksa.
- **Konsekuensi**: Kode baru dan namespace baru menggunakan identitas WAgyuu yang konsisten.

### D-02: Pemisahan Server Pusat (Central API Gateway) dan Web Host
- **Konteks**: Pada implementasi awal, web Laravel mencoba menjalankan koneksi WhatsApp langsung di proses PHP request atau daemon lokal yang berat.
- **Keputusan**: WAgyuu berjalan sebagai server API terpisah yang menangani sesi WhatsApp, pengiriman pesan, dan challenge OTP. Web Laravel tetap fokus pada manajemen member, otorisasi lokal, session login Sanctum, dan tampilan web/backoffice.
- **Konsekuensi**: Web tidak lagi menjalankan koneksi WhatsApp per HTTP request dan tidak mengontrol daemon socket langsung.

### D-03: Stack Teknologi Pusat Menggunakan TypeScript / NestJS
- **Konteks**: Upstream OpenWA telah memiliki implementasi stabil koneksi WhatsApp multi-device (Baileys) dalam TypeScript/NestJS. Upaya membuat native WhatsApp protocol dalam PHP murni (`bin/wa-gateway-daemon`) terbukti sangat rapuh, sulit didebug, dan membebani server PHP.
- **Keputusan**: Runtime pusat dibangun menggunakan Node.js / TypeScript / NestJS dengan mengadopsi pola engine Baileys dari referensi OpenWA. PHP tetap digunakan di Laravel host, dan React tetap digunakan di frontend. Tidak menulis ulang protokol WhatsApp di PHP.
- **Konsekuensi**: Memerlukan runtime Node.js >=22 di server untuk menjalankan gateway pusat.

### D-04: Host Laravel Utama adalah `laravel-headless-starter`
- **Konteks**: Terdapat dua folder host: `laravel-headless-starter` dan `WA-api-otp`.
- **Keputusan**: `laravel-headless-starter` ditetapkan sebagai host utama karena memiliki struktur Laravel 13 bersih, suite test lengkap, dan frontend React. Perbaikan yang terbukti dari `WA-api-otp` (jika ada) diadopsi secara selektif.
- **Konsekuensi**: `WA-api-otp` dijadikan referensi historis read-only.

### D-05: Isolasi Brand Mandiri & Zero Configuration di Backoffice Brand
- **Konteks**: Pengelola toko/brand tidak boleh dibebani konfigurasi teknis rumit (API key, webhook URL, database connection, atau Docker).
- **Keputusan**: Pengelola brand cukup membuka menu WhatsApp di backoffice web mereka, menambah nama sender, dan scan QR code. Integrasi backend ke gateway pusat dikonfigurasi sekali oleh administrator server melalui environment host.
- **Konsekuensi**: Browser brand tidak pernah memegang master API key atau credential gateway pusat.

### D-06: Database Metadata Demo Pusat: SQLite + Redis; Host: MySQL
- **Konteks**: Server target aaPanel tidak mendukung instalasi MongoDB. Upstream OpenWA mendukung SQLite dan PostgreSQL. Host Laravel telah menggunakan MySQL.
- **Keputusan**: Untuk demonstrasi single-instance, pusat WAgyuu menggunakan SQLite terisolasi untuk data relasional/challenge dan Redis untuk queue outbox/rate-limiting. Host Laravel tetap menggunakan MySQL.
- **Konsekuensi**: Tidak ada kebutuhan instalasi MongoDB di aaPanel.

### D-07: Format Kode OTP 4-Digit Numerik Acak (`0000`–`9999`)
- **Konteks**: Kebutuhan bisnis adalah login passwordless menggunakan 4 digit angka acak melalui WhatsApp.
- **Keputusan**: Generator OTP menggunakan `crypto.randomInt(0, 10000)` yang diformat dengan `padStart(4, '0')`. Awalan nol dipertahankan (`0472` adalah valid dan tetap 4 digit string).
- **Konsekuensi**: Verifier dan input frontend memperlakukan kode sebagai string 4 digit.

### D-08: Jalur Deployment Utama: aaPanel Apache (Tanpa Ketergantungan Docker)
- **Konteks**: VPS aaPanel pengguna menjalankan server web Apache dan PHP-FPM tanpa Docker daemon.
- **Keputusan**: Seluruh artefak deploy disiapkan untuk berjalan sebagai systemd service mandiri (`wagyuu-gateway.service`) dan Apache reverse proxy (`/v1` -> `http://127.0.0.1:PORT`).
- **Konsekuensi**: Tidak menggunakan `docker compose up` sebagai prasyarat rilis akhir.

### D-09: Portal IT Pusat, RBAC, dan Pemisahan Boundary Autentikasi
- **Konteks**: Tim IT membutuhkan konsol pusat untuk mengelola brand, menerbitkan/merotasi API key, memantau pengiriman OTP, dan menyelidiki log secara terisolasi tanpa mencampuradukkan login member atau backoffice pengelola brand.
- **Keputusan**: 
  1. Dibangun `operations-console` (React + TypeScript + Dark Navy Tokens) di `/admin`.
  2. Autentikasi dipisah tegas di level guard: `OpsAuthGuard` untuk sesi IT manusia (session cookie/token, idle 15m/max 8h, reauth 5m untuk aksi sensitif) dan `BrandAuthGuard` untuk API key machine-to-machine.
  3. Brand API key tidak memiliki izin mengakses endpoint operasional `/v1/ops/*`.
  4. Superadmin awal dibuat via CLI interaktif `npm run cli:bootstrap-admin` tanpa password hardcoded atau default credential di kode sumber.
  5. Kredensial API berlabel manusia, berbatas waktu, dan raw secret hanya ditampilkan sekali (one-time reveal) dengan dukungan rotasi ber-grace period (default 15m) serta pencabutan permanen.
- **Konsekuensi**: Member dan backoffice brand tetap mandiri di host masing-masing; IT pusat memiliki visibilitas dan kontrol penuh yang diaudit secara aman.

### D-10: Kontainerisasi Docker Dedicated `wa-gateway-openwa` pada VPS
- **Konteks**: Pengguna meminta deployment container Docker `wa-gateway-openwa` di VPS untuk menggantikan container OpenWA standar lama, sekaligus mempertahankan integrasi aaPanel reverse proxy pada port `127.0.0.1:18091`.
- **Keputusan**:
  1. Dibangun image Docker `wagyuu-gateway:1.0.0` berbasis `node:22-bookworm-slim` berukuran ringkas (~165MB terkompresi).
  2. Container diberi nama sesuai permintaan `wa-gateway-openwa` dan diorkestrasi via `compose.yaml` di `/www/docker/wa-gateway/deploy`.
  3. Bind mount volume persisten `/www/wwwroot/wa-api.billi-panca-wijaya.my.id/data:/app/data` digunakan untuk menjamin data SQLite (`wagyuu.sqlite`) dan kredensial sesi Baileys tetap awet antar siklus kontainer.
  4. Host systemd service `wagyuu-gateway.service` dihentikan & di-disable agar port 18091 loopback sepenuhnya dikuasai Docker container.
- **Konsekuensi**: Deployment sepenuhnya berbasis Docker sesuai standar operasional kontainer VPS pengguna, dengan performa ramah memori (~52MB RAM) dan status healthy.
