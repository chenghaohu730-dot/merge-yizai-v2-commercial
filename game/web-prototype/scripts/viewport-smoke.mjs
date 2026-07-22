import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const projectRoot = path.resolve(root, "..", "..");
const outDir = path.join(projectRoot, "tests", "device-checks", "viewport-smoke");
const existingUrl = process.env.MERGE_YIZAI_URL || "";
const port = existingUrl ? null : await findFreePort(5173);
const url = existingUrl || `http://127.0.0.1:${port}`;
const viewports = [
  { name: "desktop-web", width: 900, height: 1200, isMobile: false },
  { name: "short-desktop", width: 520, height: 300, isMobile: false },
  { name: "iphone-12", width: 390, height: 844, isMobile: true },
  { name: "compact-android", width: 360, height: 740, isMobile: true },
  { name: "long-screen", width: 390, height: 932, isMobile: true },
  { name: "short-screen", width: 390, height: 700, isMobile: true },
];
let server;

await mkdir(outDir, { recursive: true });

try {
  if (!existingUrl) {
    server = await startVite(port);
  }

  const browser = await chromium.launch({ headless: true });
  const summary = [];

  for (const viewport of viewports) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 2,
      isMobile: viewport.isMobile,
      hasTouch: viewport.isMobile,
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    await page.goto(`${url}?viewport=${viewport.name}-${Date.now()}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(outDir, `${viewport.name}-start.png`), fullPage: false });

    const startButton = page.locator("#startGame");
    await startButton.click();
    await page.waitForTimeout(500);

    const gameBox = await page.locator("#game").boundingBox();
    if (!gameBox) throw new Error(`Missing #game canvas for ${viewport.name}`);
    await page.mouse.click(gameBox.x + gameBox.width / 2, gameBox.y + Math.min(130, gameBox.height * 0.22));
    await page.waitForTimeout(750);
    const playingShot = path.join(outDir, `${viewport.name}-playing.png`);
    await page.screenshot({ path: playingShot, fullPage: false });
    const visual = await inspectVisualEdges(playingShot);

    const state = await page.evaluate(() => ({
      score: document.querySelector("#score")?.textContent || "",
      best: document.querySelector("#best")?.textContent || "",
      dailyProgress: document.querySelector("#dailyProgress")?.textContent || "",
      runCount: document.querySelector("#runCount")?.textContent || "",
      yizaiCount: document.querySelector("#yizaiCount")?.textContent || "",
      hasShareButton: Boolean(document.querySelector("#shareResult")),
      soundToggleText: document.querySelector("#soundToggle")?.textContent || "",
      soundToggleLabel: document.querySelector("#soundToggle")?.getAttribute("aria-label") || "",
      startClass: document.querySelector("#start")?.className || "",
      resultClass: document.querySelector("#result")?.className || "",
      canvas: (() => {
        const rect = document.querySelector("#game")?.getBoundingClientRect();
        return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
      })(),
      controls: Array.from(document.querySelectorAll(".icon-button")).map((button) => {
        const rect = button.getBoundingClientRect();
        return { id: button.id, x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      }),
    }));

    if (!state.startClass.includes("hidden")) throw new Error(`Start layer did not hide for ${viewport.name}`);
    if (!state.dailyProgress.includes("合成到") && !state.dailyProgress.includes("已完成")) throw new Error(`Daily mission missing for ${viewport.name}`);
    if (!state.runCount.includes("局")) throw new Error(`Run counter missing for ${viewport.name}`);
    if (!state.yizaiCount.includes("次")) throw new Error(`Yizai counter missing for ${viewport.name}`);
    if (!state.hasShareButton) throw new Error(`Share result button missing for ${viewport.name}`);
    if (!["声", "静"].includes(state.soundToggleText)) throw new Error(`Sound toggle missing for ${viewport.name}: ${JSON.stringify(state)}`);
    if (!state.soundToggleLabel.includes("声音")) throw new Error(`Sound toggle label missing for ${viewport.name}: ${JSON.stringify(state)}`);
    if (!state.canvas) throw new Error(`Canvas state missing for ${viewport.name}`);
    if (state.canvas.width <= 0 || state.canvas.height <= 0) throw new Error(`Canvas has invalid size for ${viewport.name}`);
    if (state.canvas.x < -1 || state.canvas.y < -1) throw new Error(`Canvas overflows top/left for ${viewport.name}`);
    if (state.canvas.x + state.canvas.width > viewport.width + 1) throw new Error(`Canvas overflows right for ${viewport.name}`);
    if (state.canvas.y + state.canvas.height > viewport.height + 1) throw new Error(`Canvas overflows bottom for ${viewport.name}`);
    for (const control of state.controls) {
      if (control.width <= 0 || control.height <= 0) throw new Error(`Control ${control.id} has invalid size for ${viewport.name}: ${JSON.stringify(control)}`);
      if (control.x < state.canvas.x - 1 || control.y < state.canvas.y - 1) throw new Error(`Control ${control.id} overflows top/left for ${viewport.name}: ${JSON.stringify({ control, canvas: state.canvas })}`);
      if (control.x + control.width > state.canvas.x + state.canvas.width + 1) throw new Error(`Control ${control.id} overflows right for ${viewport.name}: ${JSON.stringify({ control, canvas: state.canvas })}`);
      if (control.y + control.height > state.canvas.y + state.canvas.height + 1) throw new Error(`Control ${control.id} overflows bottom for ${viewport.name}: ${JSON.stringify({ control, canvas: state.canvas })}`);
    }
    if (errors.length) throw new Error(`${viewport.name} console/page errors: ${errors.join(" | ")}`);

    summary.push({ viewport, state, visual, screenshots: [`${viewport.name}-start.png`, `${viewport.name}-playing.png`] });
    await page.close();
  }

  await browser.close();
  await writeFile(path.join(outDir, "summary.json"), JSON.stringify({ ok: true, url, summary }, null, 2), "utf8");
  console.log(JSON.stringify({ ok: true, checked: viewports.length, outDir }, null, 2));
} finally {
  if (server) {
    server.kill();
  }
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

    child.stderr.on("data", () => undefined);

    child.on("exit", (code) => {
      if (code !== null && code !== 0) {
        reject(new Error(`Vite dev server exited with code ${code}`));
      }
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
      // Keep polling until the local dev server is ready.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for Vite dev server");
}

async function inspectVisualEdges(file) {
  const raw = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = raw.info;
  const zones = {
    left: sampleZone(raw.data, width, height, 0, 0, Math.max(10, Math.round(width * 0.04)), height),
    right: sampleZone(raw.data, width, height, width - Math.max(10, Math.round(width * 0.04)), 0, Math.max(10, Math.round(width * 0.04)), height),
    bottom: sampleZone(raw.data, width, height, 0, height - Math.max(24, Math.round(height * 0.08)), width, Math.max(24, Math.round(height * 0.08))),
  };
  for (const [name, zone] of Object.entries(zones)) {
    if (zone.nearWhiteRatio > 0.82) {
      throw new Error(`${path.basename(file)} ${name} edge still looks like blank white area: ${JSON.stringify(zone)}`);
    }
    if (zone.colorVariance < 9) {
      throw new Error(`${path.basename(file)} ${name} edge is too flat to prove a finished game surface: ${JSON.stringify(zone)}`);
    }
  }
  return zones;
}

function sampleZone(data, imageW, imageH, x, y, w, h) {
  let count = 0;
  let nearWhite = 0;
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let variance = 0;
  const stride = 4;
  for (let py = Math.max(0, y); py < Math.min(imageH, y + h); py += stride) {
    for (let px = Math.max(0, x); px < Math.min(imageW, x + w); px += stride) {
      const p = (py * imageW + px) * 4;
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      count += 1;
      rSum += r;
      gSum += g;
      bSum += b;
      if (r > 238 && g > 238 && b > 225) nearWhite += 1;
    }
  }
  const rMean = rSum / count;
  const gMean = gSum / count;
  const bMean = bSum / count;
  for (let py = Math.max(0, y); py < Math.min(imageH, y + h); py += stride) {
    for (let px = Math.max(0, x); px < Math.min(imageW, x + w); px += stride) {
      const p = (py * imageW + px) * 4;
      variance += Math.abs(data[p] - rMean) + Math.abs(data[p + 1] - gMean) + Math.abs(data[p + 2] - bMean);
    }
  }
  return {
    nearWhiteRatio: Number((nearWhite / count).toFixed(3)),
    colorVariance: Number((variance / Math.max(1, count) / 3).toFixed(2)),
    mean: [Math.round(rMean), Math.round(gMean), Math.round(bMean)],
  };
}
