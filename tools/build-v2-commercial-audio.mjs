import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const sourceRoot = path.join(repoRoot, "art", "audio", "cc0-v2-commercial-20260722");
const dustyArchive = path.join(sourceRoot, "dustyroom", "DM-CGS.zip");
const dustyExtractRoot = path.join(sourceRoot, "dustyroom", "extracted", "DM-CGS");
const dustyWavRoot = path.join(dustyExtractRoot, "WAV");
const dustyLicense = path.join(dustyExtractRoot, "license.pdf");
const qubodupRoot = path.join(sourceRoot, "qubodup");
const runtimeRoot = path.join(
  repoRoot,
  "game",
  "cocos-creator-v2",
  "assets",
  "bundles",
  "core_game",
  "audio",
  "v2-commercial"
);
const provenanceManifestPath = path.join(sourceRoot, "audio-provenance-manifest.json");
const runtimeManifestPath = path.join(
  repoRoot,
  "game",
  "cocos-creator-v2",
  "assets",
  "data",
  "audio-v2-commercial-manifest.json"
);

const downloadedAt = "2026-07-22";
const sfxSelections = [
  {
    key: "button",
    sourceName: "DM-CGS-40.wav",
    outputName: "button.ogg",
    bus: "uiSfx",
    targetPeakDbfs: -6,
    rationale: "48 ms compact high-frequency click; leaves headroom for repeated UI taps."
  },
  {
    key: "drop",
    sourceName: "DM-CGS-22.wav",
    outputName: "drop.ogg",
    bus: "gameSfx",
    targetPeakDbfs: -4,
    rationale: "218 ms rounded low-mid transient suitable for a soft face release."
  },
  {
    key: "merge",
    sourceName: "DM-CGS-07.wav",
    outputName: "merge.ogg",
    bus: "gameSfx",
    targetPeakDbfs: -3,
    rationale: "292 ms rising tonal sweep; remains short enough for rapid merge chains."
  },
  {
    key: "big_merge",
    sourceName: "DM-CGS-33.wav",
    outputName: "big_merge.ogg",
    bus: "gameSfx",
    targetPeakDbfs: -2,
    rationale: "1.26 s harmonic rise gives high-level merges a distinct larger payoff."
  },
  {
    key: "yizai",
    sourceName: "DM-CGS-26.wav",
    outputName: "yizai.ogg",
    bus: "brandSfx",
    targetPeakDbfs: -2,
    rationale: "500 ms ascending multi-note figure reserved for the Yizai completion event."
  },
  {
    key: "game_over",
    sourceName: "DM-CGS-30.wav",
    outputName: "game_over.ogg",
    bus: "gameSfx",
    targetPeakDbfs: -3,
    rationale: "498 ms descending tonal gesture communicates failure without a long interruption."
  }
];

