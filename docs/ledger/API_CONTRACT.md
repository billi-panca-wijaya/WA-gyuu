# API CONTRACT — WAgyuu Central Gateway & Host Adapter

Dokumen Acuan: `03-KONTRAK-API-DAN-CONTOH-KODE.md`
Status: Target Contract (M1 Baseline)

---

## 1. Lapis 1: Browser -> Laravel Host

### 1.1 Konfigurasi Publik
- **Endpoint**: `GET /api/v1/auth/whatsapp/challenge-config`
- **Tujuan**: Memberikan parameter publik untuk modal login pelanggan di browser.
- **Respons (HTTP 200)**:
```json
{
  "data": {
    "brand_name": "INTERWIN",
    "turnstile_site_key": "0x4AAAAAA...",
    "code_length": 4,
    "ttl_seconds": 300,
    "resend_cooldown_seconds": 30
  }
}
```

### 1.2 Minta OTP (Request OTP)
- **Endpoint**: `POST /api/v1/auth/whatsapp/request-otp`
- **Headers**: `X-CSRF-TOKEN`, `X-Operation-Id` (UUID)
- **Payload**:
```json
{
  "phone": "08123456789",
  "turnstile_token": "XXXXX.YYYYY.ZZZZZ"
}
```
- **Respons (HTTP 202 Accepted)**:
```json
{
  "data": {
    "challenge_id": "a57d83c0a60c8c6b9ef3417f9484fb134b06c989",
    "masked_phone": "+62812****789",
    "status": "queued",
    "resend_available_in": 30
  }
}
```

### 1.3 Kirim Ulang OTP (Resend OTP)
- **Endpoint**: `POST /api/v1/auth/whatsapp/resend-otp`
- **Payload**:
```json
{
  "challenge_id": "a57d83c0a60c8c6b9ef3417f9484fb134b06c989",
  "turnstile_token": "XXXXX.YYYYY.ZZZZZ"
}
```
- **Respons (HTTP 202 Accepted)**:
```json
{
  "data": {
    "challenge_id": "b88e94d1b71d9d7c0fa4528a0595fc245c17d090",
    "status": "queued",
    "resend_available_in": 30
  }
}
```

### 1.4 Verifikasi OTP & Finalisasi Login (Verify OTP)
- **Endpoint**: `POST /api/v1/auth/whatsapp/verify-otp`
- **Payload**:
```json
{
  "challenge_id": "a57d83c0a60c8c6b9ef3417f9484fb134b06c989",
  "code": "0472"
}
```
- **Respons (HTTP 200 OK)**:
```json
{
  "data": {
    "user": {
      "id": 12,
      "phone_e164": "+628123456789",
      "name": "Member 6789",
      "created_at": "2026-11-16T14:00:00Z"
    },
    "message": "Login berhasil."
  }
}
```
*(Session cookie Sanctum diset melalui header Set-Cookie standard Laravel).*

---

## 2. Lapis 2: Laravel Host -> WAgyuu Central Gateway

### 2.1 Autentikasi & Header Standar
- Semua permintaan diotentikasi via header:
```http
Authorization: Bearer <WAGYUU_BRAND_API_KEY>
Idempotency-Key: <OPERATION_ID_UUID>
Accept: application/json
Content-Type: application/json
```

### 2.2 Buat Challenge OTP (`POST /v1/otp/challenges`)
- **Scope**: `otp:request`
- **Payload**:
```json
{
  "phone_e164": "+628123456789",
  "purpose": "login",
  "browser_binding": "db206d5fe1b4cdb602127ee7bcbdac5fb660a232ee07bd78b28f297542f043dd"
}
```
- **Respons Sukses (HTTP 202)**:
```json
{
  "data": {
    "challenge_id": "a57d83c0a60c8c6b9ef3417f9484fb134b06c989",
    "challenge_state": "queued",
    "delivery_status": "queued",
    "masked_phone": "+62******789",
    "queue_deadline_at": "2026-11-16T14:00:30Z",
    "expires_at": null,
    "ttl_seconds": 300,
    "resend_available_at": "2026-11-16T14:00:30Z"
  },
  "meta": {
    "request_id": "3f9d8d53-1c44-4be6-93ed-d08ea64d38d3",
    "server_time": "2026-11-16T14:00:00Z"
  }
}
```

### 2.3 Cek Status Challenge (`GET /v1/otp/challenges/{id}`)
- **Respons (HTTP 200)**:
```json
{
  "data": {
    "challenge_id": "a57d83c0a60c8c6b9ef3417f9484fb134b06c989",
    "challenge_state": "pending",
    "delivery_status": "delivered",
    "expires_at": "2026-11-16T14:05:04Z",
    "resend_available_at": "2026-11-16T14:00:30Z",
    "attempts_remaining": 5
  },
  "meta": {
    "request_id": "b6bf8a73-b3ec-46a1-96ad-0fc979325613",
    "server_time": "2026-11-16T14:00:05Z"
  }
}
```

### 2.4 Verifikasi OTP Pusat (`POST /v1/otp/challenges/{id}/verify`)
- **Scope**: `otp:verify`
- **Payload**:
```json
{
  "code": "0472",
  "browser_binding": "db206d5fe1b4cdb602127ee7bcbdac5fb660a232ee07bd78b28f297542f043dd"
}
```
- **Respons Sukses (HTTP 200)**:
```json
{
  "data": {
    "verification_id": "6cb3ba0e-804d-4276-b0d7-40db0a26ee7a",
    "challenge_id": "a57d83c0a60c8c6b9ef3417f9484fb134b06c989",
    "brand_id": "6d2ca2f2-1af9-475a-aa10-a97cbeac19d4",
    "purpose": "login",
    "phone_e164": "+628123456789",
    "browser_binding": "db206d5fe1b4cdb602127ee7bcbdac5fb660a232ee07bd78b28f297542f043dd",
    "verified_at": "2026-11-16T14:01:00Z",
    "result_expires_at": "2026-11-16T14:02:00Z"
  },
  "meta": {
    "request_id": "7ec22f05-90b4-4a6c-84ec-352239aa1329"
  }
}
```
- **Respons Salah (HTTP 401)**:
```json
{
  "error": {
    "code": "OTP_INVALID",
    "message": "Kode tidak sesuai.",
    "retryable": false,
    "attempts_remaining": 4
  },
  "meta": {
    "request_id": "7ec22f05-90b4-4a6c-84ec-352239aa1329"
  }
}
```

### 2.5 Pengelolaan Sesi & Sender
- `GET /v1/capabilities`: Ambil capability gateway (misal: `pairing_methods: ["qr"]`).
- `GET /v1/senders`: Daftar nomor pengirim yang tertaut untuk brand ini.
- `POST /v1/senders`: Daftarkan label sender baru.
- `GET /v1/senders/{id}/pairing`: Ambil QR code pairing terbaru.
- `POST /v1/senders/{id}/test-messages`: Kirim pesan teks uji coba ke nomor trial.
- `GET /v1/logs`: Ambil riwayat log pengiriman yang terikat brand ini.
