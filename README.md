<div align="center">

# RepForge

### A mobile-first strength training platform with intelligent coaching.

Log every set, measure progress, and receive training insights grounded in your own workout history.

<p>
  <a href="https://github.com/chetanaybuilder/RepForge/actions/workflows/ci.yml">
    <img src="https://github.com/chetanaybuilder/RepForge/actions/workflows/ci.yml/badge.svg" alt="CI status">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license">
  </a>
  <img src="https://img.shields.io/badge/version-1.0.0-00D2FF.svg" alt="Version 1.0.0">
  <img src="https://img.shields.io/badge/node-%3E%3D18.18-brightgreen.svg" alt="Node.js 18.18 or newer">
  <img src="https://img.shields.io/badge/deployed%20on-Cloudflare-F38020.svg" alt="Cloudflare deployment">
  <img src="https://img.shields.io/badge/status-production-success.svg" alt="Production status">
</p>

<p>
  <strong>
    <a href="https://repforge-app.pages.dev">Live Application</a>
    ·
    <a href="DEPLOYMENT.md">Deployment Guide</a>
    ·
    <a href="#architecture">Architecture</a>
    ·
    <a href="#getting-started">Getting Started</a>
  </strong>
</p>

<img src="docs/media/dashboard.png" width="920" alt="RepForge dashboard showing training volume, streak, and progression analytics">

</div>

---

## Why RepForge

Modern workout logging tools often separate the two activities that matter most to consistent training: recording the session and understanding what it means.

RepForge combines a fast mobile logging workflow with durable training history, meaningful progress analytics, goal tracking, and an AI coaching layer. The result is a focused strength-training system that helps athletes answer questions such as:

- Am I increasing total training volume?
- Which exercises are progressing?
- How frequently am I training?
- What should I adjust in the next session?

RepForge is designed around three engineering principles:

1. **Fast athlete workflows:** Logging is optimized for repeated in-session use.
2. **Traceable intelligence:** Coaching context is derived from structured workout data.
3. **Small operational surface:** Static delivery, serverless compute, edge storage, and managed authentication reduce deployment overhead.

---

## Product Highlights

| Capability | What it enables |
|---|---|
| Set-by-set workout logging | Record exercises, working sets, weight, and repetitions with a touch-oriented interface. |
| Progress analytics | Analyze training volume, streaks, progression curves, and movement distribution. |
| 876-exercise library | Search and filter a curated exercise taxonomy by muscle group and equipment. |
| Personal records | Surface milestones and historical achievements. |
| Goal tracking | Define targets and monitor progress toward measurable outcomes. |
| AI strength coach | Stream contextual coaching responses generated from verified workout data. |
| Session diagnostics | Inspect a logged session and receive recommendations for the next step. |
| Google OAuth | Authenticate through a server-managed OAuth flow with a secure cookie session. |
| Mobile-first workflows | Use bottom sheets, fixed action areas, adaptive layouts, and keyboard-aware forms. |
| Performance-aware graphics | Progressively enhance capable devices while retaining a lightweight non-WebGL fallback. |

---

## Screenshots

<div align="center">
<table>
  <tr>
    <td align="center" width="50%">
      <img src="docs/media/dashboard.png" alt="RepForge dashboard">
      <br>
      <strong>Training dashboard</strong>
      <br>
      <sub>Total volume, streaks, current workload, and progression at a glance.</sub>
    </td>
    <td align="center" width="50%">
      <img src="docs/media/log%20workout.png" alt="RepForge workout logging">
      <br>
      <strong>Workout logging</strong>
      <br>
      <sub>Fast session capture with exercises and per-set weight and repetitions.</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="docs/media/coach.png" alt="RepForge AI coach">
      <br>
      <strong>Strength coach</strong>
      <br>
      <sub>Structured, streamed guidance grounded in the athlete's training context.</sub>
    </td>
    <td align="center" width="50%">
      <img src="docs/media/Exercise.png" alt="RepForge exercise library">
      <br>
      <strong>Exercise library</strong>
      <br>
      <sub>Search, filtering, favorites, and detailed exercise information.</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="docs/media/Progress.png" alt="RepForge progress analytics">
      <br>
      <strong>Progress analytics</strong>
      <br>
      <sub>Long-term progression curves and movement distribution.</sub>
    </td>
    <td align="center" width="50%"></td>
  </tr>
</table>
</div>

---

## Technology

### Application Stack

