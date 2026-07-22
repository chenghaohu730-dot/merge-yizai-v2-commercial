"use strict";

const crypto = require("node:crypto");

function hmacHex(secret, value) {
  return crypto.createHmac("sha256", secret).update(String(value), "utf8").digest("hex");
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest("hex");
}

function safeEqualHex(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
  } catch {
    return false;
  }
}

function randomHex(bytes = 16) {
  return crypto.randomBytes(bytes).toString("hex");
}

function randomUint32() {
  return crypto.randomBytes(4).readUInt32LE(0);
}

function canonicalEventDigest(nonce, events) {
  return sha256Hex(JSON.stringify([nonce, events]));
}

module.exports = {
  hmacHex,
  sha256Hex,
  safeEqualHex,
  randomHex,
  randomUint32,
  canonicalEventDigest
};
