#!/usr/bin/env bun
// @bun

// scripts/codex-bridge/server.ts
import { randomBytes } from "crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "fs";
import { homedir } from "os";
import { join } from "path";

// src/config/chatInstructions.ts
var LINKS_AND_IMAGES_RULE = "Si el usuario pide un mapa, una ubicaci\xF3n o una direcci\xF3n, inclu\xED un link de Google Maps en markdown con esa direcci\xF3n en la b\xFAsqueda: la app lo muestra como mapa dentro del chat. No pod\xE9s generar im\xE1genes ni capturas de pantalla; si ten\xE9s la URL directa de una imagen p\xFAblica real, mostrala como imagen markdown. Nunca inventes URLs de im\xE1genes.";

// scripts/codex-bridge/args.ts
function isValidModel(model) {
  return typeof model === "string" && model.length > 0 && model.length <= 128;
}
function isValidEffort(effort) {
  return typeof effort === "string" && effort.length > 0 && effort.length <= 32 && /^[a-z0-9_-]+$/i.test(effort);
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
function buildRequestLine(id, method, params) {
  const line = { jsonrpc: "2.0", id, method, params };
  return `${JSON.stringify(line)}
`;
}
function buildServerResponseLine(id, result) {
  return `${JSON.stringify({ jsonrpc: "2.0", id, result })}
`;
}
function parseCodexLine(line) {
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
  const hasMethod = typeof data.method === "string";
  const hasId = data.id !== undefined && data.id !== null;
  if (hasMethod && hasId) {
    return {
      kind: "serverRequest",
      id: data.id,
      method: data.method,
      params: data.params
    };
  }
  if (hasMethod) {
    return { kind: "notification", method: data.method, params: data.params };
  }
  if (hasId && typeof data.id === "number") {
    return { kind: "clientResponse", id: data.id, result: data.result, error: data.error };
  }
  return { kind: "other" };
}
function codexApprovalDecision(decision) {
  return decision === "allow" ? "accept" : "decline";
}
function extractFinalAgentText(turn) {
  const items = turn.items ?? [];
  const finalAnswers = items.filter((item) => item.type === "agentMessage" && item.phase === "final_answer");
  const source = finalAnswers.length > 0 ? finalAnswers : items.filter((item) => item.type === "agentMessage");
  return source.map((item) => item.text ?? "").join("").trim();
}
var ZERO_TOKEN_USAGE = {
  inputTokens: 0,
  cachedInputTokens: 0,
  outputTokens: 0,
  reasoningOutputTokens: 0,
  totalTokens: 0
};
function diffTokenUsage(before, after) {
  return {
    input: Math.max(0, after.inputTokens - before.inputTokens),
    output: Math.max(0, after.outputTokens - before.outputTokens)
  };
}
function turnInputTokens(before, after, last) {
  if (last && last.inputTokens > 0)
    return last.inputTokens;
  return diffTokenUsage(before, after).input;
}
var CODEX_DISABLED_FEATURES = [
  "apps",
  "browser_use",
  "browser_use_external",
  "computer_use",
  "goals",
  "hooks",
  "image_generation",
  "in_app_browser",
  "memories",
  "multi_agent",
  "plugins",
  "realtime_conversation",
  "remote_plugin",
  "skill_search",
  "sleep_tool",
  "tool_suggest",
  "workspace_dependencies",
  "worktrees"
];
function buildAppServerArgv() {
  const argv = ["codex", "app-server", "-c", "mcp_servers={}"];
  for (const feature of CODEX_DISABLED_FEATURES)
    argv.push("--disable", feature);
  return argv;
}
function formatBuenosAiresDateTime(now) {
  return now.toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    dateStyle: "full",
    timeStyle: "short"
  });
}
function buildCodexInstructions(now = new Date) {
  return [
    "Sos un asistente de chat general dentro de una app web. Respond\xE9 directamente con tu conocimiento, en el idioma del usuario, de forma clara y breve.",
    "",
    `Fecha y hora actual en Argentina (America/Argentina/Buenos_Aires): ${formatBuenosAiresDateTime(now)}. Hora UTC (ISO 8601): ${now.toISOString()}.`,
    "",
    `No pod\xE9s abrir un navegador. ${LINKS_AND_IMAGES_RULE}`,
    "Pod\xE9s ejecutar comandos locales solo cuando el pedido realmente lo necesita; cada comando requiere que el usuario lo apruebe, as\xED que explic\xE1 brevemente qu\xE9 vas a hacer."
  ].join(`
`);
}

