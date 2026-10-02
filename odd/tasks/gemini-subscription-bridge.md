# Gemini via Google AI Pro subscription (local Antigravity bridge)

## Objective
Provider "Gemini (suscripción)" (`geminisub`) that chats through the user's Google AI Pro plan using Antigravity CLI (`agy`) on the user's PC, behind a local HTTP bridge, mirroring "Claude (suscripción)" and "OpenAI (suscripción)". Requested and approved 2026-10-02, accepting ~25-45 s per answer. Personal use; same terms caveat as the other subscription bridges.

## Verified facts (2026-10-02, agy 1.2.14, Windows)
- Gemini CLI 0.46 is not usable: settings select `gemini-api-key`; forcing `oauth-personal` via workspace settings fails with `IneligibleTierError: This client is no longer supported for Gemini Code Assist for individuals ... migrate to Antigravity`.
- `agy models` lists the plan's models: gemini-3.8-flash-{high,medium,low}, gemini-3.7-flash-{high,medium,low}, gemini-3.6-flash-{high,medium,low}, gemini-3.1-pro-{high,low}, claude-sonnet-4-6, claude-opus-4-6-thinking, gpt-oss-120b-medium. Effort is part of the model id suffix (also `--effort low|medium|high|max` exists).
- Headless: `agy -p "<prompt>" --output-format json --print-timeout 150s [--model <id>] [--conversation <id>]` -> `{"conversation_id","status":"SUCCESS"|"ERROR","response","error"?,"duration_seconds","num_turns","usage":{"input_tokens","output_tokens","thinking_tokens","cache_read_tokens","total_tokens"}}`. Works with the subscription when `GEMINI_API_KEY` is removed from the child env. `--conversation <id>` resumes (remembered a word across calls).
- Persistent mode: `agy --print '' --input-format stream-json --output-format stream-json --model <id>`; stdin NDJSON `{"event":"user","message":{"role":"user","content":"<text>"}}` (a plain string `message` is rejected); stdout events `init` (conversation_id, model, cwd, tools incl. ask_permission), `step_update`, `result` (same shape as json mode, nested under `result`). Multiple turns per process work.
- Latency (gemini-3.6-flash-low, "reply only: ok"): one process per message 34-42 s; persistent process 44 s first turn, 26 s second turn. `--disable-slash-commands` (skills) does not help. ~21k input tokens per call is the agent's own system prompt; no option found to isolate it from the user's config.
- `usage.input_tokens` in multi-turn: second turn reported 25.9k input + 32.6k cache read (per-turn values, not cumulative like Codex's total; verify).

## Scope
- Bridge `scripts/gemini-bridge/` (bun, manual start), default port 4092, Basic auth user `gemini`, password `GEMINI_BRIDGE_PASSWORD`, same CORS allowlist and request logging as the Codex bridge, standalone bundle `gemini-bridge.js` (`bun run build:gemini-bridge`), `bun run gemini:bridge`.
- One persistent `agy` stream-json process per app chat (keyed by the bridge session id = agy conversation_id), reused while alive; idle processes closed after ~10 min; if the process is gone, start a new one with `--conversation <id>` to resume. Child env without GEMINI_API_KEY / GOOGLE_API_KEY. cwd = bridge data dir.
- GET /health, GET /models (from `agy models`, cached), POST /chat {model, message, sessionId?} -> {text, sessionId, model, tokens:{input,output}, isError, error?}. Timeout generous (5 min).
- System instructions: prefix the first message of a conversation with the chat-assistant rule + Buenos Aires date/time + LINKS_AND_IMAGES_RULE (same as Codex bridge), since agy has no system-prompt flag (verify).
- App provider `geminisub` ("Gemini (suscripción)"): settings URL + password (like codexsub), status dot, models from the bridge (effort encoded in the id: show each id as a model, no effort slider), cost "equivalente API, incluido en tu suscripción" when priceable, magic wand disabled or using a small model, README section + manual start table + PowerShell/zsh function `gemini-server`.
- Out of scope v1: images/PDF input, permission prompts (tools run with agy defaults in print mode; verify whether tools ask), YOLO.

## Tasks
- [x] T1 Bridge (args/helpers + tests, server, bundle, package scripts).
- [x] T2 App provider geminisub (settings, client, fetcher, ChatContainer branch, status dot, provider lists, pricing map).
- [x] T3 Live verification against the real agy + README + install-mac.sh download (live part and docs done; commit pending, not committed by the writer).

## Checks
TDD: not configured (ordinary checks). Runner: `bun test`. Also `bunx tsc -b`, `bun run build`, biome on touched files, live bridge test with the user's subscription.

## Progress and verification (2026-10-02, agy 1.2.14, Windows)
Live run of the bridge on port 4191 (bundle and source), model `gemini-3.6-flash-low` unless noted:
- `/health` -> `{"healthy":true,"agyVersion":"1.2.14"}`; without auth -> 401. `/models` -> the 14 models of `agy models`. Unknown model -> 400 with a Spanish message in 0.0 s.
- New chat: 51-54 s (tokens 29346 in / 2 out). Second turn, same session: 32-39 s, recalled the secret word correctly (`PINGUINO`, `ZORRO`). Third turn: 36 s.
- Resume after a bridge restart (`--conversation <id>`), also switching to `gemini-3.6-flash-medium`: 50 s, recalled the word. The conversation is kept by agy, not by the bridge process.
- Child env without `GEMINI_API_KEY` (the bridge logged the removal at startup); no credential files were read.
- No `agy` child process left running and port 4191 free after the tests.

Findings that changed the design:
- `usage` (and `num_turns`, `duration_seconds`) in the `result` event is cumulative per CONVERSATION, not per turn and not per process (29.3k, 58.8k, 88.3k, then 118k in the first turn of a resumed process). The bridge reports per-turn tokens as the difference with the previous reading kept per conversation; with no previous reading (bridge restarted) it uses cumulative / num_turns. Input tokens reported = `input_tokens + cache_read_tokens`, output = `output_tokens`.
- agy can return `status: "ERROR"` with `error: "API error (attempt 1): UNAVAILABLE (code 503): No capacity..."` and still a valid `response` (transient error that agy retries). The bridge treats a non-SUCCESS status with non-empty text as success. Seen several times in a row on `gemini-3.6-flash-low` during the live test (those runs took 31-60 s).
- `GEMINI_BRIDGE_DEBUG=1` logs the raw `result` (without the response text) per turn.

Known gaps: tools/permissions behavior of agy in print mode was not tested (no permission modal; `ask_permission` events are ignored); images/PDF unsupported; web search not verified (shown as unsupported); a turn that hits the 5 min cap kills the process (conversation stays resumable); the model list in the app is refreshed from the bridge but static seeds exist for the 14 current models.
