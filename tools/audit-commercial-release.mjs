import { readdir, readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const buildsDir = path.join(projectRoot, "exports", "builds");
const input = process.argv[2];
const releaseDir = input ? path.resolve(input) : await findLatestReleaseDir();

assertInside(buildsDir, releaseDir);

const requiredPaths = [
  "交付说明.md",
  "README.md",
  "checksums.sha256",
  "双击_打开微信小游戏工程.bat",
  "双击_查看导入说明.bat",
  "双击_自检交付包.bat",
  "自检交付包.ps1",
  "01_微信小游戏工程/game.js",
  "01_微信小游戏工程/project.config.json",
  "01_微信小游戏工程/assets/ui/share_card.png",
  "01_微信小游戏工程/assets/ui/app_icon.png",
  "01_微信小游戏工程/assets/ui/home_bg_main.jpg",
  "01_微信小游戏工程/assets/ui/game_shell.png",
  "01_微信小游戏工程/assets/ui/game_playfield_bg.jpg",
  "01_微信小游戏工程/assets/ui/btn_start_normal.png",
  "01_微信小游戏工程/assets/ui/btn_start_pressed.png",
  "01_微信小游戏工程/assets/ui/btn_start_disabled.png",
  "01_微信小游戏工程/assets/ui/btn_sound_on_normal.png",
  "01_微信小游戏工程/assets/ui/btn_pause_normal.png",
  "01_微信小游戏工程/assets/ui/btn_restart_normal.png",
  "01_微信小游戏工程/assets/ui/btn_settings_normal.png",
  "01_微信小游戏工程/assets/ui/btn_rank_normal.png",
  "01_微信小游戏工程/assets/ui/btn_achievement_normal.png",
  "01_微信小游戏工程/assets/ui/settings_panel.png",
  "01_微信小游戏工程/assets/ui/rank_panel.png",
  "01_微信小游戏工程/assets/ui/achievement_panel.png",
  "01_微信小游戏工程/assets/ui/settings_panel_frame.png",
  "01_微信小游戏工程/assets/ui/rank_panel_frame.png",
  "01_微信小游戏工程/assets/ui/achievement_panel_frame.png",
  "01_微信小游戏工程/assets/ui/close_button.png",
  "01_微信小游戏工程/assets/ui/setting_row.png",
  "01_微信小游戏工程/assets/ui/rank_row.png",
  "01_微信小游戏工程/assets/ui/achievement_row_unlocked.png",
  "01_微信小游戏工程/assets/ui/achievement_row_locked.png",
  "02_上线素材/app_icon_1024.png",
  "02_上线素材/share_card_1200x960.png",
  "02_上线素材/store_cover_1280x720.png",
  "03_交付文档/07_商业化交付清单.md",
  "03_交付文档/08_上线资料包.md",
  "03_交付文档/10_商业化验收报告.md",
  "03_交付文档/11_小游戏备案内容填写参考.md",
  "04_验证记录/device-checks/viewport-smoke/summary.json",
  "04_验证记录/device-checks/gameplay-soak/summary.json",
  "04_验证记录/device-checks/acceptance-v3-local-assets/settings-panel.png",
  "04_验证记录/device-checks/acceptance-v3-local-assets/leaderboard-panel.png",
  "04_验证记录/device-checks/acceptance-v3-local-assets/achievements-panel.png",
  "04_验证记录/device-checks/avatar-art/cute-avatar-chain-20260611.png",
  "04_验证记录/device-checks/avatar-art/perfect-round-faces-20260612.png",
  "05_网页试玩构建/dist/index.html",
  "06_美术源文件/generated/cute_avatar_sheet_20260611.png",
  "06_美术源文件/generated/cute_avatar_sheet_20260612_round.png",
  "06_美术源文件/generated/commercial_round_avatar_sheet_20260612.png",
  "06_美术源文件/generated/perfect_round_faces_20260612.png",
  "06_美术源文件/generated/game_background_20260611.png",
  "06_美术源文件/generated/ui_splash_background_20260612.png",
  "06_美术源文件/generated/game_background_20260612_commercial_machine.png",
  "06_美术源文件/generated/ui_splash_background_20260612_commercial_machine.png",
  "06_美术源文件/generated/ui_control_icons_20260612.png",
  "06_美术源文件/generated/playfield_frame_20260612.png",
  "06_美术源文件/final-faces/face_10_crown_star.png",
  "06_美术源文件/final-faces/face_11_yizai.png",
  "06_美术源文件/final-ui/playfield_frame.png",
  "06_美术源文件/final-ui/start_panel.png",
  "06_美术源文件/final-ui/control_sound.png",
  "06_美术源文件/final-ui/control_pause.png",
  "06_美术源文件/final-ui/control_restart.png",
  "06_美术源文件/final-ui/filing-systems/settings_panel.png",
  "06_美术源文件/final-ui/filing-systems/rank_panel.png",
  "06_美术源文件/final-ui/filing-systems/achievement_panel.png",
  "06_美术源文件/final-ui/filing-systems/settings_panel_frame.png",
  "06_美术源文件/final-ui/filing-systems/rank_panel_frame.png",
  "06_美术源文件/final-ui/filing-systems/achievement_panel_frame.png",
  "06_美术源文件/final-ui/filing-systems/close_button.png",
  "06_美术源文件/final-ui/filing-systems/setting_row.png",
  "06_美术源文件/final-ui/filing-systems/rank_row.png",
  "06_美术源文件/final-ui/filing-systems/achievement_row_unlocked.png",
  "06_美术源文件/final-ui/filing-systems/achievement_row_locked.png",
];

const forbiddenFragments = [
  "/node_modules/",
  "/.git/",
  "/logs/",
  "/temp/",
  "/输出结果/",
];

const forbiddenNames = new Set([
  ".env",
  "local.env",
  "secret.txt",
  "credentials.json",
]);

const forbiddenPublicTerms = [
  "哈基米",
  "蓝豆",
  "耄耋",
  "老登",
  "曼波",
  "奶龙",
  "奶呼呼",
  "阴阳怪气",
  "癫笑",
  "hajimi",
  "blue_crack",
  "old_meme",
  "mambo",
  "milk_laugh",
  "crazy_laugh",
  "abstract_king",
  "pink_smirk",
  "daidou",
  "thunder_hiss",
];

const zipPath = `${releaseDir}.zip`;
const releaseFiles = await listFiles(releaseDir);
const relativeFiles = releaseFiles.map((file) => normalize(path.relative(releaseDir, file)));
const failures = [];

for (const requiredPath of requiredPaths) {
  if (!relativeFiles.includes(requiredPath)) {
    failures.push(`缺少文件：${requiredPath}`);
  }
}

for (const file of relativeFiles) {
  const normalized = `/${file}`;
  const name = path.basename(file).toLowerCase();
  if (forbiddenFragments.some((fragment) => normalized.includes(fragment))) {
    failures.push(`不应出现在交付包中的目录：${file}`);
  }
  if (forbiddenNames.has(name) || name.endsWith(".bak")) {
    failures.push(`不应出现在交付包中的文件：${file}`);
  }
  for (const term of forbiddenPublicTerms) {
    if (file.includes(term)) failures.push(`交付包文件名仍包含旧梗痕迹：${file}`);
  }
}

await verifyChecksums();
await verifyWechatPackage();
await verifyZip();

if (failures.length) {
  console.error(JSON.stringify({ ok: false, releaseDir, zipPath, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  releaseDir,
  zipPath,
  files: relativeFiles.length,
  zipSize: (await stat(zipPath)).size,
  wechatPackageSize: await dirSize(path.join(releaseDir, "01_微信小游戏工程")),
}, null, 2));

async function findLatestReleaseDir() {
  const entries = await readdir(buildsDir, { withFileTypes: true });
  const dirs = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith("merge-yizai-commercial-preview-")) continue;
    const full = path.join(buildsDir, entry.name);
    dirs.push({ full, mtime: (await stat(full)).mtimeMs });
  }
  if (!dirs.length) throw new Error("未找到商业化交付目录，请先执行 npm run release");
  dirs.sort((a, b) => b.mtime - a.mtime);
  return dirs[0].full;
}

