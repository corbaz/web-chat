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
function appendCommonChatFlags(argv, input) {
  if (input.effort) {
    argv.push("--effort", input.effort);
  }
  if (input.sessionId) {
    argv.push("--resume", input.sessionId);
  }
}
var PERMISSION_TOOLS = ["Bash", "WebFetch", "WebSearch"];
function buildStreamChatArgv(input) {
  const argv = [
    "-p",
    "--input-format",
    "stream-json",
    "--output-format",
    "stream-json",
    "--verbose",
    "--permission-prompt-tool",
    "stdio",
    "--tools",
    PERMISSION_TOOLS.join(","),
    "--model",
    input.model,
    "--setting-sources",
    "",
    "--strict-mcp-config",
    "--system-prompt",
    input.systemPrompt || CHAT_SYSTEM_PROMPT
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
function formatBuenosAiresDateTime(now) {
  return now.toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    dateStyle: "full",
    timeStyle: "short"
  });
}
function formatUtcIso(now) {
  return now.toISOString();
}
function buildDynamicSystemPrompt(now = new Date) {
  return [
    CHAT_SYSTEM_PROMPT,
    "",
    `Fecha y hora actual en Argentina (America/Argentina/Buenos_Aires): ${formatBuenosAiresDateTime(now)}. Hora UTC (ISO 8601): ${formatUtcIso(now)}.`,
    "",
    "Pod\xE9s usar la herramienta Bash, pero solo cuando lo que pide el usuario realmente necesita la computadora local (ejecutar un comando, revisar archivos, un c\xE1lculo con herramientas del sistema, etc.); para todo lo dem\xE1s respond\xE9 directamente con tu conocimiento, sin ejecutar nada. Cada comando que propongas necesita que el usuario lo apruebe antes de correr: explic\xE1 brevemente qu\xE9 vas a hacer."
  ].join(`
`);
}
var WEB_READ_ONLY_TOOLS = ["WebSearch", "WebFetch"];
function policyForTool(toolName, autoApprove) {
  if (autoApprove)
    return "auto-allow";
  if (WEB_READ_ONLY_TOOLS.includes(toolName))
    return "auto-allow";
  return "ask";
}
function parseStreamLine(line) {
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
  if (data.type === "result") {
    return { kind: "result", raw: trimmed };
  }
  if (data.type === "system" && data.subtype === "init" && typeof data.session_id === "string" && data.session_id) {
    return { kind: "session_init", sessionId: data.session_id };
  }
  if (data.type === "control_request" && typeof data.request_id === "string") {
    const request = data.request;
    if (request?.subtype === "can_use_tool") {
      const input = request.input && typeof request.input === "object" ? request.input : {};
      return {
        kind: "can_use_tool",
        requestId: data.request_id,
        toolName: typeof request.tool_name === "string" ? request.tool_name : "",
        input
      };
    }
    return {
      kind: "other_control_request",
      requestId: data.request_id,
      subtype: typeof request?.subtype === "string" ? request.subtype : ""
    };
  }
  return { kind: "other" };
}
function buildAllowResponse(requestId, input) {
  return `${JSON.stringify({
    type: "control_response",
    response: {
      subtype: "success",
      request_id: requestId,
      response: { behavior: "allow", updatedInput: input }
    }
  })}
`;
}
function buildDenyResponse(requestId, message) {
  return `${JSON.stringify({
    type: "control_response",
    response: {
      subtype: "success",
      request_id: requestId,
      response: { behavior: "deny", message }
    }
  })}
`;
}
function formatPermissionLog(toolName, input, decision, origin) {
  const detail = typeof input.command === "string" ? input.command : typeof input.url === "string" ? input.url : "";
  const marker = origin === "yolo" ? " [YOLO]" : origin === "auto" ? " [auto]" : "";
  return `permiso ${toolName} -> ${decision}${marker}: ${detail.slice(0, 120)}`;
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
var pendingPermissions = new Map;
function listPendingPermissions() {
  return [...pendingPermissions.values()].map(({ resolve: _resolve, ...info }) => info);
}
function resolvePendingPermission(id, decision) {
  const entry = pendingPermissions.get(id);
  if (!entry)
    return false;
  pendingPermissions.delete(id);
  entry.resolve(decision);
  return true;
}
function denyPendingPermissions(ids) {
  for (const id of ids)
    resolvePendingPermission(id, "deny");
}
var HARD_CAP_MS = 10 * 60 * 1000;
async function runClaudeInteractive(argv, stdinLine, options) {
  const proc = Bun.spawn(["claude", ...argv], {
    cwd: DATA_DIR,
    env: subscriptionEnv(),
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe"
  });
  const stderrPromise = new Response(proc.stderr).text();
  const myPermissionIds = new Set;
  let sessionId = "";
  let resultRaw = "";
  let timedOut = false;
  let idleTimer = null;
  function pauseIdleTimeout() {
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  }
  function resumeIdleTimeout() {
    pauseIdleTimeout();
    idleTimer = setTimeout(() => {
      timedOut = true;
      denyPendingPermissions(myPermissionIds);
      proc.kill();
    }, CHAT_TIMEOUT_MS);
  }
  const hardCapTimer = setTimeout(() => {
    timedOut = true;
    denyPendingPermissions(myPermissionIds);
    proc.kill();
  }, HARD_CAP_MS);
  const onAbort = () => {
    timedOut = true;
    denyPendingPermissions(myPermissionIds);
    proc.kill();
  };
  options.signal?.addEventListener("abort", onAbort);
  resumeIdleTimeout();
  function writeStdinLine(line) {
    try {
      proc.stdin.write(line);
    } catch {}
  }
  writeStdinLine(stdinLine);
  const reader = proc.stdout.getReader();
  const decoder = new TextDecoder;
  let buffer = "";
  try {
    readLoop:
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
          const event = parseStreamLine(line);
          if (event.kind === "session_init") {
            sessionId = event.sessionId;
            continue;
          }
          if (event.kind === "result") {
            resultRaw = event.raw;
            break readLoop;
          }
          if (event.kind === "can_use_tool") {
            const policy = policyForTool(event.toolName, options.autoApprove);
            if (policy === "auto-allow") {
              writeStdinLine(buildAllowResponse(event.requestId, event.input));
              options.onPermissionLog?.(formatPermissionLog(event.toolName, event.input, "allow", options.autoApprove ? "yolo" : "auto"));
              continue;
            }
            myPermissionIds.add(event.requestId);
            pauseIdleTimeout();
            const decision = await new Promise((resolve) => {
              pendingPermissions.set(event.requestId, {
                id: event.requestId,
                sessionId,
                tool: event.toolName,
                command: typeof event.input.command === "string" ? event.input.command : undefined,
                description: typeof event.input.description === "string" ? event.input.description : undefined,
                resolve
              });
            });
            myPermissionIds.delete(event.requestId);
            resumeIdleTimeout();
            options.onPermissionLog?.(formatPermissionLog(event.toolName, event.input, decision, "ask"));
            writeStdinLine(decision === "allow" ? buildAllowResponse(event.requestId, event.input) : buildDenyResponse(event.requestId, "El usuario deneg\xF3 este comando."));
            continue;
          }
        }
      }
  } finally {
    pauseIdleTimeout();
    clearTimeout(hardCapTimer);
    options.signal?.removeEventListener("abort", onAbort);
    denyPendingPermissions(myPermissionIds);
  }
  try {
    await proc.stdin.end();
  } catch {}
  const [stderr, exitCode] = await Promise.all([stderrPromise, proc.exited]);
  return { stdout: resultRaw, stderr, exitCode, timedOut };
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
  const effort = isValidEffort(body.effort) ? body.effort : undefined;
  const autoApprove = body.autoApprove === true;
  log.model = model;
  log.effort = effort;
  log.images = images?.length;
  log.autoApprove = autoApprove;
  const argv = buildStreamChatArgv({
    model,
    sessionId,
    effort,
    systemPrompt: buildDynamicSystemPrompt()
  });
  const stdinLine = buildStreamChatStdin({ message, images: images ?? [] });
  try {
    const { stdout, stderr, exitCode, timedOut } = await runClaudeInteractive(argv, stdinLine, {
      autoApprove,
      signal: req.signal,
      onPermissionLog: (line) => console.log(line)
    });
    if (timedOut) {
      return jsonResponse({ error: "Claude Code no respondi\xF3 a tiempo (timeout o cliente desconectado)." }, { status: 504 }, origin);
    }
    if (exitCode !== 0) {
      return jsonResponse({
        error: `claude termin\xF3 con c\xF3digo ${exitCode}: ${stderr.trim() || "sin detalle"}`
      }, { status: 502 }, origin);
    }
    const parsed = parseStreamChatResult(stdout, model);
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
