import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const exportsRoot = path.join(projectRoot, "exports", "builds");
const stamp = makeStamp(new Date());
const packageName = `merge-yizai-commercial-preview-${stamp}`;
const releaseDir = path.join(exportsRoot, packageName);
const zipPath = `${releaseDir}.zip`;

assertInside(projectRoot, releaseDir);
assertInside(projectRoot, zipPath);

await rm(releaseDir, { recursive: true, force: true });
await rm(zipPath, { force: true });
await mkdir(releaseDir, { recursive: true });

await copyDir("game/wechat-minigame", "01_微信小游戏工程");
await copyDir("art/launch", "02_上线素材");
await copyDir("docs", "03_交付文档");
await copyDir("tests/playtest-notes", "04_验证记录/playtest-notes");
await copyDir("tests/device-checks/viewport-smoke", "04_验证记录/device-checks/viewport-smoke");
await copyDir("tests/device-checks/gameplay-soak", "04_验证记录/device-checks/gameplay-soak");
await copyDir("tests/device-checks/acceptance-v3-local-assets", "04_验证记录/device-checks/acceptance-v3-local-assets");
await copyDir("tests/device-checks/avatar-art", "04_验证记录/device-checks/avatar-art");
await copyDir("game/web-prototype/dist", "05_网页试玩构建/dist");
await copyDir("art/generated", "06_美术源文件/generated");
await copyDir("art/final/faces", "06_美术源文件/final-faces");
await copyDir("art/final/ui", "06_美术源文件/final-ui");
await copyFile("README.md", "README.md");

await writeFile(path.join(releaseDir, "交付说明.md"), makeReadme(), "utf8");
await writeFile(path.join(releaseDir, "双击_打开微信小游戏工程.bat"), toWindowsLines(makeOpenWechatBat()), "utf8");
await writeFile(path.join(releaseDir, "双击_查看导入说明.bat"), toWindowsLines(makeOpenGuideBat()), "utf8");
await writeFile(path.join(releaseDir, "双击_自检交付包.bat"), toWindowsLines(makeAuditBat()), "utf8");
await writeFile(path.join(releaseDir, "自检交付包.ps1"), `\uFEFF${makeAuditPs1()}`, "utf8");
await writeFile(path.join(releaseDir, "checksums.sha256"), await makeChecksums(releaseDir), "utf8");
await zipRelease(releaseDir, zipPath);

console.log(JSON.stringify({
  ok: true,
  releaseDir,
  zipPath,
  size: (await stat(zipPath)).size,
}, null, 2));

async function copyDir(from, to) {
  const src = path.join(projectRoot, from);
  const dest = path.join(releaseDir, to);
  assertInside(projectRoot, src);
  assertInside(releaseDir, dest);
  await cp(src, dest, { recursive: true });
}

async function copyFile(from, to) {
  const src = path.join(projectRoot, from);
  const dest = path.join(releaseDir, to);
  assertInside(projectRoot, src);
  assertInside(releaseDir, dest);
  await mkdir(path.dirname(dest), { recursive: true });
  await cp(src, dest);
}

