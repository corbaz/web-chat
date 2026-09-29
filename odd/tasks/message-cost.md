# Message cost

## Objective
Show next to each answer's token stats what that message cost (input + output), using each model's price. Prices refresh at most once a day, checked when a model is selected or changed. Requested and approved by the user 2026-09-29.

## Approach
- Source: models.dev (`cost` in USD per 1M tokens: input, output, cache_read, cache_write, optional context tiers). Full api.json is ~5 MB, so a Vercel Function `/api/prices` (and a Vite dev middleware) reduces it to the providers the app uses and caches it 24 h at the CDN.
- Client store: `prices:v1` in localStorage with `fetchedAt`; `ensureFreshPrices()` fetches when older than 24 h (app start, model or provider change); single in-flight request.
- Cost is computed once, when an assistant message with token counts appears, and stored on the message (`cost`), so later price changes do not rewrite history.
- Provider mapping: groq→groq, openai→openai, anthropic→anthropic, gemini→google, opencodezen→opencode, opengo→opencode-go, opencodefree→free, claudecode→anthropic (subscription), codexsub→openai (subscription). routellm: no price.
- Context tiers: if input tokens exceed a tier size, that tier's prices apply. Cache-read discounts are not applied (messages do not store cached token counts), so cached requests may be slightly overestimated.
- Display: `💲 US$x (entrada US$a | salida US$b)`; subscriptions add "equivalente API, incluido en tu suscripción"; OpenCode Free shows "gratis"; unknown price shows nothing.

## Tasks
- [x] T1 `src/services/pricing/pricing.ts` (compact models.dev data, compute cost with tiers) + tests.
- [x] T2 `/api/prices` Vercel Function + Vite dev middleware; client store with 24 h freshness.
- [x] T3 Annotate new assistant messages with cost; refresh prices on model/provider change and app start.
- [x] T4 Show cost in ChatMessage.
- [x] T5 README + checks (`bun test`, `bunx tsc -b`, `bun run build`, biome).

## Checks
TDD: not configured (ordinary checks). Runner: `bun test`.

## Progress
- 2026-09-29: verified models.dev: 256 of 271 models of the app's providers have `cost`; CORS `*`; 5.2 MB.
- 2026-09-29: T1-T5 done. `/api/prices` payload 13.1 KB (groq 10, openai 49, anthropic 16, google 34, opencode 114, opencode-go 33 priced models). Claude subscription uses the bridge's exact `costUsd` (total only; tokens.input excludes cache so a token-based estimate would be near zero). Rendering checked with SSR: api `US$0.00246 (entrada US$0.00171 | salida US$0.000752)` for the user's Qwen example, subscription total with note, free "Gratis". Vite dev `/api/prices` verified. `bun test` 315 pass, `bunx tsc -b` exit 0, api/prices.ts typechecked, `bun run build` OK. Vercel function not verified until deployed; not verified in a real browser. Uncommitted.
