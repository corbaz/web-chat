# Dynamic model catalog

## Objective
Refresh the available model list from each provider's `/models` API on app startup and whenever an API key is added or changed (`apikey-changed` event).

## Problem / Why
Model lists are hardcoded in `src/components/HEADER/models/*.ts`. New or retired provider models require manual edits and redeploys.

## Scope
Providers: OpenCode Zen free, OpenCode Go, Groq, Gemini, OpenAI, Anthropic. OpenCode Zen paid (API key) pending product decision. RouteLLM out of scope (stays static).

## Constraints
- Static catalogs remain as seed + metadata source (name, developer, contextWindow, price, speed) and as offline/failure fallback.
- Known IDs keep static metadata; unknown IDs get a name derived from the ID.
- Cache fetched lists in `localStorage`; never block startup on network.
- Filter non-chat models (embeddings, TTS, image, moderation, etc.).
- Consumers today: App.tsx, ChatMessage.tsx, RightMenu.tsx, ModelSelector.tsx, tokenUtils.ts, webSearch.ts.
- bun only, exact versions, Biome for lint/format, no new dependencies.

## Verified endpoints (2026-09-25, CORS preflight from https://deepchat.surge.sh OK for all)
| Provider | Endpoint | Auth | Shape |
|---|---|---|---|
| Zen free | `https://opencode.ai/zen/v1/models` | none | `{data:[{id}]}`; free = id ends `-free` or `big-pickle` |
| OpenCode Go | `https://opencode.ai/zen/go/v1/models` | none observed | `{data:[{id}]}` |
| Groq | `https://api.groq.com/openai/v1/models` | Bearer | `{data:[{id, owned_by, context_window, active}]}` |
| Gemini | `https://generativelanguage.googleapis.com/v1beta/models` | `x-goog-api-key` | `{models:[{name:"models/..", displayName, inputTokenLimit, supportedGenerationMethods}]}` |
| OpenAI | `https://api.openai.com/v1/models` | Bearer | `{data:[{id, owned_by}]}` |
| Anthropic | `https://api.anthropic.com/v1/models` | `x-api-key` + `anthropic-version` + `anthropic-dangerous-direct-browser-access` | `{data:[{id, display_name}]}` |

## TDD / checks
- TDD mode: off (no project configuration). Source: none configured; user asked to test each provider.
- Runner: `bun test` (built-in, no dependency) for pure parse/merge/filter units with fixture payloads.
- Per task: `bun test`, `bun run typecheck`, `bunx biome check src`, `bun run build`; live smoke with curl for keyless endpoints. Keyed providers need a manual browser check with the user's keys.

## Tasks
- [x] T1 Catalog core + OpenCode Zen free: central store (cache, merge, refresh on init and `apikey-changed`, `models-updated` event, React hook), migrate the six consumers, unit tests, live smoke.
- [x] T2 OpenCode Go.
- [x] T3 Groq.
- [x] T4 Gemini (filter `generateContent`, strip `models/` prefix).
- [x] T5 OpenAI (filter chat models).
- [x] T6 Anthropic.
- [x] T7 OpenCode Zen paid provider with API key (user approved 2026-09-25): new provider `opencodezen` with key field, dynamic list from `/zen/v1/models`, per-family chat routing; also fix Zen free list to exclude models whose route is not `/chat/completions`.
- [x] T8 Remove keyless `opencodefree` provider and include free models in `opencodezen` (user approved 2026-09-25). Reason: keyless Zen free tier now returns `FreeTierError: OpenCode's free tier can only be used from within OpenCode` (reproduced with curl); `deepseek-v4-flash-free` also returns `Model is unavailable` upstream. Whether free models work with a Zen key is unverified (needs user key).
- [x] T9 Groq cleanup (user approved 2026-09-25): static `groqModels.ts` keeps only models available today (gpt-oss-120b, gpt-oss-20b, gpt-oss-safeguard-20b, qwen/qwen3.8-27b with docs metadata); removed compound tool family (`isToolCapableModel`, `compoundToolPayload`, `PROVISIONAL_TOOL_MODELS`, `ToolFamily`), compound special cases in ChatArea/Footer; Footer fallback model -> `openai/gpt-oss-120b`. GPT-OSS built-in tools kept.
- [x] T10 OpenCode Go usable from the app (2026-09-25): Go returns HTTP 400 "Request is missing x-opencode-session" (user report). Added `openCodeSessionHeaders` (stable per chat: `currentChatId`) for `opengo`/`opencodezen` in ChatContainer and Footer magic button. Go routing now from docs table via `goRouteFor` (gpt/grok/muse -> `/zen/go/v1/responses`, minimax/qwen incl. qwen3.8-max -> `/messages`, rest -> `/chat/completions`), replacing hardcoded `OPENCODE_GO_ANTHROPIC_MODELS`.
- [x] T11 Web search fix (2026-09-25): Go rejected `tools[0].type: web_search` (HTTP 400, user report with glm-5.2). `supportsWebSearch` now returns false for `opengo`/`opencodezen`; ChatContainer only enables search tools when `supportsWebSearch(model, provider)` is true. `bun test` 40 pass, `bunx tsc -b` exit 0, build OK.
- [x] T12 OpenCode on the published web (user chose Vercel, project `prompting`, 2026-09-25): `vercel.json` rewrites `/opencode-go-api/:path*` to `https://opencode.ai/:path*`; Vercel env `VITE_OPENCODE_PROXY_URL=/opencode-go-api`; `.vercelignore` excludes local tooling and env files. Background: CORS preflight (OPTIONS) to `opencode.ai/zen/v1/*` and `/zen/go/v1/*` returns 404 without CORS headers (verified 2026-09-25), so browsers cannot call OpenCode directly; Surge and GitHub Pages are static and cannot proxy. Needs a hosted proxy.
- [x] T13 Hide models the provider rejects (user approved 2026-09-25; e.g. Groq `allam-2-7b` "blocked at the project level", not selectable in the Groq console; retired Llama models): `unavailableModels.ts` (`isModelUnavailableMessage`, persisted `modelCatalog:v1:unavailable:<provider>`), store `markModelUnavailable` / `clearUnavailableModels` (cleared on `apikey-changed`), stable `visible` lists for `useSyncExternalStore`; ChatContainer marks the model and appends a note; App switches to the first available model when the selected one disappears. `bun test` 45 pass, `bunx tsc -b` exit 0, build OK. Uncommitted.