| Layer | Technology | Engineering role |
|---|---|---|
| Interface | React 18, React Router 6 | Component-based navigation and state management |
| Styling | CSS Modules and shared design tokens | Responsive, themeable presentation |
| Visualization | Recharts | Charts for volume, progression, and distribution |
| Motion | Framer Motion | Interface transitions and interaction feedback |
| Graphics | Three.js, React Three Fiber | Optional, capability-aware visual enhancement |
| Frontend build | Vite 6 | Fast development and optimized production bundles |
| Edge API | Cloudflare Workers, Hono | Low-latency, serverless routing and application logic |
| Database | Cloudflare D1, SQLite | Relational athlete data at the network edge |
| AI integration | Groq, OpenAI-compatible streaming API | Context-grounded coaching responses |
| Authentication | Google OAuth 2.0 | Federated identity with server-managed sessions |
| Legacy/alternative backend | Flask, PostgreSQL-compatible deployment | Reference HTTP backend implementation |
| Testing | Pytest | Backend validation, authorization, and behavior tests |
| CI/CD | GitHub Actions, Cloudflare Pages | Automated validation and edge deployment |
| Deployment | Cloudflare Pages and Workers | Single-origin delivery and serverless execution |

### Supported Languages

- JavaScript / JSX
- Python
- SQL
- HTML and CSS
- Hono-compatible TypeScript execution
- Shell and Node.js automation

---

## Architecture

```mermaid
flowchart LR
    User["Athlete browser"] --> Edge["Cloudflare global edge"]
    Edge --> SPA["React single-page application"]
    Edge --> API["Hono API routes"]
    API --> Auth["OAuth and session services"]
    API --> Workouts["Workout and analytics services"]
    API --> Goals["Goals and achievements"]
    API --> Coach["Coach and session diagnostics"]
    Workouts --> D1[(Cloudflare D1 / SQLite)]
    Goals --> D1
    Auth --> D1
    Coach --> Groq["Groq streaming API"]
    Coach --> D1
```

### System Design

The primary deployment uses a unified Cloudflare delivery model:

- Cloudflare serves the compiled React application.
- Workers route authenticated API requests.
- Hono defines request boundaries for authentication, workouts, exercises, goals, coach interactions, and system endpoints.
- D1 persists structured user, workout, exercise, goal, OAuth, and session data.
- The AI coach consumes telemetry selected from persisted workout history rather than an unstructured client-only prompt.
- The frontend and API share an origin, reducing CORS complexity and supporting secure cookie-based sessions.

A separate Flask implementation remains available as a conventional backend deployment path. This makes the repository understandable and runnable without requiring immediate edge-platform-specific knowledge while preserving the cloud-native architecture as the production target.

---

## Data Model

The relational model separates athlete identity, calendar sessions, movements, sets, goals, and authentication state.

```mermaid
erDiagram
    USERS ||--o{ WORKOUT_DAYS : owns
    WORKOUT_DAYS ||--o{ WORKOUT_EXERCISES : contains
    WORKOUT_EXERCISES ||--o{ WORKOUT_SETS : contains
    USERS ||--o{ GOALS : defines
    USERS ||--o{ USER_FAVORITE_EXERCISES : marks
    EXERCISES ||--o{ WORKOUT_EXERCISES : references
    EXERCISES ||--o{ USER_FAVORITE_EXERCISES : references

    USERS {
        text id PK
        text google_sub
        text email
        text name
        text avatar
    }

    WORKOUT_DAYS {
        integer id PK
        integer user_id FK
        text workout_date
    }

    WORKOUT_EXERCISES {
        integer id PK
        integer workout_day_id FK
        integer exercise_id FK
    }

    WORKOUT_SETS {
        integer id PK
        integer workout_exercise_id FK
        real weight
        integer reps
    }

    EXERCISES {
        integer id PK
        text name
        text muscle_group
        text equipment
    }

    GOALS {
        integer id PK
        integer user_id FK
        text goal_type
        real target_value
    }
```

### Core Guarantees

- Repetitions and weights are validated before persistence.
- Workout ownership is checked through authenticated user identity.
- Session identifiers remain server-controlled and are never exposed to application JavaScript.
- OAuth state values are stored and consumed as part of a replay-resistant flow.
- Mutation endpoints are protected against cross-site request forgery.
- Sensitive configuration is supplied through environment variables or worker secrets.

---

## Security

| Concern | Implementation |
|---|---|
| Session storage | HttpOnly, Secure, SameSite cookie session |
| CSRF protection | Server-issued token plus double-submit request validation |
| Authentication | Google OAuth with server-side state and redirect validation |
| Authorization | Server-side ownership checks for athlete-specific resources |
| Secret handling | Environment variables and Cloudflare secrets |
| Request limits | Rate limits on general, authentication, and AI routes |
| Input validation | Bounded numeric fields, normalized strings, and backend validation |
| Prompt safety | Structured user prompts with coach-specific instruction boundaries |
| CORS strategy | Single-origin Cloudflare deployment minimizes cross-origin trust |
| Client storage | Authentication secrets and CSRF state are not persisted to browser storage |