function makeReadme() {
  return `# 《合成亿仔》商业化试玩交付包

生成时间：${new Date().toLocaleString("zh-CN", { hour12: false })}

## 包内目录

| 目录 | 内容 |
| --- | --- |
| 01_微信小游戏工程 | 可导入微信开发者工具的原生小游戏工程 |
| 02_上线素材 | 图标、分享图、宣传横图 |
| 03_交付文档 | 玩法规则、商业化交付清单、上线资料包、商业化验收报告等 |
| 04_验证记录 | 自动验证记录、移动端截图和自动长测结果 |
| 05_网页试玩构建 | 网页试玩版静态构建产物 |
| 06_美术源文件 | 图片模型母图、最终头像 PNG、UI 按钮和范围框 |

## 最简单用法

双击 \`双击_查看导入说明.bat\`，按说明导入微信开发者工具。

双击 \`双击_打开微信小游戏工程.bat\`，可以直接打开要导入的工程目录。

双击 \`双击_自检交付包.bat\`，可以检查交付包有没有缺文件、微信主包是否低于 4MB、校验文件是否匹配。

## 导入微信小游戏

1. 打开微信开发者工具。
2. 导入目录：\`01_微信小游戏工程\`。
3. 当前 AppID 仍为 \`touristappid\`，正式体验版上传前请替换真实小游戏 AppID。
4. 运行模拟器后，检查启动、掉落、合成、暂停、结算和分享。

## 当前能力

- 2D 竖屏物理合成玩法。
- 11 级头像链，最高级为亿仔。
- 亿仔保留白熊主体、橙黄色口鼻区、黑色大鼻子、粗眉毛和清晰 \`MAEE\`。
- 今日目标、本地战绩、成绩分享。
- 设置系统、本地排行榜系统、成就系统均已接入，可用于备案截图。
- 基础音效、静音开关和粒子反馈。
- 正式分享卡已接入：\`assets/ui/share_card.png\`。
- 主包体积已验证低于 4MB。
- 已包含移动端截图烟测和自动长测记录。
- 已包含新头像链母图、切图结果、按钮、范围框和验收图。
- 已包含新版启动页背景和主玩法背景。

## 上线前仍需人工处理

- 替换正式小游戏 AppID。
- 用微信开发者工具生成体验版预览码。
- 真机扫码长测 10-20 局。
- 在微信后台填写名称、简介、隐私说明、类目和素材。
- 检查分享卡在真实微信会话里的裁切效果。

## 校验

包内 \`checksums.sha256\` 记录所有文件的 SHA256，可用于交付后核对文件是否被改动。
`;
}

function makeOpenWechatBat() {
  return `@echo off
chcp 65001 >nul
start "" "%~dp001_微信小游戏工程"
`;
}

function makeOpenGuideBat() {
  return `@echo off
chcp 65001 >nul
start "" "%~dp003_交付文档\\09_交付包导入说明_傻瓜版.md"
`;
}

function makeAuditBat() {
  return `@echo off
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0自检交付包.ps1"
pause
`;
}

