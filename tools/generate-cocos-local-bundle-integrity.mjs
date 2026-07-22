import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_RELATIVE = path.join("game", "cocos-creator-v2");
const MANIFEST_RELATIVE = path.join("assets", "data", "local-bundle-manifest.json");
const INTEGRITY_RELATIVE = path.join("assets", "data", "local-bundle-integrity.json");

export function findProjectRoot(start = process.cwd()) {
  const candidates = [
    path.resolve(start),
    path.resolve(start, PROJECT_RELATIVE),
    path.resolve(start, "..", "..")
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, MANIFEST_RELATIVE))) return candidate;
  }
  throw new Error(`Cannot locate ${PROJECT_RELATIVE}/${MANIFEST_RELATIVE} from ${start}`);
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function listFiles(targetPath) {
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) return [targetPath];
  const files = [];
  for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
    const child = path.join(targetPath, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(child));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function buildIntegrityInventory(projectRoot = findProjectRoot()) {
  const manifestPath = path.join(projectRoot, MANIFEST_RELATIVE);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const ownership = new Map();
  const bundles = {};

  for (const bundle of manifest.bundles || []) {
    const files = [];
    for (const sourcePath of bundle.sourcePaths || []) {
      const absolute = path.resolve(projectRoot, sourcePath);
      const relativeGuard = path.relative(projectRoot, absolute);
      if (relativeGuard.startsWith("..") || path.isAbsolute(relativeGuard)) {
        throw new Error(`Source path escapes the Cocos project: ${sourcePath}`);
      }
      if (!fs.existsSync(absolute)) throw new Error(`Missing bundle source path: ${sourcePath}`);
      for (const filePath of listFiles(absolute)) {
        const relative = path.relative(projectRoot, filePath).replaceAll("\\", "/");
        if (relative === INTEGRITY_RELATIVE.replaceAll("\\", "/")) continue;
        const previous = ownership.get(relative);
        if (previous && previous !== bundle.name) {
          throw new Error(`Source asset belongs to multiple bundles: ${relative} (${previous}, ${bundle.name})`);
        }
        ownership.set(relative, bundle.name);
        files.push({ path: relative, bytes: fs.statSync(filePath).size, sha256: sha256File(filePath) });
      }
    }
    files.sort((a, b) => a.path.localeCompare(b.path, "en"));
    bundles[bundle.name] = {
      bytes: files.reduce((sum, file) => sum + file.bytes, 0),
      fileCount: files.length,
      files
    };
  }

  return {
    schemaVersion: 1,
    algorithm: "sha256",
    manifestSha256: sha256File(manifestPath),
    bundles
  };
}

export function checkIntegrityInventory(projectRoot = findProjectRoot()) {
  const expected = stableJson(buildIntegrityInventory(projectRoot));
  const integrityPath = path.join(projectRoot, INTEGRITY_RELATIVE);
  if (!fs.existsSync(integrityPath)) return { ok: false, reason: `Missing ${INTEGRITY_RELATIVE}` };
  const actual = stableJson(JSON.parse(fs.readFileSync(integrityPath, "utf8")));
  return actual === expected
    ? { ok: true }
    : { ok: false, reason: `${INTEGRITY_RELATIVE} is stale; regenerate after intentional asset changes.` };
}

function isCliEntry() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isCliEntry()) {
  const projectRoot = findProjectRoot();
  const inventory = buildIntegrityInventory(projectRoot);
  const output = stableJson(inventory);
  if (process.argv.includes("--check")) {
    const result = checkIntegrityInventory(projectRoot);
    if (!result.ok) {
      console.error(result.reason);
      process.exit(1);
    }
    console.log("Local bundle SHA256 inventory is current.");
  } else if (process.argv.includes("--write")) {
    fs.writeFileSync(path.join(projectRoot, INTEGRITY_RELATIVE), output, "utf8");
    console.log(`Wrote ${INTEGRITY_RELATIVE}`);
  } else {
    process.stdout.write(output);
  }
}