Production deployments must override development secrets, configure OAuth credentials, and use TLS. Never commit `.env`, session keys, OAuth secrets, API keys, or database credentials.

---

## Getting Started

### Prerequisites

- Node.js 18.18 or newer
- npm 9 or newer
- Python 3.10 or newer for the Flask backend
- A Cloudflare account for edge deployment
- Google OAuth credentials for sign-in
- A Groq API key for the AI coach

Node.js 20 or newer is recommended for the Cloudflare toolchain.

---

### Option 1: Run the frontend locally

```bash
git clone https://github.com/chetanaybuilder/RepForge.git
cd RepForge
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

### Option 2: Run the Cloudflare development stack

```bash
npm install
npm run build
npx wrangler dev --local
```

The complete application will be available on the local Wrangler URL, typically:

```text
http://localhost:8787
```

### Option 3: Run the Flask reference backend

```bash
python -m venv .venv
```

Activate the virtual environment:

**macOS / Linux**

```bash
source .venv/bin/activate
```

**Windows PowerShell**

```powershell
.venv\Scripts\Activate.ps1
```

Install dependencies and start the API:

```bash
pip install -r backend/requirements.txt
python backend/app.py
```

The Flask backend defaults to port 5000.

---

## Configuration

### Cloudflare Worker Variables

Configure secrets locally or in the Cloudflare dashboard:

```bash
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

Optional environment settings are declared in `wrangler.toml`.

### Flask Environment Variables

Create the optional environment file at `backend/.env`:

```dotenv
FLASK_ENV=development
SESSION_SECRET=replace-with-a-long-random-value
SESSION_COOKIE_SAMESITE=Lax
SESSION_LIFETIME_SECONDS=604800

DATABASE_URL=postgresql://user:password@localhost:5432/repforge
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback

GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=openai/gpt-oss-120b
GROQ_TIMEOUT_SECONDS=25

REDIS_URL=memory://
RATELIMIT_DEFAULT=200 per hour
RATELIMIT_AI=10 per hour
RATELIMIT_AUTH=20 per hour
CORS_ORIGINS=http://localhost:5173
```

### Google OAuth Redirects

For local development, register the callback URL used by the selected backend:

```text
http://localhost:8787/auth/google/callback
```

Alternatively, for a local Flask backend:

```text
http://localhost:5000/auth/google/callback
```

Do not mix redirect URIs between environments. The exact OAuth redirect URI used by the application must match the Google OAuth client configuration.

---

## Development Commands

Run commands from the repository root.

### Frontend and build

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build the frontend and Worker bundle |
| `npm run preview` | Preview the production frontend |
| `npm run lint` | Run frontend linting |
| `npm run format:check` | Check repository formatting |
| `npm run check:cloudflare` | Validate the Cloudflare build output |
| `npm run deploy` | Build and deploy to Cloudflare Pages |

### Backend

| Command | Purpose |
|---|---|
| `pytest backend/tests` | Run the Flask backend test suite |
| `npm run test:backend` | Run backend tests through npm |
| `python backend/app.py` | Start the Flask development server |

### Cloudflare

```bash
npx wrangler dev --local
npx wrangler d1 migrations apply repforge-db --local
npx wrangler d1 migrations apply repforge-db
npx wrangler secret list
```

---

## Testing Strategy

The project separates verification into deterministic backend behavior and production build validation.

### Backend Coverage Areas

- Authentication and protected routes
- Cross-site request forgery protection
- OAuth state and session behavior
- Authorization and insecure-direct-object-reference prevention
- Workout creation, retrieval, editing, and deletion
- Exercise filtering and favorites
- Goal tracking
- Request validation and numeric boundaries

### Quality Gates

```bash
npm run lint
npm run build
npm run check:cloudflare
npm run test:backend
```

A pull request should pass:

1. Frontend static analysis.
2. Frontend production compilation.
3. Cloudflare output verification.
4. Backend behavioral and authorization tests.

No quantitative coverage percentage is published unless generated consistently from the current CI environment.

---

## Performance and Scalability

### Frontend

- Vite production chunks reduce development-tool overhead.
- Route and 3D dependencies are separated where possible.
- Three.js loads only for devices that pass capability checks.
- Shared data caches are bounded and time-limited.
- Non-WebGL devices retain a functional visual fallback.
- Scroll locking, modal lifecycle handling, and stale-request protection preserve predictable interactions.

### API and Data

- Worker execution reduces cold-start latency compared with a traditional container model.
- D1 provides server-side relational persistence close to Cloudflare edge execution.
- Prepared SQL queries keep database access explicit.
- Authentication and exercise reads can be served independently from coaching and analytics.
- Coaching requests can stream output with Server-Sent Events rather than waiting for the complete response.

