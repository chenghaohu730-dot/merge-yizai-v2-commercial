const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..", "..", "..");
const gamePath = path.join(projectRoot, "game", "wechat-minigame", "game.js");

const touchHandlers = {
  start: [],
  move: [],
  end: [],
};
const storage = {};
const drawOps = [];
const textOps = [];
const share = { showShareMenu: 0, onShareAppMessage: 0, lastShareConfig: null };
const audioOps = [];
let rafQueue = [];
let frameCount = 0;
const maxFrames = 20;

function makeCtx() {
  const ctx = {};
  const methods = [
    "scale",
    "save",
    "restore",
    "clearRect",
    "translate",
    "rotate",
    "fillRect",
    "beginPath",
    "rect",
    "moveTo",
    "lineTo",
    "quadraticCurveTo",
    "closePath",
    "fill",
    "stroke",
    "clip",
    "setLineDash",
    "arc",
    "drawImage",
    "fillText",
  ];
  for (const name of methods) {
    ctx[name] = (...args) => drawOps.push([name, args.length]);
  }
  ctx.fillText = (...args) => {
    drawOps.push(["fillText", args.length]);
    textOps.push(String(args[0]));
  };
  ctx.createLinearGradient = () => ({ addColorStop: () => undefined });
  return ctx;
}

const canvas = {
  width: 0,
  height: 0,
  getContext: () => makeCtx(),
};

global.wx = {
  createCanvas: () => canvas,
  createImage: () => ({ src: "", width: 512, height: 512 }),
  createInnerAudioContext: () => {
    const audio = {
      src: "",
      volume: 1,
      play: () => audioOps.push(["play", audio.src]),
      stop: () => audioOps.push(["stop", audio.src]),
      seek: (time) => audioOps.push(["seek", audio.src, time]),
    };
    audioOps.push(["create"]);
    return audio;
  },
  getWindowInfo: () => ({ pixelRatio: 2, windowWidth: 390, windowHeight: 844 }),
  getStorageSync: (key) => storage[key],
  setStorageSync: (key, value) => {
    storage[key] = value;
  },
  onTouchStart: (handler) => touchHandlers.start.push(handler),
  onTouchMove: (handler) => touchHandlers.move.push(handler),
  onTouchEnd: (handler) => touchHandlers.end.push(handler),
  showShareMenu: () => {
    share.showShareMenu += 1;
  },
  onShareAppMessage: (handler) => {
    share.onShareAppMessage += 1;
    share.lastShareConfig = handler();
  },
  shareAppMessage: (config) => {
    share.lastShareConfig = config;
  },
};

global.requestAnimationFrame = (callback) => {
  if (frameCount < maxFrames) {
    frameCount += 1;
    rafQueue.push(callback);
  }
  return frameCount;
};

require(gamePath);
drainFrames();

dispatch(touchHandlers.start, 195, 620);
dispatch(touchHandlers.end, 195, 620);
drainFrames();
dispatch(touchHandlers.start, 195, 150);
dispatch(touchHandlers.end, 195, 150);
drainFrames();
const controlY = 781;
const playsBeforeMute = audioOps.filter(([name]) => name === "play").length;
dispatch(touchHandlers.end, 123, controlY);
drainFrames();
const playsAfterMute = audioOps.filter(([name]) => name === "play").length;
dispatch(touchHandlers.end, 195, controlY);
drainFrames();
dispatch(touchHandlers.end, 195, 420);
drainFrames();

if (drawOps.length < 100) {
  throw new Error(`Expected drawing operations, got ${drawOps.length}`);
}
if (touchHandlers.start.length !== 1 || touchHandlers.move.length !== 1 || touchHandlers.end.length !== 1) {
  throw new Error(`Unexpected touch handler registration: ${JSON.stringify({
    start: touchHandlers.start.length,
    move: touchHandlers.move.length,
    end: touchHandlers.end.length,
  })}`);
}
if (canvas.width !== 780 || canvas.height !== 1688) {
  throw new Error(`Unexpected canvas size: ${canvas.width}x${canvas.height}`);
}
if (share.showShareMenu !== 1 || share.onShareAppMessage !== 1) {
  throw new Error(`Share hooks not registered: ${JSON.stringify(share)}`);
}
if (!share.lastShareConfig || !String(share.lastShareConfig.title).includes("合成亿仔")) {
  throw new Error(`Unexpected share config: ${JSON.stringify(share.lastShareConfig)}`);
}
if (!share.lastShareConfig || share.lastShareConfig.imageUrl !== "assets/ui/share_card.png") {
  throw new Error(`Share config should use formal share card: ${JSON.stringify(share.lastShareConfig)}`);
}
for (const requiredText of ["分数", "最高", "0"]) {
  if (!textOps.some((text) => text.includes(requiredText))) {
    throw new Error(`Expected runtime HUD text "${requiredText}" was not drawn: ${JSON.stringify(textOps.slice(0, 20))}`);
  }
}
if (!drawOps.some(([name]) => name === "drawImage")) {
  throw new Error(`Expected runtime image drawing operations for baked UI assets: ${JSON.stringify(drawOps.slice(0, 20))}`);
}
if (audioOps.filter(([name]) => name === "create").length < 6) {
  throw new Error(`Expected audio contexts for gameplay sounds: ${JSON.stringify(audioOps)}`);
}
if (!audioOps.some(([name, src]) => name === "play" && String(src).includes("button.wav"))) {
  throw new Error(`Expected button sound playback: ${JSON.stringify(audioOps)}`);
}
if (!audioOps.some(([name, src]) => name === "play" && String(src).includes("drop.wav"))) {
  throw new Error(`Expected drop sound playback: ${JSON.stringify(audioOps)}`);
}
if (storage.mergeYizaiSoundMuted !== "1") {
  throw new Error(`Sound mute preference was not persisted: ${JSON.stringify(storage)}`);
}
if (playsAfterMute !== playsBeforeMute) {
  throw new Error(`Muting should not play another sound: ${JSON.stringify({ playsBeforeMute, playsAfterMute, audioOps })}`);
}

console.log(JSON.stringify({
  ok: true,
  frames: frameCount,
  drawOps: drawOps.length,
  touchHandlers: {
    start: touchHandlers.start.length,
    move: touchHandlers.move.length,
    end: touchHandlers.end.length,
  },
  canvas: { width: canvas.width, height: canvas.height },
  storage,
  share,
  hudTextDrawn: true,
  audio: {
    contexts: audioOps.filter(([name]) => name === "create").length,
    plays: audioOps.filter(([name]) => name === "play").length,
    muted: storage.mergeYizaiSoundMuted === "1",
  },
}, null, 2));

function drainFrames() {
  while (rafQueue.length) {
    const queue = rafQueue;
    rafQueue = [];
    for (const callback of queue) {
      callback(Date.now());
    }
  }
}

function dispatch(handlers, x, y) {
  for (const handler of handlers) {
    handler({ touches: [{ clientX: x, clientY: y }], changedTouches: [{ clientX: x, clientY: y }] });
  }
}
