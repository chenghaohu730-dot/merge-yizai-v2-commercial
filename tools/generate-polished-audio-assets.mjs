import { mkdir, writeFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const webDir = path.join(projectRoot, "game", "web-prototype", "public", "assets", "audio");
const wechatDir = path.join(projectRoot, "game", "wechat-minigame", "assets", "audio");
const sourceDir = path.join(projectRoot, "art", "audio", "generated");
const sampleRate = 44100;

await Promise.all([mkdir(webDir, { recursive: true }), mkdir(wechatDir, { recursive: true }), mkdir(sourceDir, { recursive: true })]);

const sfx = [
  { name: "drop.wav", notes: [[440, 0.035], [330, 0.055]], volume: 0.26, wave: "sine" },
  { name: "button.wav", notes: [[760, 0.03], [980, 0.04]], volume: 0.22, wave: "triangle" },
  { name: "merge.wav", notes: [[523, 0.045], [659, 0.055], [880, 0.075]], volume: 0.3, wave: "triangle" },
  { name: "big_merge.wav", notes: [[523, 0.045], [659, 0.055], [784, 0.065], [1046, 0.12]], volume: 0.34, wave: "triangle" },
  { name: "yizai.wav", notes: [[659, 0.08], [784, 0.08], [988, 0.1], [1318, 0.18]], volume: 0.32, wave: "sine" },
  { name: "game_over.wav", notes: [[523, 0.08], [392, 0.1], [330, 0.16]], volume: 0.24, wave: "sine" },
];

for (const sound of sfx) {
  const buffer = makeSfx(sound);
  await writeFile(path.join(webDir, sound.name), buffer);
  await writeFile(path.join(wechatDir, sound.name), buffer);
}

const bgmWav = path.join(sourceDir, "bgm_generated_cute_loop.wav");
await writeFile(bgmWav, makeBgm());
for (const dir of [webDir, wechatDir]) {
  await run("ffmpeg", ["-y", "-i", bgmWav, "-af", "volume=0.42", "-ar", "44100", "-ac", "2", "-b:a", "96k", path.join(dir, "bgm.mp3")]);
}

await rm(path.join(sourceDir, "bgm_generated_cute_loop.tmp.wav"), { force: true });

console.log(JSON.stringify({ ok: true, files: ["bgm.mp3", ...sfx.map((item) => item.name)] }, null, 2));

function makeSfx({ notes, volume, wave }) {
  const gap = 0.012;
  const totalSeconds = notes.reduce((sum, [, duration]) => sum + duration + gap, 0);
  const samples = new Float32Array(Math.ceil(totalSeconds * sampleRate));
  let cursor = 0;
  for (const [frequency, duration] of notes) {
    const count = Math.floor(duration * sampleRate);
    for (let i = 0; i < count && cursor < samples.length; i += 1, cursor += 1) {
      const t = i / sampleRate;
      const progress = i / Math.max(1, count - 1);
      const env = Math.sin(Math.PI * progress);
      samples[cursor] += osc(wave, frequency, t) * env * volume;
    }
    cursor += Math.floor(gap * sampleRate);
  }
  return wavFromMono(samples);
}

function makeBgm() {
  const bpm = 124;
  const beat = 60 / bpm;
  const bars = 32;
  const seconds = bars * 4 * beat;
  const samples = new Float32Array(Math.ceil(seconds * sampleRate));
  const chords = [
    [261.63, 329.63, 392.0],
    [293.66, 349.23, 440.0],
    [329.63, 392.0, 493.88],
    [246.94, 329.63, 392.0],
  ];
  const melody = [659.25, 0, 783.99, 659.25, 587.33, 659.25, 523.25, 0, 659.25, 783.99, 880.0, 783.99, 659.25, 587.33, 659.25, 0];

  for (let bar = 0; bar < bars; bar += 1) {
    const chord = chords[bar % chords.length];
    for (const f of chord) addNote(samples, f, bar * 4 * beat, 4 * beat, 0.035, "sine");
    for (let b = 0; b < 4; b += 1) {
      addNote(samples, chord[b % chord.length] * 2, bar * 4 * beat + b * beat, beat * 0.5, 0.055, "triangle");
      addPerc(samples, bar * 4 * beat + b * beat, b % 2 === 0 ? 0.045 : 0.025);
    }
  }
  for (let i = 0; i < melody.length * 4; i += 1) {
    const f = melody[i % melody.length];
    if (f) addNote(samples, f, i * beat * 0.5, beat * 0.42, 0.07, "triangle");
  }
  return wavFromMono(samples);
}

function addNote(samples, frequency, start, duration, volume, wave) {
  const startIdx = Math.floor(start * sampleRate);
  const count = Math.floor(duration * sampleRate);
  for (let i = 0; i < count && startIdx + i < samples.length; i += 1) {
    const t = i / sampleRate;
    const progress = i / Math.max(1, count - 1);
    const env = Math.sin(Math.PI * Math.min(1, progress * 1.8)) * Math.max(0, 1 - progress * 0.65);
    samples[startIdx + i] += osc(wave, frequency, t) * env * volume;
  }
}

function addPerc(samples, start, volume) {
  const startIdx = Math.floor(start * sampleRate);
  const count = Math.floor(0.045 * sampleRate);
  for (let i = 0; i < count && startIdx + i < samples.length; i += 1) {
    const progress = i / Math.max(1, count - 1);
    const noise = Math.sin(i * 19.17) * Math.sin(i * 3.31);
    samples[startIdx + i] += noise * (1 - progress) * volume;
  }
}

function osc(wave, frequency, t) {
  if (wave === "triangle") return 2 * Math.abs(2 * (frequency * t - Math.floor(frequency * t + 0.5))) - 1;
  return Math.sin(2 * Math.PI * frequency * t);
}

function wavFromMono(samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(sample * 32767), i * 2);
  }
  return Buffer.concat([wavHeader(samples.length), data]);
}

function wavHeader(sampleCount) {
  const byteRate = sampleRate * 2;
  const dataSize = sampleCount * 2;
  const buffer = Buffer.alloc(44);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`${command} failed ${code}: ${stderr}`)));
  });
}
