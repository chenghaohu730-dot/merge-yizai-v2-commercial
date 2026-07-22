"use strict";

const fs = require("node:fs");
const path = require("node:path");

const FUNCTION_NAMES = Object.freeze([
  "profileGet",
  "runStart",
  "runFinish",
  "rankTop",
  "rankAroundMe",
  "rankPage"
]);

function copyDirectory(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) copyDirectory(sourcePath, destinationPath);
    else fs.copyFileSync(sourcePath, destinationPath);
  }
}

function packageFunctions(options = {}) {
  const root = options.root || path.resolve(__dirname, "..");
  const output = options.output || path.join(root, "dist", "functions");
  fs.mkdirSync(output, { recursive: true });
  for (const name of FUNCTION_NAMES) {
    const destination = path.join(output, name);
    fs.mkdirSync(destination, { recursive: true });
    fs.copyFileSync(path.join(root, "functions", name, "index.js"), path.join(destination, "index.js"));
    copyDirectory(path.join(root, "shared"), path.join(destination, "_shared"));
    fs.writeFileSync(path.join(destination, "package.json"), `${JSON.stringify({
      name: `merge-yizai-${name.toLowerCase()}`,
      version: "2.0.0",
      private: true,
      main: "index.js",
      dependencies: { "wx-server-sdk": "3.0.1" }
    }, null, 2)}\n`, "utf8");
  }
  return { output, functions: [...FUNCTION_NAMES] };
}

if (require.main === module) {
  const result = packageFunctions();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

module.exports = { FUNCTION_NAMES, packageFunctions };
