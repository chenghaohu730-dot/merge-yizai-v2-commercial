import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "..");
const projectRoot = path.resolve(root, "..", "..");
const outDir = path.join(projectRoot, "tests", "device-checks", "acceptance-v3-local-assets");
const port = await findFreePort(5300);
const url = `http://127.0.0.1:${port}`;
let server;

const shots = [
  { name: "start-page", width: 900, height: 1200, mode: "start", isMobile: false },
  { name: "game-page-desktop", width: 900, height: 1200, mode: "playing", isMobile: false },
  { name: "iphone-12", width: 390, height: 844, mode: "playing", isMobile: true },
  { name: "compact-android", width: 360, height: 740, mode: "playing", isMobile: true },
  { name: "long-screen", width: 390, height: 932, mode: "playing", isMobile: true },
  { name: "short-screen", width: 390, height: 700, mode: "playing", isMobile: true },
  { name: "pause-modal", width: 390, height: 844, mode: "paused", isMobile: true },
  { name: "result-modal", width: 390, height: 844, mode: "result", isMobile: true },
  { name: "settings-panel", width: 390, height: 844, mode: "settings", isMobile: true },
  { name: "leaderboard-panel", width: 390, height: 844, mode: "leaderboard", isMobile: true },
  { name: "achievements-panel", width: 390, height: 844, mode: "achievements", isMobile: true },
];

await mkdir(outDir, { recursive: true });

try {
  server = await startVite(port);
  const browser = await chromium.launch({ headless: true });
  const summary = [];

  for (const shot of shots) {
    const page = await browser.newPage({
      viewport: { width: shot.width, height: shot.height },
      deviceScaleFactor: 2,
      isMobile: shot.isMobile,
      hasTouch: shot.isMobile,
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(`${url}?acceptance=${shot.name}-${Date.now()}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(900);

    if (["playing", "paused", "result"].includes(shot.mode)) {
      await page.evaluate(() => globalThis.__MERGE_YIZAI_TEST__.start());
      await page.waitForTimeout(400);
      for (let i = 0; i < 2; i += 1) {
        await page.evaluate(() => globalThis.__MERGE_YIZAI_TEST__.forceMerge(2));
        await page.waitForTimeout(120);
      }
    }
    if (shot.mode === "paused") {
      await page.evaluate(() => globalThis.__MERGE_YIZAI_TEST__.pause());
      await page.waitForTimeout(300);
    }
    if (shot.mode === "result") {
      await page.evaluate(() => globalThis.__MERGE_YIZAI_TEST__.end());
      await page.waitForTimeout(450);
    }
    if (shot.mode === "settings") {
      await page.locator('#start [data-open-panel="settings"]').click();
      await page.waitForTimeout(350);
    }
    if (shot.mode === "leaderboard" || shot.mode === "achievements") {
      await page.evaluate(() => globalThis.__MERGE_YIZAI_TEST__.start());
      await page.waitForTimeout(300);
      for (let i = 0; i < 3; i += 1) {
        await page.evaluate(() => globalThis.__MERGE_YIZAI_TEST__.forceMerge(2));
        await page.waitForTimeout(120);
      }
      await page.evaluate(() => globalThis.__MERGE_YIZAI_TEST__.end());
      await page.waitForTimeout(450);
      await page.locator(`#result [data-open-panel="${shot.mode}"]`).click();
      await page.waitForTimeout(350);
    }

    const file = `${shot.name}.png`;
    await page.screenshot({ path: path.join(outDir, file), fullPage: false });
    const state = await page.evaluate(() => globalThis.__MERGE_YIZAI_TEST__.getState());
    if (errors.length) throw new Error(`${shot.name} console/page errors: ${errors.join(" | ")}`);
    summary.push({ ...shot, file, state });
    await page.close();
  }

  await browser.close();
  await writeFile(path.join(outDir, "summary.json"), JSON.stringify({ ok: true, url, shots: summary }, null, 2), "utf8");
  console.log(JSON.stringify({ ok: true, outDir, url, shots: summary.map((item) => item.file) }, null, 2));
} finally {
  if (server) server.kill();
}

function findFreePort(start) {
  return new Promise((resolve, reject) => {
    const localServer = net.createServer();
    localServer.on("error", reject);
    localServer.listen(start, "127.0.0.1", () => {
      const address = localServer.address();
      localServer.close(() => resolve(address.port));
    });
  }).catch(() => findFreePort(start + 1));
}

function startVite(serverPort) {
  return new Promise((resolve, reject) => {
    const viteBin = path.join(root, "node_modules", "vite", "bin", "vite.js");
    const child = spawn(process.execPath, [viteBin, "--host", "127.0.0.1", "--port", String(serverPort)], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    child.on("exit", (code) => {
      if (code !== null && code !== 0) reject(new Error(`Vite dev server exited with code ${code}`));
    });
    waitForHttp(`http://127.0.0.1:${serverPort}`, 20000)
      .then(() => resolve(child))
      .catch((error) => {
        child.kill();
        reject(error);
      });
  });
}

async function waitForHttp(targetUrl, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(targetUrl);
      if (response.ok) return;
    } catch {
      // Keep polling.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for Vite dev server");
}
