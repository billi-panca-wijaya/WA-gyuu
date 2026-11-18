<p align="center">
  <img src="apps/gateway/public/wagyuu-logo.jpg" alt="WAgyuu Logo" width="180" style="border-radius: 20px; box-shadow: 0 8px 24px rgba(34, 197, 94, 0.25);" />
</p>

# 🚀 WAgyuu — Central WhatsApp API Gateway & Multi-Brand OTP Ecosystem

[English](README.md) | [Bahasa Indonesia](README.id.md)

**Author & Developer:** Billy Panca Wijaya  
**License:** MIT  
**Live Production Domain:** [`https://wa-api.billi-panca-wijaya.my.id`](https://wa-api.billi-panca-wijaya.my.id)  
**Operations IT Portal:** [`https://wa-api.billi-panca-wijaya.my.id/admin/login`](https://wa-api.billi-panca-wijaya.my.id/admin/login)

---

## 📑 Table of Contents
1. [Project Overview & Architecture](#-1-project-overview--architecture)
2. [Functional Segregation: Central IT Portal vs Brand Back-Office](#-2-functional-segregation-central-it-portal-vs-brand-back-office)
3. [Monorepo Architecture](#-3-monorepo-architecture)
4. [Central IT Operations Console (Pro Max UI/UX)](#-4-central-it-operations-console-pro-max-uiux)
5. [Unified Brand & API Key Management](#-5-unified-brand--api-key-management)
6. [WhatsApp Engine & 4-Digit OTP Protocol](#-6-whatsapp-engine--4-digit-otp-protocol)
7. [Multi-Driver Database Support (SQLite, MongoDB, PostgreSQL, MySQL)](#-7-multi-driver-database-support)
8. [Laravel Client Package (Spatie-Standard & Zero-Overwrite)](#-8-laravel-client-package-spatie-standard)
9. [Project Directory Structure](#-9-project-directory-structure)
10. [Local Quickstart & Development](#-10-local-quickstart--development)
11. [Docker Deployment & aaPanel Nginx Reverse Proxy on VPS](#-11-docker-deployment--aapanel-nginx-reverse-proxy-on-vps)
12. [Automated Test Suite](#-12-automated-test-suite)
13. [Security & Role-Based Access Control (RBAC)](#-13-security--role-based-access-control-rbac)

---

## 🎯 1. Project Overview & Architecture

**WAgyuu** is an enterprise-grade Central WhatsApp API Gateway and phone number verification platform designed for multi-brand operations. Built to address high-volume WhatsApp OTP delivery at scale, WAgyuu eliminates reliance on costly per-message cloud APIs and provides clean, isolated boundaries between **Central IT Operations** and individual **Brand Web Applications**.

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           BRAND WEB APPLICATIONS (LARAVEL)                      │
│                                                                                 │
│   ┌───────────────────────────┐                ┌────────────────────────────┐   │
│   │ Brand A (e.g. Web Portal) │                │ Brand B (e.g. Mobile Apps) │   │
│   │ Laravel Client Package    │                │ Laravel Client Package     │   │
│   │ Back-Office: WhatsApp Tab │                │ Back-Office: WhatsApp Tab  │   │
│   └─────────────┬─────────────┘                └─────────────┬──────────────┘   │
└─────────────────┼────────────────────────────────────────────┼──────────────────┘
                  │ API Key (Header: x-api-key)                │
                  │ Raw Secret Token (HMAC-SHA256)             │
                  ▼                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│               WAGYUU CENTRAL GATEWAY (NestJS 11 + Baileys Engine)               │
│                                                                                 │
│   Public Domain: https://wa-api.billi-panca-wijaya.my.id                        │
│   Internal Port: 18091 (Docker Container: wa-gateway-openwa)                    │
│                                                                                 │
│   ┌────────────────────────────────┐     ┌──────────────────────────────────┐   │
│   │    Public & Brand API Module   │     │      Central IT Operations       │   │
│   │    - POST /v1/otp/challenge    │     │      - Path: /admin/login        │   │
│   │    - POST /v1/otp/verify       │     │      - Route: /v1/ops/*          │   │
│   │    - POST /v1/messages/send    │     │      - HttpOnly Cookie Session   │   │
│   │    - GET  /v1/capabilities     │     │      - UI/UX Pro Max (ReactBits) │   │
│   └─────────────┬──────────────────┘     └─────────────────┬────────────────┘   │
│                 │                                          │                    │
│                 ▼                                          ▼                    │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │              TypeORM Data Layer (Multi-Driver Ready)                    │   │
│   │   - SQLite (Default Standalone Host Volume: /app/data/wagyuu.sqlite)    │   │
│   │   - MongoDB / PostgreSQL / MySQL (Configurable via Settings Panel)      │   │
│   └─────────────────────────────────────┬───────────────────────────────────┘   │
└─────────────────────────────────────────┼───────────────────────────────────────┘
                                          │ Direct WebSocket
                                          ▼
                             ┌─────────────────────────┐
                             │ Global WhatsApp Network │
                             └─────────────────────────┘
```

---

## 🏢 2. Functional Segregation: Central IT Portal vs Brand Back-Office

WAgyuu enforces strict functional segregation of duties:

1. **Central IT Operations Portal (`/admin/login`, `/v1/ops/*`):**
   - Managed exclusively by the Central IT Infrastructure Team.
   - Core Responsibilities: Brand provisioning, API credential issuance and rotation, gateway runtime memory and health monitoring, infrastructure configuration, and audit log inspection.
   - **Zero Customer Data:** Contains no end-user member accounts and does not handle brand-specific WhatsApp sender QR pairing.

2. **Brand Web Back-Office (Individual Laravel Apps):**
   - Managed by individual brand operators and agents.
   - End-user accounts, member verification histories, and brand-specific WhatsApp sender pool pairing (via QR scan or 8-digit code) are controlled natively within each brand's own back-office.

---

## 📦 3. Monorepo Architecture

This repository is organized as a unified monorepo:

- **`apps/gateway`**: Independent backend microservice built on **NestJS 11** and **Node.js 22**. Provides the core REST API, Baileys WebSocket v7 engine, HMAC verification, audit logging, RBAC guards, and TypeORM persistence layer.
- **`apps/operations-console`**: Modern Single-Page Application (SPA) built with **React 19**, **Vite 6**, **framer-motion**, and UI patterns inspired by **reactbits.dev**. Compiles directly into `apps/gateway/public/admin/`.
- **`packages/contracts`**: Shared TypeScript types, API contracts, interfaces, and DTO definitions.
- **`src/` & Root**: Spatie-standard Laravel client package (`billi-panca-wijaya/laravel-whatsapp-gateway`) providing zero-overwrite consumer integration.

---

## ✨ 4. Central IT Operations Console (Pro Max UI/UX)

The IT Operations Portal is accessible at [`https://wa-api.billi-panca-wijaya.my.id/admin/login`](https://wa-api.billi-panca-wijaya.my.id/admin/login).

### UI/UX Design Highlights:
- **ReactBits.dev Patterns:**
  - `SpotlightCard`: Interactive cards with cursor-following radial spotlight glow.
  - `ShinyText`: Shimmering gradient animation for status indicators.
- **Dark Navy Glassmorphism:** Deep navy palette (`#070d18` / `#0b1220`) with frosted surfaces and WAgyuu green accents (`#22c55e`).
- **Radar Pulse Logo:** The official WAgyuu brand logo features a subtle pulsing radar ring indicating live gateway health.
- **Seamless Reactive Login:** Authentication state transitions smoothly from login to dashboard without requiring full-page reloads.

### Streamlined 7-Menu Navigation:
- **OPERATIONS:**
  1. `Summary`: Gateway memory usage (<50MB RAM), Baileys engine status, active brand count, and infrastructure overview.
  2. `Brand & API Credentials`: Unified brand management and automated API key generation.
  3. `Webhook`: Outbound webhook callback monitoring and SSRF security guidelines.
- **MONITORING:**
  4. `Audit Logs`: Append-only audit trail recording staff actions and API calls with automatic sensitive data scrubbing.
  5. `System Health`: Real-time telemetry covering CPU, Heap Memory, RSS, and storage connection status.
- **ADMINISTRATION:**
  6. `IT Users & Access`: User management for IT staff (Superadmin, Operator, Viewer) with last-superadmin lockout protection.
  7. `Infrastructure Settings`: Comprehensive 5-tab configuration panel (Database, WhatsApp Engine, OTP Parameters, IT Sessions, Network & Logs).
  8. `API Documentation`: Interactive cURL examples and endpoint specifications.

---

## 🔑 5. Unified Brand & API Key Management

To simplify operational workflows, brand onboarding and API credential provisioning are merged into a single flow:

1. **One-Click Action:** Click **`+ Add Brand & Generate API Key`**.
2. **Automated Credential Generation:** The system creates the brand and immediately issues an active API key:
   - **Key ID:** `key_<brand_slug>_<random>` (stored in database).
   - **Raw Secret Token:** `wgy_live_<brand_slug>_<random>` (salted and SHA-256 hashed).
3. **One-Time Secret Reveal:** The raw secret token is presented **only once** upon creation or rotation, complete with an instant copy-to-clipboard button.
4. **Planned Key Rotation:** Supports configurable grace periods (default: 15 minutes) to ensure zero downtime while brand servers update credentials.

---

## ⚡ 6. WhatsApp Engine & 4-Digit OTP Protocol

### WhatsApp Engine (Baileys v7 WebSocket):
- **Chromium-Free:** Runs natively on WebSocket protocols via `@whiskeysockets/baileys`.
- **Extreme Resource Efficiency:** Consumes <50MB RAM (compared to 500MB–1GB RAM per session for headless Chromium implementations).
- **Multi-Device & Multi-Session:** Supports independent concurrent sender connections.

### 4-Digit OTP Protocol Specifications:
- **Format:** Strict 4-digit numeric code (`0000` to `9999`) preserving leading zeroes.
- **Time-to-Live (TTL):** Default 300 seconds (5 minutes).
- **Resend Cooldown:** 30 seconds to prevent message flood abuse.
- **Lockout Threshold:** Maximum 5 invalid verification attempts before the challenge is terminated.
- **Number Masking:** E.164 phone numbers are masked across all logs and console screens (e.g. `+6281****7890`).
- **Cryptographic Verifier:** SHA-256 HMAC hash using timing-safe comparison to prevent timing side-channel attacks.

---

## 🗄️ 7. Multi-Driver Database Support

WAgyuu uses TypeORM with modular driver architecture to fit different infrastructure setups:

| Database Driver | Current Status | Recommended Use Case |
|---|:---:|---|
| **SQLite (Default)** | ✅ **Active in Production** | Ideal for standalone VPS / single-container setups. Persisted to `/app/data/wagyuu.sqlite` via host volume with zero server overhead. |
| **MongoDB** | ⚙️ **Configuration Ready** | Optimal for high-throughput, document-oriented distributed clusters. |
| **PostgreSQL** | ⚙️ **Configuration Ready** | Best choice for enterprise relational databases with high transactional concurrency. |
| **MySQL / MariaDB** | ⚙️ **Configuration Ready** | Fully supported for standard enterprise SQL deployments. |

Database connection strings, pool sizes, and storage directories can be inspected and adjusted in the **Database Storage** tab under Infrastructure Settings.

---

## 🧩 8. Laravel Client Package (Spatie-Standard)

The included client package (`billi-panca-wijaya/laravel-whatsapp-gateway`) adheres to Spatie's open-source package conventions:

### Zero-Overwrite Guarantee:
Your existing Laravel application codebase is completely preserved:
- **User Model:** Simply add `use HasWhatsAppLogin;` in `app/Models/User.php`.
- **Package Auto-Discovery:** `WhatsAppGatewayServiceProvider` and the `WhatsAppGateway` facade register automatically.
- **Defensive Migrations:** Database migrations safely check for column existence before creating fields like `phone_e164` and `phone_verified_at`.

### Facade Usage Example:
```php
use BilliPancaWijaya\WhatsAppGateway\Facades\WhatsAppGateway;

// 1. Request an OTP challenge for a phone number
$challenge = WhatsAppGateway::requestOtp('+6281234567890');
// Returns: ['challenge_id' => '...', 'state' => 'queued', 'masked_phone' => '+6281****7890']

// 2. Verify the 4-digit code provided by the user
$result = WhatsAppGateway::verifyOtp($challenge['challenge_id'], '1234');
// Returns: ['user' => $userInstance, 'created' => true/false]

// 3. Send custom text message through active sender pool
WhatsAppGateway::sendMessage('+6281234567890', 'Hello, your order has been confirmed!');
```

---

## 📁 9. Project Directory Structure

```text
wa-gateway/
├── apps/
│   ├── gateway/                        # NestJS 11 Gateway Backend
│   │   ├── Dockerfile                  # Production Image (Node 22 Bookworm Slim)
│   │   ├── package.json                # Dependencies (NestJS, Baileys, TypeORM)
│   │   ├── public/                     # Public Assets (wagyuu-logo.jpg, admin/ SPA)
│   │   └── src/
│   │       ├── main.ts                 # Server Bootstrap (Port 18091)
│   │       ├── app.controller.ts       # Root redirect & SPA serving
│   │       └── modules/
│   │           ├── admin-ops/          # Central IT Portal (Brands, Keys, Health, Logs)
│   │           ├── authentication/     # Brand API Key Guard (x-api-key HMAC)
│   │           ├── otp/                # 4-Digit OTP Challenge & Verify Engine
│   │           ├── platform-auth/      # IT Staff Auth, Cookie Sessions & Audit
│   │           └── whatsapp-sessions/  # Baileys Multi-Device Adapter
│   │
│   └── operations-console/             # IT Portal Frontend (React 19 + Vite 6 + Motion)
│       ├── package.json                # Console UI Dependencies
│       ├── vite.config.ts              # Build target: apps/gateway/public/admin/
│       └── src/
│           ├── components/
│           │   ├── BrandsPanel.tsx     # Unified Brand & API Key Panel
│           │   ├── SettingsPanel.tsx   # 5-Tab Infrastructure Settings
│           │   ├── SummaryPanel.tsx    # Metrics & Infrastructure Dashboard
│           │   ├── WebhookPanel.tsx    # Clean Webhook Panel
│           │   └── ui/                 # ReactBits Components (SpotlightCard, ShinyText)
│           └── styles/portal.css       # Dark Navy Theme & Keyframes
│
├── packages/
│   └── contracts/                      # Shared Data Contracts & TypeScript DTOs
│
├── deploy/
│   ├── compose.yaml                    # Production Compose (wa-gateway-openwa)
│   └── aapanel/                        # Nginx Reverse Proxy Templates
│
├── src/                                # Laravel Client Package (Spatie Style)
│   ├── WhatsAppGateway.php             # Core Service Manager
│   ├── WhatsAppGatewayServiceProvider.php
│   ├── Facades/WhatsAppGateway.php     # Laravel Facade
│   ├── Traits/HasWhatsAppLogin.php     # User Model Trait
│   └── Http/Controllers/              # OTP & Brand Back-Office Controllers
│
├── database/migrations/                # Defensive Laravel Migrations
├── config/whatsapp-gateway.php         # Laravel Package Configuration
├── composer.json                       # Laravel Package Manifest
├── README.md                           # English Documentation
└── README.id.md                        # Indonesian Documentation
```

---

## 🛠️ 10. Local Quickstart & Development

### Prerequisites:
- Node.js 22+ & npm
- PHP 8.2+ & Composer (for testing Laravel integration)

### Running Gateway & Console Locally:
```bash
# 1. Install gateway dependencies & build backend
cd apps/gateway
npm install
npm run build

# 2. Install console dependencies & build frontend SPA
cd ../operations-console
npm install
npm run build

# 3. Start local gateway in development mode
cd ../gateway
npm run start:dev
```
Open your browser and navigate to `http://localhost:18091/admin/login`

---

## 🚢 11. Docker Deployment & aaPanel Nginx Reverse Proxy on VPS

### Production Server Specs:
- **Host VPS:** `84.247.148.115`
- **Container Name:** `wa-gateway-openwa`
- **Docker Image:** `wagyuu-gateway:1.0.0` (and `latest`)
- **Port:** `127.0.0.1:18091:18091`
- **Volume Mount:** `/www/wwwroot/wa-api.billi-panca-wijaya.my.id/data:/app/data`

### aaPanel Nginx Reverse Proxy Configuration:
Add this proxy rule under `wa-api.billi-panca-wijaya.my.id`:
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

### Container Management Commands:
```bash
# Check container status
docker ps --filter "name=wa-gateway-openwa"

# View real-time container logs
docker logs -f --tail 100 wa-gateway-openwa

# Check API health endpoint
curl -fsS http://127.0.0.1:18091/v1/health/liveness
```

---

## 🧪 12. Automated Test Suite

Run the full automated test suite using Jest:
```bash
cd apps/gateway
npm test
```

Verification output:
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

## 🛡️ 13. Security & Role-Based Access Control (RBAC)

The Central IT Operations Portal enforces tiered privileges:

| Operational Feature / Action | Superadmin | Operator | Viewer |
|---|:---:|:---:|:---:|
| **View System Summary & Telemetry** | ✅ Yes | ✅ Yes | ✅ Yes |
| **View Brand List & Metadata** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Add Brand & Generate API Key\*** | ✅ Yes | ❌ No | ❌ No |
| **Rotate API Key (Grace Period)\*** | ✅ Yes | ❌ No | ❌ No |
| **Revoke API Key Permanently\*** | ✅ Yes | ❌ No | ❌ No |
| **Pause / Resume Brand Service\*** | ✅ Yes | ❌ No | ❌ No |
| **Delete Brand & Cascaded Keys\*** | ✅ Yes | ❌ No | ❌ No |
| **View IT & API Audit Logs** | ✅ Yes | ✅ Yes | ✅ Yes |
| **View Security Logs & Failed Logins** | ✅ Yes | ❌ No | ❌ No |
| **View Infrastructure Settings** | ✅ Yes | ✅ Yes | ❌ No |
| **Modify Infrastructure Settings\*** | ✅ Yes | ❌ No | ❌ No |
| **Manage IT Staff Users\*** | ✅ Yes | ❌ No | ❌ No |
| **Last-Superadmin Lockout Protection** | 🔒 Enforced | — | — |

*\* Sensitive operations require elevated password confirmation (5-minute re-auth window).*

---

*Developed by **Billy Panca Wijaya** for secure, isolated, and scalable enterprise WhatsApp Gateway infrastructure.*
