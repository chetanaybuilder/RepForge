# RepForge Codebase Audit Report (Phase 0)

**Date**: 2026-10-14  
**Auditor**: Principal Engineer & Product Designer  
**Scope**: Full end-to-end repository audit (read-only Phase 0)  
**Target Repository**: `RepForge` (Flask 3.1 + PostgreSQL + React 18 + Vite + Three.js)

---

## Executive Summary

RepForge features a modern aesthetic and solid foundational patterns (server-side session storage, parameterized queries, constant-time CSRF tokens, WebGL fallbacks). However, a comprehensive audit reveals **critical security vulnerabilities, architectural mismatches under Gunicorn multi-worker concurrency, database connection leak risks, missing input boundaries, dead code, and duplicated endpoints**.

Key highlights:
- **Zero Secrets Committed**: Git history inspection confirms no live secrets were committed; only documentation placeholders exist. No rotation required.
- **Critical Concurrency & Rate Limiting Flaw**: Flask-Limiter is configured with `memory://` storage across 4 Gunicorn workers, making rate limiting ineffective and vulnerable to distributed bypass.
- **OAuth Vulnerabilities**: Missing OpenID Connect `nonce` parameter and token claim validation; race condition in OAuth state consumption.
- **Connection Leak & Pool Hazards**: Aborted transactions can return corrupted sockets to the connection pool; migration scripts open unmanaged connections without `finally: conn.close()`.
- **Routing & Error Handling**: The frontend SPA catch-all route intercepting all unmatched URLs causes 404 API requests to return HTML with status 200 OK.
- **Tracked Build Artifacts**: `dist/` is committed to git and missing from `.gitignore`.
- **Procfile Broken**: Points to nonexistent `backend.app:create_app()`.

---

## 1. Security Vulnerabilities & Authentication Flaws

