# OpenCode Free via local OpenCode server

## Objective
Offer OpenCode Zen free models (`-free` ids, `big-pickle`) in the web app through a local `opencode serve` process that starts automatically with Windows. A desktop app (Tauri) that starts the server on demand is a later, separate feature.

## Problem / Why
OpenCode serves its free models only to requests that look like a coding agent with tools declared. Direct API calls (keyless or with a Zen key), `opencode run` with tools disabled and `permission: deny` all return `FreeTierError`. Verified 2026-09-26 with OpenCode 1.18.32: `opencode serve` with `permission` set to `ask` for `bash`, `edit`, `webfetch` and `external_directory` answers with free models, and a requested tool call is NOT executed: it waits in `GET /permission` until answered with `POST /session/:id/permissions/:permissionID {"response":"reject"}`.

## Scope
- Scripts (bun, Windows):
  - `bun run opencode:free`: start the server in the foreground (for manual use/debug).
  - `bun run opencode:free:install`: put a hidden launcher (`.vbs`) in the user's Windows Startup folder (no admin rights; `schtasks /SC ONLOGON` was denied), and start the server now.
  - `bun run opencode:free:uninstall`: remove the task and stop the server.
  - Server runs in a dedicated empty folder under `%LOCALAPPDATA%\prompting\opencode-free` containing an `opencode.json` with `ask` permissions; binds `127.0.0.1:4096`; Basic auth password generated once and stored in that folder; `--cors https://localhost:5173 --cors https://prompting-chat.vercel.app`. The install script prints the password for the user to paste in the app.
- App provider `opencodefree` ("OpenCode Free"):
  - Settings: server URL (default `http://127.0.0.1:4096`) and password (stored like other keys).
  - Status: health check `GET /global/health` with Basic auth; UI shows connected / not reachable. When not reachable on selection, a modal explains: start the server (`bun run opencode:free:install`) or install OpenCode (https://opencode.ai).
  - Models: `GET /config/providers`, provider `opencode`, ids ending `-free` or `big-pickle`, excluding `jev-*`.
  - Chat: one OpenCode session per app chat (`POST /session`, id remembered), `POST /session/:id/message` with `{ model: { providerID: 'opencode', modelID }, parts: [{ type: 'text', text }] }`; answer = text parts; tokens from `info.tokens`.
  - Permissions: while waiting, poll `GET /permission` for the session; show "El modelo quiere ejecutar: …" with Rechazar (default) / Permitir; reply via API.
  - No images and no web search for this provider in v1.
- Out of scope: Tauri desktop app; macOS/Linux autostart.

## Constraints
- A web page cannot start local processes; autostart is the transparent path for the web.
- Browsers may apply Private Network Access rules to `https://prompting-chat.vercel.app` -> `http://127.0.0.1`; verify in the browser, localhost dev is the primary target.
- bun only, exact versions, no new dependencies, Biome.

## TDD / checks
- TDD mode: off (no project configuration). Runner: `bun test`.
- Checks: `bun test`, `bunx tsc -b`, `bunx biome check` on touched files, `bun run build`.
- Live: start the server with the script and exercise health, models, a chat message with a free model and a rejected permission through the app's client module (bun script).

## Tasks
- [x] T1 Server scripts (start, install/uninstall Startup-folder launcher, sandbox config, password).
- [x] T2 Client module for the local server (health, models, session/message, permissions) + tests.
- [x] T3 Provider `opencodefree` in the app: settings (URL + password), catalog, chat flow, permission modal, status and not-reachable modal.
- [x] T4 README section + live verification.

## Acceptance criteria
- After `bun run opencode:free:install`, selecting OpenCode Free shows the free models and a free model answers.
- With the server stopped, selecting OpenCode Free shows the not-reachable modal with steps.
- A tool call requested by the model is never executed without the user's explicit Permitir.
- Other providers unchanged.

## Progress
- Spike done (2026-09-26), see Problem.
- T1-T4 done (delegated writer + parent fix): scripts `scripts/opencode-free/` (start, install, uninstall, sandbox `opencode.json` with ask permissions, one-time password); client `src/services/opencodeLocal/` (+ tests); provider `opencodefree` with URL + password settings, status dot `OpenCodeFreeStatus.tsx`, not-reachable modal, permission modal (Rechazar default), magic button disabled for this provider; README section.
  - Parent fix: `schtasks /SC ONLOGON` returned "Acceso denegado" (needs admin), so install now copies the hidden `.vbs` launcher to the user's Startup folder; uninstall removes it (and a legacy task if present).
  - Writer fixes found live: `/global/health` requires Basic auth (health checks updated).
  - `bun test` 73 pass, 0 fail; `bunx tsc -b` exit 0; build OK.
  - Live (parent, installed server): health true; 8 free models; `ling-3.0-flash-fin-free` answered "Listo". Writer verified a bash permission request is rejected and nothing is executed.
  - Note: each message carries ~38k input tokens of OpenCode agent context (global agent config and tools), so answers are slower than direct providers.
  - State: launcher installed in Startup folder and server running on 127.0.0.1:4096 (for the user's local test). Uncommitted.
- Follow-ups from the user's local test (2026-09-26): settings field and messages say "Contraseña del servidor local" / "Guardar contraseña"; length check skipped for this provider; `checkServer` distinguishes wrong password (401) from unreachable server (network/CORS) and the error shows the current origin; `bun run opencode:free:password` copies the password, `bun run opencode:free:password <nueva>` sets a custom one and restarts the server (shared `scripts/opencode-free/launcher.ts`). Verified live: custom password accepted, old one rejected, original restored. `bun test` 76 pass, `bunx tsc -b` exit 0.

## Next step
Committed and pushed 2026-09-26 after the user's local test. Future: Tauri desktop app that starts the server on demand.
