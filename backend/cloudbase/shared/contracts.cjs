"use strict";

const API_VERSION = 1;
const PERIOD_TYPES = Object.freeze(["week", "season", "all"]);
const VERDICTS = Object.freeze(["valid", "review", "rejected"]);

class DomainError extends Error {
  constructor(code, message, options = {}) {
    super(message || code);
    this.name = "DomainError";
    this.code = code;
    this.retryable = Boolean(options.retryable);
    this.publicMessageKey = options.publicMessageKey || code.toLowerCase();
  }
}

function ok(requestId, data, serverTimeMs = Date.now()) {
  return {
    ok: true,
    requestId,
    serverTimeMs,
    data
  };
}

function fail(requestId, error, serverTimeMs = Date.now()) {
  const normalized = error instanceof DomainError
    ? error
    : new DomainError("INTERNAL_ERROR", "Unexpected server error", { retryable: true });
  return {
    ok: false,
    requestId: typeof requestId === "string" ? requestId : "unknown",
    serverTimeMs,
    error: {
      code: normalized.code,
      retryable: normalized.retryable,
      messageKey: normalized.publicMessageKey
    }
  };
}

function requireObject(value, code = "INVALID_REQUEST") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DomainError(code, "Expected an object");
  }
  return value;
}

function requireString(value, field, options = {}) {
  if (typeof value !== "string" || value.length < (options.minLength || 1) || value.length > (options.maxLength || 256)) {
    throw new DomainError("INVALID_REQUEST", `Invalid ${field}`);
  }
  return value;
}

function requireInteger(value, field, options = {}) {
  if (!Number.isSafeInteger(value)) throw new DomainError("INVALID_REQUEST", `Invalid ${field}`);
  if (options.min !== undefined && value < options.min) throw new DomainError("INVALID_REQUEST", `Invalid ${field}`);
  if (options.max !== undefined && value > options.max) throw new DomainError("INVALID_REQUEST", `Invalid ${field}`);
  return value;
}

function validateBaseRequest(request) {
  requireObject(request);
  if (request.apiVersion !== API_VERSION) {
    throw new DomainError("UNSUPPORTED_CLIENT", "Unsupported API version");
  }
  requireString(request.requestId, "requestId", { minLength: 8, maxLength: 128 });
  return request;
}

module.exports = {
  API_VERSION,
  PERIOD_TYPES,
  VERDICTS,
  DomainError,
  ok,
  fail,
  requireObject,
  requireString,
  requireInteger,
  validateBaseRequest
};