const musicSelection = {
  key: "bgm",
  sourceName: "levelmusicloop-tigrun.ogg",
  outputName: "bgm.mp3",
  bus: "bgm",
  targetIntegratedLufs: -20,
  targetPeakDbfs: -1.5,
  rationale: "The in-game loop from qubodup's matched menu/game pair; kept stereo and normalized by gain only."
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 32 * 1024 * 1024,
    ...options
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} failed (${result.status})\n${result.stdout || ""}\n${result.stderr || ""}`
    );
  }
  return result;
}

function toRepoPath(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function baseFileRecord(filePath) {
  const stat = fs.statSync(filePath);
  return {
    path: toRepoPath(filePath),
    bytes: stat.size,
    sha256: sha256(filePath)
  };
}

function probeAudio(filePath) {
  const result = run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=format_name,duration,size,bit_rate:stream=codec_name,codec_type,sample_rate,channels,channel_layout,bits_per_sample,sample_fmt",
    "-of",
    "json",
    filePath
  ]);
  const parsed = JSON.parse(result.stdout);
  const audio = parsed.streams.find((stream) => stream.codec_type === "audio");
  if (!audio) throw new Error(`No audio stream in ${filePath}`);
  return {
    codec: audio.codec_name,
    sampleRateHz: Number(audio.sample_rate),
    channels: Number(audio.channels),
    channelLayout: audio.channel_layout || null,
    bitsPerSample: Number(audio.bits_per_sample || 0),
    sampleFormat: audio.sample_fmt || null,
    durationSeconds: Number(Number(parsed.format.duration).toFixed(6)),
    bitRate: parsed.format.bit_rate ? Number(parsed.format.bit_rate) : null,
    format: parsed.format.format_name
  };
}

function volumeAudit(filePath) {
  const nullOutput = process.platform === "win32" ? "NUL" : "/dev/null";
  const result = run("ffmpeg", [
    "-hide_banner",
    "-nostats",
    "-i",
    filePath,
    "-af",
    "volumedetect",
    "-f",
    "null",
    nullOutput
  ]);
  const text = `${result.stdout}\n${result.stderr}`;
  const meanMatch = text.match(/mean_volume:\s*(-?[\d.]+) dB/);
  const maxMatch = text.match(/max_volume:\s*(-?[\d.]+) dB/);
  if (!meanMatch || !maxMatch) throw new Error(`Unable to parse volumedetect output for ${filePath}`);
  return {
    meanDbfs: Number(meanMatch[1]),
    peakDbfs: Number(maxMatch[1])
  };
}

function monoVolumeAudit(filePath) {
  const nullOutput = process.platform === "win32" ? "NUL" : "/dev/null";
  const result = run("ffmpeg", [
    "-hide_banner",
    "-nostats",
    "-i",
    filePath,
    "-af",
    "pan=mono|c0=0.5*c0+0.5*c1,volumedetect",
    "-f",
    "null",
    nullOutput
  ]);
  const text = `${result.stdout}\n${result.stderr}`;
  const meanMatch = text.match(/mean_volume:\s*(-?[\d.]+) dB/);
  const maxMatch = text.match(/max_volume:\s*(-?[\d.]+) dB/);
  if (!meanMatch || !maxMatch) {
    throw new Error(`Unable to parse mono volumedetect output for ${filePath}`);
  }
  return {
    meanDbfs: Number(meanMatch[1]),
    peakDbfs: Number(maxMatch[1])
  };
}

function loudnessAudit(filePath) {
  const nullOutput = process.platform === "win32" ? "NUL" : "/dev/null";
  const result = run("ffmpeg", [
    "-hide_banner",
    "-nostats",
    "-i",
    filePath,
    "-af",
    "loudnorm=I=-20:TP=-1.5:LRA=20:print_format=json",
    "-f",
    "null",
    nullOutput
  ]);
  const text = `${result.stdout}\n${result.stderr}`;
  const start = text.lastIndexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error(`Unable to parse loudnorm output for ${filePath}`);
  const data = JSON.parse(text.slice(start, end + 1));
  return {
    integratedLufs: Number(data.input_i),
    truePeakDbfs: Number(data.input_tp),
    loudnessRangeLu: Number(data.input_lra),
    thresholdLufs: Number(data.input_thresh)
  };
}

function ffmpegVersion() {
  return run("ffmpeg", ["-version"]).stdout.split(/\r?\n/, 1)[0];
}

function ffprobeVersion() {
  return run("ffprobe", ["-version"]).stdout.split(/\r?\n/, 1)[0];
}

function ensureSourceLayout() {
  for (const required of [dustyArchive, dustyLicense]) {
    if (!fs.existsSync(required)) throw new Error(`Missing required source: ${required}`);
  }
  const archiveBytes = fs.statSync(dustyArchive).size;
  if (archiveBytes !== 8_891_352) {
    throw new Error(`DM-CGS.zip must be the complete 8,891,352-byte archive; got ${archiveBytes}`);
  }
  const wavs = fs.readdirSync(dustyWavRoot).filter((name) => /^DM-CGS-\d{2}\.wav$/i.test(name));
  if (wavs.length !== 50) throw new Error(`Expected 50 Dustyroom WAV files, got ${wavs.length}`);
  for (const name of ["menumusicloop-tiggo.ogg", "levelmusicloop-tigrun.ogg"]) {
    const fullPath = path.join(qubodupRoot, name);
    if (!fs.existsSync(fullPath)) throw new Error(`Missing required source: ${fullPath}`);
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

ensureSourceLayout();
fs.mkdirSync(runtimeRoot, { recursive: true });

const derived = [];
for (const selection of sfxSelections) {
  const inputPath = path.join(dustyWavRoot, selection.sourceName);
  const outputPath = path.join(runtimeRoot, selection.outputName);
  const inputVolume = monoVolumeAudit(inputPath);
  const gainDb = Number((selection.targetPeakDbfs - inputVolume.peakDbfs).toFixed(2));
  const filter = `pan=mono|c0=0.5*c0+0.5*c1,volume=${gainDb}dB`;
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    inputPath,
    "-map",
    "0:a:0",
    "-vn",
    "-af",
    filter,
    "-ar",
    "44100",
    "-ac",
    "1",
    "-c:a",
    "libvorbis",
    "-q:a",
    "4",
    "-map_metadata",
    "-1",
    outputPath
  ];
  run("ffmpeg", args);
  const outputVolume = volumeAudit(outputPath);
  if (outputVolume.peakDbfs > -1) {
    throw new Error(`${selection.outputName} has insufficient peak headroom: ${outputVolume.peakDbfs} dBFS`);
  }
  derived.push({
    key: selection.key,
    bus: selection.bus,
    source: baseFileRecord(inputPath),
    output: {
      ...baseFileRecord(outputPath),
      probe: probeAudio(outputPath),
      volume: outputVolume
    },
    inputProbe: probeAudio(inputPath),
    inputVolume,
    selectionRationale: selection.rationale,
    transformation: {
      purpose: "Conservative peak normalization, mono downmix and mobile runtime compression.",
      gainDb,
      targetPeakDbfs: selection.targetPeakDbfs,
      filter,
      sampleRateHz: 44100,
      channels: 1,
      codec: "libvorbis",
      quality: 4,
      ffmpegArgs: args.slice(0, -1).concat(toRepoPath(outputPath))
    }
  });
}

const musicInputPath = path.join(qubodupRoot, musicSelection.sourceName);
const musicOutputPath = path.join(runtimeRoot, musicSelection.outputName);
const musicInputLoudness = loudnessAudit(musicInputPath);
const musicGainDb = Number(
  Math.min(
    musicSelection.targetIntegratedLufs - musicInputLoudness.integratedLufs,
    musicSelection.targetPeakDbfs - musicInputLoudness.truePeakDbfs
  ).toFixed(2)
);
const musicFilter = `volume=${musicGainDb}dB`;
const musicArgs = [
  "-hide_banner",
  "-loglevel",
  "error",
  "-y",
  "-i",
  musicInputPath,
  "-map",
  "0:a:0",
  "-vn",
  "-af",
  musicFilter,
  "-ar",
  "44100",
  "-ac",
  "2",
  "-c:a",
  "libmp3lame",
  "-b:a",
  "128k",
  "-write_xing",
  "1",
  "-map_metadata",
  "-1",
  musicOutputPath
];
run("ffmpeg", musicArgs);
const musicOutputLoudness = loudnessAudit(musicOutputPath);
const musicOutputVolume = volumeAudit(musicOutputPath);
if (musicOutputLoudness.truePeakDbfs > -1 || musicOutputVolume.peakDbfs > -1) {
  throw new Error(
    `${musicSelection.outputName} has insufficient peak headroom: ${musicOutputLoudness.truePeakDbfs} dBTP / ${musicOutputVolume.peakDbfs} dBFS`
  );
}
derived.push({
  key: musicSelection.key,
  bus: musicSelection.bus,
  source: baseFileRecord(musicInputPath),
  output: {
    ...baseFileRecord(musicOutputPath),
    probe: probeAudio(musicOutputPath),
    volume: musicOutputVolume,
    loudness: musicOutputLoudness
  },
  inputProbe: probeAudio(musicInputPath),
  inputLoudness: musicInputLoudness,
  selectionRationale: musicSelection.rationale,
  transformation: {
    purpose: "Transparent gain-only loudness alignment; no compression or limiting was applied.",
    gainDb: musicGainDb,
    targetIntegratedLufs: musicSelection.targetIntegratedLufs,
    targetPeakDbfs: musicSelection.targetPeakDbfs,
    filter: musicFilter,
    sampleRateHz: 44100,
    channels: 2,
    codec: "libmp3lame",
    bitRate: 128000,
    ffmpegArgs: musicArgs.slice(0, -1).concat(toRepoPath(musicOutputPath))
  }
});

const dustyWavs = fs
  .readdirSync(dustyWavRoot)
  .filter((name) => /^DM-CGS-\d{2}\.wav$/i.test(name))
  .sort()
  .map((name) => {
    const filePath = path.join(dustyWavRoot, name);
    return { ...baseFileRecord(filePath), probe: probeAudio(filePath) };
  });
const qubodupFiles = ["menumusicloop-tiggo.ogg", "levelmusicloop-tigrun.ogg"].map((name) => {
  const filePath = path.join(qubodupRoot, name);
  return { ...baseFileRecord(filePath), probe: probeAudio(filePath) };
});

const toolchain = {
  node: process.version,
  ffmpeg: ffmpegVersion(),
  ffprobe: ffprobeVersion()
};
const provenanceManifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  downloadedAt,
  selectionStatus: "candidate-selected; final device listening remains required before release",
  toolchain,
  sources: [
    {
      id: "dustyroom-casual-game-sounds",
      title: "Free Casual Game Sounds",
      author: "Dustyroom",
      sourcePage: "https://dustyroom.com/free-casual-game-sounds/",
      downloadUrl: "https://dustyroom.com/casualgamesounds/DM-CGS.zip",
      license: "CC0-1.0",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      attributionRequired: false,
      archiveVerification: "HTTP Content-Length matched 8,891,352 bytes; archive listing and selective extraction succeeded.",
      archive: baseFileRecord(dustyArchive),
      includedLicense: baseFileRecord(dustyLicense),
      extractedAudio: dustyWavs
    },
    {
      id: "qubodup-two-simple-game-music-loops",
      title: "Two Simple Game Music Loops",
      author: "qubodup",
      sourcePage: "https://opengameart.org/content/two-simple-game-music-loops",
      downloadUrls: [
        "https://opengameart.org/sites/default/files/menumusicloop-tiggo.ogg",
        "https://opengameart.org/sites/default/files/levelmusicloop-tigrun.ogg"
      ],
      license: "CC0-1.0",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      attributionRequired: false,
      attributionRequested: "qubodup (optional)",
      sourceAudio: qubodupFiles
    }
  ],
  derived
};
writeJson(provenanceManifestPath, provenanceManifest);

const runtimeClips = Object.fromEntries(
  derived.map((item) => [
    item.key,
    {
      resource: `audio/v2-commercial/${path.parse(item.output.path).name}`,
      file: item.output.path,
      bus: item.bus,
      bytes: item.output.bytes,
      sha256: item.output.sha256,
      codec: item.output.probe.codec,
      durationSeconds: item.output.probe.durationSeconds,
      sampleRateHz: item.output.probe.sampleRateHz,
      channels: item.output.probe.channels,
      peakDbfs: item.output.volume.peakDbfs,
      sourceFile: item.source.path
    }
  ])
);
const runtimeManifest = {
  schemaVersion: 1,
  generatedAt: provenanceManifest.generatedAt,
  provenanceManifest: toRepoPath(provenanceManifestPath),
  legacyFallbackKept: true,
  bindingNote: "No AudioService exists in the current skeleton. Bind these extensionless Cocos resource paths to EffectManager AudioClip fields when scenes/prefabs are authored.",
  bundles: {
    recommended: "core_game local bundle",
    firstCoreExperienceMustRemainOffline: true
  },
  clips: runtimeClips,
  sourceOnly: {
    menu_bgm: {
      file: toRepoPath(path.join(qubodupRoot, "menumusicloop-tiggo.ogg")),
      note: "Preserved as a matched optional menu loop; not emitted into runtime to avoid increasing the core package."
    }
  }
};
writeJson(runtimeManifestPath, runtimeManifest);

console.log(
  JSON.stringify(
    {
      ok: true,
      provenanceManifest: toRepoPath(provenanceManifestPath),
      runtimeManifest: toRepoPath(runtimeManifestPath),
      runtimeBytes: derived.reduce((sum, item) => sum + item.output.bytes, 0),
      clips: derived.map((item) => ({
        key: item.key,
        file: item.output.path,
        bytes: item.output.bytes,
        sha256: item.output.sha256,
        durationSeconds: item.output.probe.durationSeconds,
        peakDbfs: item.output.volume.peakDbfs
      }))
    },
    null,
    2
  )
);
