import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const targets = [
  path.join(projectRoot, "game", "web-prototype", "public", "assets", "audio"),
  path.join(projectRoot, "game", "wechat-minigame", "assets", "audio"),
];

const sounds = [
  { name: "drop.wav", notes: [[220, 0.035], [150, 0.04]], volume: 0.32, type: "sine" },
  { name: "merge.wav", notes: [[440, 0.045], [660, 0.055], [880, 0.06]], volume: 0.38, type: "triangle" },
  { name: "big_merge.wav", notes: [[392, 0.05], [587, 0.07], [784, 0.09], [1046, 0.09]], volume: 0.42, type: "triangle" },
  { name: "yizai.wav", notes: [[523, 0.08], [659, 0.08], [784, 0.08], [1046, 0.18]], volume: 0.42, type: "sine" },
  { name: "game_over.wav", notes: [[330, 0.08], [247, 0.1], [196, 0.16]], volume: 0.32, type: "sine" },
  { name: "button.wav", notes: [[520, 0.035], [760, 0.045]], volume: 0.26, type: "triangle" },
];

for (const dir of targets) {
  await mkdir(dir, { recursive: true });
  for (const sound of sounds) {
    await writeFile(path.join(dir, sound.name), makeWav(sound));
  }
}

console.log(JSON.stringify({ ok: true, targets, files: sounds.map((sound) => sound.name) }, null, 2));

function makeWav({ notes, volume, type }) {
  const sampleRate = 44100;
  const gap = 0.012;
  const totalSeconds = notes.reduce((sum, [, duration]) => sum + duration + gap, 0);
  const sampleCount = Math.ceil(totalSeconds * sampleRate);
  const data = Buffer.alloc(sampleCount * 2);
  let cursor = 0;

  for (const [frequency, duration] of notes) {
    const count = Math.floor(duration * sampleRate);
    for (let i = 0; i < count && cursor < sampleCount; i += 1, cursor += 1) {
      const t = i / sampleRate;
      const progress = i / Math.max(1, count - 1);
      const envelope = Math.sin(Math.PI * progress);
      const wave = type === "triangle" ? triangle(frequency * t) : Math.sin(2 * Math.PI * frequency * t);
      const sample = Math.max(-1, Math.min(1, wave * envelope * volume));
      data.writeInt16LE(Math.round(sample * 32767), cursor * 2);
    }
    cursor += Math.floor(gap * sampleRate);
  }

  return Buffer.concat([wavHeader(sampleRate, sampleCount), data]);
}

function triangle(cycles) {
  return 2 * Math.abs(2 * (cycles - Math.floor(cycles + 0.5))) - 1;
}

function wavHeader(sampleRate, sampleCount) {
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