async function verifyChecksums() {
  const checksumPath = path.join(releaseDir, "checksums.sha256");
  const checksumText = await readFile(checksumPath, "utf8");
  const expected = new Map();
  for (const line of checksumText.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    if (!match) {
      failures.push(`校验行格式错误：${line}`);
      continue;
    }
    expected.set(match[2], match[1]);
  }

  for (const file of releaseFiles) {
    const rel = normalize(path.relative(releaseDir, file));
    if (rel === "checksums.sha256") continue;
    const actual = createHash("sha256").update(await readFile(file)).digest("hex");
    if (expected.get(rel) !== actual) {
      failures.push(`SHA256 不一致：${rel}`);
    }
  }
}

async function verifyWechatPackage() {
  const packageSize = await dirSize(path.join(releaseDir, "01_微信小游戏工程"));
  if (packageSize >= 4 * 1024 * 1024) {
    failures.push(`微信小游戏主包超过 4MB：${packageSize}`);
  }

  const config = JSON.parse(await readFile(path.join(releaseDir, "01_微信小游戏工程", "project.config.json"), "utf8"));
  if (config.compileType !== "game") failures.push(`微信工程 compileType 不正确：${config.compileType}`);
  if (config.appid !== "touristappid") failures.push(`交付包应保留 touristappid，当前为：${config.appid}`);

  const gameJs = await readFile(path.join(releaseDir, "01_微信小游戏工程", "game.js"), "utf8");
  if (!gameJs.includes("assets/ui/share_card.png")) failures.push("微信分享图未指向正式 share_card.png");
  if (!gameJs.includes("assets/ui/home_bg_main.jpg")) failures.push("微信启动背景未接入 home_bg_main.jpg");
  if (!gameJs.includes("assets/ui/game_shell.png")) failures.push("微信游戏机框未接入 game_shell.png");
  if (!gameJs.includes("assets/ui/game_playfield_bg.jpg")) failures.push("微信玩法仓背景未接入 game_playfield_bg.jpg");
  if (!gameJs.includes("assets/ui/btn_start_normal.png")) failures.push("微信开始按钮未接入 btn_start_normal.png");
  if (!gameJs.includes("assets/ui/btn_settings_normal.png")) failures.push("微信设置入口未接入 btn_settings_normal.png");
  if (!gameJs.includes("assets/ui/btn_rank_normal.png")) failures.push("微信排行入口未接入 btn_rank_normal.png");
  if (!gameJs.includes("assets/ui/btn_achievement_normal.png")) failures.push("微信成就入口未接入 btn_achievement_normal.png");
  if (!gameJs.includes("assets/ui/settings_panel.png")) failures.push("微信设置面板未接入 settings_panel.png");
  if (!gameJs.includes("assets/ui/rank_panel.png")) failures.push("微信排行面板未接入 rank_panel.png");
  if (!gameJs.includes("assets/ui/achievement_panel.png")) failures.push("微信成就面板未接入 achievement_panel.png");
  if (!gameJs.includes("assets/ui/settings_panel_frame.png")) failures.push("微信设置面板未接入分层 settings_panel_frame.png");
  if (!gameJs.includes("assets/ui/rank_panel_frame.png")) failures.push("微信排行面板未接入分层 rank_panel_frame.png");
  if (!gameJs.includes("assets/ui/achievement_panel_frame.png")) failures.push("微信成就面板未接入分层 achievement_panel_frame.png");
  if (!gameJs.includes("assets/ui/close_button.png")) failures.push("微信关闭按钮未接入独立 close_button.png");
  if (!gameJs.includes("assets/ui/setting_row.png")) failures.push("微信设置行未接入独立 setting_row.png");
  if (!gameJs.includes("assets/ui/rank_row.png")) failures.push("微信排行行未接入独立 rank_row.png");
  if (!gameJs.includes("assets/ui/achievement_row_unlocked.png")) failures.push("微信成就行未接入独立 achievement_row_unlocked.png");
  if (!gameJs.includes("assets/ui/achievement_row_locked.png")) failures.push("微信成就行未接入独立 achievement_row_locked.png");
  if (gameJs.includes("visual_direction_concept.png")) failures.push("微信工程仍引用旧启动概念图 visual_direction_concept.png");
  if (!gameJs.includes("wx.onShareAppMessage")) failures.push("微信分享回调缺失");
  if (!gameJs.includes("mergeYizaiSoundMuted")) failures.push("微信端静音偏好未接入");
  if (!gameJs.includes("toggleSound")) failures.push("微信端静音开关缺失");
  if (!gameJs.includes("mergeYizaiSettings")) failures.push("微信端设置系统存档缺失");
  if (!gameJs.includes("mergeYizaiLocalLeaderboard")) failures.push("微信端本地排行榜存档缺失");
  if (!gameJs.includes("mergeYizaiAchievements")) failures.push("微信端成就系统存档缺失");
  for (const term of forbiddenPublicTerms) {
    if (gameJs.includes(term)) failures.push(`微信工程仍包含旧梗展示或资源名：${term}`);
  }

  for (const textPath of [
    "README.md",
    "03_交付文档/01_完整玩法规则表.md",
    "03_交付文档/02_11级抽象头像美术清单.md",
    "03_交付文档/07_商业化交付清单.md",
    "03_交付文档/10_商业化验收报告.md",
    "03_交付文档/11_小游戏备案内容填写参考.md",
  ]) {
    const text = await readFile(path.join(releaseDir, textPath), "utf8");
    for (const term of forbiddenPublicTerms) {
      if (text.includes(term)) failures.push(`${textPath} 仍包含旧梗词：${term}`);
    }
  }
}

