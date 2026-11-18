# TEST MATRIX — WAgyuu Acceptance Criteria (AC-01 - AC-36)

Tanggal: 16 November 2026.
Status: Baseline Matrix.

---

| ID | Skenario Uji | Lingkungan Uji | Target Verifikasi | Status Saat Ini |
|---|---|---|---|:---:|
| **AC-01** | Pelanggan meminta OTP valid | Integration Test | 1 challenge dibuat, 1 job antrean kirim, response tanpa plaintext OTP | PENDING (M3) |
| **AC-02** | Kode diawali angka 0 (misal: `0472`) | Unit Test | String 4 karakter dipertahankan utuh (`0472`), tidak menjadi integer `472` | TERAMATI di OtpService lama; PENDING (M3) |
| **AC-03** | Kode tidak diawali angka 0 | Unit Test | String 4 karakter acak tetap valid dan diverifikasi normal | PENDING (M3) |
| **AC-04** | Double click tombol minta OTP | Feature Test | Idempotency-Key mencegah duplikasi pesan dan challenge ganda | PENDING (M3-M4) |
| **AC-05** | Idempotency-Key sama, nomor beda | Feature Test | Ditolak dengan HTTP 409 IDEMPOTENCY_CONFLICT | PENDING (M3) |
| **AC-06** | Resend sebelum 30 detik cooldown | Feature Test | Ditolak dengan HTTP 429 dan header `Retry-After` sisa waktu | PENDING (M3) |
| **AC-07** | Resend valid setelah cooldown | Feature Test | Challenge lama superseded; hanya challenge baru yang bisa diverifikasi | PENDING (M3) |
| **AC-08** | Verifikasi OTP setelah masa 300 detik | Unit Test | Ditolak dengan HTTP 401 OTP_EXPIRED; tidak memperpanjang TTL | PENDING (M3) |
| **AC-09** | 5 kali tebakan salah beruntun | Unit Test | Kuota tebakan habis, challenge locked (HTTP 429) | PENDING (M3) |
| **AC-10** | Dua request verifikasi benar paralel | Concurrency Test | Hanya 1 yang berhasil mengonsumsi challenge (atomic update) | PENDING (M3) |
| **AC-11** | Browser lain mencoba verifikasi challenge ID | Security Test | Ditolak karena browser binding hash tidak cocok | PENDING (M4) |
| **AC-12** | Client brand A mencoba akses sender brand B | Security Test | Ditolak dengan HTTP 403 / 404 (Brand Scope Isolation) | PENDING (M2) |
| **AC-13** | Tidak ada sender yang aktif/siap | Feature Test | Mengembalikan HTTP 503 NO_SENDER_AVAILABLE, tidak fallback ke sender global | PENDING (M3) |
| **AC-14** | Dua sender aktif dalam satu brand | Feature Test | Pemilihan adil (round-robin / least-recently-assigned) tanpa tabrakan lease | PENDING (M3) |
| **AC-15** | Crash worker sebelum pesan terkirim | Resilience Test | Recovery antrean memproses ulang tanpa mengganti OTP | PENDING (M3) |
| **AC-16** | Timeout jaringan setelah pesan terkirim | Resilience Test | Outcome status `unknown`, tidak melakukan blind resend | PENDING (M3) |
| **AC-17** | Delivery receipt terlambat setelah expiry | Edge Case Test | Status delivery dicatat, tetapi status OTP tetap expired | PENDING (M3) |
| **AC-18** | Restart service gateway | Operational Test | Sesi WhatsApp dipulihkan tanpa perlu scan QR ulang jika auth store valid | PENDING (M2) |
| **AC-19** | Unlink sender langsung dari HP | Operational Test | Sesi gateway mendeteksi event logout dan mengubah state ke `logged_out` | PENDING (M2) |
| **AC-20** | Render QR pairing di backoffice | UI / Functional | Tampil persegi, tidak terdistorsi, ada petunjuk waktu berlaku | PENDING (M5) |
| **AC-21** | Member lama login dengan nomor terdaftar | E2E Integration | Akun lokal ditemukan, sesi login Sanctum terbentuk, tidak buat user baru | PASSED di baseline lama; PENDING (M4) |
| **AC-22** | Member baru login dengan nomor baru | E2E Integration | Akun lokal baru dibuat otomatis dengan role customer, sesi login terbentuk | PENDING (M4) |
| **AC-23** | Akun customer berstatus suspended/banned | Security Test | Verifikasi OTP sukses tapi login ditolak sesuai status akun lokal | PENDING (M4) |
| **AC-24** | Pusat verifikasi sukses tapi DB host gagal | Recovery Test | Endpoint pemulihan idempotency mengizinkan finalisasi ulang attempt lokal | PENDING (M4) |
| **AC-25** | Turnstile bot token invalid atau expired | Security Test | Ditolak di layer host Laravel; tidak menerbitkan challenge ke pusat | TERAMATI di baseline; PENDING (M4) |
| **AC-26** | Turnstile token dipakai dua kali paralel | Concurrency Test | Atomic claim di cache menolak request kedua | PENDING (M4) |
| **AC-27** | Layanan Turnstile atau Pusat down | Resilience Test | Fail-closed dengan pesan gangguan aman | PENDING (M4) |
| **AC-28** | Webhook palsu / manipulasi payload | Security Test | Ditolak karena HMAC signature tidak valid | PENDING (M4) |
| **AC-29** | Pencarian credential / OTP di log & respons | Audit Test | Tidak ada plaintext OTP, private key, atau QR raw di log | PENDING (M3-M5) |
| **AC-30** | Tombol Google login tanpa konfigurasi | UI Test | Tombol tidak merusak SPA dan menampilkan instruksi aman | PENDING (M6) |
| **AC-31** | Token Google salah audience/expired | Security Test | Ditolak di server Laravel | PENDING (M6) |
| **AC-32** | Akses endpoint backoffice oleh non-admin | Security Test | HTTP 403 Forbidden di level middleware route Laravel | PENDING (M5) |
| **AC-33** | Deep link URL frontend dan `/api/v1/...` | Routing Test | Apache melayani routing SPA dan API secara presisi | PENDING (M8) |
| **AC-34** | Akses direct ke file `.env` atau sqlite via HTTP | Security Test | Ditolak 403 Forbidden oleh Apache `.htaccess` | PENDING (M8) |
| **AC-35** | Verifikasi setelah pembersihan kode | Regression Test | Build frontend dan API sukses tanpa broken import | PENDING (M7) |
| **AC-36** | Demo dan UAT presentasi | UAT Demo | Seluruh alur presentasi berjalan sesuai skenario PRD Dokumen 06 | PENDING (M8) |
