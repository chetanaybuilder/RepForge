# RepForge — Biomechanical Strength Operating System

<div align="center">

```
  ____  _____ ____  _____ ___  ____   ____ _____
 |  _ \| ____|  _ \|  ___/ _ \|  _ \ / ___| ____|
 | |_) |  _| | |_) | |_ | | | | |_) | |  _|  _|
 |  _ <| |___|  __/|  _|| |_| |  _ <| |_| | |___
 |_| \_\_____|_|   |_|   \___/|_| \_\\____|_____|
  EDGE-NATIVE STRENGTH INTELLIGENCE & 3D TELEMETRY
```

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-Edge_Runtime-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Cloudflare D1](https://img.shields.io/badge/Cloudflare_D1-Serverless_SQL-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/d1/)
[![Groq Cloud](https://img.shields.io/badge/Groq-LLaMA_3.3_70B-F55036?style=for-the-badge&logo=groq&logoColor=white)](https://groq.com/)
[![React 18](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r170-000000?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Pytest-44_Passed-4EAA25?style=for-the-badge&logo=pytest&logoColor=white)](https://docs.pytest.org/)
[![Vitest](https://img.shields.io/badge/Vitest-10_Passed-729B1B?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

<p align="center">
  <b>RepForge is an edge-native biomechanical strength operating system combining ultra-responsive multi-set workout telemetry with real-time Three.js WebGL visualization.</b><br>
  Powered by Cloudflare Workers, Cloudflare D1 serverless SQL, and Groq LLaMA 3.3 streaming intelligence, it delivers deterministic progressive overload tracking with sub-10ms global latency.
</p>

[**⚡ Experience Live Production App**](https://repforge.chetanaybatra03-8b2.workers.dev) · [**Explore Architecture**](#-system-architecture) · [**View Media Showcase**](#-interactive-showcase) · [**Read Deployment Docs**](DEPLOYMENT.md)

</div>

---

## ✦ Interactive Showcase

### High-Performance Action Demos (Buttery GIFs strictly under 5MB)

|                          🏋️ Multi-Set Logging & Exercise Picker                           |                     🌌 Three.js Interactive 3D Hero & Analytics                     |
| :---------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------: |
| <img src="docs/media/demo-workout-logging.gif" alt="Workout Logging Demo" width="100%" /> | <img src="docs/media/demo-3d-dashboard.gif" alt="3D Dashboard Demo" width="100%" /> |
|       _Sub-millisecond set mutations, searchable 876-movement modal, keyboard nav_        |   _Interactive WebGL orbit controls, dynamic tiering, volume trend trajectories_    |

<div align="center">
  <br>
  <b>🤖 Groq LLaMA 3.3 SSE Real-Time Streaming Tactical Coach</b><br>
  <img src="docs/media/demo-coach-stream.gif" alt="Groq Tactical Coach Streaming" width="70%" />
  <br>
  <i>Sub-50ms Time-to-First-Token, prompt injection sanitized, context-grounded workout telemetry</i>
</div>

---

<details>
<summary><b>📸 Click to Expand High-Resolution Desktop Screenshots (1440 × 900)</b></summary>
<br>

|            Landing Page (Layered Glassmorphism & WebGL Hero)             |              Athlete Login (Google OAuth & Demo Access)              |
| :----------------------------------------------------------------------: | :------------------------------------------------------------------: |
| <img src="docs/media/landing.png" alt="RepForge Landing" width="100%" /> | <img src="docs/media/login.png" alt="RepForge Login" width="100%" /> |

|                      Biomechanical Telemetry Dashboard                       |                Log Workout Console & Exercise Picker Modal                 |
| :--------------------------------------------------------------------------: | :------------------------------------------------------------------------: |
| <img src="docs/media/dashboard.png" alt="RepForge Dashboard" width="100%" /> | <img src="docs/media/workouts.png" alt="RepForge Workouts" width="100%" /> |

|                876-Movement Exercise Library & Filter Engine                 |           Tactical AI Coach (LLaMA 3.3 Telemetry Grounded)           |
| :--------------------------------------------------------------------------: | :------------------------------------------------------------------: |
| <img src="docs/media/exercises.png" alt="RepForge Exercises" width="100%" /> | <img src="docs/media/coach.png" alt="RepForge Coach" width="100%" /> |

|             Quantum Milestone Crystals & Target Tracking             |                                                              |
| :------------------------------------------------------------------: | :----------------------------------------------------------: |
| <img src="docs/media/goals.png" alt="RepForge Goals" width="100%" /> | _Goal progression driving 3D crystalline refractive shaders_ |

</details>

<details>
<summary><b>📱 Click to Expand iPhone 14 Mobile Screenshots (390 × 844)</b></summary>
<br>

|                                 Mobile Dashboard                                  |                                 Mobile Workouts                                 |                               Mobile AI Coach                                |
| :-------------------------------------------------------------------------------: | :-----------------------------------------------------------------------------: | :--------------------------------------------------------------------------: |
| <img src="docs/media/mobile-dashboard.png" alt="Mobile Dashboard" width="100%" /> | <img src="docs/media/mobile-workouts.png" alt="Mobile Workouts" width="100%" /> | <img src="docs/media/mobile-coach.png" alt="Mobile AI Coach" width="100%" /> |

</details>

---

## ✦ System Architecture

```mermaid
flowchart TB
    subgraph Client["Edge Client Layer (Browser)"]
        UI["React 18 + Vanilla CSS Design System"]
        WGL["Three.js r170 WebGL Canvas (Dynamic Tiering)"]
        State["Auth & Toast Contexts · CSRF Interceptor"]
    end

    subgraph Cloudflare["Cloudflare Global Anycast Edge Network"]
        Worker["Cloudflare Worker (Hono Router)"]
        Assets["Cloudflare Assets (Pre-Gzipped SPA Static Bundle)"]
        Cache["Edge Cache Proxy (Exercise Images: 1-Year Immutable)"]
    end

    subgraph Data["Edge Persistence Layer"]
        D1[("Cloudflare D1 SQLite Database\nrepforge-db (APAC)\n9 Tables · 876 Exercises Seeded")]
    end

    subgraph AI["High-Throughput Intelligence Layer"]
        Groq["Groq Cloud API\nLLaMA 3.3 70B Versatile\nSSE Token Streaming (~500 T/s)"]
    end

    Client -->|"HTTPS / Cookie Session / CSRF Token"| Worker
    Worker -->|"Static Asset Pass-Through / SPA Fallback"| Assets
    Worker -->|"Parameterized Prepared Statements"| D1
    Worker -->|"Cached Raw Image CDN Fetch"| Cache
    Worker -->|"Secure SSE Streaming / Prompt Injection Sanitized"| Groq
```

---

## ✦ Architectural Decisions & Tech Stack

| Domain                  | Technology                          | Alternative Evaluated             | Engineering Rationale                                                                                                           |
| :---------------------- | :---------------------------------- | :-------------------------------- | :------------------------------------------------------------------------------------------------------------------------------ |
| **Compute & Routing**   | **Cloudflare Workers (Hono)**       | AWS Lambda / Render Gunicorn      | Sub-10ms global cold starts, zero container provisioning overhead, distributed across 300+ edge locations.                      |
| **Primary Persistence** | **Cloudflare D1 (SQLite)**          | Postgres Connection Pool          | Native serverless binding without socket exhaustion, automated regional replication, microsecond read latencies.                |
| **Neural Engine**       | **Groq LLaMA 3.3 70B Versatile**    | Google Gemini 2.5 / OpenAI GPT-4o | Sub-50ms Time-to-First-Token via LPU inference; exceptional reasoning density for workout telemetry analysis without token lag. |
| **Styling & HUD**       | **Vanilla CSS Design System**       | Tailwind CSS / Styled Components  | Zero CSS runtime overhead, complete granular control over glassmorphism tokens, backdrop filters, and custom CSS scrollbars.    |
| **3D Visualization**    | **Three.js r170 + Dynamic Tiering** | Babylon.js / Static CSS Sprites   | Custom vertex shaders for holographic neural core, dynamic frame-rate budget scaling based on device GPU capacity.              |
| **Exercise Corpus**     | **free-exercise-db (876 items)**    | ExerciseDB RapidAPI               | Public domain (Unlicense), fully offline-resilient, zero API recurring cost, cached at Cloudflare edge.                         |

---

## ✦ Deep Technical Breakdowns

### 1. Dynamic Graphics Tiering & Resilient WebGL

The 3D visualization layer (`DashboardHero3D`, `QuantumGemCanvas`, `CoachAvatarCanvas`) utilizes an adaptive hardware probe:

- **Device Capability Detection**: Inspects `navigator.hardwareConcurrency`, memory hints, and WebGL maximum renderbuffer dimensions.
- **Tier 1 (Ultra / High)**: Full particle counts (1,000+), dynamic lighting, chromatic aberration, post-processing bloom, and 60 FPS continuous animation.
- **Tier 2 (Balanced / Mobile)**: Reduced particle geometry (350), static directional lights, throttled render loop to save battery.
- **Context Loss Recovery**: Canvases listen to `webglcontextlost` and `webglcontextrestored`, re-instantiating geometries without page reloads. If WebGL is entirely unsupported, `ThreeErrorBoundary` mounts an SVG glassmorphism fallback gracefully.

### 2. Prompt Injection Defense & AST Sanitization

RepForge grounds its AI Coach exclusively in verified athlete metrics while neutralizing prompt injection attempts:

```
[ SYSTEM PROMPT: Immutable Coach Persona & Grounding Rules ]
-----------------------------------------------------------
[ VERIFIED CONTEXT: Total Volume, Recent Sets, PRs, Goals ]
-----------------------------------------------------------
[ ATHLETE PROMPT: Sanitized user input (Special tokens stripped) ]
```

- **Delimiter Cleansing**: User input is stripped of markdown block injection markers, system prompt override keywords, and delimiter spoofing attempts.
- **Strict Grounding Enforcement**: The model is instructed to decline queries unrelated to strength training, biomechanics, recovery, or program design.
- **Server-Sent Events (SSE)**: Streamed token chunks are yielded directly via standard `text/event-stream` with heartbeat keep-alives.

### 3. Biomechanical Progression & Epley 1RM Mathematics

Progression metrics, milestones, and volume trends are computed using empirical powerlifting formulas:
$$\text{1RM}_{\text{Epley}} = w \cdot \left(1 + \frac{r}{30}\right) \quad (\text{for } r > 1)$$
$$\text{Total Session Volume} = \sum_{i=1}^{n} w_i \cdot r_i \cdot \text{completed}_i$$

- **Progressive Overload Detection**: Automatically calculates weekly overload deltas ($\Delta \text{Vol} = \text{Vol}_{\text{current}} - \text{Vol}_{\text{previous}}$), alerting athletes to volume surges (>20% risk of overtraining) or volume plateaus.

### 4. Zero-Trust Multi-Tenant Isolation (IDOR Elimination)

- Every mutating and read operation derives user identity exclusively from the cryptographically signed `repforge_session` cookie validated server-side.
- In Cloudflare D1, all queries utilize parameterized statements:
  ```sql
  SELECT * FROM workout_days WHERE user_id = ? ORDER BY date DESC;
  ```
- Client-supplied IDs in URL parameters or JSON request bodies are strictly validated against the authenticated session `user.id`. Any unauthorized cross-tenant attempt immediately throws a structured `403 Forbidden` error.

---

## ✦ Enterprise Security Matrix

| Security Vector        | Threat Model                                   | Mitigation Mechanism                                                                                                                           |
| :--------------------- | :--------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authentication**     | Session Hijacking & Credential Replay          | Cryptographically signed, `HttpOnly`, `SameSite=Lax`, `Secure` session cookies with 7-day TTL and instant revocation.                          |
| **CSRF Protection**    | Cross-Site Request Forgery on Mutating Routes  | Double-Submit Cookie Pattern with cryptographically verified `X-CSRF-Token` headers checked using constant-time comparison.                    |
| **OAuth 2.0 Security** | State Tampering / Replay Attacks               | Ephemeral cryptographic `state` and `nonce` tokens stored with 10-minute expiry; validated during Google callback.                             |
| **SQL Injection**      | Malicious Data Extraction / Database Tampering | 100% prepared SQL statements with positional bindings (`?` for D1, `%s` for Postgres); zero dynamic string concatenation.                      |
| **HTTP Hardening**     | XSS, Clickjacking, MIME Confusion              | Comprehensive headers: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Strict-Transport-Security`. |

---

## ✦ Environment Variables Reference

| Variable               | Target Runtime  | Required | Description                               | Default / Example                                  |
| :--------------------- | :-------------- | :------: | :---------------------------------------- | :------------------------------------------------- |
| `GROQ_API_KEY`         | Worker / Python | **Yes**  | Groq Cloud API Key for LLaMA 3.3          | `gsk_...`                                          |
| `GROQ_MODEL`           | Worker / Python |    No    | Groq LLM Model Identifier                 | `llama-3.3-70b-versatile`                          |
| `GOOGLE_CLIENT_ID`     | Worker / Python | **Yes**  | Google Cloud OAuth 2.0 Client ID          | `...apps.googleusercontent.com`                    |
| `GOOGLE_CLIENT_SECRET` | Worker / Python | **Yes**  | Google Cloud OAuth 2.0 Secret             | `GOCSPX-...`                                       |
| `SESSION_SECRET`       | Worker / Python | **Yes**  | 32-byte secret for session signing        | `0b42f...` (hex token)                             |
| `FRONTEND_URL`         | Worker          |    No    | Canonical origin for redirects            | `https://repforge.chetanaybatra03-8b2.workers.dev` |
| `DATABASE_URL`         | Python Local    |    No    | PostgreSQL connection URI for local Flask | `postgresql://user:pass@host:5432/repforge`        |

---

## ✦ Local Development Quickstart

### Option A: Serverless Edge Development (Recommended)

```bash
# 1. Clone repository
git clone https://github.com/chetanaybuilder/RepForge.git
cd RepForge

# 2. Install dependencies
npm install

# 3. Configure secrets in .dev.vars for Wrangler
cat <<EOF > .dev.vars
GROQ_API_KEY=gsk_your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
EOF

# 4. Run local Cloudflare Workers edge environment with D1
npx wrangler dev
```

Open `http://localhost:8787` in your browser.

---

### Option B: Python Flask Development

```bash
# 1. Set up Python virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# 2. Install Python packages
pip install -r requirements.txt

# 3. Copy environment template and configure
cp .env.example .env

# 4. Build frontend assets
npm run build

# 5. Start Flask development server
python app.py
```

Open `http://localhost:5000` in your browser.

---

## ✦ Automated Verification & Test Suite

RepForge enforces comprehensive full-stack testing across both backend and frontend layers:

```bash
# 1. Run Python unit & integration test suite (44 tests)
pytest

# 2. Run Python formatting & linting checks
python -m ruff check .

# 3. Run React Vitest suite (10 tests)
npm test -- --run

# 4. Run frontend production build
npm run build

# 5. Execute automated Playwright media capture & GIF generator
node tests/e2e/capture_media.js
```

---

## ✦ Live Production Deployment

RepForge is deployed globally on Cloudflare Workers and Cloudflare D1:

- **Live Production URL:** [`https://repforge.chetanaybatra03-8b2.workers.dev`](https://repforge.chetanaybatra03-8b2.workers.dev)
- **Standalone API Gateway:** [`https://repforge-api.chetanaybatra03-8b2.workers.dev`](https://repforge-api.chetanaybatra03-8b2.workers.dev)
- **Instant Demo Athlete Access:** Navigate to `https://repforge.chetanaybatra03-8b2.workers.dev/auth/demo-login` for instant authenticated access as athlete Marcus Vance with historical training logs and PR telemetry.

To deploy code updates directly to Cloudflare:

```bash
npm run build
npx wrangler deploy
```

---

## ✦ Credits & Acknowledgments

- **Exercise Corpus**: 876 movements sourced from [`free-exercise-db`](https://github.com/yuhonas/free-exercise-db) by [yuhonas](https://github.com/yuhonas), released under the [Unlicense](https://unlicense.org/) (Public Domain).
- **LPU Inference**: Powered by [Groq Cloud](https://groq.com/) for lightning-fast LLaMA 3.3 70B token generation.
- **Serverless Edge Network**: Hosted on [Cloudflare Workers](https://workers.cloudflare.com/) and [Cloudflare D1](https://developers.cloudflare.com/d1/).

---

## ✦ License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
Crafted with precision for lifters who demand empirical strength progression.