## Acceptance criteria
- On startup, cached lists render immediately, then refresh in the background.
- After saving a provider key, that provider's list refreshes without reload.
- Network/auth failure falls back to cache, then to static catalog, with no UI error spam.
- Known models keep existing metadata; token stats keep working.

## Progress
- Exploration and endpoint verification done.
- T1 done: `src/services/modelCatalog/` (types, naming, mergeWithStatic, cache, registry, store, useModelCatalog, fetchers/zenFreeFetcher); six consumers migrated; `tsconfig.app.json` excludes `*.test.ts`.
  - `bun test`: 19 pass, 0 fail.
  - Live smoke Zen free: 11 free ids (static catalog was stale, e.g. `north-mini-code-free` gone).
  - `bunx tsc -b` / `bun run build`: FAIL on 4 pre-existing TS7006 implicit-any errors in react-select callbacks (ModelSelector.tsx 196,210,232; ProviderSelector.tsx 155, untouched by T1). Not caused by T1.
  - Manual browser check pending (user).
- Pre-existing build fix: explicit react-select callback types (`SingleValue`, `OptionProps`, `SingleValueProps`) in ModelSelector/ProviderSelector. `bunx tsc -b` exit 0; `bun run build` OK.
- T2 done: shared `fetchers/http.ts` (`fetchJson` with timeout, `parseDataIds`); `fetchers/openCodeGoFetcher.ts`; registry entries now declare `requiresKey` and receive the stored key (`${provider}ApiKey`); store skips keyed providers without a key.
  - `bun test`: 21 pass, 0 fail. `bunx tsc -b`: exit 0. Biome: clean. Build: OK.
  - Live smoke Go: HTTP 200, 42 ids.
  - Risk noted: chat routing uses the hardcoded `OPENCODE_GO_ANTHROPIC_MODELS` set in `src/config/providers.ts`; new Go models not in that set go to `/chat/completions`.
  - Manual browser check pending (user).
- T3 done: `fetchers/groqFetcher.ts` (drops `active: false`, whisper/TTS/orpheus/playai/prompt-guard/llama-guard; keeps `gpt-oss-safeguard`), registry entry `requiresKey: true`.
  - `bun test`: 24 pass, 0 fail. `bunx tsc -b`: exit 0. Biome: clean. Build: OK.
  - Live: endpoint returns 401 without key (auth confirmed required); keyed live check pending (user, browser).
  - Follow-up idea: Groq returns `context_window`/`max_completion_tokens`; unknown models could be enriched from it (currently ids only).
- T4 done: `fetchers/geminiFetcher.ts` (`?pageSize=1000`, strips `models/`, requires `generateContent`, keeps only `gemini-*flash*` per prior decision to avoid Pro quota errors; excludes image/tts/live/audio/embedding, `-NNN` snapshots, 1.x and 2.0). Registry entry `requiresKey: true`.
  - `bun test`: 27 pass, 0 fail. `bunx tsc -b`: exit 0. Biome: clean. Build: OK.
  - Live: 403 without key (auth required); keyed live check pending (user, browser).
