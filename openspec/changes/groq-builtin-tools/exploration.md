## Exploration: Groq Built-In Tools (Nivel 1) — web_search, code_interpreter, visit_website, wolfram_alpha

### Current State

The web-chat app is **already closer to Nivel 1 than the SDD-init notes assumed**. Verified facts from reading the code AND Groq's current API docs (console.groq.com/docs):

1. **Compound models are already listed and selectable.** `groq/compound` and `groq/compound-mini` exist in `src/components/HEADER/models/groqModels.ts:96-114` (developer "Groq", `maxCompletionTokens: "8192"`, `precio: "0.00"`). Users can pick them in `RightMenu` today.

2. **Groq built-in tools are automatic by model selection — NO `tools` param needed.** Per Groq docs: *"The only change needed: Specify the compound model!"* The compound models internally decide when to call `web_search`, `code_execution`/`code_interpreter`, `visit_website`, `wolfram_alpha`. So the **capability already works today** for any user who selects `groq/compound`.

3. **`search_settings` is already being sent — but it is mis-configured AND mis-scoped.** In `src/config/providers.ts:191-205`, the Groq `payloadBuilder` unconditionally returns:
   ```ts
   search_settings: { include_domains: ["*.*"], exclude_domains: [] }
   ```
   Two problems, both confirmed against Groq docs:
   - **Scope bug**: docs state `search_settings` is `supported_models: ['compound-beta', 'compound-beta-mini']` only. The app sends it on EVERY Groq request — including `llama-3.3-70b-versatile`, `openai/gpt-oss-120b`, etc. Non-compound models likely ignore it, but this is undocumented behavior and a smell.
   - **Value bug**: `include_domains` expects concrete domains (e.g. `["example.com"]`), NOT globs. `["*.*"]` would restrict searches to the literal nonexistent domain `*.*`. The correct "search the whole web" is to **omit `include_domains`** (or set `[]`). The current value is likely silently breaking web search for compound models. This is a real bug, not a theoretical one.

4. **`executed_tools` is completely ignored.** Groq returns tool-execution metadata at `choices[0].message.executed_tools` — an array of `{ index, type, arguments, output?, search_results?, code_results? }`. The response parser at `src/components/chat/ChatContainer.tsx:525-530` reads ONLY `choices[0].message.content` (via the default OpenAI-shape fallback, since Groq has no custom `parseResponse`). Users get the final synthesized answer but ZERO visibility into which tools ran, what queries were searched, what code was executed, or what sources were cited.

5. **No streaming.** Single `axios.post` (`ChatContainer.tsx:499`), no `stream: true` in any Groq payload. Response is one JSON blob. This means `executed_tools` arrives in the final response (not as delta chunks), simplifying Nivel 1 parsing.

6. **`payloadBuilder` has exactly ONE caller.** `ChatContainer.tsx:476-480` is the only call site. The SDD-init note about a "9-caller blast radius" refers to the `ChatMessageType` *type* (9 callers), NOT `payloadBuilder` (1 caller). Changing the `payloadBuilder` interface signature is therefore low-risk for the call site, but still touches 7 provider implementations.

### Affected Areas

- `src/config/providers.ts:191-205` — Groq `payloadBuilder`: fix `search_settings` value bug + gate to compound models only. (Approach B would also change the interface signature at `:20-24`.)
- `src/components/chat/ChatContainer.tsx:525-574` — response parsing: read `choices[0].message.executed_tools` and attach to the assistant `ChatMessageType`. (Approach B would also change the call site at `:476-480`.)
- `src/interfaces/chat/chatTypes.ts:1-13` — `ChatMessageType`: add optional `executedTools?` field (9 callers, but additive — no breakage).
- `src/components/chat/ChatMessage.tsx` — render `executed_tools` as a collapsible "tool calls" section (web_search queries+sources, code_execution code+output, etc.).
- `src/components/HEADER/models/groqModels.ts` — (optional) add `supportsBuiltinTools?: boolean` flag to `GroqModel` interface to gate UI/model-aware logic.
- `src/components/HEADER/menu/RightMenu.tsx` — (Approach B only) new UI section for tool toggles + `search_settings` config (country, include/exclude domains, include_images).
- `src/App.tsx` + `src/components/chat/ChatContainer.tsx` — (Approach B only) state plumbing for tool config from UI to `payloadBuilder`.

### Approaches

#### 1. Approach A — Minimal Visibility + Bug Fix (NO `payloadBuilder` signature change)

- Fix `search_settings`: remove the broken `include_domains: ["*.*"]`, gate `search_settings` so it is only sent when `model` is `groq/compound` or `groq/compound-mini`.
- Extend response parsing in `ChatContainer` to read `choices[0].message.executed_tools` (Groq returns this on compound-model responses).
- Add `executedTools?: ExecutedTool[]` to `ChatMessageType` (additive, non-breaking).
- Render `executed_tools` in `ChatMessage` as a collapsible section — handle `web_search` (queries + `search_results.results[]` with title/url/score), `code_execution`/`code_interpreter` (code + `code_results[]`), and a generic fallback for `visit_website` / `wolfram_alpha` (type + arguments + output).
- Compound models keep auto-deciding which tools to call.

