# RepForge — Biomechanical Strength Operating System

[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r170-black?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)

RepForge is an advanced biomechanical strength intelligence platform. Built for dedicated lifters, it combines high-speed, touch-optimized multi-exercise logging with empirical telemetry and proactive AI coaching grounded exclusively in verified historical training data.

---

## ✦ System Architecture

```
                                  [ CLIENT LAYER ]
               React 18 + Vite · Three.js WebGL Core · Vanilla CSS HUD
                                         │
                        HTTPS / WSS · CSRF Double-Submit · SameSite Cookies
                                         │
                                  [ BACKEND LAYER ]
                Python 3.11 Flask WSGI · Gunicorn · Flask-Limiter
                                         │
               ┌─────────────────────────┴─────────────────────────┐
               ▼                                                   ▼
       [ PERSISTENCE LAYER ]                               [ INTELLIGENCE LAYER ]
 PostgreSQL Connection Pool (50 Conns)              Google Gemini 2.5 Flash Neural Engine
  Supabase / Neon / Render Postgres               Telemetry Sanitization & Overload Vectors
```

---

## ✦ The Four Core Subsystems

### `01` — Log Workout Console
- **Multi-Exercise Execution**: Add unlimited exercise movements per session with reordering and deletions.
- **Micro-Input Set Matrix**: Ultra-compact inline table for sets, weight (kg), target reps, and completion flags.
- **In-Line AI Diagnostics**: Instant neural review of individual workout days with good points, critical warnings, and biomechanical adjustments.

### `02` — Telemetry Dashboard
- **Cumulative Volume Telemetry**: Real-time counter tracking total mechanical load lifted across all sessions.
- **Momentum & Streak Tracking**: Current training streak and historical peak adherence tracking.
- **Progression Trajectory Curve**: Recharts-powered interactive weekly volume curves (kg) over time.
- **Milestone Feed**: High-contrast PR cards displaying peak weights, set-rep schemes, and dates.

### `03` — Tactical AI Trainer
- **Live Telemetry HUD**: 
  - **Volume Trend**: Automatic detection of volume surges or dips against baseline capacity.
  - **Progressive Overload Target**: Micro-loading directives (+2.5kg compound targets or plateau deload protocols).
  - **Recovery & CNS Status**: Central nervous system fatigue warnings for 4+ day streaks and split symmetry indicators.
- **Biomechanical Dialogue**: Context-grounded strength coaching that speaks with concise gym metrics rather than generic filler.
- **Fault-Tolerant Synthesizer**: Client-side algorithmic synthesizer ensuring instant, tailored briefings even under network or rate-limit events.

### `04` — Goals & 3D Crystals
- **Custom Milestone Targets**: Set targets for Weekly Frequency, Exercise Peak PRs, or Total Volume.
- **WebGL Quantum Crystals**: Real-time 3D crystalline milestone objects that react visually as goals are approached and completed.
- **Clean Empty States & Fallbacks**: Fully guarded against uninitialized arrays with safe fallback schemas.

---

## ✦ Enterprise Security & High-Concurrency Hardening

### 1. High-Concurrency Database Architecture (50–100 Concurrent Users)
- **Threaded Connection Pool**: Configured with `minconn=4` and `maxconn=50` (configurable via `DB_MAX_CONNECTIONS`).
- **Active Socket Liveness Verification**: Tests connections with `SELECT 1` ping before dispatching queries, automatically purging dead or dropped cloud sockets (Supabase / Neon idle disconnects).
- **Exponential Backoff Queue**: Requests during peak traffic spikes gracefully back off and queue across 4 retry attempts rather than throwing `PoolError`.
- **Clean Dirty-Socket Disposal**: Any connection marked broken or closed is evicted via `_pool.putconn(conn, close=True)` to prevent pool poisoning.

### 2. Zero-Trust Identity Isolation (No IDOR)
- All workout, goal, and telemetry queries resolve the owner strictly from server-authenticated session state (`g.user_id`).
- Client-supplied IDs in request bodies or query parameters are ignored.
- 100% of database queries execute through parameterized placeholders (`%s`) to render SQL injection impossible.

### 3. Cryptographic Constant-Time Anti-CSRF
- Mutating routes (`POST`, `PUT`, `DELETE`) require an `X-CSRF-Token` header.
- Verification uses `hmac.compare_digest` to prevent timing side-channel attacks.
- Tokens reside strictly in client memory, never in `localStorage` or `sessionStorage`.

### 4. Defense-In-Depth HTTP Security Headers
- **Content Security Policy (CSP)**: Strict boundaries preventing external script injection, clickjacking, and unauthorized resource fetching.
- **Strict-Transport-Security (HSTS)**: 2-year `max-age=63072000; includeSubDomains; preload`.
- **Anti-Clickjacking**: `X-Frame-Options: DENY` and `frame-ancestors 'none'`.
- **MIME Enforcement**: `X-Content-Type-Options: nosniff`.
- **Hardware Isolation**: `Permissions-Policy` completely disabling microphone, camera, geolocation, and USB APIs.

