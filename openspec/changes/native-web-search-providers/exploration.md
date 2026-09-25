# Exploration: Native Web Search Providers

**Change:** native-web-search-providers
**Date:** 2026-07-20
**Mode:** Hybrid (OpenSpec + Engram) | Standard (strict_tdd: false — no test runner)
**Binding user decision:** Provider-native web search only. No external search provider, no app-managed fallback. Verified-capable models show a small globe indicator next to their name and a search control near the composer. Unsupported/unknown models show no icon and no control. Prompt wording alone MUST NEVER be treated as browsing.

## Source / Call Ledger

| Source | Calls | Purpose |
|---|---|---|
| CodeGraph `codegraph_explore` | 6 | `providers.ts` + 7 model catalogs + `groqTools.ts` + `ModelSelector`/`RightMenu` + `ChatContainer` + `Footer` + `routellmModels` (read-only, current on-disk source) |
| Engram `mem_context` + `mem_search` x2 + `mem_get_observation` x4 | 7 | Prior context: #816 (native-only decision), #806 (live web-search mapping 2026-07-19), #808 (groq-builtin-tools design), #787 (sdd-init/web-chat) |
| Context7 `resolve-library-id` x4 + `query-docs` x4 | 8 | Official docs 2026-07-20: Groq (`/llmstxt/console_groq_llms-full_txt`), OpenAI (`/websites/developers_openai_api`), Anthropic (`/llmstxt/platform_claude_llms_txt`), Gemini (`/websites/ai.google_dev_gemini-api`) |
| Read (files) | 9 | `openspec/config.yaml`, `openspec/changes/groq-builtin-tools/{proposal,tasks,exploration,verification,design,apply-progress}.md`, `_shared/{sdd-phase-common,openspec-convention}.md`, 3 SKILL.md |
| smart-search / opencli | 0 | Not invoked — Context7 + CodeGraph + Engram covered the research; no live web search needed. Would have followed `opencli list -f yaml` preflight if Context7 lacked provider docs. |
| Secret files / API keys | 0 | No secret-bearing path read, printed, logged, or persisted. |

## Current State

### Provider architecture (the core seam)

`src/config/providers.ts` exports `PROVIDERS: Record<ProviderType, ProviderConfig>` keyed by `groq | routellm | openai | anthropic | opengo | opencodefree | gemini`. `ProviderConfig` interface (post groq-builtin-tools Slice 1):

```ts
interface ProviderConfig {
  name: string
  endpoint: (model: string) => string
  headerAuth: (apiKey: string, model: string) => Record<string, string>
  payloadBuilder: (
    model: string, messages: Message[], maxTokens: number,
    toolsConfig?: ToolConfig,            // <-- Slice 1 added (Groq consumes; 6 ignore)
  ) => Record<string, unknown>
  parseResponse?: (data, model) => string
  parseActualModel?: (data) => string
  parseExecutedTools?: (data, model) => ExecutedTool[]   // <-- Slice 1 added (Groq only)
  warning?: string
}
```

### groq-builtin-tools state (incorporate, do not duplicate)

- **Slice 1 Infrastructure: APPLIED** (tasks 1.1-1.6, 6/18 done). `src/config/groqTools.ts` created with `isToolCapableModel`, `compoundToolPayload`, `gptOssToolPayload`, `defaultToolConfig`, `parseExecutedTools`, `COMPOUND_TOOLS`/`GPT_OSS_TOOLS`, `VERIFIED_GPT_OSS_TOOL_MODELS`, `PROVISIONAL_TOOL_MODELS`, `TOOL_TRUNCATION_LIMIT=500`. `search_settings` removed. `chatTypes.ts` has `ToolFamily`, `BuiltinToolId`, `ToolConfig`, `ExecutedTool`, `executedTools?: ExecutedTool[]`, `TOOLS_STORAGE_KEY="prompting_chat_tools:v1"`. Both `payloadBuilder` call sites (`ChatContainer.tsx`, `Footer.tsx`) pass 4th-arg `undefined` (compatibility placeholder).
- **Slice 2 Control: NOT applied (BLOCKED)** before planning-artifact contradictions. Planned: `groqModels.ts.supportsBuiltinTools?: ToolFamily`; `RightMenu.tsx` 4 compound / 2 GPT-OSS toggles; `App.tsx` lifts `toolConfig`; per-chat `localStorage[TOOLS_STORAGE_KEY][chatId]`; `ChatContainer` passes real `toolsConfig`.
- **Slice 3 Visibility: NOT applied.** Planned: `ToolChips.tsx`; `ChatMessage` renders `executedTools`; `ChatArea` "Ejecutando herramientas..." indicator.
- **Live verification (2026-07-19, 13 probes):** `groq/compound` auto-searches; `groq/compound-mini` payload-accepted (PROVISIONAL); `openai/gpt-oss-120b` + `openai/gpt-oss-safeguard-20b` tool-capable; `enabled_tools:[]` and omitting `compound_custom` do NOT disable auto-tooling (last-off guard required).

