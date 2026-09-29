# OpenAI via ChatGPT subscription (local Codex bridge)

## Objective
Provider "OpenAI (suscripción)" (`codexsub`) that chats through the user's ChatGPT subscription using the official Codex CLI on the user's PC, behind a local HTTP bridge, mirroring "Claude (suscripción)". Requested 2026-09-28 ("OpenAI con mi suscripción, no por API key"). Personal use; same terms caveat as the Claude bridge.

## Verified facts (2026-09-28, codex-cli 0.158.0, "Logged in using ChatGPT")
- `codex exec --json --skip-git-repo-check --sandbox read-only -c model_reasoning_effort=low "<prompt>"` answers; JSONL events: `thread.started {thread_id}`, `turn.started`, `item.completed {item:{type:'agent_message', text}}`, `turn.completed {usage:{input_tokens, cached_input_tokens, output_tokens, reasoning_output_tokens}}`. ~17 s and ~37k input tokens (Codex agent context).
- `codex exec resume <SESSION_ID> [PROMPT]` continues a session.
- `codex app-server` (experimental, JSON-RPC over stdio) is the richer path. Protocol schema generated with `codex app-server generate-json-schema --out <dir>`. Client methods include `initialize`, `thread/start`, `thread/resume`, `turn/start`, `turn/interrupt`, `model/list`, `account/read`, `account/rateLimits/read`. Server->client requests include `item/commandExecution/requestApproval`, `item/fileChange/requestApproval`, `item/permissions/requestApproval`, `execCommandApproval`, `applyPatchApproval`. Command approval decisions: `accept`, `acceptForSession`, `decline`/`cancel` (check schema).

## Scope
- Bridge `scripts/codex-bridge/` (bun, manual start, no autostart), port 4100, Basic auth user `codex`, same CORS allowlist, request logging, standalone bundle `codex-bridge.js` (`bun run build:codex-bridge`), started with `bun run codex:bridge` or `CODEX_BRIDGE_PASSWORD='...' bun codex-bridge.js`.
- Use `codex app-server` over stdio: one long-lived process (or one per chat) with JSON-RPC; `model/list` for models; `thread/start` / `thread/resume` per app chat; `turn/start` with text, images and reasoning effort; stream until the turn completes; collect assistant text and usage.
- Approvals: command execution and file changes ask the user through `GET /permission` + `POST /permission/:id` (same contract and UI as the Claude bridge), YOLO auto-accepts; sandbox `read-only` by default, `workspace-write` only in YOLO. Current date/time Buenos Aires in the instructions. Strip `OPENAI_API_KEY` / `OPENAI_BASE_URL` from the child env so the ChatGPT login is used.
- App provider `codexsub` ("OpenAI (suscripción)"): settings URL + password, status dot, models from the bridge, effort slider, vision if the model supports it, web search if Codex exposes it (verify), magic wand with a small model, tokens and context limits.

## Tasks
- [x] T1 Spike app-server handshake (initialize, model/list, thread/start, turn/start, approval request) and document exact messages.
- [x] T2 Bridge + tests + bundle.
- [x] T3 App provider + README.

## Progress
- 2026-09-28: CLI verified (exec, resume, app-server schema). Waiting for T17 (effort for all providers) to finish before implementation, because both touch the same app files.
- 2026-09-29: T1-T3 done (delegated; resumed after a rate-limit cut). Default port 4094 (user request; old 4100 migrated). One persistent `codex app-server`; `model/list` gives supportedReasoningEfforts and inputModalities; images via `localImage` temp files; no PDF input in the protocol (PDF falls back to text); approvals accept/decline through GET/POST /permission; YOLO = workspace-write + never. Known: command execution fails on the user's Windows (Codex sandbox helper `helper_unknown_error`), approval routing itself works; web search not verified live. `bun test` 261 pass, `bunx tsc -b` exit 0, builds OK. Uncommitted.
