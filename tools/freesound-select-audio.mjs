import { mkdir, writeFile, readFile, cp } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { pipeline } from "node:stream/promises";

const token = process.env.FREESOUND_TOKEN;
if (!token) throw new Error("Missing FREESOUND_TOKEN");

const projectRoot = path.resolve(import.meta.dirname, "..");
const audioSourceDir = path.join(projectRoot, "art", "audio", "freesound");
const webAudioDir = path.join(projectRoot, "game", "web-prototype", "public", "assets", "audio");
const wechatAudioDir = path.join(projectRoot, "game", "wechat-minigame", "assets", "audio");

const searches = [
  { key: "bgm", query: "happy game music loop", filter: "duration:[15 TO 120]", maxDuration: 120 },
  { key: "drop", query: "pop plop bubble", filter: "duration:[0 TO 3]", maxDuration: 3 },
  { key: "button", query: "button click pop", filter: "duration:[0 TO 2]", maxDuration: 2 },
  { key: "merge", query: "sparkle chime", filter: "duration:[0 TO 4]", maxDuration: 4 },
  { key: "big_merge", query: "success sparkle chime", filter: "duration:[0 TO 5]", maxDuration: 5 },
  { key: "yizai", query: "happy win jingle", filter: "duration:[0 TO 6]", maxDuration: 6 },
  { key: "game_over", query: "negative chime", filter: "duration:[0 TO 6]", maxDuration: 6 },
];

await mkdir(audioSourceDir, { recursive: true });
await mkdir(webAudioDir, { recursive: true });
await mkdir(wechatAudioDir, { recursive: true });

const selected = [];

for (const search of searches) {
  const results = await searchFreesound(search);
  const chosen = chooseResult(results, search);
  if (!chosen) throw new Error(`No Freesound result for ${search.key}`);
  selected.push({ key: search.key, ...chosen });
}

for (const item of selected) {
  const preview = item.previews?.["preview-hq-mp3"] || item.previews?.["preview-lq-mp3"];
  if (!preview) throw new Error(`No preview for ${item.key} (${item.id})`);
  const rawPath = path.join(audioSourceDir, `${item.key}_${item.id}.mp3`);
  await download(preview, rawPath);
  const runtimeName = item.key === "bgm" ? "bgm.mp3" : `${item.key}.wav`;
  const webTarget = path.join(webAudioDir, runtimeName);
  const wechatTarget = path.join(wechatAudioDir, runtimeName);
  if (item.key === "bgm") {
    await run("ffmpeg", ["-y", "-i", rawPath, "-t", "45", "-af", "afade=t=in:st=0:d=0.6,afade=t=out:st=43:d=2,volume=0.42", "-ar", "44100", "-ac", "2", "-b:a", "96k", webTarget]);
  } else {
    await run("ffmpeg", ["-y", "-i", rawPath, "-t", String(Math.min(item.duration || 2, item.maxDuration || 2)), "-af", "afade=t=in:st=0:d=0.01,afade=t=out:st=0.35:d=0.12,volume=0.78", "-ar", "44100", "-ac", "1", webTarget]);
  }
  await cp(webTarget, wechatTarget);
}

await writeFile(
  path.join(audioSourceDir, "freesound-attribution-20260612.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), selected: selected.map(summarize) }, null, 2),
  "utf8",
);

console.log(JSON.stringify({ ok: true, selected: selected.map(summarize) }, null, 2));

async function searchFreesound({ query, filter }) {
  const url = new URL("https://freesound.org/apiv2/search/text/");
  url.searchParams.set("query", query);
  url.searchParams.set("filter", filter);
  url.searchParams.set("fields", "id,name,username,license,duration,previews,tags,avg_rating,num_ratings");
  url.searchParams.set("sort", "score");
  url.searchParams.set("page_size", "10");
  const response = await fetch(url, { headers: { Authorization: `Token ${token}` } });
  if (!response.ok) throw new Error(`Freesound search failed ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return data.results || [];
}

function chooseResult(results, search) {
  return results
    .filter((item) => item.previews?.["preview-hq-mp3"] || item.previews?.["preview-lq-mp3"])
    .filter((item) => !item.duration || item.duration <= search.maxDuration)
    .filter((item) => !String(item.license || "").toLowerCase().includes("nc"))
    .sort((a, b) => scoreResult(b, search) - scoreResult(a, search))[0];
}

function scoreResult(item, search) {
  const name = `${item.name || ""} ${(item.tags || []).join(" ")}`.toLowerCase();
  let score = (item.num_ratings || 0) * 2 + (item.avg_rating || 0);
  for (const word of ["loop", "cute", "happy", "game", "music", "chime", "pop", "sparkle"]) {
    if (name.includes(word)) score += 5;
  }
  if (search.key !== "bgm" && item.license === "Creative Commons 0") score += 20;
  if (search.key === "bgm" && item.license === "Creative Commons 0") score += 8;
  return score;
}

async function download(url, target) {
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`Download failed ${response.status}: ${url}`);
  await pipeline(response.body, createWriteStream(target));
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`${command} failed ${code}: ${stderr}`)));
  });
}

function summarize(item) {
  return {
    key: item.key,
    id: item.id,
    name: item.name,
    username: item.username,
    license: item.license,
    duration: Number(item.duration?.toFixed?.(2) || item.duration || 0),
  };
}
