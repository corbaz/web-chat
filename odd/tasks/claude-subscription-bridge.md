# Claude via subscription (local `claude -p` bridge)

## Objective
Add provider "Claude (suscripción)" (`claudecode`) that chats through the user's own Claude Code subscription by running `claude -p` headless on the user's PC, behind a small local HTTP bridge. User approved 2026-09-27 after being told the terms risk (subscription use from a third-party app); personal use only.

## Verified facts (2026-09-27, Claude Code 2.1.283 on the user's PC)
- `claude -p "<msg>" --output-format json --tools "" --model haiku --setting-sources "" --strict-mcp-config --system-prompt "<chat prompt>"` answers in ~4 s with ~700 input tokens (no user config, no tools, no MCP).
- JSON result keys include `result` (answer text), `is_error`, `session_id`, `usage` (input_tokens, output_tokens, cache_*), `modelUsage` (per model id), `total_cost_usd`, `api_error_status`, `duration_ms`.
- Continuing a conversation: `--resume <session_id>` keeps context (asked name after "Me llamo Julio" -> "Te llamas Julio"). Do not pass `--no-session-persistence` when the session must be resumed.
- Web search without local access: `--tools WebSearch --allowedTools WebSearch` returns an answer with sources.
- Model aliases: `haiku`, `sonnet`, `opus`, `fable` (alias always maps to latest).

## Scope
- Bridge `scripts/claude-bridge/server.ts` (bun, cross-platform, manual start only, NO autostart/service): `bun run claude:bridge`.
  - Listens on `127.0.0.1:4098`; Basic auth user `claude`, password from env `CLAUDE_BRIDGE_PASSWORD` or a file generated once in the bridge folder (Windows `%LOCALAPPDATA%\prompting\claude-bridge`, macOS `~/Library/Application Support/prompting/claude-bridge`, Linux `~/.local/share/prompting/claude-bridge`); prints URL + password on start.
  - CORS allowlist: `https://localhost:5173`, `https://prompting-chat.vercel.app` (handle OPTIONS preflight, `Authorization` + `Content-Type` headers).
  - `GET /health` -> `{ healthy: true, claudeVersion }` (auth required).
  - `GET /models` -> static list: haiku, sonnet, opus, fable with display names.
  - `POST /chat` body `{ model, message, sessionId?, webSearch? }` -> runs `claude -p` with argv array (never a shell string; message passed as an argument or stdin, no injection), cwd = bridge folder, flags: `--output-format json --tools "" --setting-sources "" --strict-mcp-config --system-prompt <chat prompt>`, `--resume sessionId` when given, `--tools WebSearch --allowedTools WebSearch` when webSearch. Returns `{ text, sessionId, model, tokens: { input, output }, costUsd, isError, error? }`. Timeout ~180 s. One request at a time per session is fine.
  - Never enable Bash/Edit/Read or other local tools.
- App provider `claudecode` label "Claude (suscripción)", modeled on `opencodefree`: settings = bridge URL (default `http://127.0.0.1:4098`) + password (field "Contraseña del bridge local", button "Guardar contraseña"), status dot (reuse or generalize `OpenCodeFreeStatus`), not-reachable modal with steps (install Claude Code, log in with the subscription, run `bun run claude:bridge`), one bridge session per app chat (map in localStorage), send only the latest message, tokens and model shown like other providers, context limits from `MODEL_LIMITS.anthropic` mapped from the real model id in `modelUsage`.
  - Web search: supported (globe) and forwarded as `webSearch`.
  - Vision: out of scope v1 (false).
  - Magic wand: works using the bridge with a fresh session (no resume), model `haiku`.
- README section in Spanish, including the terms warning in one neutral sentence.

## Constraints
- bun only, exact versions, no new dependencies, Biome, TypeScript 7 (`bunx tsc -b`).
- Other providers unchanged.

## TDD / checks
- TDD off. Runner `bun test`. Checks: `bun test`, `bunx tsc -b`, Biome on touched files, `bun run build`.
- Live: start the bridge on a test port, call /health, /models, /chat twice with resume, and once with webSearch, using `haiku`.

## Tasks
- [x] T1 Bridge server + unit tests for arg building and response parsing.
- [x] T2 App provider, settings, status, chat flow, magic wand.
- [x] T3 README + live verification.
- [x] T4 All Claude models + user-selectable effort (user request 2026-09-27).
  - Models: every Anthropic model from models.dev (`MODEL_LIMITS.anthropic` ids / new generated data), selectable by full id; keep the 4 aliases out or as "latest" entries only if they add value. Verified: `claude -p --model <full-id>` works for claude-opus-4-8, claude-sonnet-4-6, claude-sonnet-4-5, claude-haiku-4-5. `claude-fable-5-1` returned "requires usage credits" on this subscription: keep it listed, show the error clearly.
  - Effort: `claude -p --effort <low|medium|high|xhigh|max>` accepted on every tested model (haiku high raised thinking tokens). Levels per model from models.dev `reasoning_options` effort values; models with only `budget_tokens` (Haiku 4.5, Sonnet 4.5) get low/medium/high. Plus "Por defecto" (no flag). Selector UI next to the model selector, only for providers that support it (start with `claudecode`, component generic for later providers); choice remembered per model in localStorage; sent to the bridge (`effort` field, validated allowlist) and appended as `--effort`.
  - Note: `modelUsage` also contains a background haiku entry; pick the requested/non-background model when reporting the model name.