function makeAuditPs1() {
  return `$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$errors = New-Object System.Collections.Generic.List[string]

function Add-Err($message) {
  $script:errors.Add($message) | Out-Null
}

function Need($relativePath) {
  $full = Join-Path $root $relativePath
  if (!(Test-Path -LiteralPath $full)) {
    Add-Err "缺少文件或目录：$relativePath"
  }
}

function Get-Sha256Hex($literalPath) {
  if (Get-Command Get-FileHash -ErrorAction SilentlyContinue) {
    return (Get-FileHash -LiteralPath $literalPath -Algorithm SHA256).Hash.ToLowerInvariant()
  }
  $stream = [System.IO.File]::OpenRead($literalPath)
  try {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
      return ([System.BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-', '').ToLowerInvariant()
    } finally {
      $sha.Dispose()
    }
  } finally {
    $stream.Dispose()
  }
}

Write-Host "正在自检《合成亿仔》交付包..." -ForegroundColor Cyan

$required = @(
  '交付说明.md',
  'README.md',
  'checksums.sha256',
  '01_微信小游戏工程\\game.js',
  '01_微信小游戏工程\\project.config.json',
  '01_微信小游戏工程\\assets\\ui\\share_card.png',
  '01_微信小游戏工程\\assets\\ui\\app_icon.png',
  '01_微信小游戏工程\\assets\\ui\\home_bg_main.jpg',
  '01_微信小游戏工程\\assets\\ui\\game_shell.png',
  '01_微信小游戏工程\\assets\\ui\\game_playfield_bg.jpg',
  '01_微信小游戏工程\\assets\\ui\\btn_start_normal.png',
  '01_微信小游戏工程\\assets\\ui\\btn_start_pressed.png',
  '01_微信小游戏工程\\assets\\ui\\btn_start_disabled.png',
  '01_微信小游戏工程\\assets\\ui\\btn_sound_on_normal.png',
  '01_微信小游戏工程\\assets\\ui\\btn_pause_normal.png',
  '01_微信小游戏工程\\assets\\ui\\btn_restart_normal.png',
  '01_微信小游戏工程\\assets\\ui\\btn_settings_normal.png',
  '01_微信小游戏工程\\assets\\ui\\btn_rank_normal.png',
  '01_微信小游戏工程\\assets\\ui\\btn_achievement_normal.png',
  '01_微信小游戏工程\\assets\\ui\\settings_panel.png',
  '01_微信小游戏工程\\assets\\ui\\rank_panel.png',
  '01_微信小游戏工程\\assets\\ui\\achievement_panel.png',
  '01_微信小游戏工程\\assets\\ui\\settings_panel_frame.png',
  '01_微信小游戏工程\\assets\\ui\\rank_panel_frame.png',
  '01_微信小游戏工程\\assets\\ui\\achievement_panel_frame.png',
  '01_微信小游戏工程\\assets\\ui\\close_button.png',
  '01_微信小游戏工程\\assets\\ui\\setting_row.png',
  '01_微信小游戏工程\\assets\\ui\\rank_row.png',
  '01_微信小游戏工程\\assets\\ui\\achievement_row_unlocked.png',
  '01_微信小游戏工程\\assets\\ui\\achievement_row_locked.png',
  '02_上线素材\\app_icon_1024.png',
  '02_上线素材\\share_card_1200x960.png',
  '03_交付文档\\08_上线资料包.md',
  '03_交付文档\\09_交付包导入说明_傻瓜版.md',
  '03_交付文档\\10_商业化验收报告.md',
  '03_交付文档\\11_小游戏备案内容填写参考.md',
  '04_验证记录\\device-checks\\viewport-smoke\\summary.json',
  '04_验证记录\\device-checks\\gameplay-soak\\summary.json',
  '04_验证记录\\device-checks\\acceptance-v3-local-assets\\settings-panel.png',
  '04_验证记录\\device-checks\\acceptance-v3-local-assets\\leaderboard-panel.png',
  '04_验证记录\\device-checks\\acceptance-v3-local-assets\\achievements-panel.png',
  '04_验证记录\\device-checks\\avatar-art\\cute-avatar-chain-20260611.png',
  '04_验证记录\\device-checks\\avatar-art\\perfect-round-faces-20260612.png',
  '06_美术源文件\\generated\\game_background_20260611.png',
  '06_美术源文件\\generated\\ui_splash_background_20260612.png',
  '06_美术源文件\\generated\\game_background_20260612_commercial_machine.png',
  '06_美术源文件\\generated\\ui_splash_background_20260612_commercial_machine.png',
  '06_美术源文件\\generated\\cute_avatar_sheet_20260611.png',
  '06_美术源文件\\generated\\cute_avatar_sheet_20260612_round.png',
  '06_美术源文件\\generated\\commercial_round_avatar_sheet_20260612.png',
  '06_美术源文件\\generated\\perfect_round_faces_20260612.png',
  '06_美术源文件\\generated\\ui_control_icons_20260612.png',
  '06_美术源文件\\generated\\playfield_frame_20260612.png',
  '06_美术源文件\\final-faces\\face_10_crown_star.png',
  '06_美术源文件\\final-faces\\face_11_yizai.png',
  '06_美术源文件\\final-ui\\playfield_frame.png',
  '06_美术源文件\\final-ui\\start_panel.png',
  '06_美术源文件\\final-ui\\control_sound.png',
  '06_美术源文件\\final-ui\\control_pause.png',
  '06_美术源文件\\final-ui\\control_restart.png',
  '06_美术源文件\\final-ui\\filing-systems\\settings_panel.png',
  '06_美术源文件\\final-ui\\filing-systems\\rank_panel.png',
  '06_美术源文件\\final-ui\\filing-systems\\achievement_panel.png',
  '06_美术源文件\\final-ui\\filing-systems\\settings_panel_frame.png',
  '06_美术源文件\\final-ui\\filing-systems\\rank_panel_frame.png',
  '06_美术源文件\\final-ui\\filing-systems\\achievement_panel_frame.png',
  '06_美术源文件\\final-ui\\filing-systems\\close_button.png',
  '06_美术源文件\\final-ui\\filing-systems\\setting_row.png',
  '06_美术源文件\\final-ui\\filing-systems\\rank_row.png',
  '06_美术源文件\\final-ui\\filing-systems\\achievement_row_unlocked.png',
  '06_美术源文件\\final-ui\\filing-systems\\achievement_row_locked.png',
  '05_网页试玩构建\\dist\\index.html'
)

foreach ($item in $required) { Need $item }

$wechatDir = Join-Path $root '01_微信小游戏工程'
if (Test-Path -LiteralPath $wechatDir) {
  $size = (Get-ChildItem -LiteralPath $wechatDir -Recurse -File | Measure-Object -Property Length -Sum).Sum
  if ($size -ge 4MB) {
    Add-Err "微信小游戏工程超过 4MB：$size bytes"
  } else {
    Write-Host "微信小游戏工程大小 OK：$size bytes" -ForegroundColor Green
  }
}

$configPath = Join-Path $root '01_微信小游戏工程\\project.config.json'
if (Test-Path -LiteralPath $configPath) {
  $config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
  if ($config.compileType -ne 'game') { Add-Err "compileType 不是 game" }
  if ($config.appid -ne 'touristappid') { Add-Err "当前 AppID 不是 touristappid。交付包不应内置真实 AppID。" }
}

$gamePath = Join-Path $root '01_微信小游戏工程\\game.js'
if (Test-Path -LiteralPath $gamePath) {
  $gameText = Get-Content -LiteralPath $gamePath -Raw -Encoding UTF8
  if ($gameText -notmatch 'assets/ui/share_card\\.png') { Add-Err "微信分享图未指向正式 share_card.png" }
  if ($gameText -notmatch 'assets/ui/home_bg_main\\.jpg') { Add-Err "微信启动背景未指向正式 home_bg_main.jpg" }
  if ($gameText -notmatch 'assets/ui/game_shell\\.png') { Add-Err "微信游戏机框未指向正式 game_shell.png" }
  if ($gameText -notmatch 'assets/ui/game_playfield_bg\\.jpg') { Add-Err "微信玩法仓背景未指向正式 game_playfield_bg.jpg" }
  if ($gameText -notmatch 'assets/ui/btn_start_normal\\.png') { Add-Err "微信开始按钮未指向正式 btn_start_normal.png" }
  if ($gameText -notmatch 'assets/ui/btn_settings_normal\\.png') { Add-Err "微信设置入口未指向正式 btn_settings_normal.png" }
  if ($gameText -notmatch 'assets/ui/btn_rank_normal\\.png') { Add-Err "微信排行入口未指向正式 btn_rank_normal.png" }
  if ($gameText -notmatch 'assets/ui/btn_achievement_normal\\.png') { Add-Err "微信成就入口未指向正式 btn_achievement_normal.png" }
  if ($gameText -notmatch 'assets/ui/settings_panel\\.png') { Add-Err "微信设置面板未指向正式 settings_panel.png" }
  if ($gameText -notmatch 'assets/ui/rank_panel\\.png') { Add-Err "微信排行面板未指向正式 rank_panel.png" }
  if ($gameText -notmatch 'assets/ui/achievement_panel\\.png') { Add-Err "微信成就面板未指向正式 achievement_panel.png" }
  if ($gameText -notmatch 'assets/ui/settings_panel_frame\\.png') { Add-Err "微信设置面板未指向分层 settings_panel_frame.png" }
  if ($gameText -notmatch 'assets/ui/rank_panel_frame\\.png') { Add-Err "微信排行面板未指向分层 rank_panel_frame.png" }
  if ($gameText -notmatch 'assets/ui/achievement_panel_frame\\.png') { Add-Err "微信成就面板未指向分层 achievement_panel_frame.png" }
  if ($gameText -notmatch 'assets/ui/close_button\\.png') { Add-Err "微信关闭按钮未指向独立 close_button.png" }
  if ($gameText -notmatch 'assets/ui/setting_row\\.png') { Add-Err "微信设置行未指向独立 setting_row.png" }
  if ($gameText -notmatch 'assets/ui/rank_row\\.png') { Add-Err "微信排行行未指向独立 rank_row.png" }
  if ($gameText -notmatch 'assets/ui/achievement_row_unlocked\\.png') { Add-Err "微信成就行未指向独立 achievement_row_unlocked.png" }
  if ($gameText -notmatch 'assets/ui/achievement_row_locked\\.png') { Add-Err "微信成就行未指向独立 achievement_row_locked.png" }
  if ($gameText -notmatch 'mergeYizaiSoundMuted') { Add-Err "微信端静音偏好未接入" }
  if ($gameText -notmatch 'toggleSound') { Add-Err "微信端静音开关缺失" }
  if ($gameText -notmatch 'mergeYizaiSettings') { Add-Err "微信端设置系统存档缺失" }
  if ($gameText -notmatch 'mergeYizaiLocalLeaderboard') { Add-Err "微信端本地排行榜存档缺失" }
  if ($gameText -notmatch 'mergeYizaiAchievements') { Add-Err "微信端成就系统存档缺失" }
}

$badFiles = Get-ChildItem -LiteralPath $root -Recurse -File | Where-Object {
  $_.FullName -match '\\\\node_modules\\\\|\\\\\\.git\\\\|\\\\logs\\\\|\\\\temp\\\\|\\\\输出结果\\\\' -or
  $_.Name -in @('.env', 'local.env', 'credentials.json', 'secret.txt') -or
  $_.Name.EndsWith('.bak')
}
if ($badFiles.Count -gt 0) {
  foreach ($file in $badFiles) { Add-Err "发现不应交付的文件：$($file.FullName.Substring($root.Length + 1))" }
}

$checksumPath = Join-Path $root 'checksums.sha256'
if (Test-Path -LiteralPath $checksumPath) {
  foreach ($line in Get-Content -LiteralPath $checksumPath -Encoding UTF8) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    if ($line -notmatch "^([a-f0-9]{64})  (.+)$") {
      Add-Err "校验行格式错误：$line"
      continue
    }
    $expected = $Matches[1]
    $relative = $Matches[2] -replace '/', '\\\\'
    $target = Join-Path $root $relative
    if (!(Test-Path -LiteralPath $target)) {
      Add-Err "校验文件不存在：$relative"
      continue
    }
    $actual = Get-Sha256Hex $target
    if ($actual -ne $expected) { Add-Err "SHA256 不一致：$relative" }
  }
}

if ($errors.Count -gt 0) {
  Write-Host ""
  Write-Host "自检失败：" -ForegroundColor Red
  foreach ($err in $errors) { Write-Host " - $err" -ForegroundColor Red }
  exit 1
}

Write-Host ""
Write-Host "自检通过：交付包关键文件完整，包体大小安全，校验文件匹配。" -ForegroundColor Green
exit 0
`;
}

