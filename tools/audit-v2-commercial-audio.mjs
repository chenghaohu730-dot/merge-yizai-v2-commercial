import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const provenancePath = path.join(
  repoRoot,
  "art",
  "audio",
  "cc0-v2-commercial-20260722",
  "audio-provenance-manifest.json"
);
const runtimeManifestPath = path.join(
  repoRoot,
  "game",
  "cocos-creator-v2",
  "assets",
  "data",
  "audio-v2-commercial-manifest.json"
);
const errors = [];

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function fromRepoPath(relativePath) {
  return path.join(repoRoot, ...relativePath.split("/"));
}

function probe(filePath) {
  const result = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration,size:stream=codec_name,codec_type,sample_rate,channels",
      "-of",
      "json",
      filePath
    ],
    { encoding: "utf8", windowsHide: true }
  );
  if (result.status !== 0) return null;
  const parsed = JSON.parse(result.stdout);
  const audio = parsed.streams.find((stream) => stream.codec_type === "audio");
  if (!audio) return null;
  return {
    codec: audio.codec_name,
    sampleRateHz: Number(audio.sample_rate),
    channels: Number(audio.channels),
    durationSeconds: Number(parsed.format.duration),
    bytes: Number(parsed.format.size)
  };
}

function volumePeak(filePath) {
  const nullOutput = process.platform === "win32" ? "NUL" : "/dev/null";
  const result = spawnSync(
    "ffmpeg",
    ["-hide_banner", "-nostats", "-i", filePath, "-af", "volumedetect", "-f", "null", nullOutput],
    { encoding: "utf8", windowsHide: true }
  );
  if (result.status !== 0) return null;
  const match = `${result.stdout}\n${result.stderr}`.match(/max_volume:\s*(-?[\d.]+) dB/);
  return match ? Number(match[1]) : null;
}

function checkRecord(record, label) {
  const fullPath = fromRepoPath(record.path);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${label}: missing ${record.path}`);
    return;
  }
  const bytes = fs.statSync(fullPath).size;
  if (bytes !== record.bytes) errors.push(`${label}: byte mismatch for ${record.path}`);
  const hash = sha256(fullPath);
  if (hash !== record.sha256) errors.push(`${label}: SHA256 mismatch for ${record.path}`);
}

if (!fs.existsSync(provenancePath)) errors.push("Missing audio provenance manifest.");
if (!fs.existsSync(runtimeManifestPath)) errors.push("Missing Cocos audio runtime manifest.");

if (errors.length === 0) {
  const provenance = JSON.parse(fs.readFileSync(provenancePath, "utf8"));
  const runtime = JSON.parse(fs.readFileSync(runtimeManifestPath, "utf8"));
  const buttonStatesPath = path.join(
    repoRoot,
    "game",
    "cocos-creator-v2",
    "assets",
    "data",
    "button-states.json"
  );
  const dustyroom = provenance.sources.find((source) => source.id === "dustyroom-casual-game-sounds");
  const qubodup = provenance.sources.find(
    (source) => source.id === "qubodup-two-simple-game-music-loops"
  );
  if (!dustyroom || dustyroom.license !== "CC0-1.0") errors.push("Dustyroom CC0 source record missing.");
  if (!qubodup || qubodup.license !== "CC0-1.0") errors.push("qubodup CC0 source record missing.");
  if (dustyroom) {
    checkRecord(dustyroom.archive, "Dustyroom archive");
    checkRecord(dustyroom.includedLicense, "Dustyroom license");
    if (dustyroom.extractedAudio.length !== 50) errors.push("Dustyroom manifest must contain 50 WAV files.");
    for (const record of dustyroom.extractedAudio) checkRecord(record, "Dustyroom extracted audio");
  }
  if (qubodup) {
    if (qubodup.sourceAudio.length !== 2) errors.push("qubodup manifest must contain two OGG sources.");
    for (const record of qubodup.sourceAudio) checkRecord(record, "qubodup source audio");
  }

  const requiredKeys = ["button", "drop", "merge", "big_merge", "yizai", "game_over", "bgm"];
  for (const key of requiredKeys) {
    const clip = runtime.clips[key];
    if (!clip) {
      errors.push(`Missing runtime audio key: ${key}`);
      continue;
    }
    const fullPath = fromRepoPath(clip.file);
    if (!fs.existsSync(fullPath)) {
      errors.push(`Missing runtime clip: ${clip.file}`);
      continue;
    }
    if (fs.statSync(fullPath).size !== clip.bytes) errors.push(`Byte mismatch: ${clip.file}`);
    if (sha256(fullPath) !== clip.sha256) errors.push(`SHA256 mismatch: ${clip.file}`);
    const provenanceClip = provenance.derived.find((item) => item.key === key);
    if (!provenanceClip) {
      errors.push(`Missing provenance-derived record for runtime key: ${key}`);
    } else if (
      provenanceClip.output.path !== clip.file ||
      provenanceClip.output.bytes !== clip.bytes ||
      provenanceClip.output.sha256 !== clip.sha256
    ) {
      errors.push(`Runtime/provenance mapping mismatch for key: ${key}`);
    }
    const metaPath = `${fullPath}.meta`;
    if (!fs.existsSync(metaPath)) {
      errors.push(`Missing Cocos audio metadata: ${clip.file}.meta`);
    } else {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
      if (meta.importer !== "audio-clip" || meta.imported !== true) {
        errors.push(`Invalid Cocos audio metadata: ${clip.file}.meta`);
      }
    }
    const media = probe(fullPath);
    if (!media) {
      errors.push(`ffprobe could not decode: ${clip.file}`);
      continue;
    }
    const expectedCodec = key === "bgm" ? "mp3" : "vorbis";
    const expectedChannels = key === "bgm" ? 2 : 1;
    if (media.codec !== expectedCodec) errors.push(`${clip.file}: expected ${expectedCodec}, got ${media.codec}`);
    if (media.sampleRateHz !== 44100) errors.push(`${clip.file}: sample rate must be 44100 Hz.`);
    if (media.channels !== expectedChannels) {
      errors.push(`${clip.file}: expected ${expectedChannels} channel(s), got ${media.channels}`);
    }
    const peak = volumePeak(fullPath);
    if (peak === null || peak > -1) errors.push(`${clip.file}: peak headroom audit failed (${peak}).`);
    if (key !== "bgm" && media.durationSeconds > 2) {
      errors.push(`${clip.file}: one-shot is longer than the 2-second runtime budget.`);
    }
  }
  const runtimeBytes = requiredKeys.reduce((sum, key) => sum + (runtime.clips[key]?.bytes || 0), 0);
  if (runtimeBytes > 1_000_000) {
    errors.push(`Runtime audio exceeds the 1,000,000-byte candidate budget: ${runtimeBytes}.`);
  }
  if (!fs.existsSync(buttonStatesPath)) {
    errors.push("Missing button-states.json.");
  } else {
    const buttonStates = JSON.parse(fs.readFileSync(buttonStatesPath, "utf8"));
    if (buttonStates.audio !== "audio/v2-commercial/button") {
      errors.push("button-states.json is not mapped to the V2 commercial button clip.");
    }
  }
}

if (errors.length > 0) {
  console.error("V2 commercial audio audit failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("V2 commercial audio audit passed: 50 source WAVs, 2 source OGGs, 7 runtime clips, CC0 provenance, hashes, codecs, sample rates and peak headroom verified.");