| Severity | File & Line | Finding & Vulnerability | Remediation |
| :--- | :--- | :--- | :--- |
| **CRITICAL** | [`auth/google_oauth.py:51-64`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/auth/google_oauth.py#L51-L64)<br>[`auth/google_oauth.py:87-116`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/auth/google_oauth.py#L87-L116)<br>[`auth/oauth_state.py:19-24`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/auth/oauth_state.py#L19-L24) | **Missing OAuth `nonce` Parameter & Validation**: `build_authorization_url` does not include an OIDC `nonce` parameter, and `verify_id_token` does not validate a `nonce` claim in Google's ID token. Without a cryptographically random nonce bound to the browser/state, the app is vulnerable to token replay and ID token injection. | Generate a cryptographically random `nonce`, store its hash in `oauth_states`, pass `nonce` in Google authorization params, and enforce `claims.get('nonce') == expected_nonce` in `verify_id_token`. |
| **CRITICAL** | [`auth/oauth_state.py:26-36`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/auth/oauth_state.py#L26-L36) | **TOCTOU Race Condition in OAuth State Consumption**: `consume_state` performs a non-atomic `SELECT` followed by `DELETE`. Two concurrent callback requests with identical state can both succeed the check before deletion occurs, enabling replay attacks. | Replace with an atomic deletion query: `DELETE FROM oauth_states WHERE state = %s RETURNING expires_at`. |
| **HIGH** | [`config.py:37`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/config.py#L37)<br>[`config.py:88-96`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/config.py#L88-L96) | **`SESSION_SECRET` Fallback Bypasses Production Validation**: Line 37 assigns `os.environ.get("SESSION_SECRET") or secrets.token_hex(32)`. Consequently, `Config.validate()` never detects a missing `SESSION_SECRET` because `getattr(cls, "SESSION_SECRET")` is never falsy. Across 4 Gunicorn workers, each worker starts with a different secret. | Check `os.environ.get("SESSION_SECRET")` directly in `Config.validate()` and abort startup in production if missing. |
| **HIGH** | [`config.py:41-43`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/config.py#L41-L43) | **Insecure Session Cookie `SameSite=None` Default in Production**: `SESSION_COOKIE_SAMESITE` defaults to `"None"` in production. While `Secure` is enabled, `SameSite=None` permits session cookies to be transmitted on cross-site requests, exposing the application to cross-site request attacks. Since the frontend and backend are co-located on Render, `SameSite` must be `"Lax"` or `"Strict"`. | Default `SESSION_COOKIE_SAMESITE` to `"Lax"` in all environments. |
| **HIGH** | [`routes/auth_routes.py:112-118`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/routes/auth_routes.py#L112-L118) | **Missing CSRF Protection on Logout**: `POST /auth/logout` is decorated with `@login_required` but lacks `@csrf_protect`. An attacker can forge a cross-site POST request to force-logout legitimate users (Logout CSRF / DoS). | Decorate `/auth/logout` with `@csrf_protect`. |
| **MEDIUM** | [`routes/auth_routes.py:100-108`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/routes/auth_routes.py#L100-L108) | **Session Fixation / Lack of Pre-Auth Session Invalidation**: Upon successful OAuth callback, `create_session` is called without invalidating or deleting any pre-existing session associated with the client cookie. | Call `delete_session` or `rotate_session` on any existing cookie before creating a fresh authenticated session. |
| **MEDIUM** | [`ai/gemini_service.py:85`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/ai/gemini_service.py#L85) | **Gemini API Key Passed in URL Query Parameter**: The Gemini request passes `params={"key": api_key}`. Query parameters are logged in plaintext by HTTP proxies, web servers, and network telemetry. | Pass the API key securely via the `x-goog-api-key` header instead of the URL query string. |
| **LOW** | [`ai/gemini_service.py:98`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/ai/gemini_service.py#L98) | **Upstream Error Disclosure in AI Chat**: `GeminiError(f"... Detail: {resp.text}", "ai_bad_request")` leaks raw Google API responses directly back to frontend consumers via `ApiError`. | Sanitize exception messages; log `resp.text` only to server-side logs. |
| **LOW** | [`src/pages/AIAnalysis.jsx:102,120`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/src/pages/AIAnalysis.jsx#L102-L120) | **Unencrypted Sensitive Chat History in LocalStorage**: Chat history is persisted in browser `localStorage` under `rf_chat_${user.id}`. Any client-side extension or XSS script has read access to historical training discussions. | Sanitize client-stored messages or avoid persisting private health discussions in persistent unencrypted storage. |

---

## 2. Multi-Worker Concurrency & Flask-Limiter Architecture

| Severity | File & Line | Finding & Vulnerability | Remediation |
| :--- | :--- | :--- | :--- |
| **CRITICAL** | [`config.py:79`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/config.py#L79)<br>[`render.yaml:11`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/render.yaml#L11)<br>[`requirements.txt:1-10`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/requirements.txt#L1-L10) | **In-Memory Rate Limiting Under Multi-Worker Gunicorn**: `RATELIMIT_STORAGE_URI` defaults to `memory://`. Gunicorn runs 4 workers (`-w 4`). In-memory storage is local to each worker OS process. An attacker's requests are round-robined across workers, multiplying rate limits by 4x, and worker recycles erase all counters. The requirements explicitly forbid in-memory rate limiting across workers. | Require a shared rate-limit backend (e.g. Redis URI via `RATELIMIT_STORAGE_URI` or database/cache storage) and add `redis` to `requirements.txt`. |
| **MEDIUM** | [`vite.config.js:8-17`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/vite.config.js#L8-L17)<br>[`config.py:56-58`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/config.py#L56-L58) | **Hardcoded External Render URL in Development Proxy & Redirects**: `vite.config.js` proxies `/api` and `/auth` to `https://repforge-w7dh.onrender.com`. In local development, frontend requests bypass local backend port 5000 and target a remote deployment. `GOOGLE_REDIRECT_URI` also defaults to this third-party URL. | Configure `vite.config.js` proxy to default to `http://localhost:5000` or `process.env.VITE_BACKEND_URL`. Do not hardcode specific personal deployment hostnames in source defaults. |

---

## 3. Database Connection Leaks & Connection Pool Hazards

| Severity | File & Line | Finding & Vulnerability | Remediation |
| :--- | :--- | :--- | :--- |
| **HIGH** | [`database/db.py:116-133`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/database/db.py#L116-L133) | **Corrupted Connection Re-injection into Pool**: In `get_connection()`, if an exception occurs during query execution or `conn.commit()`, `conn.rollback()` is attempted. If `conn.rollback()` fails or the socket was aborted by PostgreSQL, `getattr(conn, "closed", 1)` may still be `0` (socket open but transaction aborted). `_pool.putconn(conn)` returns the corrupted socket to the pool instead of closing it with `close=True`. | If rollback raises an exception or `conn.status == TRANSACTION_STATUS_ERROR`, return the connection using `_pool.putconn(conn, close=True)`. |
| **HIGH** | [`database/migrate_nested_workouts.py:21-71`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/database/migrate_nested_workouts.py#L21-L71) | **Unmanaged Connection Leak in Migration**: `conn = psycopg2.connect(db_url)` is created without a `try ... finally: conn.close()`. If the migration encounters an error during schema execution or table conversion, the connection socket is leaked until process exit. | Wrap `conn` in a context manager or `try ... finally: conn.close()`. |
| **MEDIUM** | [`database/add_day_number.py:9-26`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/database/add_day_number.py#L9-L26) | **Redundant Commit & Missing Pool Shutdown in Migration Script**: Line 9 calls `init_pool`, line 25 calls `conn.commit()` manually (even though `get_connection()` already commits on exit), and `close_pool()` is never invoked before script completion. | Remove redundant commit and ensure `close_pool()` is called in a `finally` block. |
| **MEDIUM** | [`app.py:22, 108-110`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/app.py#L22) | **Unused `close_pool` on Application Teardown**: `close_pool` is imported in `app.py:22`, but never registered on process signal (SIGTERM/SIGINT) or teardown. Gunicorn worker graceful reloads leave active pool connections lingering on PostgreSQL. | Register a shutdown handler / `atexit` hook to invoke `close_pool()`. |
| **MEDIUM** | [`auth/session_store.py:57`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/auth/session_store.py#L57)<br>[`auth/decorators.py:38, 42`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/auth/decorators.py#L38-L42) | **Extreme DB Write Amplification & Redundant Queries per Request**: Every authenticated request executes: (1) `SELECT sessions`, (2) `UPDATE sessions SET last_seen_at = now()`, (3) `SELECT users`. Writing to the database on every single read-only GET request creates severe WAL bloat and row locking under 50-100 concurrent users. | Throttle `last_seen_at` updates (e.g. only update if last seen > 5 minutes ago) or cache user/session data in memory with short TTL. |

---

## 4. Input Validation & Unbounded Numbers

| Severity | File & Line | Finding & Vulnerability | Remediation |
| :--- | :--- | :--- | :--- |
| **HIGH** | [`utils/validation.py:61-63`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/utils/validation.py#L61-L63)<br>[`utils/validation.py:79-81`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/utils/validation.py#L79-L81) | **Unbounded Exercises & Sets Arrays (DoS Vulnerability)**: `validate_workout_day_payload` checks `len(exercises) > 0` and `len(sets) > 0`, but enforces no upper bound on the number of exercises per workout day or sets per exercise. An attacker can send 50,000 exercises/sets, causing server memory exhaustion and query timeouts. | Enforce explicit upper bounds: e.g. `1 <= len(exercises) <= 30` and `1 <= len(sets) <= 50`. |
| **HIGH** | [`routes/goals_routes.py:37-39`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/routes/goals_routes.py#L37-L39) | **Unbounded Numeric `target_value` Causes 500 Numeric Overflow**: `_validate_goal_payload` checks `target_value > 0`, but enforces no upper bound. PostgreSQL schema defines `target_value NUMERIC(10,2)`. Any value `>= 100,000,000` causes PostgreSQL `NumericValueOutOfRange`, crashing with an unhandled 500 error instead of a 400 Bad Request. | Bound `target_value` in validation: `0 < target_value <= 1000000`. |
| **MEDIUM** | [`routes/goals_routes.py:49-50`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/routes/goals_routes.py#L49-L50) | **Unvalidated Goal Period Dates**: `period_start` and `period_end` are passed directly from client payloads to SQL without ISO date parsing. Malformed strings cause PostgreSQL syntax errors and unhandled 500 responses. | Parse with `datetime.date.fromisoformat` before passing to SQL query parameters. |
| **MEDIUM** | [`utils/validation.py:160-161`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/utils/validation.py#L160-L161)<br>[`routes/workout_routes.py:88`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/routes/workout_routes.py#L88) | **Unbounded / Negative `limit` Parameter**: `validate_list_params` caps `limit = min(..., 500)` but has no lower bound. Passing `?limit=-1` results in `LIMIT -1` in SQL, triggering a PostgreSQL syntax error. In `routes/workout_routes.py:88`, `recent()` executes `int(request.args.get("limit", 10))` without a `try/except` guard against `ValueError`. | Ensure `limit = max(1, min(int(limit), 500))` with try/except error handling. |
| **MEDIUM** | [`database/queries_workouts.py:70, 250`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/database/queries_workouts.py#L70) | **`null` Weight Bypass Leading to Integrity Violation**: `s.get("weight", s.get("weight_kg", 0))` returns `None` if the client sends `{"weight": null}`. Inserting `None` into `workout_sets.weight_kg` violates the database `NOT NULL` constraint and triggers a 500 error. | Default to `0.0` if `s.get("weight")` is `None`. |

---

## 5. Broken Routing & Error Handling

| Severity | File & Line | Finding & Vulnerability | Remediation |
| :--- | :--- | :--- | :--- |
| **CRITICAL** | [`app.py:96-102`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/app.py#L96-L102)<br>[`utils/errors.py:32-44`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/utils/errors.py#L32-L44) | **SPA Catch-All Route Swallows API/Auth 404s**: `@app.route('/<path:path>')` matches all unmatched URLs and serves `index.html` with status 200 OK. Any invalid API endpoint (e.g. `GET /api/nonexistent` or `DELETE /api/workouts/123`) returns HTML 200 instead of JSON 404. This breaks error handling in the API client and prevents `utils/errors.py:handle_404` from ever firing. | Exclude `/api/` and `/auth/` prefixes in the `serve` route: return `jsonify({"error": {"code": "not_found", "message": "The requested resource was not found."}}), 404`. |
| **CRITICAL** | [`Procfile:1`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/Procfile#L1) | **Broken Procfile Startup Command**: `Procfile` specifies `backend.app:create_app()`. There is no `backend` folder; the app root is at top-level `app.py`. Running `Procfile` causes `ModuleNotFoundError: No module named 'backend'`. | Change to `gunicorn -w 4 -k sync -b 0.0.0.0:$PORT "app:create_app()"`. |
| **LOW** | [`app.py:104-106`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/app.py#L104-L106)<br>[`routes/misc_routes.py:10-13`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/routes/misc_routes.py#L10-L13) | **Duplicate `/health` Route Definition**: Health check is defined on `misc_bp` (`/api/health`) and manually routed again on `@app.route("/health")` referencing `app.view_functions["misc.health"]()`. | Consolidate `/health` into `misc_bp` without duplicate manual route decorators. |
| **LOW** | [`app.py:10-14`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/app.py#L10-L14) | **Unconditional IPv4 Monkey-Patching**: Monkey-patching `socket.getaddrinfo` forces IPv4 across all Python network requests, breaking IPv6 dual-stack environments. | Remove or gate behind an explicit environment variable (e.g. `FORCE_IPV4=true`). |

---

## 6. Dead Code & Duplicated Logic

| Type | File & Line | Details |
| :--- | :--- | :--- |
| **Duplicated Logic** | [`routes/auth_routes.py:121-141`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/routes/auth_routes.py#L121-L141)<br>[`routes/misc_routes.py:16-36`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/routes/misc_routes.py#L16-L36) | **Duplicate `/me` Endpoint**: Identical code for returning authenticated session user details is implemented both as `GET /auth/me` and `GET /api/me`. |
| **Dead Code** | [`routes/workout_routes.py:13-26`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/routes/workout_routes.py#L13-L26) | `_serialize_flat` is defined with legacy workout column mappings but is never referenced or called anywhere. |
| **Dead Code** | [`src/hooks/useWorkouts.js:67-73`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/src/hooks/useWorkouts.js#L67-L73)<br>[`src/hooks/useWorkouts.js:78-81`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/src/hooks/useWorkouts.js#L78-L81) | `updateWorkout(id, payload)` calls `PUT /api/workouts/${id}` and `deleteWorkout(id)` calls `DELETE /api/workouts/${id}`. Neither endpoint exists in the Flask backend (`routes/workout_routes.py`), and neither function is imported or used in any React component. |
| **Dead Code** | [`src/components/3d/TypingIndicator3D.jsx:1-67`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/src/components/3d/TypingIndicator3D.jsx#L1-L67) | Component is defined and exported, but never imported or rendered in any view. |
| **Dead Code** | [`routes/ai_routes.py:132`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/routes/ai_routes.py#L132) | `import json` inside `day_insights` is unused. |
| **Dead Logic** | [`database/queries_workouts.py:145-147`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/database/queries_workouts.py#L145-L147) | `sort_map` provides `"weight_desc"`, `"weight_asc"`, and `"exercise_asc"`, but all three map to `"d.date DESC"` / `"d.date ASC"`, silently failing to sort by weight or exercise. |
| **Uncalled Purge** | [`auth/oauth_state.py:38-39`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/auth/oauth_state.py#L38-L39)<br>[`auth/session_store.py:80-81`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/auth/session_store.py#L80-L81) | `purge_expired_states()` and `purge_expired_sessions()` are defined but never scheduled or invoked. |

---

## 7. Performance & Database Anti-Patterns

| Severity | File & Line | Issue | Remediation |
| :--- | :--- | :--- | :--- |
| **MEDIUM** | [`database/queries_workouts.py:246-260`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/database/queries_workouts.py#L246-L260) | **N+1 Inserts in `update_exercise`**: Inserts sets individually inside a Python `for` loop with single-row roundtrips instead of batching via `psycopg2.extras.execute_values`. | Refactor to `execute_values` bulk insert identical to `create_workout_day`. |
| **MEDIUM** | [`services/goals_service.py:62-79`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/services/goals_service.py#L62-L79) | **Logic Bug: Milestone Achievement Counts Sets as Workouts**: `compute_achievements` evaluates `total = len(workouts)`. `workouts` is the flattened array of sets returned by `get_all_for_stats`. A user logging 1 workout with 10 sets instantly unlocks the "10 Workouts Logged" milestone. | Calculate total distinct workouts via `len(set(w.get("day_id", w["date"]) for w in workouts))`. |
| **MEDIUM** | [`src/hooks/useFetch.js:7`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/src/hooks/useFetch.js#L7)<br>[`src/hooks/useWorkouts.js:8`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/src/hooks/useWorkouts.js#L8) | **Unbounded Module-Level Cache Leak**: `globalCache` and `globalWorkoutsCache` are unbounded `Map` objects with no TTL or LRU eviction, retaining every query response in memory indefinitely. | Introduce TTL/size limits or use TanStack Query cache properly. |
| **MEDIUM** | [`src/pages/Goals.jsx:151-155`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/src/pages/Goals.jsx#L151-L155)<br>[`src/components/3d/Achievement3D.jsx:73`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/src/components/3d/Achievement3D.jsx#L73) | **WebGL Context Limit Saturation**: Each achievement item renders an independent Three.js `<Canvas>`, creating 8+ concurrent WebGL contexts on the page. Browsers typically cap active WebGL contexts at 8–16, causing older canvases to drop context and crash. | Use CSS 3D/canvas fallbacks or a single shared canvas with multiple viewports. |
| **LOW** | [`src/pages/Dashboard.jsx:38-51`](file:///c:/Users/batra/Downloads/RepForgev2/RepForge/src/pages/Dashboard.jsx#L38-L51) | **Duplicate Heavy Query on Page Load**: Dashboard triggers both `/api/workouts/stats` and `/api/workouts/analytics` simultaneously, executing `get_all_for_stats` twice in parallel over the entire user training log. | Consolidate metrics or leverage cached queries. |

---

## 8. Insecure Direct Object Reference (IDOR) Audit

Every endpoint was audited against unauthorized user data access:
- **`routes/workout_routes.py`**:
  - `GET /api/workouts`: Scoped strictly to `g.user_id`. (Safe)
  - `POST /api/workouts`: Assigned strictly to `g.user_id`. (Safe)
  - `PUT /api/workouts/exercises/<exercise_id>`: Verifies `JOIN workout_days d WHERE e.id = %s AND d.user_id = %s`. (Safe)
  - `DELETE /api/workouts/exercises/<exercise_id>`: Verifies `JOIN workout_days d WHERE e.id = %s AND d.user_id = %s`. (Safe)
  - `GET /api/workouts/stats`, `/recent`, `/exercises`, `/progress`, `/prs`, `/analytics`: All scoped strictly to `g.user_id`. (Safe)
- **`routes/goals_routes.py`**:
  - `GET /api/goals`, `POST /api/goals`: Scoped strictly to `g.user_id`. (Safe)
  - `DELETE /api/goals/<goal_id>`: `DELETE FROM goals WHERE id = %s AND user_id = %s`. (Safe)
- **`routes/ai_routes.py`**:
  - `POST /api/ai/chat`: Scoped strictly to `g.user_id`. (Safe)
  - `POST /api/ai/insights/<day_id>`: Scoped strictly to `g.user_id AND d.id = %s`. (Safe)

**IDOR Verdict**: All active API routes strictly enforce ownership through the authenticated session (`g.user_id`). No client-provided user IDs are honored.

---

## 9. Dependencies & Git Artifact Hygiene

| Issue | Details | Remediation |
| :--- | :--- | :--- |
| **Committed `dist/` Directory** | Commit `c4a0763` committed compiled bundle files (JS chunks, CSS, web fonts) into git. `.gitignore` does not list `dist/`. | Add `dist/` to `.gitignore` and run `git rm -r --cached dist`. |
| **Unused Frontend Dependency** | `@tanstack/react-query` (`^5.103.1`) is declared in `package.json` and wrapped in `App.jsx`, but `useQuery` / `useMutation` are never called in any component. | Either migrate custom `useFetch` hooks to TanStack Query or remove the dependency to save bundle size. |
| **Missing Backend Dependency** | Flask-Limiter requires a persistent shared store (e.g. `redis`) to function across Gunicorn workers, but no Redis client is listed in `requirements.txt`. | Add `redis` to `requirements.txt`. |
| **Git Secrets Check** | Git history was scanned for live API keys (`AIza...`, `ghp_...`, `sk-...`, `postgres://...`). **No live secrets were found**. Only placeholder documentation in `README.md` and `.env.example` exists. | **No credential rotation required**. |

---

## 10. Prioritized Remediation Roadmap

1. **Phase 1: Security & Auth Hardening**:
   - Implement OpenID Connect `nonce` generation and validation in `auth/google_oauth.py`.
   - Fix atomic state consumption (`DELETE ... RETURNING`) in `auth/oauth_state.py`.
   - Add `@csrf_protect` to `/auth/logout`.
   - Set `SESSION_COOKIE_SAMESITE` default to `"Lax"`.
   - Check `SESSION_SECRET` properly in `Config.validate()`.
2. **Phase 2: Concurrency & Infrastructure**:
   - Add `redis` to `requirements.txt` and configure shared storage for Flask-Limiter.
   - Fix `Procfile` to run `app:create_app()`.
   - Fix `app.py` catch-all route so `/api/*` and `/auth/*` 404s return JSON 404 instead of HTML 200.
   - Clean git index: remove tracked `dist/` and add to `.gitignore`.
3. **Phase 3: Database & Validation Resilience**:
   - Fix connection recovery in `database/db.py` to prevent dirty socket reuse.
   - Close connections in migration scripts (`migrate_nested_workouts.py`, `add_day_number.py`).
   - Add upper bounds for exercises, sets, and goals in `utils/validation.py` and `routes/goals_routes.py`.
   - Fix N+1 inserts in `update_exercise`.
   - Fix milestone achievement calculation in `services/goals_service.py`.
4. **Phase 4: Dead Code & Redundancy Removal**:
   - Remove duplicate `/api/me` or `/auth/me`.
   - Delete dead functions (`_serialize_flat`, `updateWorkout`, `deleteWorkout`, `TypingIndicator3D`).
   - Fix `database/queries_workouts.py` sort mappings.
