<p align="center">
  <img src="apps/gateway/public/wagyuu-logo.jpg" alt="WAgyuu Logo" width="180" style="border-radius: 20px; box-shadow: 0 8px 24px rgba(34, 197, 94, 0.25);" />
</p>

# 🚀 WAgyuu — WhatsApp API Gateway & Multi-Brand OTP Service

[English](README.md) | [Bahasa Indonesia](README.id.md)

**Author & Developer:** Billy Panca Wijaya  
**License:** MIT  
**Live Domain:** [`https://wa-api.billi-panca-wijaya.my.id`](https://wa-api.billi-panca-wijaya.my.id)  
**Admin Dashboard:** [`https://wa-api.billi-panca-wijaya.my.id/admin/login`](https://wa-api.billi-panca-wijaya.my.id/admin/login)

---

> ⚠️ **NOTICE: PROTOTYPE STATUS (ACTIVE WORK IN PROGRESS)**  
> The WAgyuu system is currently a **prototype**. Some features are not yet complete, bugs may still exist, and unexpected errors can occasionally occur. This project is actively being developed, tested, and iterated upon.

---

## 📑 Table of Contents
1. [Brief Overview](#-1-brief-overview)
2. [Core System Components](#-2-core-system-components)
3. [Dashboard Interface (Mobile & Desktop)](#-3-dashboard-interface-mobile--desktop)
4. [Brand Registration & API Credentials](#-4-brand-registration--api-credentials)
5. [WhatsApp OTP Message Format](#-5-whatsapp-otp-message-format)
6. [Database Storage](#-6-database-storage)
7. [Integrating with Laravel Applications](#-7-integrating-with-laravel-applications)
8. [Monorepo Directory Structure](#-8-monorepo-directory-structure)
9. [Running Locally](#-9-running-locally)
10. [Docker on VPS Guide](#-10-docker-on-vps-guide)

---

## 🎯 1. Brief Overview

**WAgyuu** is a self-hosted WhatsApp gateway designed to send messages and verify one-time passwords (OTP) to user phone numbers. It allows you to run and control your own WhatsApp delivery service without recurring per-message cloud fees.

---

## 📦 2. Core System Components

The system consists of three parts:

1. **Gateway Server (`apps/gateway`)**:
   - Backend built with **NestJS 11** and **Node.js 22**.
   - Powered by the **Baileys v7** engine (direct WebSocket protocol, lightweight RAM footprint < 50MB, no Chromium browser required).
   - Provides public REST APIs for OTP requests, code verification, and message dispatch.

2. **Admin Web Dashboard (`apps/operations-console`)**:
   - Built with **React 19** and **Vite**.
   - Used to register brands, generate API credentials, view audit logs, and monitor server health.

3. **Laravel Client Package (`src/`)**:
   - Composer package (`billi-panca-wijaya/laravel-whatsapp-gateway`) ready to install into your Laravel websites.
   - Preserves existing host code with a zero-overwrite guarantee.

---

## 📱 3. Dashboard Interface (Mobile & Desktop)

The admin dashboard is responsive and works smoothly across mobile phones and desktop displays:

- **Animated Hamburger Menu (Drawer):**
  - On mobile phones, the navigation menu is hidden by default and slides into view smoothly when clicking the burger button.
  - An animated dark backdrop overlay allows you to tap outside to dismiss the menu.
  - On desktop screens, the burger button collapses or expands the sidebar for a distraction-free view.
- **Fast State Transitions:** Navigating between tabs occurs seamlessly without full-page browser reloads.
- **Comfortable Session Duration:** Admin login sessions stay active longer (24-hour idle timeout and 30-day session maximum) so you are not logged out abruptly.

---

## 🔑 4. Brand Registration & API Credentials

Brand creation and credential provisioning are handled in **one unified step**:

1. Click **`+ Add Brand & Generate API Key`**.
2. Enter the brand name and slug.
3. The system creates the brand and automatically generates an **API Key ID** and **Secret Token**.
4. Copy the revealed Secret Token (displayed only once for security) and paste it into your web application's `.env` file.

---

## 💬 5. WhatsApp OTP Message Format

OTP messages are delivered in Indonesian and automatically inject the registered brand name:

> *"Kode verifikasi **{Nama Brand}** Anda adalah \***{4_DIGIT_CODE}\***. Berlaku 5 menit. Demi keamanan akun Anda, jangan bagikan kode ini kepada siapa pun."*

- `{Nama Brand}`: Dynamically loaded from your brand registration.
- `{4_DIGIT_CODE}`: 4 pure random numeric digits (`0000`–`9999`).
- Code validity: 5 minutes (300 seconds).
- Resend cooldown: 30 seconds.
- Max invalid attempts: 5 tries before lockout.

---

## 🗄️ 6. Database Storage

WAgyuu uses TypeORM with support for multiple database engines:

- **SQLite (Currently Active):** Lightweight file storage at `/app/data/wagyuu.sqlite`. Ideal for standalone single-container deployments without external database services.
- **MongoDB / PostgreSQL / MySQL:** Driver configurations are pre-wired and can be toggled via settings if connecting to an external database cluster.

---

## 🧩 7. Integrating with Laravel Applications

If your website is built on Laravel, simply require the Composer package:

```bash
composer require billi-panca-wijaya/laravel-whatsapp-gateway
```

Add your gateway URL and credentials to `.env`:
```env
OPENWA_BASE_URL=https://wa-api.billi-panca-wijaya.my.id
OPENWA_API_KEY=your_brand_key_here
WA_OTP_HMAC_SECRET=your_live_secret_token_here
```

Attach the `HasWhatsAppLogin` trait to your User model:
```php
use BilliPancaWijaya\WhatsAppGateway\Traits\HasWhatsAppLogin;

class User extends Authenticatable
{
    use HasWhatsAppLogin;
}
```

---

## 📁 8. Monorepo Directory Structure

```text
wa-gateway/
├── apps/
│   ├── gateway/                 # NestJS backend & Baileys engine
│   └── operations-console/      # React admin console (mobile & desktop responsive)
├── packages/
│   └── contracts/               # Shared TypeScript types & DTO schemas
├── src/                         # Laravel client package source code
├── resources/frontend/          # Publishable UI components for consumer apps
├── config/                      # Laravel package configuration
├── database/migrations/         # Laravel defensive migrations
├── tests/                       # Automated PHPUnit package tests
├── README.md                    # English documentation
└── README.id.md                 # Indonesian documentation
```

---

## 🛠️ 9. Running Locally

```bash
# 1. Install & build gateway backend
cd apps/gateway
npm install
npm run build

# 2. Install & build admin console
cd ../operations-console
npm install
npm run build

# 3. Start local development server
cd ../gateway
npm run start:dev
```
Open your browser at `http://localhost:18091/admin/login`

---

## 🚢 10. Docker on VPS Guide

- **Container Name:** `wa-gateway-openwa`
- **Internal Port:** `18091`
- **Persistent Volume:** `/www/wwwroot/wa-api.billi-panca-wijaya.my.id/data:/app/data`

### Helpful Container Commands:
```bash
# Check container status
docker ps --filter "name=wa-gateway-openwa"

# View real-time logs
docker logs -f --tail 50 wa-gateway-openwa

# Check health endpoint
curl -fsS http://127.0.0.1:18091/v1/health/liveness
```

---

*Developed by **Billy Panca Wijaya** — Note: This project is currently in prototype status under active development.*