- [x] T5 Vision for Claude (suscripción) (user request 2026-09-27). Verified: `claude -p --input-format stream-json --output-format stream-json --verbose --tools "" ...` with a user message `{type:'user', message:{role:'user', content:[{type:'image', source:{type:'base64', media_type, data}}, {type:'text', text}]}}` on stdin answered correctly about a PNG ("Rojo"); result is the line with `"type":"result"`. All Claude models accept images (models.dev).
- [x] T6 Standalone bridge for machines without the repo (user's Mac): single-file bundle runnable with `bun claude-bridge.js` (download one file), documented for Windows and macOS.
- [x] T7 Current date/time and tools with user permission (user request 2026-09-28).
  - Date/time: the model did not know the time. Add the current date and time in America/Argentina/Buenos_Aires (and the ISO UTC time) to the system prompt on every /chat.
  - Tools with permission, verified live 2026-09-28: `claude -p --input-format stream-json --output-format stream-json --verbose --permission-prompt-tool stdio --tools Bash,...` sends on stdout `{"type":"control_request","request_id":"...","request":{"subtype":"can_use_tool","tool_name":"Bash","input":{"command":"...","description":"..."},...}}` and waits; the host answers on stdin `{"type":"control_response","response":{"subtype":"success","request_id":"<same>","response":{"behavior":"allow","updatedInput":<input>}}}` or `{"behavior":"deny","message":"..."}`. Deny: nothing executed. Allow: executed. An initial `{"type":"control_request","request_id":"init-1","request":{"subtype":"initialize"}}` is accepted (answer arrives as control_response). Without `--permission-prompt-tool stdio` the CLI auto-denies (`system/permission_denied`) and the model only asks in text.
  - Policy: tools Bash, WebFetch, WebSearch (never Edit/Write/Read/NotebookEdit). WebSearch and WebFetch are auto-allowed by the bridge (read-only web); Bash always asks the user. Commands run in the bridge data folder.
  - Bridge: all /chat go through stream-json (text-only too) so permissions work; keep `--resume`, `--effort`, images. Pending permissions exposed like OpenCode Free: `GET /permission` (list `{id, sessionId, tool, command, description}`), `POST /permission/:id` `{decision:"allow"|"deny"}`; the /chat HTTP request stays open until the result. Pause the 180 s timeout while a permission is pending (cap total at ~10 min). Log one line per permission decision (tool + first 120 chars of the command; no message text).
  - App: while a claudecode request is in flight, poll `GET /permission` for its session and show the existing permission modal (Rechazar default / Permitir una vez), reusing `src/services/opencodeLocal/permissionModal.ts` or a generalized version. Globe toggle no longer needed to enable WebSearch for claudecode (always available); keep the globe hidden or informational for this provider.

## Progress
- Spike done 2026-09-27 (see Verified facts).
- T1-T3 done (delegated writer): `scripts/claude-bridge/{args,server}.ts` (+ 18 tests), `bun run claude:bridge`; app provider `claudecode` (`src/services/claudeBridge/`, `ClaudeCodeStatus.tsx`, static haiku/sonnet/opus/fable), web search on, vision off, magic wand via bridge with haiku; token limits mapped from the real model id. Live: health 401/200, CORS preflight 204, resume remembered the name, web search returned sources. `bun test` 100 pass, `bunx tsc -b` exit 0, build OK. Bridge left stopped. Uncommitted.
- T4-T6 done: all Claude models (claudeModels.generated.ts) + effort slider between provider and model (lowest level by default, per-model memory); vision through the stream-json stdin path (live: "Rojo"); standalone bundle `scripts/claude-bridge/claude-bridge.js` (`bun run build:bridge`) verified running outside the repo. `@types/bun` 1.4.2 added (parent, user-approved). `bun test` 138 pass, `bunx tsc -b` exit 0, build OK. Uncommitted.
- 2026-09-28: request logging (one line per /chat, no message text or password). macOS hang: `ANTHROPIC_API_KEY` in the user's shell made `claude -p` use another auth and time out (180 s); the bridge now strips ANTHROPIC_API_KEY/AUTH_TOKEN/BASE_URL and Bedrock/Vertex/Foundry vars for the child and reports them at startup. Verified live with a fake key. `bun test` 138 pass.
- T7 done (+ YOLO): every /chat uses the interactive stream path with `--permission-prompt-tool stdio`, tools Bash,WebFetch,WebSearch; WebSearch/WebFetch auto-allowed; Bash asks via GET/POST /permission (app polls and shows the shared modal); YOLO toggle (claudecode/opencodefree, not persisted, confirmation per page load) sends autoApprove. System prompt carries Buenos Aires date/time per request. Note: Claude Code auto-approves some read-only Bash commands (e.g. plain echo) without asking. Live: time 10:40 correct, deny blocked file write, allow executed, WebFetch no prompt, YOLO executed without pending permission. `bun test` 159 pass, `bunx tsc -b` exit 0. Uncommitted.
