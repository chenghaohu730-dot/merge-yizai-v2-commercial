import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { findProjectRoot } from "./generate-cocos-local-bundle-integrity.mjs";

function listFiles(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

export function evaluatePackageSizes(report, manifest) {
  const errors = [];
  const warnings = [];
  const descriptors = new Map((manifest.bundles || []).map((bundle) => [bundle.name, bundle]));
  const mainLimit = manifest.budgets.mainMaxBytes;
  if (report.mainBytes > mainLimit) errors.push(`main is ${report.mainBytes} bytes; limit is ${mainLimit}.`);

  for (const [name, descriptor] of descriptors) {
    if (name === "main") continue;
    const bytes = report.bundles[name];
    if (!Number.isInteger(bytes)) {
      errors.push(`Built game.json is missing local subpackage ${name}.`);
      continue;
    }
    if (bytes > descriptor.budgetBytes) errors.push(`${name} is ${bytes} bytes; budget is ${descriptor.budgetBytes}.`);
  }

  if (report.totalBytes > manifest.budgets.localTotalTargetBytes) {
    errors.push(`Local package total is ${report.totalBytes} bytes; internal gate is ${manifest.budgets.localTotalTargetBytes}.`);
  }
  if (report.totalBytes > manifest.budgets.localTotalHardMaxBytes) {
    errors.push(`Local package total exceeds the 20 MiB platform maximum (${manifest.budgets.localTotalHardMaxBytes} bytes).`);
  }
  if (report.totalBytes > manifest.budgets.localTotalTargetBytes * 0.9) {
    warnings.push("Local package total has consumed more than 90% of the 16 MiB internal budget.");
  }
  return { errors, warnings };
}

export function inspectWechatBuild(buildDir) {
  const absoluteBuild = path.resolve(buildDir);
  const gameJsonPath = path.join(absoluteBuild, "game.json");
  if (!fs.existsSync(gameJsonPath)) throw new Error(`Missing WeChat game.json: ${gameJsonPath}`);
  const gameJson = JSON.parse(fs.readFileSync(gameJsonPath, "utf8"));
  const declarations = gameJson.subpackages || gameJson.subPackages || [];
  const roots = declarations.map((item) => ({
    name: item.name || path.basename(item.root),
    root: String(item.root || "").replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "")
  }));
  const bundles = Object.fromEntries(roots.map((item) => [item.name, 0]));
  const packageFiles = Object.fromEntries(roots.map((item) => [item.name, []]));
  const mainFiles = [];
  const allFiles = [];
  let mainBytes = 0;
  let totalBytes = 0;

  for (const filePath of listFiles(absoluteBuild).sort()) {
    const relative = path.relative(absoluteBuild, filePath).replaceAll("\\", "/");
    const bytes = fs.statSync(filePath).size;
    const record = { relative, filePath };
    allFiles.push(record);
    totalBytes += bytes;
    const owner = roots.find((item) => relative === item.root || relative.startsWith(`${item.root}/`));
    if (owner) {
      bundles[owner.name] += bytes;
      packageFiles[owner.name].push(record);
    } else {
      mainBytes += bytes;
      mainFiles.push(record);
    }
  }

  const hashFiles = (files) => {
    const hash = crypto.createHash("sha256");
    for (const file of [...files].sort((a, b) => a.relative.localeCompare(b.relative))) {
      hash.update(file.relative, "utf8");
      hash.update("\0");
      hash.update(fs.readFileSync(file.filePath));
      hash.update("\0");
    }
    return hash.digest("hex");
  };

  return {
    hashAlgorithm: "sha256(path\\0bytes\\0)",
    mainBytes,
    mainFiles: mainFiles.length,
    mainSha256: hashFiles(mainFiles),
    bundles,
    bundleFiles: Object.fromEntries(Object.entries(packageFiles).map(([name, files]) => [name, files.length])),
    bundleSha256: Object.fromEntries(Object.entries(packageFiles).map(([name, files]) => [name, hashFiles(files)])),
    totalBytes,
    totalFiles: allFiles.length,
    totalSha256: hashFiles(allFiles),
    gameJsonPath
  };
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const buildDir = argumentValue("--build-dir");
  if (!buildDir) {
    console.error("Usage: node tools/audit-cocos-local-bundle-sizes.mjs --build-dir <Cocos WeChat build directory>");
    process.exit(2);
  }
  const projectRoot = findProjectRoot();
  const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, "assets", "data", "local-bundle-manifest.json"), "utf8"));
  const report = inspectWechatBuild(buildDir);
  const result = evaluatePackageSizes(report, manifest);
  const output = JSON.stringify({ ...report, ...result }, null, 2);
  const outputPath = argumentValue("--out");
  if (outputPath) {
    fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
    fs.writeFileSync(path.resolve(outputPath), `${output}\n`, "utf8");
  }
  console.log(output);
  if (result.errors.length) process.exit(1);
}