### Scalability Trade-offs

Cloudflare Workers and D1 provide operational simplicity and low-latency deployment, but introduce platform-level constraints:

- D1 is not an unrestricted relational cluster.
- Write-heavy workloads require query and schema review as usage grows.
- A single edge database may eventually require regional or sharding strategy for international scale.
- Streaming third-party AI responses depend on provider availability and latency.
- Exercising the full system against real traffic remains necessary before treating synthetic benchmarks as production guarantees.

The current design is appropriate for a portfolio-scale or early-product workload where simplicity, cost control, and deployment speed are priorities.

---

## Engineering Decisions

### Single-Origin Architecture

The frontend and API are deployed together when possible. This removes unnecessary CORS configuration and enables first-party session cookies.

### HttpOnly Sessions

The browser does not receive the raw session identifier. A server-controlled cookie identifies authenticated sessions, while application JavaScript retains only ephemeral request tokens.

### Memory-Only CSRF State

Mutating frontend requests carry CSRF state held in memory. The value is not persisted in local storage, reducing exposure from persistent browser compromise.

### Local Calendar Dates

Workout dates are represented as local calendar values rather than UTC timestamps. This prevents a log created near midnight from being assigned to the wrong day when the athlete crosses a timezone boundary.

### End-Time Rest Timer

The rest timer calculates remaining time from a timestamp instead of counting interval executions. This keeps it accurate when browser activity is throttled in a background tab.

### Stale Response Protection

Screen loaders track mounted state and request identity, preventing an outdated response from overwriting newer application state.

### Adaptive Graphics

WebGL capability, reduced-motion preferences, and device constraints determine whether richer graphics are loaded. The application remains usable on devices that cannot support 3D rendering.

---

## Project Structure

```text
RepForge/
├── frontend/
│   ├── src/
│   │   ├── components/        # Forms, modals, navigation, timers, charts
│   │   ├── context/           # Cross-screen application state
│   │   ├── hooks/             # Request and lifecycle behavior
│   │   ├── pages/             # Dashboard, workouts, exercises, coach, goals
│   │   ├── services/          # API and CSRF transport
│   │   └── utils/             # Shared browser-safe helpers
│   └── package.json
├── worker/
│   └── index.js               # Cloudflare/Hono edge application
├── backend/
│   ├── app.py                 # Flask application entry point
│   ├── auth/                  # OAuth and session implementations
│   ├── database/              # PostgreSQL and SQLite query utilities
│   ├── routes/                # REST route handlers
│   ├── services/              # Coach, statistics, and goal services
│   └── tests/                 # Behavioral and security tests
├── migrations/
│   └── D1 migration history
├── scripts/
│   ├── build-worker.mjs       # Production Worker bundling
│   └── verify-pages-build.mjs # Cloudflare build verification
├── public/                    # Cloudflare static asset configuration
├── docs/
│   └── media/                 # README and product screenshots
├── wrangler.toml              # Cloudflare bindings and environment variables
└── package.json               # Monorepo scripts and tooling
```

---

## Deployment

### Cloudflare Pages and Workers

```bash
npm install
npm run build
npm run deploy
```

Configure secrets before deploying:

```bash
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

Apply D1 migrations:

```bash
npx wrangler d1 migrations apply repforge-db
```

Complete deployment instructions, environment bindings, OAuth setup, database details, and rollback considerations are documented in [`DEPLOYMENT.md`](DEPLOYMENT.md).

---

## Roadmap

- Add a service worker and explicit offline logging mode.
- Expand automated interaction and accessibility coverage.
- Add real-device visual regression testing.
- Add internationalization and locale-aware formatting.
- Add wearable and external fitness-platform imports.
- Add exportable training reports and shareable progress views.
- Publish reproducible performance benchmarks with CI context.
- Add Open Graph metadata and social preview assets.
- Introduce richer coaching evaluation and response-grounding metrics.

---

## Contributing

1. Fork the repository.
2. Create a focused feature branch.
3. Keep authentication, authorization, and data-model changes scoped.
4. Add or update tests for behavior that could regress.
5. Run the relevant quality gates before opening a pull request.

```bash
npm run lint
npm run build
npm run check:cloudflare
npm run test:backend
```

Keep unrelated formatting or refactoring separate from functional changes.

---

## License

RepForge is available under the [MIT License](LICENSE).

---

<div align="center">

Built for athletes. Engineered for maintainability.

<a href="https://github.com/chetanaybuilder/RepForge">GitHub</a>
·
<a href="https://repforge-app.pages.dev">Live Demo</a>

</div>