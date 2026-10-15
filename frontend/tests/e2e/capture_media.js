import { chromium } from "playwright";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.BASE_URL || "https://repforge.chetanaybatra03-8b2.workers.dev";
const OUTPUT_DIR = path.resolve("docs/media");
const TEMP_VIDEOS = path.resolve("docs/media/temp_videos");
const FFMPEG_PATH = "C:\\Users\\batra\\AppData\\Local\\ms-playwright\\ffmpeg-1013\\ffmpeg-win64.exe";

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(TEMP_VIDEOS)) fs.mkdirSync(TEMP_VIDEOS, { recursive: true });

function convertToGif(videoPath, gifPath) {
  try {
    const cmd = `python tests/e2e/convert_to_gif.py "${videoPath}" "${gifPath}"`;
    execSync(cmd, { stdio: "inherit" });
  } catch (e) {
    console.error(`Failed to convert ${videoPath} to GIF:`, e.message);
  }
}

async function captureAllMedia() {
  console.log(`Starting RepForge Playwright Media Capture targeting ${BASE_URL}...`);

  // Launch browser with WebGL enabled
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--no-sandbox",
    ],
  });

  // --- 1. Desktop Screenshots (1440x900) ---
  console.log("\n--- Capturing High-Res Desktop Screenshots (1440x900) ---");
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await desktopContext.newPage();

  // Landing Page
  console.log("Navigating to Landing Page...");
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000); // Wait for 3D stars & animations
  await page.screenshot({ path: path.join(OUTPUT_DIR, "landing.png"), fullPage: false });
  console.log("✓ Saved docs/media/landing.png");

  // Login Page
  console.log("Navigating to Login Page...");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, "login.png"), fullPage: false });
  console.log("✓ Saved docs/media/login.png");

  // Demo Login to establish session
  console.log("Authenticating as Marcus Vance via Demo Login...");
  await page.goto(`${BASE_URL}/auth/demo-login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500); // Allow 3D Hero and volume charts to render

  // Dashboard Page
  console.log("Capturing Dashboard Page...");
  await page.screenshot({ path: path.join(OUTPUT_DIR, "dashboard.png"), fullPage: false });
  console.log("✓ Saved docs/media/dashboard.png");

  // Workouts Page (with Exercise Picker Modal)
  console.log("Navigating to Workouts Page...");
  await page.goto(`${BASE_URL}/workouts`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  // Open Exercise Picker
  const pickerBtn = await page.$("button:has-text('Browse Exercise Library'), button:has-text('Pick from Library'), button:has-text('Browse Library')");
  if (pickerBtn) {
    await pickerBtn.click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: path.join(OUTPUT_DIR, "workouts.png"), fullPage: false });
  console.log("✓ Saved docs/media/workouts.png");

  // Exercises Library Page
  console.log("Navigating to Exercises Page...");
  await page.goto(`${BASE_URL}/exercises`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, "exercises.png"), fullPage: false });
  console.log("✓ Saved docs/media/exercises.png");

  // Coach Page
  console.log("Navigating to Coach Page...");
  await page.goto(`${BASE_URL}/coach`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUTPUT_DIR, "coach.png"), fullPage: false });
  console.log("✓ Saved docs/media/coach.png");

  // Goals Page
  console.log("Navigating to Goals Page...");
  await page.goto(`${BASE_URL}/goals`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUTPUT_DIR, "goals.png"), fullPage: false });
  console.log("✓ Saved docs/media/goals.png");

  await desktopContext.close();

  // --- 2. Mobile Screenshots (390x844 - iPhone 14) ---
  console.log("\n--- Capturing Mobile Screenshots (390x844) ---");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();

  // Mobile Demo Login
  await mobilePage.goto(`${BASE_URL}/auth/demo-login`, { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(2500);
  await mobilePage.screenshot({ path: path.join(OUTPUT_DIR, "mobile-dashboard.png") });
  console.log("✓ Saved docs/media/mobile-dashboard.png");

  // Mobile Workouts
  await mobilePage.goto(`${BASE_URL}/workouts`, { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(1500);
  await mobilePage.screenshot({ path: path.join(OUTPUT_DIR, "mobile-workouts.png") });
  console.log("✓ Saved docs/media/mobile-workouts.png");

  // Mobile Coach
  await mobilePage.goto(`${BASE_URL}/coach`, { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(2000);
  await mobilePage.screenshot({ path: path.join(OUTPUT_DIR, "mobile-coach.png") });
  console.log("✓ Saved docs/media/mobile-coach.png");

  await mobileContext.close();

  // --- 3. Capture 3 Demo Video Record Contexts & Convert to GIFs ---
  console.log("\n--- Recording Demo Sessions for High-Performance GIFs ---");

  // GIF 1: Workout Logging with Exercise Picker
  console.log("Recording GIF 1: Workout Logging with Exercise Picker...");
  const videoCtx1 = await browser.newContext({
    viewport: { width: 1200, height: 750 },
    recordVideo: { dir: TEMP_VIDEOS, size: { width: 1200, height: 750 } },
  });
  const page1 = await videoCtx1.newPage();
  await page1.goto(`${BASE_URL}/auth/demo-login`, { waitUntil: "networkidle" });
  await page1.goto(`${BASE_URL}/workouts`, { waitUntil: "networkidle" });
  await page1.waitForTimeout(1000);

  const btn1 = await page1.$("button:has-text('Browse Exercise Library'), button:has-text('Pick from Library'), button:has-text('Browse Library')");
  if (btn1) {
    await btn1.click();
    await page1.waitForTimeout(1000);
    // Type in search
    const searchInput = await page1.$("input[placeholder*='Search']");
    if (searchInput) {
      await searchInput.type("Bench", { delay: 100 });
      await page1.waitForTimeout(1000);
    }
    // Click first exercise card
    const card = await page1.$(".rf-picker-card, .rf-exercise-card, div[role='button']");
    if (card) {
      await card.click();
      await page1.waitForTimeout(1000);
    }
  }
  await page1.waitForTimeout(1500);
  await page1.close();
  await videoCtx1.close();

  // GIF 2: 3D Dashboard Interaction
  console.log("Recording GIF 2: 3D Dashboard Interactive Orbit & Volume...");
  const videoCtx2 = await browser.newContext({
    viewport: { width: 1200, height: 750 },
    recordVideo: { dir: TEMP_VIDEOS, size: { width: 1200, height: 750 } },
  });
  const page2 = await videoCtx2.newPage();
  await page2.goto(`${BASE_URL}/auth/demo-login`, { waitUntil: "networkidle" });
  await page2.waitForTimeout(2000);
  // Smoothly move mouse over the 3D Hero canvas
  await page2.mouse.move(600, 300);
  await page2.waitForTimeout(400);
  await page2.mouse.move(400, 250, { steps: 10 });
  await page2.waitForTimeout(400);
  await page2.mouse.move(800, 350, { steps: 10 });
  await page2.waitForTimeout(600);
  // Hover over volume trend
  await page2.mouse.move(600, 600, { steps: 10 });
  await page2.waitForTimeout(1500);
  await page2.close();
  await videoCtx2.close();

  // GIF 3: Coach Chat Streaming Response
  console.log("Recording GIF 3: Coach Streaming Response...");
  const videoCtx3 = await browser.newContext({
    viewport: { width: 1200, height: 750 },
    recordVideo: { dir: TEMP_VIDEOS, size: { width: 1200, height: 750 } },
  });
  const page3 = await videoCtx3.newPage();
  await page3.goto(`${BASE_URL}/auth/demo-login`, { waitUntil: "networkidle" });
  await page3.goto(`${BASE_URL}/coach`, { waitUntil: "networkidle" });
  await page3.waitForTimeout(1500);

  // Click quick prompt pill or type prompt
  const quickPill = await page3.$("button:has-text('volume'), button:has-text('overload'), button:has-text('streak')");
  if (quickPill) {
    await quickPill.click();
  } else {
    const chatInput = await page3.$("input[placeholder*='Ask'], textarea");
    if (chatInput) {
      await chatInput.type("How should I plan my progressive overload for squat next session?", { delay: 40 });
      const sendBtn = await page3.$("button:has-text('Send'), button[type='submit']");
      if (sendBtn) await sendBtn.click();
    }
  }
  await page3.waitForTimeout(4000); // Allow stream tokens to render smoothly
  await page3.close();
  await videoCtx3.close();

  await browser.close();

  // --- 4. Convert Recorded Videos to GIFs ---
  console.log("\n--- Converting WebM Videos to Optimized GIFs with FFmpeg ---");
  const videoFiles = fs.readdirSync(TEMP_VIDEOS).filter((f) => f.endsWith(".webm"));
  videoFiles.sort((a, b) => fs.statSync(path.join(TEMP_VIDEOS, a)).mtimeMs - fs.statSync(path.join(TEMP_VIDEOS, b)).mtimeMs);

  const gifTargets = [
    "demo-workout-logging.gif",
    "demo-3d-dashboard.gif",
    "demo-coach-stream.gif",
  ];

  videoFiles.forEach((vFile, idx) => {
    if (gifTargets[idx]) {
      const src = path.join(TEMP_VIDEOS, vFile);
      const dest = path.join(OUTPUT_DIR, gifTargets[idx]);
      convertToGif(src, dest);
    }
  });

  // Clean up temp video directory
  try {
    fs.rmSync(TEMP_VIDEOS, { recursive: true, force: true });
  } catch {
    // ignore
  }

  console.log("\n🎉 RepForge Media Capture Complete! All screenshots and GIFs in docs/media/.");
}

captureAllMedia().catch((err) => {
  console.error("Capture Media Error:", err);
  process.exit(1);
});