### Model selector (two render surfaces for the globe)

- `src/components/HEADER/ModelSelector.tsx` — `react-select` `Select<ModelOption>` with `GroupBase` grouping by `developer`. Options are `{value: model.id, label: model.name}`. `customStyles` covers `option`/`singleValue` via style functions only (NO custom React renderer). Injecting a globe icon requires `components.Option` + `components.SingleValue` (or `formatOptionLabel`) — style-only is insufficient.
- `src/components/HEADER/menu/RightMenu.tsx` — radio list (`<label><input type="radio">` + `model.name` + `model.developer`). Currently filters to groq/routellm/openai/anthropic only (pre-existing inconsistency vs ModelSelector which includes all 7). Globe = add `<svg aria-hidden>` next to `model.name`.

### Composer (search toggle surface)

`src/components/FOOTER/Footer.tsx` — fixed input bar with textarea + buttons (clear, copy, paste, magic wand, send). `nmBtnBase` style is 44x44, `touch-manipulation`. `handleMagicButton` is the second `payloadBuilder` call site (line ~163, passes `undefined`). The search toggle goes in this button row, visible only when `supportsWebSearch(selectedModel)`.

### Persistence (existing keys, all versioned `:v1`)

| Key | Constant | Used? |
|---|---|---|
| `prompting_chat_messages:v1` | `STORAGE_KEY` | Yes — `{ [chatId]: ChatMessageType[] }` |
| `prompting_chat_history:v1` | `CHAT_HISTORY_KEY` | Yes — chat list with `model?` per chat |
| `prompting_chat_tools:v1` | `TOOLS_STORAGE_KEY` | Declared, NOT yet used (Control slice pending) |
| `${provider}ApiKey` | `getApiKeyStorageKey` | Yes — API keys |

## Capability Matrix (evidence-backed, as of 2026-07-20)