// scripts/codex-bridge/server.ts
var HOSTNAME = "127.0.0.1";
var PORT = Number(process.env.CODEX_BRIDGE_PORT) || 4094;
var BASIC_AUTH_USER = "codex";
var CORS_ORIGINS = [
  "https://localhost:5173",
  "https://prompting-chat.vercel.app"
];
var CHAT_TIMEOUT_MS = 180000;
var HARD_CAP_MS = 10 * 60 * 1000;
function bridgeDataDir() {
  if (process.platform === "win32") {
    const base = process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local");
    return join(base, "prompting", "codex-bridge");
  }
  if (process.platform === "darwin") {
    return join(homedir(), "Library", "Application Support", "prompting", "codex-bridge");
  }
  const base = process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
  return join(base, "prompting", "codex-bridge");
}
var DATA_DIR = bridgeDataDir();
var IMAGES_DIR = join(DATA_DIR, "images");
var PASSWORD_PATH = join(DATA_DIR, "password.txt");
if (!existsSync(DATA_DIR))
  mkdirSync(DATA_DIR, { recursive: true });
if (!existsSync(IMAGES_DIR))
  mkdirSync(IMAGES_DIR, { recursive: true });
function ensurePassword() {
  const fromEnv = process.env.CODEX_BRIDGE_PASSWORD?.trim();
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
var INSTALL_INSTRUCTIONS = 'No se encontr\xF3 el comando "codex". Instal\xE1 Codex CLI (https://developers.openai.com/codex/cli) y ejecut\xE1 "codex" para iniciar sesi\xF3n con tu suscripci\xF3n de ChatGPT antes de usar este bridge.';
var NON_SUBSCRIPTION_AUTH_VARS = ["OPENAI_API_KEY", "OPENAI_BASE_URL"];
function subscriptionEnv() {
  const env = { ...process.env };
  for (const name of NON_SUBSCRIPTION_AUTH_VARS)
    delete env[name];
  return env;
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
var codexProc = null;
var nextRequestId = 1;
var pendingRequests = new Map;
var pendingPermissions = new Map;
var permissionCounter = 0;
function listPendingPermissions() {
  return [...pendingPermissions.values()].map(({ resolve: _resolve, serverRequestId: _sid, ...info }) => info);
}
function resolvePendingPermission(id, decision) {
  const entry = pendingPermissions.get(id);
  if (!entry)
    return false;
  pendingPermissions.delete(id);
  entry.resolve(decision);
  return true;
}
var threadCumulativeTokens = new Map;
var threadLastCallTokens = new Map;
var pendingTurns = new Map;
function writeToCodex(line) {
  if (!codexProc)
    return;
  try {
    codexProc.stdin.write(line);
  } catch {}
}
function callCodex(method, params) {
  return new Promise((resolve, reject) => {
    const id = nextRequestId++;
    pendingRequests.set(id, {
      resolve: ({ result, error }) => {
        if (error)
          reject(new Error(formatRpcError(error)));
        else
          resolve(result);
      }
    });
    writeToCodex(buildRequestLine(id, method, params));
  });
}
function formatRpcError(error) {
  if (error && typeof error === "object") {
    const record = error;
    if (typeof record.message === "string")
      return record.message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "Error desconocido de codex app-server";
  }
}
async function findCodexVersion() {
  try {
    const proc = Bun.spawn(["codex", "--version"], {
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
function handleServerRequest(id, method, params) {
  if (method === "item/commandExecution/requestApproval" || method === "execCommandApproval") {
    const p = params ?? {};
    const permissionId = `perm_${++permissionCounter}`;
    const commandText = p.command || p.commandActions?.[0]?.command || undefined;
    pendingPermissions.set(permissionId, {
      id: permissionId,
      serverRequestId: id,
      sessionId: p.threadId || "",
      tool: "command",
      command: commandText,
      resolve: (decision) => {
        writeToCodex(buildServerResponseLine(id, {
          decision: codexApprovalDecision(decision)
        }));
      }
    });
    return;
  }
  if (method === "item/fileChange/requestApproval" || method === "applyPatchApproval" || method === "item/permissions/requestApproval") {
    writeToCodex(buildServerResponseLine(id, { decision: "decline" }));
    return;
  }
  writeToCodex(`${JSON.stringify({
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: `M\xE9todo no manejado: ${method}` }
  })}
`);
}
function handleNotification(method, params) {
  if (method === "thread/tokenUsage/updated") {
    const p = params;
    if (p.threadId && p.tokenUsage?.total) {
      threadCumulativeTokens.set(p.threadId, p.tokenUsage.total);
    }
    if (p.threadId && p.tokenUsage?.last) {
      threadLastCallTokens.set(p.threadId, p.tokenUsage.last);
    }
    return;
  }
  if (method === "turn/completed") {
    const p = params;
    const turn = p.turn;
    if (turn?.id && pendingTurns.has(turn.id)) {
      const entry = pendingTurns.get(turn.id);
      if (entry) {
        pendingTurns.delete(turn.id);
        entry.resolve(turn);
      }
    }
    return;
  }
}
function startCodexProcess() {
  codexProc = Bun.spawn(buildAppServerArgv(), {
    cwd: DATA_DIR,
    env: subscriptionEnv(),
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe"
  });
  (async () => {
    const text = await new Response(codexProc?.stderr).text();
    if (text.trim())
      console.error("[codex app-server stderr]", text.trim());
  })();
  (async () => {
    if (!codexProc)
      return;
    const reader = codexProc.stdout.getReader();
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
          const event = parseCodexLine(line);
          if (event.kind === "clientResponse") {
            const entry = pendingRequests.get(event.id);
            if (entry) {
              pendingRequests.delete(event.id);
              entry.resolve({ result: event.result, error: event.error });
            }
          } else if (event.kind === "serverRequest") {
            handleServerRequest(event.id, event.method, event.params);
          } else if (event.kind === "notification") {
            handleNotification(event.method, event.params);
          }
        }
      }
    } catch (error) {
      console.error("[codex app-server] error leyendo stdout:", error);
    }
  })();
  codexProc.exited.then((code) => {
    console.error(`[codex app-server] proceso terminado (c\xF3digo ${code}); reintentando en 2s`);
    codexProc = null;
    for (const [, entry] of pendingRequests) {
      entry.resolve({ error: { message: "codex app-server se cerr\xF3" } });
    }
    pendingRequests.clear();
    setTimeout(() => void ensureCodexProcess(), 2000);
  });
}
var initializePromise = null;
async function ensureCodexProcess() {
  if (codexProc)
    return;
  startCodexProcess();
  initializePromise = callCodex("initialize", {
    clientInfo: { name: "codex-bridge", version: "0.1.0" }
  }).then(() => {
    return;
  });
  await initializePromise;
}
async function fetchModels() {
  await ensureCodexProcess();
  const result = await callCodex("model/list", {});
  const data = result?.data ?? [];
  return data.filter((m) => !m.hidden).map((m) => ({
    id: m.id,
    name: m.displayName || m.id,
    vision: (m.inputModalities ?? []).includes("image"),
    effortLevels: (m.supportedReasoningEfforts ?? []).map((e) => e.reasoningEffort),
    defaultEffort: m.defaultReasoningEffort || "",
    isDefault: m.isDefault === true
  }));
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
  if (info.autoApprove)
    parts.push("YOLO");
  if (info.tokensIn !== undefined)
    parts.push(`tokens=${info.tokensIn}\u2192${info.tokensOut ?? 0}`);
  if (info.error)
    parts.push(`error: ${info.error.slice(0, 160)}`);
  return parts.join(" ");
}
function extensionFor(mimeType) {
  if (mimeType === "image/jpeg")
    return "jpg";
  if (mimeType === "image/png")
    return "png";
  if (mimeType === "image/webp")
    return "webp";
  if (mimeType === "image/gif")
    return "gif";
  return "bin";
}
function writeTempImages(images) {
  const paths = [];
  for (const image of images) {
    const filename = `${randomBytes(8).toString("hex")}.${extensionFor(image.mimeType)}`;
    const path = join(IMAGES_DIR, filename);
    writeFileSync(path, Buffer.from(image.data, "base64"));
    paths.push(path);
  }
  return paths;
}
function cleanupTempFiles(paths) {
  for (const path of paths) {
    try {
      rmSync(path, { force: true });
    } catch {}
  }
}
async function resolveThreadId(sessionId, cwd, sandbox, approvalPolicy) {
  if (sessionId) {
    try {
      const resumed = await callCodex("thread/resume", {
        threadId: sessionId,
        excludeTurns: true,
        baseInstructions: buildCodexInstructions()
      });
      if (resumed?.thread?.id)
        return resumed.thread.id;
    } catch {}
  }
  const started = await callCodex("thread/start", {
    cwd,
    sandbox,
    approvalPolicy,
    baseInstructions: buildCodexInstructions()
  });
  const threadId = started?.thread?.id;
  if (!threadId)
    throw new Error("codex app-server no devolvi\xF3 threadId en thread/start");
  return threadId;
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
    return jsonResponse({ error: "Modelo inv\xE1lido." }, { status: 400 }, origin);
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
    return jsonResponse({ error: "Nivel de esfuerzo inv\xE1lido." }, { status: 400 }, origin);
  }
  if (body.images !== undefined && !isValidImages(body.images)) {
    return jsonResponse({ error: "Imagen inv\xE1lida. Usa PNG, JPEG, WEBP o GIF en base64 (m\xE1ximo 4 im\xE1genes)." }, { status: 400 }, origin);
  }
  const images = isValidImages(body.images) ? body.images : undefined;
  if (!images && rawBody.length > MAX_BODY_BYTES) {
    return jsonResponse({ error: "Cuerpo de la solicitud demasiado grande." }, { status: 413 }, origin);
  }
  const model = body.model;
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : undefined;
  const effort = isValidEffort(body.effort) ? body.effort : undefined;
  const autoApprove = body.autoApprove === true;
  log.model = model;
  log.effort = effort;
  log.images = images?.length;
  log.autoApprove = autoApprove;
  const sandbox = autoApprove ? "workspace-write" : "read-only";
  const approvalPolicy = autoApprove ? "never" : "untrusted";
  let tempImagePaths = [];
  try {
    await ensureCodexProcess();
    const threadId = await resolveThreadId(sessionId, DATA_DIR, sandbox, approvalPolicy);
    const input = [];
    if (images && images.length > 0) {
      tempImagePaths = writeTempImages(images);
      for (const path of tempImagePaths)
        input.push({ type: "localImage", path });
    }
    input.push({ type: "text", text: message });
    const beforeTokens = threadCumulativeTokens.get(threadId) ?? ZERO_TOKEN_USAGE;
    threadLastCallTokens.delete(threadId);
    const startResult = await callCodex("turn/start", {
      threadId,
      input,
      ...effort ? { effort } : {}
    });
    const turnId = startResult?.turn?.id;
    if (!turnId)
      throw new Error("codex app-server no devolvi\xF3 turnId en turn/start");
    const myPermissionIds = [];
    for (const [id, entry] of pendingPermissions) {
      if (entry.sessionId === threadId)
        myPermissionIds.push(id);
    }
    const completedTurn = await new Promise((resolve, reject) => {
      let timedOut = false;
      let idleTimer = null;
      const hardCapTimer = setTimeout(() => {
        timedOut = true;
        pendingTurns.delete(turnId);
        callCodex("turn/interrupt", { threadId }).catch(() => {});
        reject(new Error("TIMEOUT"));
      }, HARD_CAP_MS);
      function resumeIdle() {
        if (idleTimer)
          clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          if (timedOut)
            return;
          timedOut = true;
          clearTimeout(hardCapTimer);
          pendingTurns.delete(turnId);
          callCodex("turn/interrupt", { threadId }).catch(() => {});
          reject(new Error("TIMEOUT"));
        }, CHAT_TIMEOUT_MS);
      }
      resumeIdle();
      const checkInterval = setInterval(() => {
        const hasPending = [...pendingPermissions.values()].some((p) => p.sessionId === threadId);
        if (hasPending) {
          if (idleTimer) {
            clearTimeout(idleTimer);
            idleTimer = null;
          }
        } else if (!idleTimer && !timedOut) {
          resumeIdle();
        }
      }, 500);
      pendingTurns.set(turnId, {
        sessionId: threadId,
        resolve: (turn) => {
          clearTimeout(hardCapTimer);
          if (idleTimer)
            clearTimeout(idleTimer);
          clearInterval(checkInterval);
          if (!timedOut)
            resolve(turn);
        }
      });
    });
    const afterTokens = threadCumulativeTokens.get(threadId) ?? beforeTokens;
    const tokens = {
      input: turnInputTokens(beforeTokens, afterTokens, threadLastCallTokens.get(threadId)),
      output: diffTokenUsage(beforeTokens, afterTokens).output
    };
    log.tokensIn = tokens.input;
    log.tokensOut = tokens.output;
    const text = extractFinalAgentText(completedTurn);
    const isError = completedTurn.status !== "completed" || Boolean(completedTurn.error);
    if (isError)
      log.error = completedTurn.error?.message;
    return jsonResponse({
      text,
      sessionId: threadId,
      model,
      tokens,
      isError,
      error: isError ? completedTurn.error?.message || "El turno no se complet\xF3" : undefined
    }, {}, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "TIMEOUT") {
      return jsonResponse({ error: "Codex no respondi\xF3 a tiempo (timeout o cliente desconectado)." }, { status: 504 }, origin);
    }
    if (message.includes("ENOENT")) {
      return jsonResponse({ error: INSTALL_INSTRUCTIONS }, { status: 500 }, origin);
    }
    return jsonResponse({ error: message }, { status: 500 }, origin);
  } finally {
    cleanupTempFiles(tempImagePaths);
  }
}
async function main() {
  const codexVersion = await findCodexVersion();
  const ignored = NON_SUBSCRIPTION_AUTH_VARS.filter((name) => process.env[name]);
  if (ignored.length > 0) {
    console.log(`Se ignoran para usar tu suscripci\xF3n: ${ignored.join(", ")} (solo en este bridge).`);
  }
  if (!codexVersion) {
    console.warn(INSTALL_INSTRUCTIONS);
  } else {
    ensureCodexProcess().catch((error) => {
      console.error("No se pudo iniciar codex app-server:", error);
    });
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
        return jsonResponse({ error: "No autorizado." }, { status: 401, headers: { "WWW-Authenticate": 'Basic realm="codex-bridge"' } }, origin);
      }
      if (url.pathname === "/health" && req.method === "GET") {
        const version = await findCodexVersion();
        return jsonResponse({ healthy: version !== null && codexProc !== null, codexVersion: version }, {}, origin);
      }
      if (url.pathname === "/models" && req.method === "GET") {
        try {
          const models = await fetchModels();
          return jsonResponse(models, {}, origin);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return jsonResponse({ error: message }, { status: 502 }, origin);
        }
      }
      if (url.pathname === "/permission" && req.method === "GET") {
        return jsonResponse(listPendingPermissions(), {}, origin);
      }
      if (url.pathname.startsWith("/permission/") && req.method === "POST") {
        const id = decodeURIComponent(url.pathname.slice("/permission/".length));
        if (!id) {
          return jsonResponse({ error: "Falta el id del permiso." }, { status: 400 }, origin);
        }
        let body;
        try {
          body = JSON.parse(await req.text());
        } catch {
          return jsonResponse({ error: "JSON inv\xE1lido." }, { status: 400 }, origin);
        }
        if (body.decision !== "allow" && body.decision !== "deny") {
          return jsonResponse({ error: 'decision inv\xE1lida. Usa "allow" o "deny".' }, { status: 400 }, origin);
        }
        const resolved = resolvePendingPermission(id, body.decision);
        if (!resolved) {
          return jsonResponse({ error: "Permiso no encontrado (ya resuelto, vencido, o id incorrecto)." }, { status: 404 }, origin);
        }
        return jsonResponse({ ok: true }, {}, origin);
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
  console.log(`Codex bridge escuchando en http://${server.hostname}:${server.port}`);
  console.log(`Usuario: ${BASIC_AUTH_USER}`);
  console.log(process.env.CODEX_BRIDGE_PASSWORD ? "Password: la de CODEX_BRIDGE_PASSWORD" : `Password: ${PASSWORD}`);
  console.log("Registro: una l\xEDnea por mensaje (sin el texto ni la contrase\xF1a).");
  if (codexVersion) {
    console.log(`codex detectado: ${codexVersion}`);
  }
  console.log('Requiere Codex CLI instalado y con sesi\xF3n iniciada (ejecut\xE1 "codex" y segu\xED el login).');
}
main();
