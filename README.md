# RepForge — Production-Grade AI Strength Platform

RepForge is an AI-powered strength training platform built for serious lifters. It pairs high-velocity workout logging with proactive AI analysis grounded entirely in authentic training history — no invented numbers, no fake statistics.

**Tech Stack**:
- **Frontend**: React 18 + Vite, Three.js / React Three Fiber (with graceful 2D/CSS fallbacks and WebGL guards), TanStack Query, Framer Motion.
- **Backend**: Python 3.11 + Flask, Gunicorn, psycopg2, Flask-Limiter, PyJWT, Cryptography.
- **Database**: PostgreSQL (Supabase / Neon / Render Postgres).
- **Authentication**: Google OAuth 2.0 (server-verified with JWKS cryptographic signatures, HTTP-only SameSite cookies, CSRF protection).
- **AI Intelligence**: Google Gemini 2.5 Flash with prompt sanitization and structured context injection.

---

## 1. Local Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL database (e.g. Supabase Postgres)
- Google Cloud OAuth 2.0 Web Client credentials
- Google Gemini API key

### Quick Start

```bash
# 1. Clone repository
git clone <your-repo-url>
cd RepForge

# 2. Setup Backend
cd backend
python -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env      # Configure your environment variables

# 3. Setup Frontend
cd ../frontend
npm install
cp .env.example .env         # Sets VITE_API_URL=http://localhost:5000

# 4. Start Development Servers
# Terminal 1 (Backend):
cd backend && python -m backend.app

# Terminal 2 (Frontend):
cd frontend && npm run dev
```

---

## 2. Environment Variables Reference

### Backend (`.env` or `backend/.env`)

| Variable | Required | Description | Example |
|---|---|---|---|
| `FLASK_ENV` | Yes | App mode | `development` / `production` |
| `SESSION_SECRET` | Yes | 32-byte secret for session signing | `python -c "import secrets; print(secrets.token_hex(32))"` |
| `SESSION_LIFETIME_SECONDS` | No | Session timeout in seconds | `604800` (7 days) |
| `DATABASE_URL` | Yes | PostgreSQL connection URI | `postgresql://user:pass@host:5432/db` |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth Client ID | `...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET`| Yes | Google OAuth Client Secret | `GOCSPX-...` |
| `GOOGLE_REDIRECT_URI` | Yes | Callback URL registered with Google | `https://api.yourdomain.com/auth/google/callback` |
| `GEMINI_API_KEY` | Yes | Gemini API key from AI Studio | `AIzaSy...` |
| `GEMINI_MODEL` | No | Gemini Model identifier | `gemini-2.5-flash` |
| `FRONTEND_URL` | Yes | Frontend client URL | `http://localhost:5173` / `https://your-app.onrender.com` |
| `BACKEND_URL` | Yes | Backend public URL | `http://localhost:5000` / `https://your-api.onrender.com` |
| `CORS_ORIGINS` | Yes | Allowed origins for CORS | `http://localhost:5173,https://your-app.onrender.com` |
| `RATELIMIT_DEFAULT` | No | Default rate limit | `200 per hour` |
| `RATELIMIT_AI` | No | AI endpoint rate limit | `15 per hour` |
| `RATELIMIT_AUTH` | No | Auth endpoint rate limit | `20 per hour` |

### Frontend (`frontend/.env`)

| Variable | Required | Description | Example |
|---|---|---|---|
| `VITE_API_URL` | Yes | Base URL of deployed Flask backend | `http://localhost:5000` (local) or `https://repforge-api.onrender.com` (prod) |

---

## 3. Production Deployment Guide (Render)

RepForge is split into two Render services: a **Web Service** for the Python backend and a **Static Site** for the React frontend.

> **Note**: The backend API is at `https://repforge-w7dh.onrender.com` — this is **not** the app UI.
> Users should access RepForge through the **frontend Static Site URL** (see Step 2 below).

### Step 1: Deploy Backend (Web Service)

1. Connect your repository in the Render Dashboard.
2. Select **New Web Service** and choose your repository.
3. Configure the service:
   - **Name**: `repforge-api` (or any name you like)
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn -w 4 -k sync -b 0.0.0.0:$PORT "backend.app:create_app()"`
4. Add Environment Variables:
   - Set all variables from `.env.example` (`FLASK_ENV=production`, `DATABASE_URL`, `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GEMINI_API_KEY`, etc.).
   - Set `FRONTEND_URL` and `CORS_ORIGINS` to your frontend Render URL (e.g. `https://repforge-app.onrender.com`).
5. Deploy and note your backend URL (e.g. `https://repforge-w7dh.onrender.com`).
6. Update Google Cloud Console: Add `https://<your-backend>.onrender.com/auth/google/callback` to Authorized Redirect URIs.

### Step 2: Deploy Frontend (Static Site)

1. Select **New Static Site** in the Render Dashboard.
2. Configure the service:
   - **Name**: `repforge-app` (or any name you like)
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/dist`
3. Add Environment Variable:
   - `VITE_API_URL`: `https://repforge-w7dh.onrender.com` (your backend URL from Step 1)
4. The SPA rewrite rule is handled automatically by the `frontend/public/_redirects` file — no manual rewrite rule is needed.
5. Click **Create Static Site**.
6. **This is the URL you share with users** — e.g. `https://repforge-app.onrender.com`.

---

## 4. Architecture & Security Invariants

### 1. Zero Trust User Isolation (No IDOR)
- All workout, goal, and analytics queries strictly resolve the current user through the server-side session: `g.user_id`.
- The frontend never passes a user ID in request payloads or query parameters; client-supplied IDs are completely ignored.
- Every SQL query uses strict parameterized placeholders (`%s`) to prevent SQL injection.

### 2. Cryptographic Google OAuth & Session Management
- OAuth login exchanges Google authorization codes securely server-to-server.
- The returned Google ID token is validated cryptographically against Google's public JWKS certificates.
- Sessions are stored in the database (`sessions` table) and transmitted via HTTP-only, SameSite=Lax, Secure cookies.

### 3. Anti-CSRF Token Defense
- Mutating endpoints (`POST`, `PUT`, `DELETE`) require a valid `X-CSRF-Token` header matching the user's session token.
- CSRF tokens are retrieved once upon authentication and maintained strictly in client memory.

### 4. Resilient 3D & WebGL Error Boundaries
- All 3D canvases (Hero scene, ambient particles, coach avatars) are guarded by `isWebGLAvailable()` runtime detection and wrapped in `ThreeErrorBoundary`.
- If WebGL is unsupported or contexts are saturated, components degrade seamlessly to sleek CSS gradients and animations without crashing the page.
- App and page-level Error Boundaries automatically isolate errors and display full debug diagnostics.

---

## 5. Verification & Testing

```bash
# Run backend offline verification
cd backend
python -m unittest discover tests -v

# Run production frontend build
cd frontend
npm run build
```

---

## 6. License
MIT License. Built for lifters who train with intention.
