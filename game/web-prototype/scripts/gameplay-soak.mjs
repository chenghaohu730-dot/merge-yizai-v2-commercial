import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "..");
const projectRoot = path.resolve(root, "..", "..");
const outDir = path.join(projectRoot, "tests", "device-checks", "gameplay-soak");
const existingUrl = process.env.MERGE_YIZAI_URL || "";
const port = existingUrl ? null : await findFreePort(5200);
const url = existingUrl || `http://127.0.0.1:${port}`;
const errors = [];
let server;

await mkdir(outDir, { recursive: true });

try {
  if (!existingUrl) {
    server = await startVite(port);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto(`${url}?soak=${Date.now()}`, { waitUntil: "domcontentloaded" });
  await page.locator("#startGame").click();
  await page.waitForTimeout(500);

  await page.locator("#soundToggle").click();
  await page.waitForTimeout(180);
  await page.locator("#pause").click();
  await page.waitForTimeout(180);
  await page.locator("#resume").click();
  await page.waitForTimeout(180);

  const gameBox = await page.locator("#game").boundingBox();
  if (!gameBox) throw new Error("Missing #game canvas");

  const drops = [];
  for (let i = 0; i < 32; i += 1) {
    const lane = i % 8;
    const xRatio = 0.18 + lane * 0.09 + (i % 2) * 0.035;
    const x = gameBox.x + gameBox.width * Math.min(0.84, xRatio);
    const y = gameBox.y + Math.min(136, gameBox.height * 0.2);
    await page.mouse.click(x, y);
    drops.push({ x: Math.round(x), y: Math.round(y) });
    await page.waitForTimeout(470);
  }

  await page.evaluate(() => {
    const tester = globalThis.__MERGE_YIZAI_TEST__;
    for (let i = 0; i < 14; i += 1) {
      tester.forceMerge((i % 6) + 1);
    }
  });
  await page.waitForTimeout(1200);

  const state = await page.evaluate(() => globalThis.__MERGE_YIZAI_TEST__.getState());
  const canvasCheck = await page.evaluate(() => {
    const canvas = document.querySelector("#game");
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;
    let nonBlank = 0;
    let samples = 0;
    for (let i = 0; i < data.length; i += Math.max(4, Math.floor(data.length / 1600 / 4) * 4)) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      samples += 1;
      if (a > 0 && (r < 245 || g < 245 || b < 245)) nonBlank += 1;
    }
    return { width, height, samples, nonBlank };
  });

  await page.screenshot({ path: path.join(outDir, "iphone-12-soak-final.png"), fullPage: false });
  await browser.close();

  if (errors.length) throw new Error(`Console/page errors during soak: ${errors.join(" | ")}`);
  if (!["playing", "over"].includes(state.state)) throw new Error(`Unexpected game state after soak: ${JSON.stringify(state)}`);
  if (Number(state.score) <= 0) throw new Error(`Score did not increase during soak: ${JSON.stringify(state)}`);
  if (state.soundMuted !== true) throw new Error(`Sound toggle did not persist muted state: ${JSON.stringify(state)}`);
  if (canvasCheck.width <= 0 || canvasCheck.height <= 0) throw new Error(`Canvas has invalid size: ${JSON.stringify(canvasCheck)}`);
  if (canvasCheck.nonBlank < 200) throw new Error(`Canvas appears blank after soak: ${JSON.stringify(canvasCheck)}`);

  const summary = {
    ok: true,
    url,
    drops: drops.length,
    forcedMerges: 14,
    state,
    canvasCheck,
    screenshot: "iphone-12-soak-final.png",
  };
  await writeFile(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
  console.log(JSON.stringify(summary, null, 2));
} finally {
  if (server) {
    server.kill();
  }
}

function findFreePort(start) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(start, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
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
