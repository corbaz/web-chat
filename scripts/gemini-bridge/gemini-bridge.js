#!/usr/bin/env bun
// @bun

// scripts/gemini-bridge/server.ts
import { randomBytes } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

// src/config/chatInstructions.ts
var LINKS_AND_IMAGES_RULE = "Si el usuario pide un mapa, una ubicaci\xF3n o una direcci\xF3n, inclu\xED un link de Google Maps en markdown con esa direcci\xF3n en la b\xFAsqueda: la app lo muestra como mapa dentro del chat. No pod\xE9s generar im\xE1genes ni capturas de pantalla; si ten\xE9s la URL directa de una imagen p\xFAblica real, mostrala como imagen markdown. Nunca inventes URLs de im\xE1genes.";

// scripts/codex-bridge/args.ts
var UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidSessionId(id) {
  return typeof id === "string" && UUID_PATTERN.test(id);
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
function formatBuenosAiresDateTime(now) {
  return now.toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    dateStyle: "full",
    timeStyle: "short"
  });
}

// scripts/gemini-bridge/args.ts
var MAX_BODY_BYTES2 = 200 * 1024;
function isValidModel(model) {
  return typeof model === "string" && model.length > 0 && model.length <= 128;
}
function parseModelsOutput(output) {
  const models = [];
  for (const rawLine of output.split(/\r?\n/)) {
    const tab = rawLine.indexOf("\t");
    if (tab === -1)
      continue;
    const id = rawLine.slice(0, tab).trim();
    const name = rawLine.slice(tab + 1).trim();
    if (!id || /\s/.test(id))
      continue;
    models.push({ id, name: name || id });
  }
  return models;
}
function buildAgyArgv(model, conversationId) {
  const argv = [
    "agy",
    "--print",
    "",
    "--input-format",
    "stream-json",
    "--output-format",
    "stream-json",
    "--model",
    model
  ];
  if (conversationId)
    argv.push("--conversation", conversationId);
  return argv;
}
function buildUserLine(text) {
  return `${JSON.stringify({
    event: "user",
    message: { role: "user", content: text }
  })}
`;
}
function parseAgyLine(line) {
  const trimmed = line.trim();
  if (!trimmed)
    return { kind: "other" };
  let data;
  try {
    data = JSON.parse(trimmed);
  } catch {
    return { kind: "other" };
  }
  if (!data || typeof data !== "object")
    return { kind: "other" };
  if (data.event === "init" && typeof data.conversation_id === "string") {
    return { kind: "init", conversationId: data.conversation_id };
  }
  if (data.event === "result") {
    const nested = data.result;
    const result = nested && typeof nested === "object" ? nested : data;
    return { kind: "result", result };
  }
  return { kind: "other" };
}
function buildGeminiInstructions(now = new Date) {
  return [
    "Sos un asistente de chat general dentro de una app web. Respond\xE9 directamente con tu conocimiento, en el idioma del usuario, de forma clara y breve.",
    "",
    `Fecha y hora actual en Argentina (America/Argentina/Buenos_Aires): ${formatBuenosAiresDateTime(now)}. Hora UTC (ISO 8601): ${now.toISOString()}.`,
    "",
    `No pod\xE9s abrir un navegador ni hace falta usar herramientas locales salvo que el pedido lo exija. ${LINKS_AND_IMAGES_RULE}`
  ].join(`
`);
}
function buildFirstMessage(message, now = new Date) {
  return [
    "[Instrucciones del sistema para esta conversaci\xF3n]",
    buildGeminiInstructions(now),
    "[Fin de las instrucciones]",
    "",
    "[Mensaje del usuario]",
    message
  ].join(`
`);
}
function usageDelta(previous, current, numTurns) {
  const cur = current ?? {};
  const keys = [
    "input_tokens",
    "output_tokens",
    "thinking_tokens",
    "cache_read_tokens",
    "total_tokens"
  ];
  const out = {};
  for (const key of keys) {
    const now = cur[key] ?? 0;
    if (previous) {
      out[key] = Math.max(0, now - (previous[key] ?? 0));
    } else if (numTurns && numTurns > 1) {
      out[key] = Math.round(now / numTurns);
    } else {
      out[key] = now;
    }
  }
  return out;
}
function resultToBody(result, sessionId, model, previousUsage) {
  const usage = usageDelta(previousUsage, result.usage, result.num_turns);
  const input = (usage.input_tokens ?? 0) + (usage.cache_read_tokens ?? 0);
  const output = usage.output_tokens ?? 0;
  const text = (result.response ?? "").trim();
  const isError = result.status !== "SUCCESS" && !text;
  return {
    text,
    sessionId,
    model,
    tokens: { input, output },
    isError,
    error: isError ? result.error || "El turno no se complet\xF3" : undefined
  };
}
function isKnownModel(model, known) {
  return known.size === 0 || known.has(model);
}
var NON_SUBSCRIPTION_AUTH_VARS = ["GEMINI_API_KEY", "GOOGLE_API_KEY"];
function buildSubscriptionEnv(source) {
  const env = { ...source };
  for (const name of NON_SUBSCRIPTION_AUTH_VARS)
    delete env[name];
  return env;
}

