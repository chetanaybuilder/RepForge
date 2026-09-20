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
npm install
npm run build

# 4. Start Development Server
python app.py
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
| `GEMINI_API_KEY` | Yes | Gemini API key from AI Studio | `AIzaSy...` |
| `GEMINI_MODEL` | No | Gemini Model identifier | `gemini-2.5-flash` |
| `RATELIMIT_DEFAULT` | No | Default rate limit | `200 per hour` |
| `RATELIMIT_AI` | No | AI endpoint rate limit | `15 per hour` |
| `RATELIMIT_AUTH` | No | Auth endpoint rate limit | `20 per hour` |

---

## 3. Production Deployment Guide (Render)

## 3. Production Deployment Guide (Render)

RepForge is a unified application that hosts both the frontend and backend together in a single Render **Web Service**.

1. Connect your repository in the Render Dashboard.
2. Select **New Web Service** and choose your repository (or use the provided `render.yaml`).
3. Configure the service:
   - **Name**: `repforge`
   - **Environment**: `Python 3`
   - **Build Command**: `npm install && npm run build && pip install -r requirements.txt`
   - **Start Command**: `gunicorn -w 4 -k sync -b 0.0.0.0:$PORT "app:create_app()"`
4. Add Environment Variables:
   - Set all required variables from `.env.example` (`FLASK_ENV=production`, `DATABASE_URL`, `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GEMINI_API_KEY`).
5. Deploy and note your web service URL (e.g. `https://repforge.onrender.com`).
6. Update Google Cloud Console: Add `https://<your-app>.onrender.com/auth/google/callback` to Authorized Redirect URIs.

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