async function makeChecksums(root) {
  const files = await listFiles(root);
  const lines = [];
  for (const file of files) {
    if (path.basename(file) === "checksums.sha256") continue;
    const hash = createHash("sha256").update(await readFile(file)).digest("hex");
    const rel = path.relative(root, file).replaceAll("\\", "/");
    lines.push(`${hash}  ${rel}`);
  }
  return `${lines.sort().join("\n")}\n`;
}

function toWindowsLines(text) {
  return text.replace(/\r?\n/g, "\r\n");
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

function zipRelease(sourceDir, targetZip) {
  return new Promise((resolve, reject) => {
    const src = escapePowerShellString(sourceDir);
    const dst = escapePowerShellString(targetZip);
    const command = [
      "$ErrorActionPreference='Stop';",
      `$src='${src}';`,
      `$dst='${dst}';`,
      "Compress-Archive -Path (Join-Path $src '*') -DestinationPath $dst -Force;",
      "if (!(Test-Path -LiteralPath $dst)) { throw 'Zip file was not created' }",
    ].join(" ");
    const child = spawn("powershell.exe", ["-NoProfile", "-Command", command], { stdio: "pipe" });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `Compress-Archive failed with code ${code}`));
    });
  });
}

function escapePowerShellString(value) {
  return value.replaceAll("'", "''");
}

function makeStamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function assertInside(parent, child) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path escapes expected directory: ${child}`);
  }
}
