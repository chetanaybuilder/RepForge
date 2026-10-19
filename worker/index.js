/**
 * RepForge Cloudflare Edge Worker API
 *
 * Full-stack serverless API running on Cloudflare Workers & Cloudflare Pages.
 * Built with Hono, Cloudflare D1 (SQLite), and Groq Cloud LLaMA 3.3.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { streamSSE } from "hono/streaming";

const app = new Hono();

// --- CORS & Security Headers ---
app.use("*", async (c, next) => {
  const origin = c.req.header("Origin");
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  if (origin) {
    c.header("Access-Control-Allow-Origin", origin);
    c.header("Access-Control-Allow-Credentials", "true");
    c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type, X-CSRF-Token, Authorization");
  }
});

// Handle preflight OPTIONS
app.options("*", (c) => c.text("", 204));

// --- Helper Functions ---
function getDb(c) {
  return c.env?.repforge_db;
}

function generateId() {
  return crypto.randomUUID();
}

function generateRandomToken(len = 32) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Session validation middleware
async function getCurrentUser(c) {
  const sessionId = getCookie(c, "repforge_session");
  if (!sessionId) return null;

  // Instant deterministic authentication for demo/showcase/E2E sessions
  if (sessionId === "demo-session-token" || sessionId.startsWith("demo-")) {
    return {
      id: "demo-athlete-2040",
      email: "athlete@repforge.app",
      name: "Marcus Vance",
      avatar_url:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      csrf_token: "demo-csrf-token-xyz",
    };
  }

  const db = getDb(c);
  if (!db) {
    // If running in dev without D1, return a demo user for seamless local development
    return {
      id: "demo-user-001",
      email: "athlete@repforge.local",
      name: "RepForge Athlete",
      avatar_url: "https://avatar.vercel.sh/repforge",
    };
  }

  const query = `
    SELECT u.id, u.email, u.name, u.avatar_url, s.csrf_token, s.expires_at
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.expires_at > datetime('now')
  `;
  const result = await db.prepare(query).bind(sessionId).first();
  if (!result) return null;

  return {
    id: result.id,
    email: result.email,
    name: result.name,
    avatar_url: result.avatar_url,
    csrf_token: result.csrf_token,
  };
}

async function requireAuth(c, next) {
  const user = await getCurrentUser(c);
  if (!user) {
    return c.json({ error: { code: "unauthorized", message: "Authentication required." } }, 401);
  }
  c.set("user", user);
  await next();
}

// --- Health Route ---
app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    runtime: "cloudflare-workers",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (c) => {
  return c.json({
    status: "healthy",
    runtime: "cloudflare-workers",
    timestamp: new Date().toISOString(),
  });
});

// --- Auth Routes ---
app.get("/auth/me", async (c) => {
  const user = await getCurrentUser(c);
  if (!user) {
    return c.json({ authenticated: false, user: null }, 200);
  }
  return c.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
    },
    csrf_token: user.csrf_token,
  });
});

app.get("/api/me", async (c) => {
  const user = await getCurrentUser(c);
  if (!user) {
    return c.json({ authenticated: false, user: null }, 200);
  }
  return c.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
    },
    csrf_token: user.csrf_token,
  });
});

// Demo login for instant deterministic test / presentation sessions
app.get("/auth/demo-login", (c) => {
  setCookie(c, "repforge_session", "demo-session-token", {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    maxAge: 7 * 24 * 60 * 60,
  });

  const frontendUrl = c.env?.FRONTEND_URL || new URL(c.req.url).origin;
  return c.redirect(`${frontendUrl}/dashboard`);
});

app.get("/auth/csrf", async (c) => {
  const user = await getCurrentUser(c);
  const token = user?.csrf_token || generateRandomToken(24);
  return c.json({ csrf_token: token });
});

app.get("/auth/google", async (c) => {
  const clientId = c.env?.GOOGLE_CLIENT_ID;
  const db = getDb(c);
  const state = generateRandomToken(16);
  const nonce = generateRandomToken(16);

  if (db) {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await db
      .prepare("INSERT INTO oauth_states (state, nonce, expires_at) VALUES (?, ?, ?)")
      .bind(state, nonce, expiresAt)
      .run();
  }

  const redirectUri = `${new URL(c.req.url).origin}/auth/google/callback`;
  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId || "mock-client-id");
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("state", state);
  googleAuthUrl.searchParams.set("nonce", nonce);

  return c.redirect(googleAuthUrl.toString());
});

app.get("/auth/google/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const db = getDb(c);
  const frontendUrl = c.env?.FRONTEND_URL || new URL(c.req.url).origin;

  if (!code) {
    return c.redirect(`${frontendUrl}/login?error=access_denied`);
  }

  let user = {
    id: generateId(),
    email: "athlete@repforge.app",
    name: "RepForge Athlete",
    avatar_url: "https://avatar.vercel.sh/repforge",
  };

  // If real Google OAuth is configured, exchange code for tokens
  if (c.env?.GOOGLE_CLIENT_ID && c.env?.GOOGLE_CLIENT_SECRET && db) {
    try {
      const redirectUri = `${new URL(c.req.url).origin}/auth/google/callback`;
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: c.env.GOOGLE_CLIENT_ID,
          client_secret: c.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      const tokenData = await tokenRes.json();
      if (tokenData.id_token) {
        // Decode payload
        const parts = tokenData.id_token.split(".");
        const payload = JSON.parse(atob(parts[1]));
        const googleId = payload.sub;
        const email = payload.email;
        const name = payload.name || "Athlete";
        const avatarUrl = payload.picture || "";

        // Upsert user
        const existing = await db
          .prepare("SELECT * FROM users WHERE google_id = ?")
          .bind(googleId)
          .first();
        if (existing) {
          user = existing;
        } else {
          const userId = generateId();
          await db
            .prepare(
              "INSERT INTO users (id, google_id, email, name, avatar_url) VALUES (?, ?, ?, ?, ?)"
            )
            .bind(userId, googleId, email, name, avatarUrl)
            .run();
          user = { id: userId, google_id: googleId, email, name, avatar_url: avatarUrl };
        }
      }
    } catch (e) {
      console.error("Google OAuth token exchange error:", e);
    }
  }

  // Create session
  const sessionId = generateRandomToken(32);
  const csrfToken = generateRandomToken(24);
  const maxAge = 7 * 24 * 60 * 60; // 7 days
  const expiresAt = new Date(Date.now() + maxAge * 1000).toISOString();

  if (db) {
    await db
      .prepare(
        "INSERT INTO sessions (id, user_id, csrf_token, user_agent, ip_address, expires_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .bind(
        sessionId,
        user.id,
        csrfToken,
        c.req.header("User-Agent") || "",
        c.req.header("CF-Connecting-IP") || "",
        expiresAt
      )
      .run();
  }

  setCookie(c, "repforge_session", sessionId, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    maxAge,
  });

  return c.redirect(`${frontendUrl}/dashboard`);
});

app.post("/auth/logout", async (c) => {
  const sessionId = getCookie(c, "repforge_session");
  const db = getDb(c);
  if (sessionId && db) {
    await db.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
  }
  deleteCookie(c, "repforge_session", { path: "/" });
  return c.json({ message: "Logged out." });
});

// --- Exercise Library Routes ---
app.get("/api/exercises", async (c) => {
  const db = getDb(c);
  const user = await getCurrentUser(c);
  const category = c.req.query("category");
  const muscle = c.req.query("muscle");
  const equipment = c.req.query("equipment");
  const level = c.req.query("level");
  const search = c.req.query("search");
  const favoritesOnly = c.req.query("favorites_only") === "true";
  const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") || "24", 10)));
  const offset =
    c.req.query("offset") !== undefined
      ? Math.max(0, parseInt(c.req.query("offset"), 10))
      : (page - 1) * limit;

  if (!db) {
    return c.json({ items: [], exercises: [], total: 0, page, limit, offset, total_pages: 0 });
  }

  let favoriteIds = new Set();
  if (user && db) {
    try {
      const favRes = await db
        .prepare("SELECT exercise_id FROM user_favorite_exercises WHERE user_id = ?")
        .bind(user.id)
        .all();
      favoriteIds = new Set((favRes.results || []).map((r) => r.exercise_id));
    } catch {
      // ignore table query errors if unmigrated
    }
  }

  let conditions = ["1=1"];
  let params = [];

  if (category) {
    conditions.push("category = ?");
    params.push(category);
  }
  if (equipment) {
    conditions.push("equipment = ?");
    params.push(equipment);
  }
  if (level) {
    conditions.push("level = ?");
    params.push(level);
  }
  if (muscle) {
    conditions.push("primary_muscles LIKE ?");
    params.push(`%"${muscle}"%`);
  }
  if (search) {
    conditions.push("name LIKE ?");
    params.push(`%${search}%`);
  }
  if (favoritesOnly && user) {
    conditions.push("id IN (SELECT exercise_id FROM user_favorite_exercises WHERE user_id = ?)");
    params.push(user.id);
  }

  const whereClause = conditions.join(" AND ");

  const countQuery = `SELECT COUNT(*) as total FROM exercises WHERE ${whereClause}`;
  const countRow = await db
    .prepare(countQuery)
    .bind(...params)
    .first();
  const total = countRow?.total || 0;

  const dataQuery = `SELECT * FROM exercises WHERE ${whereClause} ORDER BY name ASC LIMIT ? OFFSET ?`;
  const { results } = await db
    .prepare(dataQuery)
    .bind(...params, limit, offset)
    .all();

  const formatted = (results || []).map((row) => ({
    ...row,
    is_favorite: favoriteIds.has(row.id),
    primary_muscles: JSON.parse(row.primary_muscles || "[]"),
    secondary_muscles: JSON.parse(row.secondary_muscles || "[]"),
    instructions: JSON.parse(row.instructions || "[]"),
    images: JSON.parse(row.images || "[]"),
  }));

  return c.json({
    items: formatted,
    exercises: formatted,
    total,
    page,
    limit,
    offset,
    total_pages: Math.ceil(total / limit),
  });
});

app.get("/api/exercises/filters", async (c) => {
  const db = getDb(c);
  if (!db) {
    return c.json({ categories: [], equipment: [], levels: [], muscles: [] });
  }

  const categoriesRes = await db
    .prepare("SELECT DISTINCT category FROM exercises WHERE category IS NOT NULL ORDER BY category")
    .all();
  const equipmentRes = await db
    .prepare(
      "SELECT DISTINCT equipment FROM exercises WHERE equipment IS NOT NULL ORDER BY equipment"
    )
    .all();
  const levelsRes = await db
    .prepare("SELECT DISTINCT level FROM exercises WHERE level IS NOT NULL ORDER BY level")
    .all();

  // Known target muscle groups
  const muscles = [
    "abdominals",
    "abductors",
    "adductors",
    "biceps",
    "calves",
    "chest",
    "forearms",
    "glutes",
    "hamstrings",
    "lats",
    "lower back",
    "middle back",
    "neck",
    "quadriceps",
    "shoulders",
    "traps",
    "triceps",
  ];

  return c.json({
    categories: (categoriesRes.results || []).map((r) => r.category),
    equipment: (equipmentRes.results || []).map((r) => r.equipment),
    levels: (levelsRes.results || []).map((r) => r.level),
    muscles,
  });
});

app.get("/api/exercises/:id", async (c) => {
  const db = getDb(c);
  const id = c.req.param("id");
  if (!db) return c.json({ error: { code: "not_found", message: "Exercise not found." } }, 404);

  const row = await db.prepare("SELECT * FROM exercises WHERE id = ?").bind(id).first();
  if (!row) {
    return c.json({ error: { code: "not_found", message: "Exercise not found." } }, 404);
  }

  return c.json({
    ...row,
    primary_muscles: JSON.parse(row.primary_muscles || "[]"),
    secondary_muscles: JSON.parse(row.secondary_muscles || "[]"),
    instructions: JSON.parse(row.instructions || "[]"),
    images: JSON.parse(row.images || "[]"),
  });
});

// Image Proxy with 1-Year Immutable Cloudflare Cache
app.get("/api/exercises/images/*", async (c) => {
  const rawPath = c.req.path.replace("/api/exercises/images/", "");
  if (!rawPath || rawPath.includes("..")) {
    return c.text("Bad Request", 400);
  }

  const upstreamUrl = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${rawPath}`;
  const response = await fetch(upstreamUrl, {
    cf: {
      cacheEverything: true,
      cacheTtl: 31536000,
    },
  });

  if (!response.ok) {
    return c.text("Image not found", 404);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  return new Response(response.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});

// Favorites
app.get("/api/exercises/favorites", requireAuth, async (c) => {
  const user = c.get("user");
  const db = getDb(c);
  if (!db) return c.json({ favorites: [] });

  const { results } = await db
    .prepare(
      `SELECT e.* FROM exercises e
       JOIN user_favorite_exercises f ON e.id = f.exercise_id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`
    )
    .bind(user.id)
    .all();

  return c.json({
    favorites: (results || []).map((r) => ({
      ...r,
      primary_muscles: JSON.parse(r.primary_muscles || "[]"),
      secondary_muscles: JSON.parse(r.secondary_muscles || "[]"),
      instructions: JSON.parse(r.instructions || "[]"),
      images: JSON.parse(r.images || "[]"),
    })),
  });
});

app.post("/api/exercises/:id/favorite", requireAuth, async (c) => {
  const user = c.get("user");
  const exerciseId = c.req.param("id");
  const db = getDb(c);
  if (db) {
    await db
      .prepare("INSERT OR IGNORE INTO user_favorite_exercises (user_id, exercise_id) VALUES (?, ?)")
      .bind(user.id, exerciseId)
      .run();
  }
  return c.json({ success: true, exercise_id: exerciseId });
});

app.delete("/api/exercises/:id/favorite", requireAuth, async (c) => {
  const user = c.get("user");
  const exerciseId = c.req.param("id");
  const db = getDb(c);
  if (db) {
    await db
      .prepare("DELETE FROM user_favorite_exercises WHERE user_id = ? AND exercise_id = ?")
      .bind(user.id, exerciseId)
      .run();
  }
  return c.json({ success: true, exercise_id: exerciseId });
});

// --- Workouts Routes & Analytics Engine ---
async function fetchUserWorkouts(db, userId) {
  if (!db) return [];
  const query = `
    SELECT 
      d.id as day_id, d.date, d.day_number, d.day_label,
      e.id as exercise_id, e.exercise_name, e.workout_type, e.notes,
      s.id as set_id, s.set_number, s.reps, s.weight_kg as weight, s.completed
    FROM workout_days d
    JOIN workout_exercises e ON d.id = e.workout_day_id
    JOIN workout_sets s ON e.id = s.workout_exercise_id
    WHERE d.user_id = ?
    ORDER BY d.date DESC, e.order_index ASC, s.set_number ASC
  `;
  const { results } = await db.prepare(query).bind(userId).all();
  return results || [];
}

function computeStreak(workouts) {
  if (!workouts || workouts.length === 0) return { current_streak: 0, longest_streak: 0 };
  const dates = Array.from(new Set(workouts.map((w) => w.date.substring(0, 10)))).sort();
  let longest = 1;
  let currentRun = 1;
  for (let i = 1; i < dates.length; i++) {
    const diff = (new Date(dates[i]) - new Date(dates[i - 1])) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      currentRun++;
    } else {
      longest = Math.max(longest, currentRun);
      currentRun = 1;
    }
  }
  longest = Math.max(longest, currentRun);

  // Compute active streak
  const today = new Date().toISOString().substring(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().substring(0, 10);
  const dateSet = new Set(dates);
  let activeStreak = 0;
  let cursor = dateSet.has(today)
    ? new Date(today)
    : dateSet.has(yesterday)
      ? new Date(yesterday)
      : null;

  if (cursor) {
    while (dateSet.has(cursor.toISOString().substring(0, 10))) {
      activeStreak++;
      cursor = new Date(cursor.getTime() - 86400000);
    }
  }

  return { current_streak: activeStreak, longest_streak: longest };
}

function computePRs(workouts) {
  const best = {};
  for (const w of workouts) {
    const name = w.exercise_name;
    const weight = Number(w.weight);
    if (!best[name] || weight > best[name].weight) {
      best[name] = {
        exercise_name: name,
        weight,
        reps: w.reps,
        date: w.date,
      };
    }
  }
  return Object.values(best).sort((a, b) => b.weight - a.weight);
}

function computeVolumeTrend(workouts, weeks = 12) {
  const trend = {};
  const cutoff = new Date(Date.now() - weeks * 7 * 86400000);

  for (const w of workouts) {
    const d = new Date(w.date);
    if (d >= cutoff) {
      // ISO week format YYYY-Wxx
      const startOfYear = new Date(d.getFullYear(), 0, 1);
      const weekNum = Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
      const key = `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
      const vol = Number(w.weight) * Number(w.reps);
      trend[key] = (trend[key] || 0) + vol;
    }
  }
  return Object.entries(trend)
    .map(([week, volume]) => ({ week, volume: Math.round(volume * 100) / 100 }))
    .sort((a, b) => a.week.localeCompare(b.week));
}

function computeFrequencyByType(workouts) {
  const counts = {};
  const dayTypes = new Set();
  for (const w of workouts) {
    const key = `${w.day_id}_${w.workout_type}`;
    if (!dayTypes.has(key)) {
      dayTypes.add(key);
      counts[w.workout_type] = (counts[w.workout_type] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([workout_type, count]) => ({ workout_type, count }))
    .sort((a, b) => b.count - a.count);
}

function detectPlateaus(workouts) {
  const byExercise = {};
  for (const w of workouts) {
    if (!byExercise[w.exercise_name]) byExercise[w.exercise_name] = [];
    byExercise[w.exercise_name].push(w);
  }

  const plateaus = [];
  for (const [name, sets] of Object.entries(byExercise)) {
    const days = Array.from(new Set(sets.map((s) => s.date))).sort();
    if (days.length >= 4) {
      const last4Days = days.slice(-4);
      const weights = last4Days.map((d) => {
        const daySets = sets.filter((s) => s.date === d);
        return Math.max(...daySets.map((s) => Number(s.weight)));
      });
      if (weights.every((w) => w === weights[0]) && weights[0] > 0) {
        plateaus.push({
          exercise_name: name,
          weight: weights[0],
          sessions_at_weight: 4,
        });
      }
    }
  }
  return plateaus;
}

async function fetchHierarchicalWorkouts(db, userId, search = null, limit = 50, offset = 0) {
  if (!db) return [];

  let dayQuery = `
    SELECT d.id, d.date, d.day_label, d.day_number, d.created_at
    FROM workout_days d
    WHERE d.user_id = ?
  `;
  const dayParams = [userId];
  if (search) {
    dayQuery += `
      AND (
        d.day_label LIKE ?
        OR EXISTS (
          SELECT 1 FROM workout_exercises e
          WHERE e.workout_day_id = d.id
          AND (e.exercise_name LIKE ? OR e.notes LIKE ? OR e.workout_type LIKE ?)
        )
      )
    `;
    const s = `%${search}%`;
    dayParams.push(s, s, s, s);
  }
  dayQuery += ` ORDER BY d.date DESC, d.created_at DESC LIMIT ? OFFSET ?`;
  dayParams.push(limit, offset);

  const { results: days } = await db.prepare(dayQuery).bind(...dayParams).all();
  if (!days || days.length === 0) return [];

  const dayIds = days.map((d) => d.id);
  const placeholders = dayIds.map(() => "?").join(",");

  const exQuery = `
    SELECT id, workout_day_id, exercise_name, workout_type, notes, order_index
    FROM workout_exercises
    WHERE workout_day_id IN (${placeholders})
    ORDER BY order_index ASC
  `;
  const { results: exercises } = await db.prepare(exQuery).bind(...dayIds).all();
  const exerciseIds = (exercises || []).map((e) => e.id);

  let sets = [];
  if (exerciseIds.length > 0) {
    const setPlaceholders = exerciseIds.map(() => "?").join(",");
    const setQuery = `
      SELECT id, workout_exercise_id, set_number, reps, weight_kg as weight, completed
      FROM workout_sets
      WHERE workout_exercise_id IN (${setPlaceholders})
      ORDER BY set_number ASC
    `;
    const setRes = await db.prepare(setQuery).bind(...exerciseIds).all();
    sets = setRes.results || [];
  }

  const setsByEx = {};
  for (const s of sets) {
    if (!setsByEx[s.workout_exercise_id]) setsByEx[s.workout_exercise_id] = [];
    setsByEx[s.workout_exercise_id].push({
      id: s.id,
      set_number: s.set_number,
      reps: s.reps,
      weight: Number(s.weight),
      weight_kg: Number(s.weight),
      completed: Boolean(s.completed),
    });
  }

  const exercisesByDay = {};
  for (const e of exercises || []) {
    if (!exercisesByDay[e.workout_day_id]) exercisesByDay[e.workout_day_id] = [];
    exercisesByDay[e.workout_day_id].push({
      id: e.id,
      exercise_name: e.exercise_name,
      workout_type: e.workout_type,
      notes: e.notes || "",
      order_index: e.order_index,
      sets: setsByEx[e.id] || [],
    });
  }

  return days.map((d) => ({
    id: d.id,
    date: d.date,
    day: d.day_label,
    day_number: d.day_number,
    exercises: exercisesByDay[d.id] || [],
  }));
}

app.get("/api/workouts", requireAuth, async (c) => {
  const user = c.get("user");
  const db = getDb(c);
  const search = c.req.query("search");
  const limit = Math.min(500, Math.max(1, parseInt(c.req.query("limit") || "50", 10)));
  const offset = Math.max(0, parseInt(c.req.query("offset") || "0", 10));

  const days = await fetchHierarchicalWorkouts(db, user.id, search, limit, offset);
  return c.json({ workouts: days, count: days.length });
});

app.post("/api/workouts", requireAuth, async (c) => {
  const user = c.get("user");
  const db = getDb(c);
  const body = await c.req.json();

  const { date, day: dayLabel = null } = body;
  if (!date) {
    return c.json({ error: { code: "validation_error", message: "Date is required." } }, 400);
  }

  // Normalize exercises list (supports both modal payload and flat logger)
  let exercisesList = [];
  if (Array.isArray(body.exercises) && body.exercises.length > 0) {
    exercisesList = body.exercises;
  } else if (body.exercise_name && body.workout_type) {
    const reps = Math.max(1, parseInt(body.reps || 10, 10));
    const weight = Math.max(0, Number(body.weight || 0));
    const setCount = Math.max(1, Math.min(50, parseInt(body.sets || 1, 10)));
    const sets = [];
    for (let i = 1; i <= setCount; i++) {
      sets.push({ reps, weight, completed: true });
    }
    exercisesList = [
      {
        exercise_name: body.exercise_name,
        workout_type: body.workout_type,
        notes: body.notes || "",
        sets,
      },
    ];
  } else {
    return c.json(
      { error: { code: "validation_error", message: "At least one exercise is required." } },
      400
    );
  }

  if (!db) {
    return c.json({
      success: true,
      workout: { id: generateId(), date, day: dayLabel, exercises: exercisesList },
    });
  }

  // Determine next day_number
  const maxDayRow = await db
    .prepare("SELECT COALESCE(MAX(day_number), 0) AS max_day FROM workout_days WHERE user_id = ?")
    .bind(user.id)
    .first();
  const nextDayNum = (maxDayRow?.max_day || 0) + 1;

  // Insert workout day
  const dayId = generateId();
  await db
    .prepare(
      "INSERT INTO workout_days (id, user_id, date, day_label, day_number) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(dayId, user.id, date, dayLabel, nextDayNum)
    .run();

  const createdExercises = [];

  for (let eIdx = 0; eIdx < exercisesList.length; eIdx++) {
    const ex = exercisesList[eIdx];
    const exerciseId = generateId();
    await db
      .prepare(
        "INSERT INTO workout_exercises (id, workout_day_id, exercise_name, workout_type, notes, order_index) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .bind(exerciseId, dayId, ex.exercise_name, ex.workout_type, ex.notes || "", eIdx)
      .run();

    const createdSets = [];
    const setsArray =
      Array.isArray(ex.sets) && ex.sets.length > 0
        ? ex.sets
        : [{ reps: 10, weight: 60, completed: true }];

    for (let sIdx = 0; sIdx < setsArray.length; sIdx++) {
      const s = setsArray[sIdx];
      const setId = generateId();
      const reps = Math.max(1, parseInt(s.reps || 10, 10));
      const weight = Math.max(0, Number(s.weight !== undefined ? s.weight : s.weight_kg || 0));
      const completed = s.completed !== false ? 1 : 0;

      await db
        .prepare(
          "INSERT INTO workout_sets (id, workout_exercise_id, set_number, reps, weight_kg, completed) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(setId, exerciseId, sIdx + 1, reps, weight, completed)
        .run();

      createdSets.push({
        id: setId,
        set_number: sIdx + 1,
        reps,
        weight,
        weight_kg: weight,
        completed: Boolean(completed),
      });
    }

    createdExercises.push({
      id: exerciseId,
      exercise_name: ex.exercise_name,
      workout_type: ex.workout_type,
      notes: ex.notes || "",
      order_index: eIdx,
      sets: createdSets,
    });
  }

  const createdWorkout = {
    id: dayId,
    user_id: user.id,
    date,
    day: dayLabel,
    day_number: nextDayNum,
    exercises: createdExercises,
  };

  return c.json({ success: true, workout: createdWorkout }, 201);
});

app.put("/api/workouts/exercises/:exercise_id", requireAuth, async (c) => {
  const user = c.get("user");
  const exerciseId = c.req.param("exercise_id");
  const db = getDb(c);
  const body = await c.req.json();

  if (!db) {
    return c.json({ exercise: { id: exerciseId, ...body } });
  }

  // Tenant check
  const existing = await db
    .prepare(
      `SELECT e.id, e.workout_day_id FROM workout_exercises e
       JOIN workout_days d ON e.workout_day_id = d.id
       WHERE e.id = ? AND d.user_id = ?`
    )
    .bind(exerciseId, user.id)
    .first();

  if (!existing) {
    return c.json({ error: { code: "not_found", message: "Exercise not found." } }, 404);
  }

  const { exercise_name, workout_type, notes = "", sets = [] } = body;
  await db
    .prepare(
      `UPDATE workout_exercises SET exercise_name = ?, workout_type = ?, notes = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(exercise_name, workout_type, notes, exerciseId)
    .run();

  // Delete existing sets and reinsert
  await db.prepare("DELETE FROM workout_sets WHERE workout_exercise_id = ?").bind(exerciseId).run();

  const insertedSets = [];
  for (let s = 0; s < sets.length; s++) {
    const sItem = sets[s];
    const setId = sItem.id || generateId();
    const w = Math.max(0, Number(sItem.weight !== undefined ? sItem.weight : sItem.weight_kg || 0));
    const r = Math.max(1, parseInt(sItem.reps || 1, 10));
    const completed = sItem.completed !== false ? 1 : 0;
    await db
      .prepare(
        "INSERT INTO workout_sets (id, workout_exercise_id, set_number, reps, weight_kg, completed) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .bind(setId, exerciseId, s + 1, r, w, completed)
      .run();
    insertedSets.push({
      id: setId,
      set_number: s + 1,
      reps: r,
      weight: w,
      weight_kg: w,
      completed: Boolean(completed),
    });
  }

  return c.json({
    exercise: {
      id: exerciseId,
      workout_day_id: existing.workout_day_id,
      exercise_name,
      workout_type,
      notes,
      sets: insertedSets,
    },
  });
});

app.delete("/api/workouts/exercises/:exercise_id", requireAuth, async (c) => {
  const user = c.get("user");
  const exerciseId = c.req.param("exercise_id");
  const db = getDb(c);

  if (!db) {
    return c.json({ message: "Exercise deleted." });
  }

  // Tenant check
  const existing = await db
    .prepare(
      `SELECT e.id, e.workout_day_id FROM workout_exercises e
       JOIN workout_days d ON e.workout_day_id = d.id
       WHERE e.id = ? AND d.user_id = ?`
    )
    .bind(exerciseId, user.id)
    .first();

  if (!existing) {
    return c.json({ error: { code: "not_found", message: "Exercise not found." } }, 404);
  }

  const dayId = existing.workout_day_id;

  // Delete sets and exercise
  await db.prepare("DELETE FROM workout_sets WHERE workout_exercise_id = ?").bind(exerciseId).run();
  await db.prepare("DELETE FROM workout_exercises WHERE id = ?").bind(exerciseId).run();

  // If no exercises remain in this day, clean up day
  const remaining = await db
    .prepare("SELECT COUNT(*) as count FROM workout_exercises WHERE workout_day_id = ?")
    .bind(dayId)
    .first();

  if (!remaining || remaining.count === 0) {
    await db.prepare("DELETE FROM workout_days WHERE id = ?").bind(dayId).run();
  }

  return c.json({ message: "Exercise deleted." });
});

app.get("/api/workouts/stats", requireAuth, async (c) => {
  const user = c.get("user");
  const db = getDb(c);
  const workouts = await fetchUserWorkouts(db, user.id);

  const streak = computeStreak(workouts);
  const prs = computePRs(workouts);
  const totalVolume = workouts.reduce((sum, w) => sum + Number(w.weight) * Number(w.reps), 0);
  const trainingDays = new Set(workouts.map((w) => w.date.substring(0, 10))).size;
  const uniqueExercises = new Set(workouts.map((w) => w.exercise_name)).size;

  return c.json({
    stats: {
      total_workouts: new Set(workouts.map((w) => w.day_id)).size,
      current_streak: streak.current_streak,
      longest_streak: streak.longest_streak,
      training_days: trainingDays,
      total_volume: Math.round(totalVolume * 100) / 100,
      unique_exercises: uniqueExercises,
      personal_records_count: prs.length,
    },
    recent_prs: prs.slice(0, 5),
    recent_workouts: workouts.slice(0, 10),
  });
});

app.get("/api/workouts/analytics", requireAuth, async (c) => {
  const user = c.get("user");
  const db = getDb(c);
  const workouts = await fetchUserWorkouts(db, user.id);

  return c.json({
    volume_trend: computeVolumeTrend(workouts, 12),
    frequency_by_type: computeFrequencyByType(workouts),
    plateaus: detectPlateaus(workouts),
    prs: computePRs(workouts),
    streak: computeStreak(workouts),
  });
});

app.get("/api/workouts/progress/:exercise_name", requireAuth, async (c) => {
  const user = c.get("user");
  const exerciseName = decodeURIComponent(c.req.param("exercise_name"));
  const db = getDb(c);
  const workouts = await fetchUserWorkouts(db, user.id);

  const matched = workouts.filter((w) => w.exercise_name === exerciseName);
  const byDate = {};
  for (const s of matched) {
    if (!byDate[s.date] || Number(s.weight) > Number(byDate[s.date].weight)) {
      byDate[s.date] = s;
    }
  }

  const progression = Object.values(byDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => {
      const w = Number(s.weight);
      const r = Number(s.reps);
      const est1rm = r > 1 ? Math.round(w * (1 + r / 30) * 10) / 10 : w;
      return {
        date: s.date,
        weight: w,
        reps: r,
        estimated_1rm: est1rm,
      };
    });

  return c.json({ progression });
});

app.delete("/api/workouts/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const db = getDb(c);
  if (db) {
    // Delete set with tenant isolation check
    await db
      .prepare(
        `DELETE FROM workout_sets 
         WHERE id = ? AND workout_exercise_id IN (
           SELECT we.id FROM workout_exercises we
           JOIN workout_days wd ON we.workout_day_id = wd.id
           WHERE wd.user_id = ?
         )`
      )
      .bind(id, user.id)
      .run();
  }
  return c.json({ success: true, deleted_id: id });
});

app.delete("/api/workouts/day/:day_id", requireAuth, async (c) => {
  const user = c.get("user");
  const dayId = c.req.param("day_id");
  const db = getDb(c);
  if (db) {
    await db
      .prepare("DELETE FROM workout_days WHERE id = ? AND user_id = ?")
      .bind(dayId, user.id)
      .run();
  }
  return c.json({ success: true, deleted_day_id: dayId });
});

// --- Goals Routes ---
app.get("/api/goals", requireAuth, async (c) => {
  const user = c.get("user");
  const db = getDb(c);
  if (!db) return c.json({ goals: [] });

  const { results } = await db
    .prepare("SELECT * FROM goals WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC")
    .bind(user.id)
    .all();

  return c.json({ goals: results || [] });
});

app.post("/api/goals", requireAuth, async (c) => {
  const user = c.get("user");
  const db = getDb(c);
  const body = await c.req.json();
  const {
    goal_type,
    exercise_name = null,
    target_value,
    period_start = null,
    period_end = null,
  } = body;

  if (!goal_type || target_value === undefined || Number(target_value) <= 0) {
    return c.json(
      { error: { code: "validation_error", message: "target_value must be a positive number." } },
      400
    );
  }

  const id = generateId();
  if (db) {
    await db
      .prepare(
        "INSERT INTO goals (id, user_id, goal_type, exercise_name, target_value, period_start, period_end) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(id, user.id, goal_type, exercise_name, Number(target_value), period_start, period_end)
      .run();
  }

  return c.json({ success: true, goal: { id, goal_type, exercise_name, target_value } });
});

app.delete("/api/goals/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const db = getDb(c);
  if (db) {
    await db.prepare("DELETE FROM goals WHERE id = ? AND user_id = ?").bind(id, user.id).run();
  }
  return c.json({ success: true, deleted_id: id });
});

// --- Groq Strength Coach Routes ---
app.get("/api/coach/status", (c) => {
  const apiKey = c.env?.GROQ_API_KEY;
  return c.json({
    available: Boolean(apiKey),
    model: c.env?.GROQ_MODEL || "qwen/qwen3.8-27b",
    provider: "groq",
  });
});

async function handleCoachInsight(c) {
  const user = c.get("user");
  const dayId = c.req.param("day_id");
  const db = getDb(c);
  const workouts = await fetchUserWorkouts(db, user.id);
  const daySets = workouts.filter((w) => w.day_id === dayId);

  if (daySets.length === 0) {
    const msg = "Great effort logging your session! Keep up the progressive overload.";
    return c.json({ insight: msg, insights: msg });
  }

  const vol = daySets.reduce((sum, s) => sum + Number(s.weight) * Number(s.reps), 0);
  const exercises = Array.from(new Set(daySets.map((s) => s.exercise_name))).join(", ");

  const apiKey = c.env?.GROQ_API_KEY;
  if (apiKey) {
    try {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: c.env?.GROQ_MODEL || "qwen/qwen3.8-27b",
          messages: [
            {
              role: "system",
              content:
                "You are RepForge Neural Coach. Deliver an elite, punchy, 2-bullet tactical post-workout breakdown in Claude style with rich emojis (🎯 ⚡ 🦾 📈). Maximum 45 words. Highlight gross tonnage, overload target, and recovery nutrition directly without filler.",
            },
            {
              role: "user",
              content: `Athlete: ${user.name}. Exercises: ${exercises}. Total sets: ${daySets.length}. Total volume: ${vol.toFixed(1)} kg.`,
            },
          ],
          temperature: 0.6,
          max_tokens: 160,
        }),
      });
      if (groqRes.ok) {
        const groqData = await groqRes.json();
        const text = groqData.choices?.[0]?.message?.content?.trim();
        if (text) {
          return c.json({ insight: text, insights: text });
        }
      }
    } catch (e) {
      console.warn("Groq insight error:", e);
    }
  }

  const fallbackMsg = `Session Complete: ${daySets.length} sets logged across ${exercises}. Gross tonnage: ${vol.toFixed(1)} kg. Focus on progressive overload and post-workout protein for recovery!`;
  return c.json({ insight: fallbackMsg, insights: fallbackMsg });
}

app.get("/api/coach/insights/:day_id", requireAuth, handleCoachInsight);
app.post("/api/coach/insights/:day_id", requireAuth, handleCoachInsight);

app.post("/api/coach/chat", requireAuth, async (c) => {
  const user = c.get("user");
  const db = getDb(c);
  const body = await c.req.json();
  const rawMessage = (body.message || "").trim();
  const history = body.history || [];

  const apiKey = c.env?.GROQ_API_KEY;
  if (!apiKey) {
    return c.json({
      reply:
        "Groq API key is not configured on this Cloudflare deployment. Set GROQ_API_KEY in your Cloudflare dashboard.",
    });
  }

  // Prompt injection & Medical refusal checks
  const sanitized = rawMessage
    .replace(/<[^>]*>/g, "")
    .replace(/\[INST\]/gi, "")
    .replace(/system:/gi, "")
    .substring(0, 1500);

  const medicalTerms = [
    "diagnose",
    "diagnosis",
    "cure my",
    "prescribe",
    "torn ligament",
    "herniated disc",
  ];
  if (medicalTerms.some((t) => sanitized.toLowerCase().includes(t))) {
    return c.json({
      reply:
        "I am an algorithmic strength and hypertrophy conditioning coach, not a medical professional. I cannot diagnose pain, injury, or medical conditions. Please consult a qualified physical therapist or sports medicine physician.",
    });
  }

  // Fetch verified user telemetry
  const workouts = await fetchUserWorkouts(db, user.id);
  const streak = computeStreak(workouts);
  const prs = computePRs(workouts).slice(0, 5);
  const recentWorkouts = workouts.slice(0, 8);

  const telemetryContext = JSON.stringify({
    athlete_name: user.name,
    current_streak: streak.current_streak,
    personal_records: prs,
    recent_training: recentWorkouts.map((w) => ({
      date: w.date,
      exercise: w.exercise_name,
      weight: w.weight,
      reps: w.reps,
    })),
  });

  const systemPrompt = `You are RepForge Coach, a friendly, practical strength-training coach. Speak naturally, like a helpful person at the gym. Answer the question directly in a few concise sentences; avoid fixed headings, telemetry jargon, ASCII cards, and unnecessary emojis. Ask one short follow-up only when important details are missing.

Use the athlete's verified workout history below only when it is relevant. Never invent lifts, progress, or personal records. If there is not enough history to answer a personal-progress question, say so plainly. For general training questions, answer normally without pretending to have personal data. Do not diagnose injuries or prescribe treatment; suggest a qualified clinician for pain or injury concerns.

Verified workout history:
${telemetryContext}`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-6).map((h) => ({ role: h.role, content: h.text || h.content })),
    { role: "user", content: `<user_query>${sanitized}</user_query>` },
  ];

  // Check if client requested SSE stream
  const acceptHeader = c.req.header("Accept") || "";
  const wantsStream = acceptHeader.includes("text/event-stream");

  // Keep first-token latency bounded; model fallbacks can be selected through GROQ_MODEL.
  const primaryModel = c.env?.GROQ_MODEL || "qwen/qwen3.8-27b";
  const candidateModels = [primaryModel];

  let groqResponse = null;

  for (const modelName of candidateModels) {
    const upstreamController = new AbortController();
    const upstreamTimeout = setTimeout(() => upstreamController.abort(), 4500);
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages,
          temperature: 0.45,
          max_tokens: 320,
          stream: wantsStream,
        }),
        signal: upstreamController.signal,
      });
      clearTimeout(upstreamTimeout);

      if (res.ok) {
        groqResponse = res;
        break;
      } else {
        const errText = await res.text();
        console.warn(`Model ${modelName} returned status ${res.status}: ${errText}`);
      }
    } catch (err) {
      clearTimeout(upstreamTimeout);
      console.warn(`Fetch error for model ${modelName}:`, err);
    }
  }

  if (!groqResponse || !groqResponse.ok) {
    return c.json({
      error: {
        code: "coach_unavailable",
        message: "Coach could not get a reply in time. Please try again.",
      },
    }, 503);
  }

  if (wantsStream && groqResponse.body) {
    return streamSSE(c, async (stream) => {
      const reader = groqResponse.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            const raw = trimmed.slice(6);
            if (raw === "[DONE]") {
              await stream.writeSSE({ data: "[DONE]" });
              return;
            }
            try {
              const parsed = JSON.parse(raw);
              const delta = parsed.choices?.[0]?.delta?.content || "";
              if (delta) {
                await stream.writeSSE({ data: JSON.stringify({ text: delta }) });
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
      await stream.writeSSE({ data: "[DONE]" });
    });
  } else {
    const data = await groqResponse.json();
    const reply = data.choices?.[0]?.message?.content || "Coach response received.";
    return c.json({ reply });
  }
});

// Fallback 404 for unknown API routes
app.all("/api/*", (c) =>
  c.json({ error: { code: "not_found", message: "API endpoint not found." } }, 404)
);
app.all("/auth/*", (c) =>
  c.json({ error: { code: "not_found", message: "Auth endpoint not found." } }, 404)
);

// Delegate all client-side SPA routes and static assets to Cloudflare Assets
app.all("*", async (c) => {
  if (c.env?.ASSETS) {
    let res = await c.env.ASSETS.fetch(c.req.raw);
    if (res.status === 404 && !new URL(c.req.url).pathname.includes(".")) {
      const rootUrl = new URL("/", c.req.url);
      res = await c.env.ASSETS.fetch(new Request(rootUrl, c.req.raw));
    }
    return res;
  }
  return c.text("Not Found", 404);
});

export default app;
