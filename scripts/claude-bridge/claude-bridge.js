#!/usr/bin/env bun
// @bun

// scripts/claude-bridge/server.ts
import { randomBytes } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

// scripts/claude-bridge/args.ts
var MODEL_ALLOWLIST = ["haiku", "sonnet", "opus", "fable"];
var FULL_MODEL_ID_PATTERN = /^claude-[a-z0-9.-]+$/;
function isValidModel(model) {
  if (typeof model !== "string" || model.length === 0)
    return false;
  if (MODEL_ALLOWLIST.includes(model))
    return true;
  return FULL_MODEL_ID_PATTERN.test(model);
}
var EFFORT_LEVELS = ["low", "medium", "high", "xhigh", "max"];
function isValidEffort(effort) {
  return typeof effort === "string" && EFFORT_LEVELS.includes(effort);
}
var IMAGE_MIME_ALLOWLIST = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif"
];
var MAX_IMAGES_PER_MESSAGE = 4;
function isValidImageMime(value) {
  return typeof value === "string" && IMAGE_MIME_ALLOWLIST.includes(value);
}
var BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;
function isValidImageData(value) {
  return typeof value === "string" && value.length > 0 && BASE64_PATTERN.test(value);
}
function isValidImage(value) {
  if (!value || typeof value !== "object")
    return false;
  const record = value;
  return isValidImageMime(record.mimeType) && isValidImageData(record.data);
}
function isValidImages(value) {
  if (!Array.isArray(value))
    return false;
  if (value.length === 0 || value.length > MAX_IMAGES_PER_MESSAGE)
    return false;
  return value.every(isValidImage);
}
var UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidSessionId(id) {
  return typeof id === "string" && UUID_PATTERN.test(id);
}
var CHAT_SYSTEM_PROMPT = "Sos un asistente de chat general dentro de una app web. Respond\xE9 directamente con tu conocimiento, en el idioma del usuario. No ejecutes comandos ni uses herramientas locales.";
function buildChatArgv(input) {
  const argv = [
    "-p",
    input.message,
    "--output-format",
    "json",
    "--model",
    input.model,
    "--setting-sources",
    "",
    "--strict-mcp-config",
    "--system-prompt",
    CHAT_SYSTEM_PROMPT
  ];
  appendCommonChatFlags(argv, input);
  return argv;
}
function appendCommonChatFlags(argv, input) {
  if (input.effort) {
    argv.push("--effort", input.effort);
  }
  if (input.webSearch) {
    argv.push("--tools", "WebSearch", "--allowedTools", "WebSearch");
  } else {
    argv.push("--tools", "");
  }
  if (input.sessionId) {
    argv.push("--resume", input.sessionId);
  }
}
function buildStreamChatArgv(input) {
  const argv = [
    "-p",
    "--input-format",
    "stream-json",
    "--output-format",
    "stream-json",
    "--verbose",
    "--model",
    input.model,
    "--setting-sources",
    "",
    "--strict-mcp-config",
    "--system-prompt",
    CHAT_SYSTEM_PROMPT
  ];
  appendCommonChatFlags(argv, input);
  return argv;
}
function buildStreamChatStdin(input) {
  const content = [
    ...input.images.map((image) => ({
      type: "image",
      source: {
        type: "base64",
        media_type: image.mimeType,
        data: image.data
      }
    })),
    { type: "text", text: input.message }
  ];
  const line = JSON.stringify({
    type: "user",
    message: { role: "user", content }
  });
  return `${line}
`;
}
function pickReportedModel(modelUsageKeys, requestedModel) {
  if (modelUsageKeys.length === 0)
    return requestedModel;
  if (modelUsageKeys.includes(requestedModel))
    return requestedModel;
  const requestedIsHaiku = requestedModel === "haiku" || requestedModel.includes("haiku");
  if (!requestedIsHaiku) {
    const nonHaiku = modelUsageKeys.find((key) => !key.includes("haiku"));
    if (nonHaiku)
      return nonHaiku;
  }
  return modelUsageKeys[0];
}
function buildParsedChatResult(data, requestedModel) {
  const modelUsageKeys = data.modelUsage ? Object.keys(data.modelUsage) : [];
  const realModel = pickReportedModel(modelUsageKeys, requestedModel);
  const isError = data.is_error === true;
  return {
    text: typeof data.result === "string" ? data.result : "",
    sessionId: typeof data.session_id === "string" ? data.session_id : "",
    model: realModel,
    tokens: {
      input: data.usage?.input_tokens ?? 0,
      output: data.usage?.output_tokens ?? 0
    },
    costUsd: typeof data.total_cost_usd === "number" ? data.total_cost_usd : 0,
    isError,
    error: isError ? data.result || "Error desconocido de Claude Code" : undefined
  };
}
function parseClaudeResult(raw, requestedModel) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return {
      text: "",
      sessionId: "",
      model: requestedModel,
      tokens: { input: 0, output: 0 },
      costUsd: 0,
      isError: true,
      error: "No se pudo interpretar la respuesta de Claude Code (JSON inv\xE1lido)."
    };
  }
  return buildParsedChatResult(data, requestedModel);
}
function parseStreamChatResult(raw, requestedModel) {
  for (const line of raw.split(`
`)) {
    const trimmed = line.trim();
    if (!trimmed)
      continue;
    let data;
    try {
      data = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (data.type === "result") {
      return buildParsedChatResult(data, requestedModel);
    }
  }
  return {
    text: "",
    sessionId: "",
    model: requestedModel,
    tokens: { input: 0, output: 0 },
    costUsd: 0,
    isError: true,
    error: "No se encontr\xF3 la l\xEDnea de resultado en la respuesta de Claude Code."
  };
}
function constantTimeEqual(a, b) {
  if (a.length !== b.length)
    return false;
  let diff = 0;
  for (let i = 0;i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
function checkBasicAuth(authHeader, username, password) {
  if (!authHeader || !authHeader.startsWith("Basic "))
    return false;
  let decoded;
  try {
    decoded = atob(authHeader.slice("Basic ".length));
  } catch {
    return false;
  }
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1)
    return false;
  const user = decoded.slice(0, separatorIndex);
  const pass = decoded.slice(separatorIndex + 1);
  return constantTimeEqual(user, username) && constantTimeEqual(pass, password);
}
function isAllowedOrigin(origin, allowlist) {
  return typeof origin === "string" && allowlist.includes(origin);
}
var MAX_BODY_BYTES = 200 * 1024;
var MAX_BODY_BYTES_WITH_IMAGES = 16 * 1024 * 1024;

// scripts/claude-bridge/server.ts
var HOSTNAME = "127.0.0.1";
var PORT = Number(process.env.CLAUDE_BRIDGE_PORT) || 4098;
var BASIC_AUTH_USER = "claude";
var CORS_ORIGINS = [
  "https://localhost:5173",
  "https://prompting-chat.vercel.app"
];
var CHAT_TIMEOUT_MS = 180000;
var MODELS_RESPONSE = [
  { id: "haiku", name: "Claude Haiku" },
  { id: "sonnet", name: "Claude Sonnet" },
  { id: "opus", name: "Claude Opus" },
  { id: "fable", name: "Claude Fable" }
];
function bridgeDataDir() {
  if (process.platform === "win32") {
    const base = process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local");
    return join(base, "prompting", "claude-bridge");
  }
  if (process.platform === "darwin") {
    return join(homedir(), "Library", "Application Support", "prompting", "claude-bridge");
  }
  const base = process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
  return join(base, "prompting", "claude-bridge");
}
var DATA_DIR = bridgeDataDir();
var PASSWORD_PATH = join(DATA_DIR, "password.txt");
if (!existsSync(DATA_DIR))
  mkdirSync(DATA_DIR, { recursive: true });
function ensurePassword() {
  const fromEnv = process.env.CLAUDE_BRIDGE_PASSWORD?.trim();
  if (fromEnv)
    return fromEnv;
  if (existsSync(PASSWORD_PATH)) {
    const existing = readFileSync(PASSWORD_PATH, "utf8").trim();
    if (existing)
      return existing;
  }
  const password = randomBytes(18).toString("hex");
  writeFileSync(PASSWORD_PATH, password, "utf8");
  return password;
}
var PASSWORD = ensurePassword();
var INSTALL_INSTRUCTIONS = 'No se encontr\xF3 el comando "claude". Instal\xE1 Claude Code (https://claude.com/claude-code) y ejecut\xE1 "claude" y luego "/login" para iniciar sesi\xF3n con tu suscripci\xF3n antes de usar este bridge.';
async function findClaudeVersion() {
  try {
    const proc = Bun.spawn(["claude", "--version"], {
      stdout: "pipe",
      stderr: "pipe"
    });
    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    if (exitCode !== 0)
      return null;
    return output.trim() || null;
  } catch {
    return null;
  }
}
function corsHeaders(origin) {
  if (!isAllowedOrigin(origin, CORS_ORIGINS))
    return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    Vary: "Origin"
  };
}
function jsonResponse(body, init = {}, origin = null) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
      ...init.headers
    }
  });
}
var NON_SUBSCRIPTION_AUTH_VARS = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_BASE_URL",
  "CLAUDE_CODE_USE_BEDROCK",
  "CLAUDE_CODE_USE_VERTEX",
  "CLAUDE_CODE_USE_FOUNDRY"
];
function subscriptionEnv() {
  const env = { ...process.env };
  for (const name of NON_SUBSCRIPTION_AUTH_VARS)
    delete env[name];
  return env;
}
async function runClaude(argv) {
  const proc = Bun.spawn(["claude", ...argv], {
    cwd: DATA_DIR,
    env: subscriptionEnv(),
    stdout: "pipe",
    stderr: "pipe"
  });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    proc.kill();
  }, CHAT_TIMEOUT_MS);
  try {
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited
    ]);
    return { stdout, stderr, exitCode, timedOut };
  } finally {
    clearTimeout(timer);
  }
}
async function runClaudeWithStdin(argv, stdinLine) {
  const proc = Bun.spawn(["claude", ...argv], {
    cwd: DATA_DIR,
    env: subscriptionEnv(),
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe"
  });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    proc.kill();
  }, CHAT_TIMEOUT_MS);
  try {
    proc.stdin.write(stdinLine);
    await proc.stdin.end();
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited
    ]);
    return { stdout, stderr, exitCode, timedOut };
  } finally {
    clearTimeout(timer);
  }
}
function formatLog(req, url, status, ms, info) {
  const hora = new Date().toLocaleTimeString("es-AR", { hour12: false });
  const parts = [`[${hora}]`, req.method, url.pathname, String(status), `${(ms / 1000).toFixed(1)}s`];
  if (info.model)
    parts.push(info.model);
  if (info.effort)
    parts.push(`effort=${info.effort}`);
  if (info.images)
    parts.push(`im\xE1genes=${info.images}`);
  if (info.webSearch)
    parts.push("web");
  if (info.tokensIn !== undefined)
    parts.push(`tokens=${info.tokensIn}\u2192${info.tokensOut ?? 0}`);
  if (info.error)
    parts.push(`error: ${info.error.slice(0, 160)}`);
  return parts.join(" ");
}
async function handleChat(req, origin, log) {
  const contentLength = Number(req.headers.get("content-length") || "0");
  if (contentLength > MAX_BODY_BYTES_WITH_IMAGES) {
    return jsonResponse({ error: "Cuerpo de la solicitud demasiado grande." }, { status: 413 }, origin);
  }
  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY_BYTES_WITH_IMAGES) {
    return jsonResponse({ error: "Cuerpo de la solicitud demasiado grande." }, { status: 413 }, origin);
  }
  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "JSON inv\xE1lido." }, { status: 400 }, origin);
  }
  if (!isValidModel(body.model)) {
    return jsonResponse({
      error: "Modelo inv\xE1lido. Usa un id completo de Claude (ej. claude-sonnet-4-6) o uno de los alias haiku, sonnet, opus, fable."
    }, { status: 400 }, origin);
  }
  const hasImages = Array.isArray(body.images) && body.images.length > 0;
  if (typeof body.message !== "string" || !body.message.trim() && !hasImages) {
    return jsonResponse({ error: "Falta el mensaje." }, { status: 400 }, origin);
  }
  const imageCount = hasImages ? body.images.length : 0;
  const message = body.message.trim() || (imageCount > 1 ? "Describe las im\xE1genes." : "Describe la imagen.");
  if (body.sessionId !== undefined && !isValidSessionId(body.sessionId)) {
    return jsonResponse({ error: "sessionId inv\xE1lido (debe ser un UUID)." }, { status: 400 }, origin);
  }
  if (body.effort !== undefined && !isValidEffort(body.effort)) {
    return jsonResponse({
      error: "Nivel de esfuerzo inv\xE1lido. Usa low, medium, high, xhigh o max."
    }, { status: 400 }, origin);
  }
  if (body.images !== undefined && !isValidImages(body.images)) {
    return jsonResponse({
      error: "Imagen inv\xE1lida. Usa PNG, JPEG, WEBP o GIF en base64 (m\xE1ximo 4 im\xE1genes)."
    }, { status: 400 }, origin);
  }
  const images = isValidImages(body.images) ? body.images : undefined;
  if (!images && rawBody.length > MAX_BODY_BYTES) {
    return jsonResponse({ error: "Cuerpo de la solicitud demasiado grande." }, { status: 413 }, origin);
  }
  const model = body.model;
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : undefined;
  const webSearch = body.webSearch === true;
  const effort = isValidEffort(body.effort) ? body.effort : undefined;
  log.model = model;
  log.effort = effort;
  log.images = images?.length;
  log.webSearch = webSearch;
  try {
    const { stdout, stderr, exitCode, timedOut } = images ? await runClaudeWithStdin(buildStreamChatArgv({ model, sessionId, webSearch, effort }), buildStreamChatStdin({ message, images })) : await runClaude(buildChatArgv({
      model,
      message,
      sessionId,
      webSearch,
      effort
    }));
    if (timedOut) {
      return jsonResponse({ error: "Claude Code no respondi\xF3 a tiempo (timeout de 180s)." }, { status: 504 }, origin);
    }
    if (exitCode !== 0) {
      return jsonResponse({
        error: `claude termin\xF3 con c\xF3digo ${exitCode}: ${stderr.trim() || "sin detalle"}`
      }, { status: 502 }, origin);
    }
    const parsed = images ? parseStreamChatResult(stdout, model) : parseClaudeResult(stdout, model);
    log.tokensIn = parsed.tokens?.input;
    log.tokensOut = parsed.tokens?.output;
    if (parsed.isError)
      log.error = parsed.error ?? parsed.text;
    return jsonResponse(parsed, {}, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("ENOENT")) {
      return jsonResponse({ error: INSTALL_INSTRUCTIONS }, { status: 500 }, origin);
    }
    return jsonResponse({ error: message }, { status: 500 }, origin);
  }
}
async function main() {
  const claudeVersion = await findClaudeVersion();
  const ignored = NON_SUBSCRIPTION_AUTH_VARS.filter((name) => process.env[name]);
  if (ignored.length > 0) {
    console.log(`Se ignoran para usar tu suscripci\xF3n: ${ignored.join(", ")} (solo en este bridge).`);
  }
  if (!claudeVersion) {
    console.warn(INSTALL_INSTRUCTIONS);
  }
  const server = Bun.serve({
    hostname: HOSTNAME,
    port: PORT,
    async fetch(req) {
      const url = new URL(req.url);
      const origin = req.headers.get("origin");
      if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
      }
      if (!checkBasicAuth(req.headers.get("authorization"), BASIC_AUTH_USER, PASSWORD)) {
        console.log(formatLog(req, url, 401, 0, { error: "contrase\xF1a incorrecta" }));
        return jsonResponse({ error: "No autorizado." }, {
          status: 401,
          headers: { "WWW-Authenticate": 'Basic realm="claude-bridge"' }
        }, origin);
      }
      if (url.pathname === "/health" && req.method === "GET") {
        const version = await findClaudeVersion();
        return jsonResponse({ healthy: version !== null, claudeVersion: version }, {}, origin);
      }
      if (url.pathname === "/models" && req.method === "GET") {
        return jsonResponse(MODELS_RESPONSE, {}, origin);
      }
      if (url.pathname === "/chat" && req.method === "POST") {
        const started = Date.now();
        const log = {};
        const response = await handleChat(req, origin, log);
        if (response.status >= 400 && !log.error) {
          try {
            const data = await response.clone().json();
            log.error = data.error;
          } catch {}
        }
        console.log(formatLog(req, url, response.status, Date.now() - started, log));
        return response;
      }
      return jsonResponse({ error: "No encontrado." }, { status: 404 }, origin);
    }
  });
  console.log(`Claude bridge escuchando en http://${server.hostname}:${server.port}`);
  console.log(`Usuario: ${BASIC_AUTH_USER}`);
  console.log(process.env.CLAUDE_BRIDGE_PASSWORD ? "Password: la de CLAUDE_BRIDGE_PASSWORD" : `Password: ${PASSWORD}`);
  console.log("Registro: una l\xEDnea por mensaje (sin el texto ni la contrase\xF1a).");
  if (claudeVersion) {
    console.log(`claude detectado: ${claudeVersion}`);
  }
  console.log('Requiere Claude Code instalado y con sesi\xF3n iniciada (ejecut\xE1 "claude" y luego "/login").');
}
main();
