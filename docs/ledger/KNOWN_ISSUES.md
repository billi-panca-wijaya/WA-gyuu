# KNOWN ISSUES — WAgyuu Prototype

Tanggal: 16 November 2026.
Status: Audit Baseline M0.

---

| Issue ID | Area | Deskripsi Masalah | Dampak | Rencana Resolusi |
|---|---|---|---|---|
| **ISSUE-01** | Dependency Lock | Paket `wa-gateway` lama memerlukan `guzzlehttp/guzzle: ^7.8`, sedangkan host `laravel-headless-starter` mengunci Guzzle pada `8.2.0` (Laravel 13). | Pemasangan paket lama ke host via Composer gagal akibat konflik versi Guzzle. | Gunakan `CentralGatewayClient` tipis berbasis `Illuminate\Support\Facades\Http` (Laravel HTTP client bawaan) tanpa dependensi langsung pada Guzzle versi tertentu. |
| **ISSUE-02** | Google Auth Contract | `AuthModal.tsx` mengirimkan Google OAuth `access_token` melalui key request `id_token`, sementara backend `AuthController.php` memanggil Google userinfo API dengan token tersebut. | Penamaan field membingungkan (`id_token` vs `access_token`) dan jika GIS One Tap diaktifkan di masa depan akan menyebabkan verifikasi JWT gagal. | Sesuaikan kontrak autentikasi Google di M6: verifikasi `id_token` JWT via client library resmi di server side, atau klarifikasi endpoint untuk access token. |
| **ISSUE-03** | Turnstile Replay Window | Token Cloudflare Turnstile memiliki masa hidup 300 detik dan verifikasi Siteverify Cloudflare membutuhkan propagasi untuk mendeteksi reuse jika dua request datang paralel sangat cepat. | Potensi race condition jika dua request masuk secara bersamaan dengan token yang sama. | Terapkan atomic token claim di shared cache (Redis) dengan expiry 300 detik pada level host Laravel. |
| **ISSUE-04** | User Schema Alteration | Migration `0001_create_whatsapp_user_columns.php` lama di `wa-gateway` mengubah kolom `name` dan `email` tabel `users` menjadi nullable, dan rollback `down()` menghapus kolom-kolom host. | Bahaya data loss jika rollback dijalankan pada database yang sudah ada user aktif. | Jangan gunakan migration lama tersebut. Gunakan tabel terpisah `wa_login_attempts` untuk state verifikasi dan kaitkan dengan user ID lokal tanpa merusak schema `users`. |
| **ISSUE-05** | Embedded OpenWA Dashboard | Frontend starter menyalin bundle UI OpenWA (`src/openwa`) dengan CSS override kompleks di `vite.config.ts`, banyak menu teknis (Chats, Plugins, Infrastructure) yang menghasilkan error 501. | Tampilan backoffice membingungkan pengelola brand dan menambah ukuran bundle JS secara tidak perlu. | Ganti dengan 5 menu backoffice ringan di M5, lalu pensiunkan folder `src/openwa` di M7. |