| Provider | Current endpoint | Native search mechanism | Status | Request shape (verified/official) | Response citations | CORS (browser) | Optional / Forced |
|---|---|---|---|---|---|---|---|
| **Groq** | `api.groq.com/openai/v1/chat/completions` (Chat Completions, Bearer) | Compound auto-search + `compound_custom.tools.enabled_tools`; GPT-OSS `tools:[{type:"browser_search"}]` | **Verified supported** (live 2026-07-19, 13 probes) | `compound_custom.tools.enabled_tools:["web_search"]` (compound); `tools:[{type:"browser_search"}]` (gpt-oss) | `choices[0].message.executed_tools[].search_results.results[]` (`title`/`url`/`score`/`content`) | Direct browser, Bearer — OK (already working) | Auto (model decides); cannot force OFF (`enabled_tools:[]` = all-on); can subset; cannot force ON |
| **Gemini** | `generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` (`x-goog-api-key`) | `tools:[{google_search:{}}]` on `generateContent` -> `groundingMetadata`; OR new Interactions API (`/v1beta/interactions`) | **Provider-supported, app-unwired** | `tools:[{google_search:{}}]` (generateContent) OR `tools:[{type:"google_search"}]` (Interactions) | `groundingMetadata.groundingChunks[].web.{uri,title}` + `groundingSupports` + `searchEntryPoint` (generateContent); OR `steps[].content[].annotations[].url_citation` (Interactions) | Direct browser, `x-goog-api-key` — OK (already working) | Optional (model decides when to ground); no "force" param |
| **OpenAI** | `api.openai.com/v1/chat/completions` (Chat Completions, proxy required) | `tools:[{type:"web_search"}]` on **Responses API** (`/v1/responses`) — NOT Chat Completions | **Provider-supported, app-unwired** (requires endpoint migration + proxy) | `POST /v1/responses` `tools:[{type:"web_search",filters:{allowed_domains,blocked_domains}}]` `tool_choice:"auto"\|"required"` `include:["web_search_call.action.sources"]` | `output[].annotations[].url_citation` (`url`/`title`/`start_index`/`end_index`) + `web_search_call.action.sources[]` | Requires backend proxy (repo `warning` already states this) | `tool_choice:"auto"` (optional) or `"required"` (forced) |
| **Anthropic** | `api.anthropic.com/v1/messages` (`x-api-key`, `anthropic-dangerous-direct-browser-access:true`) | `tools:[{type:"web_search_20250305",name:"web_search",max_uses:5}]` | **Provider-supported, app-unwired** | `tools:[{type:"web_search_20250305",name:"web_search",max_uses:N}]` | `content[].citations[].{url,title,cited_text}` + `encrypted_content` for `pause_turn` continuation | Direct browser (dangerous header already set) — OK; `pause_turn` needs follow-up loop | Optional (model decides); `max_uses` caps; `stop_reason:"pause_turn"` may require continuation with preserved `encrypted_content` |
| **RouteLLM** | `routellm.abacus.ai/v1/chat/completions` (OpenAI-compatible proxy) | None — Chat Completions; `web_search` is Responses-only; Gemini/Anthropic native tool params not passed through the OpenAI-compatible shape | **Unsupported via this proxy** (strongly likely; unverifiable pass-through) | N/A | N/A | Direct (already used) | N/A |
| **OpenCode Go** | `opencode.ai/zen/go/v1/chat/completions` or `/v1/messages` (proxy) | Unknown — proxy; Anthropic-family `/v1/messages` MIGHT pass `web_search_20250305` through; unverified | **Unknown / unverifiable** (probe or hide) | Unverified | Unverified | Requires proxy in production (localhost auto-proxy via Vite) | Unverified |
| **OpenCode Free** | `opencode.ai/zen/v1/chat/completions` (no auth, `apiKey="free"`) | Unknown — free aggregator; native search pass-through unlikely on free tier | **Unknown / unverifiable** (free tier likely no) | Unverified | Unverified | Requires proxy in production (localhost auto-proxy) | Unverified |

### Capability classification per model ID

- **Verified supported (globe + toggle):** `groq/compound`, `groq/compound-mini` (PROVISIONAL), `openai/gpt-oss-120b`, `openai/gpt-oss-safeguard-20b` (Groq provider); Gemini `gemini-3.5-flash`, `gemini-3.1-flash-lite`, `gemini-2.5-flash`, `gemini-2.5-flash-lite` (generateContent + `google_search`, provider-documented); Anthropic `claude-opus-4-6`, `claude-sonnet-4-6`, `claude-haiku-4-5-*`, `claude-opus-4-5-*`, `claude-sonnet-4-5-*`, `claude-sonnet-4-*`, `claude-opus-4-*` (web_search_20250305, provider-documented for Claude 4.x).
- **Provider-supported but app-unwired (globe + toggle gated on wiring + proxy):** OpenAI `gpt-4.1*`, `gpt-4o*`, `gpt-5*`, `o3`, `o4-mini` (Responses API `web_search` tool; requires proxy + endpoint migration).
- **Unsupported (no globe, no toggle):** All RouteLLM models (proxy strips native tool params); non-tool Groq (`llama-*`, `qwen-*`, `meta-llama/llama-4-scout-*`, `openai/gpt-oss-20b` — not live-verified).
- **Unknown / unverifiable (no globe until probed):** All OpenCode Go models, all OpenCode Free models.

## SDD Relationship: `dependsOn` groq-builtin-tools

**Decision: `native-web-search-providers` dependsOn `groq-builtin-tools`.**