async function verifyZip() {
  await stat(zipPath);
  const listing = await listZip(zipPath);
  for (const requiredPath of ["交付说明.md", "checksums.sha256", "双击_自检交付包.bat", "01_微信小游戏工程/game.js", "01_微信小游戏工程/assets/ui/home_bg_main.jpg", "01_微信小游戏工程/assets/ui/settings_panel.png", "01_微信小游戏工程/assets/ui/rank_panel.png", "01_微信小游戏工程/assets/ui/achievement_panel.png", "01_微信小游戏工程/assets/ui/settings_panel_frame.png", "01_微信小游戏工程/assets/ui/rank_panel_frame.png", "01_微信小游戏工程/assets/ui/achievement_panel_frame.png", "01_微信小游戏工程/assets/ui/close_button.png", "02_上线素材/share_card_1200x960.png", "03_交付文档/11_小游戏备案内容填写参考.md", "04_验证记录/device-checks/acceptance-v3-local-assets/settings-panel.png", "04_验证记录/device-checks/acceptance-v3-local-assets/leaderboard-panel.png", "04_验证记录/device-checks/acceptance-v3-local-assets/achievements-panel.png"]) {
    if (!listing.includes(requiredPath)) failures.push(`zip 中缺少文件：${requiredPath}`);
  }
}

function listZip(zipFile) {
  return new Promise((resolve, reject) => {
    const command = [
      "Add-Type -AssemblyName System.IO.Compression.FileSystem;",
      `$zip='${escapePowerShellString(zipFile)}';`,
      "$archive=[System.IO.Compression.ZipFile]::OpenRead($zip);",
      "try { $archive.Entries | ForEach-Object { $_.FullName } } finally { $archive.Dispose() }",
    ].join(" ");
    const child = spawn("powershell.exe", ["-NoProfile", "-Command", command], { stdio: "pipe" });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("close", (code) => {
      if (code === 0) resolve(stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
      else reject(new Error(stderr || `读取 zip 失败：${code}`));
    });
  });
}

async function listFiles(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await listFiles(full));
    if (entry.isFile()) out.push(full);
  }
  return out;
}

async function dirSize(dir) {
  let total = 0;
  for (const file of await listFiles(dir)) {
    total += (await stat(file)).size;
  }
  return total;
}

function normalize(value) {
  return value.replaceAll("\\", "/");
}

function escapePowerShellString(value) {
  return value.replaceAll("'", "''");
}

function assertInside(parent, child) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`路径越界：${child}`);
  }
}
