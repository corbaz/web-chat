# Model check ("Revisar modelos")

## Objective
One button that refreshes every enabled provider's model list, tests each model with a minimal request using the user's own keys (in the browser), disables the ones the account cannot use (with the reason on hover) and shows a complete per-provider report. Requested and approved by the user 2026-09-30 ("revisá todas las cuentas que tengo habilitadas, refrescá los modelos, poné en disable lo que no se puede y armame listado completo por proveedor").

## Constraints
- Keys never leave the browser; the check runs client-side with the keys already saved.
- Reuse the chat request path (`getProviderConfig(provider)`: `endpoint`, headers, `payloadBuilder`) so the probe hits exactly what chat uses (including the OpenCode Go proxy and per-family routes).
- Minimal cost: one user message "ok", output capped to the minimum each API accepts; a few requests in flight per provider.
- Classification: 2xx = ok; `isQuotaExhaustedMessage` = quota; `isModelUnavailableMessage` or 404 = unavailable; per-minute 429, 5xx, network, invalid key = unknown (never disables).
- Apply results with `markModelUnavailable(provider, id, reason)` / `markModelAvailable`.
- Subscription bridges (claudecode, codexsub): not probed per model (would spend the subscription); report "bridge reachable" + the bridge's model list. OpenCode Free reuses `probeFreeModels`; Gemini reuses `probeGeminiModels`.

## Tasks
- [x] T1 `modelCheck.ts`: `classifyProbeResponse`, `capProbePayload` (pure), `probeApiModel` via ProviderConfig (endpoint, headerAuth, payloadBuilder, `openCodeSessionHeaders`); tests in `modelCheck.test.ts` (11 new). QUOTA pattern extended with "insufficient funds/balance" (Zen); 402 also maps to quota.
- [x] T2 `modelCheckRunner.ts` `runModelCheck(onProgress)`: refresh then probe per enabled provider (providers in parallel; API concurrency 3; Gemini via `probeGeminiModels` in chunks of 3; OpenCode Free via `probeFreeModels`; bridges: `checkServer` only, models reported "subscription"; RouteLLM skipped). Applies marks (ok/quota/unavailable; unknown leaves state). Records the Gemini/OpenCode Free daily throttles (`recordGeminiCheckDone`, `recordFreeModelCheckDone`).
- [x] T3 UI: `ModelCheckModal.tsx` (portal, z-10000, Esc/close, progress, per-provider report, "Volver a revisar") + "Revisar modelos" button in `RightMenu.tsx`.
- [x] T4 README (Qué hace + Cambios recientes) and checks.

## Progress
- 2026-09-30: T1-T4 implemented. `bun test`: 340 pass / 0 fail (baseline 329). `bunx tsc -b`: clean. `bun run build`: OK. `bunx biome check` on touched dirs: clean.

## Not verified
- No browser run and no real keys used: request shapes per provider (OpenCode Go/Zen proxy routes, Zen Gemini/Responses routes, OpenAI with `max_completion_tokens` 16) are built from the chat's own ProviderConfig but were not exercised live; UI not rendered visually.
- In dev (React StrictMode) opening the modal starts the run twice (first result is discarded but its requests still run).
- A 404 from a misconfigured proxy would be classified as "unavailable" for every model of that provider.

## Checks
TDD: not configured (ordinary checks). Runner: `bun test`. Also `bunx tsc -b`, `bun run build`, biome on touched files.

- 2026-09-30 (parent review): `runModelCheck` is single-flight (StrictMode double mount or a second click reuses the running check; progress fan-out to all listeners) so requests are never sent twice; if every probed model of a provider comes back 'unavailable' (e.g. proxy/provider-wide 404) nothing is disabled and the report shows a provider-level note. `bun test` 340 pass, tsc 0, build OK.