Rationale:
- **Reuses Slice 1 infra (already applied):** `payloadBuilder` 4th param `toolsConfig?`, `parseExecutedTools?` interface hook, `groqTools.ts` (`isToolCapableModel`, `defaultToolConfig`), `TOOLS_STORAGE_KEY` schema.
- **Does NOT supersede:** groq-builtin-tools covers 4 compound + 2 GPT-OSS tools visibility + control (broader than web search alone). Superseding would shrink scope and discard the executed_tools/chip work.
- **Does NOT amend:** the new change does not modify the Groq artifacts' contracts; it builds on top of the infra they introduced and extends the same seam to 6 other providers.
- **Coherence constraint:** the new change's per-chat "search enabled" state MUST extend `TOOLS_STORAGE_KEY[chatId]` (add a `searchEnabled` bit alongside the existing per-tool booleans), NOT introduce a parallel persistence key, to avoid duplicate state. The globe capability metadata is net-new on model catalogs (or a central set).
- **Blocking note:** groq-builtin-tools is blocked before Slice 2 Control. The new change can proceed independently for: (a) the capability matrix + globe indicator (pure metadata, no payload change), and (b) non-Groq providers (Gemini/Anthropic/OpenAI injection). The Groq composer search toggle reuses the Control slice's planned `App.tsx` toolConfig plumbing — either the Control slice lands first, or the new change generalizes that plumbing and feeds back. Orchestrator decision required at spec time.

## UX / State Architecture

### Globe capability indicator
- **Capability source:** a central `src/config/webSearch.ts` exporting `WEB_SEARCH_CAPABLE_MODELS: Set<string>` (verified IDs) + `PROVISIONAL_WEB_SEARCH_MODELS: Set<string>` + `supportsWebSearch(model): boolean`. Mirrors the `VERIFIED_GPT_OSS_TOOL_MODELS` pattern from `groqTools.ts`. Preferred over adding `supportsWebSearch?: boolean` to 7 model interfaces (avoids 7 interface changes; single source of truth).
- **Render surfaces (both must be updated):** `ModelSelector.tsx` via `react-select` `components.Option` + `components.SingleValue` (or `formatOptionLabel`) to inject `<svg aria-hidden="true">` globe when `supportsWebSearch(option.value)`; `RightMenu.tsx` radio list — add globe `<svg>` next to `model.name`.
- **Truthful display:** globe for verified + provider-documented-capable; no globe for unsupported + unknown. PROVISIONAL models show globe with a distinct visual (e.g. muted/dotted) + `aria-label` "Búsqueda web provisional".

### Composer search toggle (`Footer.tsx`)
- New `<button type="button" aria-pressed={searchEnabled} aria-label="Activar búsqueda web">` in the input button row, visible ONLY when `supportsWebSearch(selectedModel)`. Hidden (not disabled) for unsupported/unknown — matches user decision ("no icon/control").
- 44x44 `nmBtnBase`/`nmBtnAccent` style (matches existing buttons); `touch-manipulation` for mobile.
- State: `searchEnabled` per chat, lifted in `App.tsx`, persisted at `localStorage[TOOLS_STORAGE_KEY][chatId].searchEnabled` (extends the groq-builtin-tools key — NO new key).
- **Behavior on model/provider switch:** if the new model lacks capability, the toggle hides and search is not injected on the next request (state preserved but inert in storage); if the user switches back to a capable model, the toggle restores to the persisted value. No silent prompt-based browsing.

### Per-chat persistence schema (extends groq-builtin-tools)
```
localStorage["prompting_chat_tools:v1"] = {
  [chatId]: {
    // groq-builtin-tools per-tool booleans (Control slice, pending):
    web_search?: boolean, code_interpreter?: boolean, visit_website?: boolean,
    wolfram_alpha?: boolean, browser_search?: boolean,
    // native-web-search-providers addition:
    searchEnabled?: boolean,   // drives composer toggle for ALL capable providers
  }
}
```
- **Version/key:** reuse `TOOLS_STORAGE_KEY` (`:v1`). No migration (key currently unused). If groq-builtin-tools Control lands first, the new change adds `searchEnabled` additively.
- **Failure:** localStorage read failure -> default (`searchEnabled: true` for capable models, following `defaultToolConfig` all-on pattern).

