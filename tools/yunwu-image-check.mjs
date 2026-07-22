const baseUrl = process.env.YUNWU_BASE_URL || "https://yunwu.ai/v1";
const apiKey = process.env.YUNWU_API_KEY;

if (!apiKey) {
  console.error("Missing YUNWU_API_KEY.");
  process.exit(1);
}

const response = await fetch(`${baseUrl}/models`, {
  headers: {
    Authorization: `Bearer ${apiKey}`,
  },
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

let payload;
try {
  payload = JSON.parse(text);
} catch {
  payload = { raw: text };
}

const models = Array.isArray(payload.data) ? payload.data : [];
const imageModels = models
  .map((item) => typeof item === "string" ? item : item.id || item.model || item.name)
  .filter(Boolean)
  .filter((id) => /image|gpt-image|dall|midjourney|flux|ideogram|imagen|gemini|nano|banana/i.test(id))
  .sort();

console.log(JSON.stringify({
  ok: true,
  modelCount: models.length,
  imageModels,
}, null, 2));

function safeBody(text) {
  return text.length > 600 ? `${text.slice(0, 600)}...` : text;
}