- Side fix (user request): `ChatMessage.tsx:207` `max-w-[120px]` -> `max-w-30`.
- T5 done: `fetchers/openaiFetcher.ts` keeps `gpt-*`, `chatgpt-*`, `o<digit>*`; drops embedding/tts/whisper/transcribe/dall-e/image/audio/realtime/moderation/search/computer-use/deep-research/instruct/gpt-3.5 and dated snapshots (`-YYYY-MM-DD`, so static `gpt-4o-2024-05-13` disappears once refreshed). Registry entry `requiresKey: true`.
  - `bun test`: 30 pass, 0 fail. `bunx tsc -b`: exit 0. Biome: clean. Build: OK.
  - Live: 401 without key; keyed live check pending (user, browser).
  - Note: new OpenAI models lack static `maxTokens`, so token stats use the generic fallback. The `warning` in `providers.ts` about OpenAI CORS is outdated (preflight allows `*`).
- T6 done: `fetchers/anthropicFetcher.ts` (`?limit=1000`, headers `x-api-key`, `anthropic-version: 2023-06-01`, `anthropic-dangerous-direct-browser-access`; keeps `type: model`, dated ids kept). Registry entry `requiresKey: true`.
  - `bun test`: 32 pass, 0 fail. `bunx tsc -b`: exit 0 (after fixing an unused param). Biome: clean. Build: OK.
  - Live: 401 without key; keyed live check pending (user, browser).

## T7 findings (https://opencode.ai/docs/zen/, 2026-09-25)
Zen chat endpoint depends on model family:
- `/zen/v1/responses`: `gpt-*`, `grok-*`, `muse-*` (including `muse-spark-1.3-contributor-free`).
- `/zen/v1/messages`: `claude-*`, `qwen*` except `qwen3.8-max`.
- `/zen/v1/models/<id>` (Google generateContent): `gemini-*`.
- `/zen/v1/chat/completions`: everything else (deepseek, minimax, glm, kimi, big-pickle, other free models, `qwen3.8-max`).
- `/zen/v1/systemone`: `jev-*` (classification API, not chat) -> exclude.
Impact on T1: `jev-1.13-free` and `muse-spark-1.3-contributor-free` are listed as free but break on `/chat/completions`.

- T7 done: `zenRoute.ts` (`zenRouteFor`), `fetchers/zenFetcher.ts` (paid: route != null and not free), seed `opencodeZenModels.ts`; new provider `opencodezen` in `providers.ts` routing per family (messages/responses/gemini/chat), reusing Anthropic, Responses (extracted `buildResponsesPayload`, `openai` unchanged), Gemini native and OpenAI chat builders/parsers; key `opencodezenApiKey` in ApiKeyModal (validated via `/zen/v1/models`) and ApiKeyInput; gated by `isOpenCodeAvailable()`. Zen free now also requires route `chat`. Web search not enabled for `opencodezen` (unverified).
  - `bun test`: 42 pass, 0 fail. `bunx tsc -b`: exit 0. Biome: touched files clean (13 pre-existing warnings in untouched lines of `providers.ts`). Build: OK.
  - Live: free list 8 ids (jev/muse contributor excluded); paid list 69 ids.
  - Keyed chat calls pending (user, browser).
- T8 done: removed `opencodefree` (provider, config, static catalog, `zenFreeFetcher`, keyless special cases in ChatContainer/Footer); `zenFetcher` keeps every id with a non-null route (free ones included, `jev-*` excluded); seed adds `big-pickle`; fallback provider = stored provider with key, else first provider with key, else `groq`; one-time removal of `modelCatalog:v1:opencodefree`.
  - `bun test`: 37 pass, 0 fail. `bunx tsc -b`: exit 0. Build: OK. Live Zen parser: 79 ids incl. `big-pickle` and 8 `*-free`, `jev-*` excluded.
  - Free models with a Zen key: unverified (user, browser).
- Groq docs reviewed (models + deprecations, 2026-09-25): production = gpt-oss-120b, gpt-oss-20b, (llama-3.1-8b-instant, llama-3.3-70b-versatile now Enterprise only, shutdown 08/16/26 for developer plan); preview = qwen/qwen3.8-27b, openai/gpt-oss-safeguard-20b, minimaxai/minimax-m2.7 (Enterprise). Shut down: groq/compound and groq/compound-mini (09/21/26), qwen/qwen3.6-27b (09/14/26), qwen/qwen3-32b and llama-4-scout (07/17/26). Static `groqModels.ts` still lists these, and `groqTools.ts` depends on compound.
- T9: `bun test` 37 pass, 0 fail; `bunx tsc -b` exit 0; build OK. `BuiltinToolId`/`ToolConfig` keys `visit_website`/`wolfram_alpha` left in place (now unused by any model).
- T10: `bun test` 40 pass, 0 fail; `bunx tsc -b` exit 0; build OK. Live keyed check pending (user). Production proxy must forward/allow `x-opencode-session`.

## Next step
Verify https://prompting-chat.vercel.app with OpenCode Go and Zen keys (prompting.vercel.app belongs to another account).