### Source / citation rendering (normalized across providers)
- **Normalized type:** `Citation { url: string; title?: string; snippet?: string }[]`.
- **New hook:** `ProviderConfig.parseCitations?: (data, model) => Citation[]` (parallel to `parseExecutedTools?`).
  - Groq: REUSES `parseExecutedTools` output — extract `search_results.results[]` from `executedTools` into `Citation[]` (do NOT re-parse the response).
  - Gemini: `parseCitations` reads `groundingMetadata.groundingChunks[].web` (generateContent) or `steps[].content[].annotations[].url_citation` (Interactions).
  - OpenAI: `parseCitations` reads `output[].annotations[].url_citation` + `web_search_call.action.sources[]`.
  - Anthropic: `parseCitations` reads `content[].citations[]`.
- **Render:** `ChatMessage.tsx` "Fuentes" section — links as escaped text (no `dangerouslySetInnerHTML`, no raw HTML), `target="_blank" rel="noopener noreferrer"`. Overlaps with groq-builtin-tools Visibility slice (`ToolChips`) — for Groq, the "Fuentes" section derives from the same `executedTools`; for others it is net-new.

### Truthful states
- `enabled`: toggle on, globe visible.
- `searching`: request in flight with search enabled -> "Buscando en la web..." in existing `aria-live="polite"` region (extends groq-builtin-tools' "Ejecutando herramientas..." indicator pattern; provider-agnostic).
- `sources`: citations rendered after response (normalized `Citation[]`).
- `provider failure`: existing `getApiErrorMessage`/`isInvalidApiKeyError` path; show "Búsqueda no disponible" if search-specific failure (e.g. Anthropic `pause_turn` not continued, OpenAI proxy down).
- `unsupported/unknown hidden`: no globe, no toggle (not disabled — hidden) for unsupported + unknown models. Prompt wording never treated as browsing.

### Accessibility & mobile
- Toggle: `<button type="button" aria-pressed>` + `aria-label` + `title` + focusable + 44x44.
- Globe: `<svg aria-hidden="true">` decorative; capability conveyed via option/label `aria-label`.
- Mobile: toggle in `Footer.tsx` input bar (already `isMobile()`-aware), `touch-manipulation`, same row as existing buttons.

### Security
- **No secret exposure:** API keys from `localStorage[${provider}ApiKey]`, never logged (existing pattern). No new secret surface.
- **Backend/proxy:** OpenAI requires proxy (repo `warning` already states this); OpenCode Go/Free require proxy in production. Groq/Gemini/Anthropic direct browser OK (Anthropic uses `anthropic-dangerous-direct-browser-access: true`, already set).
- **XSS:** citations rendered as escaped text links; no `dangerouslySetInnerHTML`; no raw HTML injection.

## Affected Areas

- `src/config/webSearch.ts` — **Create.** `WEB_SEARCH_CAPABLE_MODELS`, `PROVISIONAL_WEB_SEARCH_MODELS`, `supportsWebSearch(model)`, `Citation` type.
- `src/config/providers.ts` — **Modify.** Gemini/OpenAI/Anthropic `payloadBuilder` inject native search tool when `toolsConfig?.searchEnabled`; add `parseCitations?` to interface; wire per provider. (Groq reuses Slice 1.)
- `src/components/HEADER/ModelSelector.tsx` — **Modify.** `components.Option`/`components.SingleValue` (or `formatOptionLabel`) to render globe.
- `src/components/HEADER/menu/RightMenu.tsx` — **Modify.** Globe next to `model.name`; extend model filter to all 7 providers (pre-existing inconsistency).
- `src/components/FOOTER/Footer.tsx` — **Modify.** Composer search toggle (visible when `supportsWebSearch`).
- `src/App.tsx` — **Modify.** Lift `searchEnabled` per chat; persist `TOOLS_STORAGE_KEY[chatId].searchEnabled`; plumb to `ChatContainer` + `Footer`.
- `src/components/chat/ChatContainer.tsx` — **Modify.** Pass `searchEnabled` into `payloadBuilder` 4th arg (replaces `undefined` placeholder for capable non-Groq providers; composes with Groq `toolsConfig`).
- `src/components/chat/ChatMessage.tsx` — **Modify.** Normalized "Fuentes" citation section (reuses Groq `executedTools` for Groq; `parseCitations` for others).
- `src/interfaces/chat/chatTypes.ts` — **Modify.** Add `Citation`, `searchEnabled?: boolean` on `ToolConfig` (additive).

## Approaches

### 1. Approach A — Central capability set + composer toggle + per-provider citation parser (smallest truthful)

- New `src/config/webSearch.ts`: central `WEB_SEARCH_CAPABLE_MODELS` set + `supportsWebSearch(model)`. Reuses `isToolCapableModel` from `groqTools.ts` for Groq classification.
- Extend existing `ToolConfig` with `searchEnabled?: boolean` (additive; no 5th param). Gemini/OpenAI/Anthropic `payloadBuilder` read `toolsConfig?.searchEnabled` and inject their native search tool.
- New `ProviderConfig.parseCitations?: (data, model) => Citation[]` for Gemini/OpenAI/Anthropic (Groq reuses `parseExecutedTools`).
- `ModelSelector` + `RightMenu`: globe via custom renderer.
- `Footer`: composer search toggle.
- `App` + `ChatContainer`: lift `searchEnabled` per chat, persist in `TOOLS_STORAGE_KEY[chatId]`, plumb to `payloadBuilder`.
- `ChatMessage`: normalized "Fuentes" section.
- Gemini via `generateContent` + `tools:[{google_search:{}}]` (smaller than Interactions migration).
- OpenAI via Responses API (endpoint migration; gated on proxy).

**Pros:** smallest truthful surface; reuses Slice 1 infra; one composer toggle (matches user decision); normalized citations via parallel hook; globe is pure metadata; `searchEnabled` extends existing `ToolConfig` (no 5th param, no 7-interface change).
**Cons:** OpenAI Responses migration is non-trivial (endpoint + payload + `include` + proxy); Anthropic `pause_turn` loop adds complexity; overlaps with groq-builtin-tools Control on the `searchEnabled`/`web_search` bit (must share state, not duplicate).
**Effort:** Medium-High (OpenAI Responses is the heavy part).

### 2. Approach B — Per-provider capability flag on model interfaces + 5th param + Gemini Interactions API

- Add `supportsWebSearch?: boolean` to all 7 model catalog interfaces; tag each model individually.
- New 5th param `searchConfig?` on `payloadBuilder` (separate from `toolsConfig`).
- Gemini via Interactions API (`/v1beta/interactions`) — migration from `generateContent`.

**Pros:** cleaner separation (search vs tools); Interactions API is Gemini's 2026 recommended path; per-model flag is more granular.
**Cons:** 7 interface changes; 5th param widens the seam (and re-couples all 7 builders); Gemini Interactions migration is larger than `generateContent` + `google_search`; more diff; no UX benefit over A.
**Effort:** High.

## Recommendation

**Approach A**, scoped into reviewable slices <=400 authored lines (chain strategy: feature-branch-chain, already selected; review budget: 400 lines):

| Slice | Scope | Est. lines | Depends on |
|---|---|---|---|
| 1. Capability + Globe | `webSearch.ts` (central set + `supportsWebSearch` + `Citation` type) + `ModelSelector` globe + `RightMenu` globe. No payload changes. | ~150 | groq-builtin-tools Slice 1 (applied) |
| 2. Composer Toggle + Gemini/Anthropic | `Footer` toggle + `App`/`ChatContainer` `searchEnabled` plumbing + `TOOLS_STORAGE_KEY[chatId].searchEnabled` + Gemini `generateContent` + `google_search` injection + `parseCitations` + Anthropic `web_search_20250305` injection + `parseCitations` + `ChatMessage` "Fuentes" (Gemini/Anthropic). | ~350 | Slice 1 |
| 3. OpenAI Responses | OpenAI `payloadBuilder` migration to Responses API (or parallel endpoint) + `web_search` tool + `tool_choice` + `include` + proxy gating + `parseCitations` + `ChatMessage` "Fuentes" (OpenAI). | ~300 | Slice 2 + proxy |
| Deferred | RouteLLM (unsupported via proxy — no globe); OpenCode Go/Free (unknown — no globe until live-probed). | 0 | N/A |

Rationale: Approach A reuses the Slice 1 infra from groq-builtin-tools, keeps the composer UX to a single toggle (matches the binding user decision), normalizes citations via a parallel `parseCitations?` hook, and stages OpenAI (the heaviest migration) last. Gemini uses `generateContent` + `google_search` (smaller than Interactions migration). Approach B's 7-interface change + 5th param + Interactions migration is larger with no UX benefit.

## Risks

- **OpenAI Responses migration** is non-trivial: endpoint (`/v1/chat/completions` -> `/v1/responses`), payload shape (`messages` -> `input`, `max_completion_tokens` -> `max_tokens` semantics differ), `include:["web_search_call.action.sources"]`, and requires the backend proxy the repo already warns about. May need a separate `openaiResponses` provider entry or a conditional endpoint — design decision at spec time.
- **Anthropic `pause_turn`** requires a follow-up request loop with preserved `encrypted_content`. The app currently does single non-streaming `axios.post` requests; this adds a loop and couples to `buildAnthropicPayload`/`parseAnthropicResponse`. Must decide: implement the loop, or treat `pause_turn` as a truthful "search incomplete" state.
- **Gemini `generateContent` + `google_search`** may be deprecated in favor of the Interactions API (Context7 2026-07-20 docs emphasize Interactions). Live verification needed before spec: is `generateContent` + `tools:[{google_search:{}}]` + `groundingMetadata` still current, or must we migrate to Interactions?
- **Overlap with groq-builtin-tools Control slice** on the `searchEnabled`/`web_search` bit. MUST NOT duplicate state: the composer toggle and the RightMenu panel share the same `ToolConfig`/`TOOLS_STORAGE_KEY` entry. Coordinate ordering so the new change does not redefine the Groq `ToolConfig`.
- **RouteLLM/OpenCode Go/OpenCode Free marked "unknown"/"unsupported":** users may expect search on models that have native search via their original APIs (e.g. Grok 4 via xAI, Gemini via Google) but NOT via the proxy. Truthful UX = no globe until live-verified. Probing OpenCode Go/Free pass-through is optional and out of scope unless the user requests it.
- **No test runner:** verification via `bun run typecheck` + `bunx biome lint src` (read-only) + `bun run format:check` + manual smoke per provider (requires API keys for Groq/Gemini/Anthropic; proxy for OpenAI; OpenCode Go/Free cannot be verified without probing).
- **`react-select` globe injection** requires custom `components.Option`/`components.SingleValue` (style-only customization is insufficient to render icons). Moderate react-select expertise needed; must preserve the existing neumorphic `customStyles`.
- **Gemini model ID `gemini-flash-latest`** is labeled "Gemini 1.5 Flash" in the catalog — ambiguous; `google_search` grounding support may differ across Gemini generations. Verify per-ID before tagging.

## Ready for Proposal

**Yes.** The orchestrator should tell the user:

1. **Capability matrix (evidence-backed):** Groq verified (4 IDs); Gemini + Anthropic provider-supported but app-unwired (direct browser OK); OpenAI provider-supported but requires Responses API migration + backend proxy; RouteLLM unsupported via proxy; OpenCode Go/Free unknown/unverifiable (hide until probed).
2. **SDD relationship:** `native-web-search-providers` **dependsOn** `groq-builtin-tools` (reuses Slice 1 infra; does not supersede/amend). Coordinate the `searchEnabled` bit so composer toggle + RightMenu panel share state.
3. **Recommended approach:** A (central capability set + composer toggle + per-provider `parseCitations?`), sliced <=400 lines (Globe -> Gemini/Anthropic -> OpenAI Responses). Defer RouteLLM/OpenCode Go/Free (no globe until live-verified).
4. **Live verification needed before spec:** (a) Gemini `generateContent` + `google_search` vs Interactions API currency; (b) OpenAI model IDs that accept `web_search` on Responses; (c) Anthropic `pause_turn` loop behavior; (d) OpenCode Go/Free native-search pass-through (probe or leave unknown).