### 5. Resilient WebGL Presentation Boundaries
- All 3D canvases (Neural Core, particles, coach avatars, crystals) feature runtime `isWebGLAvailable()` detection.
- Wrapped inside `ThreeErrorBoundary` and `AIErrorBoundary` to safely isolate graphics failures without crashing the view.

---

## ✦ Environment Variables Reference

Create a `.env` file in the root directory:

| Variable | Required | Description | Default / Example |
|---|---|---|---|
| `FLASK_ENV` | Yes | Application environment | `production` or `development` |
| `SESSION_SECRET` | Yes | 32-byte secret for session signing | `python -c "import secrets; print(secrets.token_hex(32))"` |
| `SESSION_LIFETIME_SECONDS` | No | Session expiration timeout | `604800` (7 days) |
| `DATABASE_URL` | Yes | PostgreSQL connection URI | `postgresql://user:pass@host:5432/dbname` |
| `DB_MIN_CONNECTIONS` | No | Connection pool baseline | `4` |
| `DB_MAX_CONNECTIONS` | No | Max pool capacity for burst traffic | `50` |
| `GOOGLE_CLIENT_ID` | Yes | Google Cloud OAuth Client ID | `...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Yes | Google Cloud OAuth Client Secret | `GOCSPX-...` |
| `GOOGLE_REDIRECT_URI` | Yes | OAuth callback endpoint | `https://<your-app>.com/auth/google/callback` |
| `GEMINI_API_KEY` | Yes | Google AI Studio API Key | `AIzaSy...` |
| `GEMINI_MODEL` | No | Gemini Model Identifier | `gemini-2.5-flash` |
| `RATELIMIT_DEFAULT` | No | Default rate limit per IP | `200 per hour` |
| `RATELIMIT_AI` | No | Rate limit on AI chat requests | `15 per hour` |
| `RATELIMIT_AUTH` | No | Rate limit on login attempts | `20 per hour` |

---

## ✦ Local Development Quickstart

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- PostgreSQL database instance

### 1. Clone & Setup Python Virtual Environment
```bash
git clone https://github.com/chetanaybuilder/RepForge.git
cd RepForge

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your DATABASE_URL, GOOGLE_CLIENT_ID, and GEMINI_API_KEY
```

### 3. Build Frontend Assets
```bash
npm install
npm run build
```

### 4. Start Unified Development Server
```bash
python app.py
```
Open `http://localhost:5000` in your browser.

---

## ✦ Production Deployment (Render)

RepForge is configured to deploy as a unified single-service web application on **Render**:

1. Fork or push this repository to GitHub.
2. Log in to [Render](https://render.com) and click **New > Web Service**.
3. Select your repository.
4. Set the following build configuration:
   - **Runtime**: `Python 3`
   - **Build Command**: `npm install && npm run build && pip install -r requirements.txt`
   - **Start Command**: `gunicorn -w 4 -k sync -b 0.0.0.0:$PORT "app:create_app()"`
5. In **Environment Variables**, supply:
   - `FLASK_ENV`: `production`
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `SESSION_SECRET`: A generated 32-byte hex string
   - `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
   - `GOOGLE_CLIENT_SECRET`: Your Google OAuth secret
   - `GOOGLE_REDIRECT_URI`: `https://<your-service-name>.onrender.com/auth/google/callback`
   - `GEMINI_API_KEY`: Your Gemini API Key
6. Click **Deploy Web Service**.

---

## ✦ Repository Layout

```
RepForge/
├── ai/                     # Gemini AI service integration & system prompts
├── auth/                   # Google OAuth 2.0, session store, CSRF decorators
├── database/               # PostgreSQL connection pool, schema, CRUD queries
│   ├── db.py               # Threaded connection pool with auto-recovery
│   ├── queries_workouts.py # Workout day & exercise CRUD operations
│   └── queries_goals.py    # Goals & achievements queries
├── routes/                 # Flask blueprints (auth, workouts, goals, ai, misc)
├── services/               # Pure calculation services (stats, volume trends, PRs)
├── src/                    # Frontend React 18 application
│   ├── components/         # Reusable UI components, modals, buttons, error boundaries
│   │   └── 3d/             # Three.js WebGL scenes (ambient stars, crystals, avatar)
│   ├── context/            # AuthContext & ToastContext providers
│   ├── hooks/              # useFetch, useWorkouts data hooks
│   ├── pages/              # Landing, Login, Dashboard, Workouts, AI Trainer, Goals
│   ├── services/           # Frontend API client with CSRF interceptor
│   └── styles/             # Modular Vanilla CSS design system (tokens, surfaces, base)
├── app.py                  # Backend application factory & production entrypoint
├── config.py               # Central environment configuration & validations
├── package.json            # Frontend Vite & React dependencies
├── requirements.txt        # Python backend dependencies
└── vite.config.js          # Vite production build bundler configuration
```

---

## ✦ License
MIT License. Crafted for lifters who demand precision.
