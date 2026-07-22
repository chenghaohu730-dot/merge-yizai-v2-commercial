import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.YUNWU_BASE_URL || "https://yunwu.ai/v1";
const apiKey = process.env.YUNWU_API_KEY;

if (!apiKey) {
  console.error("Missing YUNWU_API_KEY.");
  process.exit(1);
}

const specPath = process.argv[2];
if (!specPath) {
  console.error("Usage: node tools/yunwu-generate-image.mjs <spec.json>");
  process.exit(1);
}

const spec = JSON.parse(await BunlessRead(specPath));
const out = path.resolve(spec.out);
await mkdir(path.dirname(out), { recursive: true });

const payload = {
  model: spec.model,
  prompt: spec.prompt,
  size: spec.size || "1024x1024",
  quality: spec.quality || "high",
  n: spec.n || 1,
};

for (const key of ["background", "output_format", "output_compression", "moderation"]) {
  if (spec[key] !== undefined) payload[key] = spec[key];
}

const response = await fetch(`${baseUrl}/images/generations`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

const text = await response.text();
if (!response.ok) {
  console.error(JSON.stringify({
    ok: false,
    status: response.status,
    body: safeBody(text),
  }, null, 2));
  process.exit(1);
}

let result;
try {
  result = JSON.parse(text);
} catch {
  console.error(JSON.stringify({ ok: false, error: "Non-JSON response", body: safeBody(text) }, null, 2));
  process.exit(1);
}

const item = result.data?.[0] || result.output?.[0] || result;
const b64 = item.b64_json || item.image_base64 || item.result;
if (b64) {
  const clean = b64.includes(",") ? b64.split(",").pop() : b64;
  await writeFile(out, Buffer.from(clean, "base64"));
  console.log(JSON.stringify({ ok: true, out, source: "b64_json", model: spec.model }, null, 2));
  process.exit(0);
}

const url = item.url || item.image_url;
if (url) {
  const imageResponse = await fetch(url);
  if (!imageResponse.ok) {
    console.error(JSON.stringify({ ok: false, status: imageResponse.status, url }, null, 2));
    process.exit(1);
  }
  await writeFile(out, Buffer.from(await imageResponse.arrayBuffer()));
  console.log(JSON.stringify({ ok: true, out, source: "url", model: spec.model }, null, 2));
  process.exit(0);
}

console.error(JSON.stringify({ ok: false, error: "No image data found", keys: Object.keys(item || {}) }, null, 2));
process.exit(1);

async function BunlessRead(file) {
  const fs = await import("node:fs/promises");
  return fs.readFile(file, "utf8");
}

function safeBody(body) {
  return body.length > 1200 ? `${body.slice(0, 1200)}...` : body;
}