// scripts/gemini-bridge/server.ts
var HOSTNAME = "127.0.0.1";
var PORT = Number(process.env.GEMINI_BRIDGE_PORT) || 4092;
var BASIC_AUTH_USER = "gemini";
var CORS_ORIGINS = [
  "https://localhost:5173",
  "https://prompting-chat.vercel.app"
];
var TURN_HARD_CAP_MS = 5 * 60 * 1000;
var IDLE_KILL_MS = 10 * 60 * 1000;
var MODELS_TTL_MS = 10 * 60 * 1000;
function bridgeDataDir() {
  if (process.platform === "win32") {
    const base = process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local");
    return join(base, "prompting", "gemini-bridge");
  }
  if (process.platform === "darwin") {
    return join(homedir(), "Library", "Application Support", "prompting", "gemini-bridge");
  }
  const base = process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
  return join(base, "prompting", "gemini-bridge");
}
var DATA_DIR = bridgeDataDir();
var PASSWORD_PATH = join(DATA_DIR, "password.txt");
if (!existsSync(DATA_DIR))
  mkdirSync(DATA_DIR, { recursive: true });
function ensurePassword() {
  const fromEnv = process.env.GEMINI_BRIDGE_PASSWORD?.trim();
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
var INSTALL_INSTRUCTIONS = 'No se encontr\xF3 el comando "agy". Instal\xE1 Antigravity CLI (https://antigravity.google/) y ejecut\xE1 "agy" para iniciar sesi\xF3n con tu cuenta de Google AI Pro antes de usar este bridge.';
function subscriptionEnv() {
  return buildSubscriptionEnv(process.env);
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
async function runAgy(args) {
  const proc = Bun.spawn(["agy", ...args], {
    cwd: DATA_DIR,
    env: subscriptionEnv(),
    stdout: "pipe",
    stderr: "pipe"
  });
  const [stdout] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text()
  ]);
  return { code: await proc.exited, stdout };
}
async function findAgyVersion() {
  try {
    const { code, stdout } = await runAgy(["--version"]);
    if (code !== 0)
      return null;
    return stdout.trim() || null;
  } catch {
    return null;
  }
}
var modelsCache = null;
var modelsInFlight = null;
async function fetchModels() {
  if (modelsCache && Date.now() - modelsCache.fetchedAt < MODELS_TTL_MS) {
    return modelsCache.models;
  }
  if (!modelsInFlight) {
    modelsInFlight = (async () => {
      const { code, stdout } = await runAgy(["models"]);
      const models = parseModelsOutput(stdout);
      if (code !== 0 || models.length === 0) {
        throw new Error("`agy models` no devolvi\xF3 modelos (\xBFiniciaste sesi\xF3n en agy?).");
      }
      modelsCache = { models, fetchedAt: Date.now() };
      return models;
    })().finally(() => {
      modelsInFlight = null;
    });
  }
  return modelsInFlight;
}
var sessions = new Map;
var lastUsageByConversation = new Map;
function killSession(session) {
  if (session.idleTimer)
    clearTimeout(session.idleTimer);
  session.idleTimer = null;
  if (session.conversationId && sessions.get(session.conversationId) === session) {
    sessions.delete(session.conversationId);
  }
  try {
    session.proc.kill();
  } catch {}
}
function armIdleTimer(session) {
  if (session.idleTimer)
    clearTimeout(session.idleTimer);
  session.idleTimer = setTimeout(() => killSession(session), IDLE_KILL_MS);
}
function registerConversation(session, conversationId) {
  if (!session.conversationId)
    session.conversationId = conversationId;
  sessions.set(session.conversationId, session);
}
function spawnSession(model, conversationId) {
  const proc = Bun.spawn(buildAgyArgv(model, conversationId), {
    cwd: DATA_DIR,
    env: subscriptionEnv(),
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe"
  });
  const session = {
    proc,
    model,
    conversationId: conversationId ?? null,
    alive: true,
    stderrTail: "",
    pending: null,
    queue: Promise.resolve(),
    idleTimer: null
  };
  if (conversationId)
    sessions.set(conversationId, session);
  armIdleTimer(session);
  (async () => {
    const reader = proc.stderr.getReader();
    const decoder = new TextDecoder;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done)
          break;
        session.stderrTail = (session.stderrTail + decoder.decode(value, { stream: true })).slice(-500);
      }
    } catch {}
  })();
  (async () => {
    const reader = proc.stdout.getReader();
    const decoder = new TextDecoder;
    let buffer = "";
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done)
          break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf(`
`)) !== -1) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          const event = parseAgyLine(line);
          if (event.kind === "init") {
            registerConversation(session, event.conversationId);
          } else if (event.kind === "result") {
            if (event.result.conversation_id) {
              registerConversation(session, event.result.conversation_id);
            }
            if (process.env.GEMINI_BRIDGE_DEBUG) {
              console.log("[agy result]", JSON.stringify({ ...event.result, response: `<${event.result.response?.length ?? 0} chars>` }));
            }
            const pending = session.pending;
            session.pending = null;
            pending?.resolve(event.result);
          }
        }
      }
    } catch (error) {
      console.error("[agy] error leyendo stdout:", error);
    }
  })();
  proc.exited.then((code) => {
    session.alive = false;
    if (session.idleTimer)
      clearTimeout(session.idleTimer);
    if (session.conversationId && sessions.get(session.conversationId) === session) {
      sessions.delete(session.conversationId);
    }
    const pending = session.pending;
    session.pending = null;
    pending?.reject(new Error(`agy se cerr\xF3 (c\xF3digo ${code})${session.stderrTail.trim() ? `: ${session.stderrTail.trim().slice(-200)}` : ""}`));
  });
  return session;
}
function runTurn(session, text) {
  const turn = session.queue.then(() => new Promise((resolve, reject) => {
    if (!session.alive) {
      reject(new Error("agy se cerr\xF3 antes de recibir el mensaje"));
      return;
    }
    if (session.idleTimer)
      clearTimeout(session.idleTimer);
    const cap = setTimeout(() => {
      session.pending = null;
      killSession(session);
      reject(new Error("TIMEOUT"));
    }, TURN_HARD_CAP_MS);
    session.pending = {
      resolve: (result) => {
        clearTimeout(cap);
        armIdleTimer(session);
        resolve(result);
      },
      reject: (error) => {
        clearTimeout(cap);
        reject(error);
      }
    };
    try {
      const stdin = session.proc.stdin;
      stdin.write(buildUserLine(text));
      stdin.flush?.();
    } catch (error) {
      clearTimeout(cap);
      session.pending = null;
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  }));
  session.queue = turn.catch(() => {
    return;
  });
  return turn;
}
function formatLog(req, url, status, ms, info) {
  const hora = new Date().toLocaleTimeString("es-AR", { hour12: false });
  const parts = [`[${hora}]`, req.method, url.pathname, String(status), `${(ms / 1000).toFixed(1)}s`];
  if (info.model)
    parts.push(info.model);
  if (info.tokensIn !== undefined)
    parts.push(`tokens=${info.tokensIn}\u2192${info.tokensOut ?? 0}`);
  if (info.error)
    parts.push(`error: ${info.error.slice(0, 160)}`);
  return parts.join(" ");
}
async function handleChat(req, origin, log) {
  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY_BYTES2) {
    return jsonResponse({ error: "Cuerpo de la solicitud demasiado grande." }, { status: 413 }, origin);
  }
  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "JSON inv\xE1lido." }, { status: 400 }, origin);
  }
  if (!isValidModel(body.model)) {
    return jsonResponse({ error: "Modelo inv\xE1lido." }, { status: 400 }, origin);
  }
  if (typeof body.message !== "string" || !body.message.trim()) {
    return jsonResponse({ error: "Falta el mensaje." }, { status: 400 }, origin);
  }
  if (body.sessionId !== undefined && !isValidSessionId(body.sessionId)) {
    return jsonResponse({ error: "sessionId inv\xE1lido (debe ser un UUID)." }, { status: 400 }, origin);
  }
  const model = body.model;
  const message = body.message.trim();
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : undefined;
  log.model = model;
  try {
    let known = null;
    try {
      known = new Set((await fetchModels()).map((m) => m.id));
    } catch {}
    if (known && !isKnownModel(model, known)) {
      return jsonResponse({
        error: `agy no tiene el modelo "${model}". Eleg\xED uno de la lista de Gemini (suscripci\xF3n).`
      }, { status: 400 }, origin);
    }
    let session = sessionId ? sessions.get(sessionId) : undefined;
    if (session && (!session.alive || session.model !== model)) {
      killSession(session);
      session = undefined;
    }
    const isNewConversation = !sessionId;
    if (!session)
      session = spawnSession(model, sessionId);
    const text = isNewConversation ? buildFirstMessage(message) : message;
    const result = await runTurn(session, text);
    const conversationId = session.conversationId || result.conversation_id || sessionId || "";
    const responseBody = resultToBody(result, conversationId, model, lastUsageByConversation.get(conversationId));
    if (result.usage && conversationId) {
      lastUsageByConversation.set(conversationId, result.usage);
    }
    log.tokensIn = responseBody.tokens.input;
    log.tokensOut = responseBody.tokens.output;
    if (responseBody.isError)
      log.error = responseBody.error;
    return jsonResponse(responseBody, {}, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "TIMEOUT") {
      return jsonResponse({ error: "Gemini no respondi\xF3 a tiempo (m\xE1s de 5 minutos)." }, { status: 504 }, origin);
    }
    if (message.includes("ENOENT")) {
      return jsonResponse({ error: INSTALL_INSTRUCTIONS }, { status: 500 }, origin);
    }
    return jsonResponse({ error: message }, { status: 500 }, origin);
  }
}
async function main() {
  const agyVersion = await findAgyVersion();
  const ignored = NON_SUBSCRIPTION_AUTH_VARS.filter((name) => process.env[name]);
  if (ignored.length > 0) {
    console.log(`Se ignoran para usar tu suscripci\xF3n: ${ignored.join(", ")} (solo en este bridge).`);
  }
  if (!agyVersion)
    console.warn(INSTALL_INSTRUCTIONS);
  const server = Bun.serve({
    hostname: HOSTNAME,
    port: PORT,
    idleTimeout: 255,
    async fetch(req) {
      const url = new URL(req.url);
      const origin = req.headers.get("origin");
      if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
      }
      if (!checkBasicAuth(req.headers.get("authorization"), BASIC_AUTH_USER, PASSWORD)) {
        console.log(formatLog(req, url, 401, 0, { error: "contrase\xF1a incorrecta" }));
        return jsonResponse({ error: "No autorizado." }, { status: 401, headers: { "WWW-Authenticate": 'Basic realm="gemini-bridge"' } }, origin);
      }
      if (url.pathname === "/health" && req.method === "GET") {
        const version = await findAgyVersion();
        return jsonResponse({ healthy: version !== null, agyVersion: version }, {}, origin);
      }
      if (url.pathname === "/models" && req.method === "GET") {
        try {
          return jsonResponse(await fetchModels(), {}, origin);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return jsonResponse({ error: message }, { status: 502 }, origin);
        }
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
  const shutdown = () => {
    for (const session of [...sessions.values()])
      killSession(session);
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  console.log(`Gemini bridge escuchando en http://${server.hostname}:${server.port}`);
  console.log(`Usuario: ${BASIC_AUTH_USER}`);
  console.log(process.env.GEMINI_BRIDGE_PASSWORD ? "Password: la de GEMINI_BRIDGE_PASSWORD" : `Password: ${PASSWORD}`);
  console.log("Registro: una l\xEDnea por mensaje (sin el texto ni la contrase\xF1a).");
  if (agyVersion)
    console.log(`agy detectado: ${agyVersion}`);
  console.log("Requiere Antigravity CLI (agy) instalado y con sesi\xF3n de Google AI Pro. Cada respuesta tarda ~25-45 s.");
}
main();