- **Pros**: Smallest possible blast radius (4 files, no interface signature change, 1 caller unchanged, 9 `ChatMessageType` callers unaffected since field is optional). Fixes two real bugs. Delivers the actual Nivel 1 value (visibility + correct search). Matches the "Nivel 1" framing.
- **Cons**: No per-request tool control; no UI to tune `search_settings` (country, domain restrict, images); relies on the compound model's auto-decision for which tools to invoke.
- **Effort**: Low–Medium.

#### 2. Approach B — Full Tool Control (extend `payloadBuilder` signature)

- Add optional 4th param `toolsConfig?: ToolsConfig` to `ProviderConfig.payloadBuilder` interface (`providers.ts:20-24`).
- Update all 7 provider implementations: 6 ignore the new arg, Groq uses it.
- Add a `ToolsConfig` type: `{ enabledTools: Array<'web_search'|'code_interpreter'|'visit_website'|'wolfram_alpha'>, searchSettings?: { country?, includeDomains?, excludeDomains?, includeImages? } }`.
- Build UI in `RightMenu` (only shown when selected model supports built-in tools) to toggle each tool and configure `search_settings`.
- Plumb state: `App` → `ChatContainer` → `payloadBuilder` call site (`:476`).
- Plus everything in Approach A (bug fix + `executed_tools` display).

- **Pros**: Full user control over which tools run; configurable `search_settings`; future-proof for non-compound Groq models that may gain tool support; enables domain-restricted search (useful for research workflows).
- **Cons**: Large blast radius — interface + 7 implementations + 1 caller + state plumbing across 3–4 components + new UI section + new types. Higher regression risk. Significantly more design + implementation work.
- **Effort**: High.

### Recommendation

**Approach A for Nivel 1.** The topic is explicitly labeled "Nivel 1" (level 1), signaling a minimal first step. The key insight from exploration is that the **capability already exists** — compound models already auto-use all four built-in tools. What is missing is (a) **visibility** (`executed_tools` is discarded) and (b) **correctness** (`search_settings` is both mis-scoped and mis-valued). Approach A fixes both with minimal risk and no interface churn.

Approach B is the natural **"Nivel 2"** follow-up if/when the user wants explicit per-request tool control and `search_settings` tuning UI. It should be a separate change, not bundled into Nivel 1.

One caveat to surface in the proposal: the user's task framing ("adding web_search, code_interpreter, visit_website, and wolfram_alpha capabilities") implies *adding* capability, but exploration shows the capability is already present via compound models. The proposal should reframe Nivel 1 as **"surfacing + fixing"** the existing capability, not adding it from scratch — otherwise the user may expect new tool-invocation code that is not needed.

### Risks

- **`search_settings: { include_domains: ["*.*"] }` is likely actively broken** for compound models — `["*.*"]` is not a valid "all domains" wildcard in Groq's API (it expects concrete domains). Must verify against the live API, but high likelihood this is silently returning zero search results or being ignored. Fixing this may itself change compound-model behavior noticeably.
- **`search_settings` sent to non-compound Groq models** — docs only document behavior for compound models. Non-compound models likely ignore it, but this is unverified and could in principle cause errors on some models.
- **Model ID drift**: app uses `groq/compound` and `groq/compound-mini`; Groq docs currently show `compound-beta` and `compound-beta-mini`. The app's IDs may be correct for the current API (Groq has renamed models over time), but this must be confirmed with a live smoke test. If wrong, compound models are already silently 404-ing and the user wouldn't know.
- **`executed_tools` shape varies by `type`** (`search_results` for web_search, `code_results` for code_execution, generic `output` for others). The renderer must handle all variants generically and degrade gracefully on unknown types.
- **No test runner** — verification relies on `bun run typecheck` + `bun run lint` + a manual live smoke test against the Groq API with a compound model. Recommend the smoke test query something time-sensitive ("What is today's news on X?") to confirm web_search actually fires and returns results after the `search_settings` fix.
- **`GroqMessageType` is a thin type** (only `role` + `content`) used in `prepareMessagesForApi` — it does NOT support multimodal/tool messages. If Approach B later needs to send tool results back in a follow-up turn, this type and `prepareMessagesForApi` will need extension. Not needed for Nivel 1 (compound models handle tool loops server-side).

### Ready for Proposal

**Yes.** The orchestrator should tell the user:

1. **Reframe**: Nivel 1 is not "adding" tool capability — compound models already auto-use `web_search` / `code_interpreter` / `visit_website` / `wolfram_alpha`. Nivel 1 is **surfacing** what already happens (display `executed_tools`) + **fixing** a real `search_settings` bug.
2. **Two bugs found** that should be fixed as part of Nivel 1: (a) `search_settings.include_domains: ["*.*"]` is a glob that Groq doesn't support — likely breaking web search; (b) `search_settings` is sent to all Groq models but only compound models support it.
3. **Choose**: Approach A (visibility + bug fix, low risk, matches "Nivel 1") vs Approach B (full tool-control UI, high effort, better as "Nivel 2"). **Recommend A now, B later.**
4. **Verify model IDs**: confirm `groq/compound` and `groq/compound-mini` are accepted by the live Groq API (docs show `compound-beta` / `compound-beta-mini`).
