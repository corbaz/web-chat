# Verification: Groq Built-In Tools — Live API Probes (Task 1.1)

**Date:** 2026-07-19
**Method:** PowerShell `Invoke-WebRequest` against `https://api.groq.com/openai/v1/chat/completions`. `Authorization: Bearer $env:GROQ_API_KEY` read from process environment. **No key value, no Authorization header, and no secret-bearing path was printed, logged, or persisted.** All probe outputs below are sanitized (status code + `executed_tools` shape only).

**Hard pre-edit gate result:** `GROQ_API_KEY` present in process environment (length 56, `gsk_` prefix). Gate PASSED → live probes authorized → infra implementation unlocked.

**Probe count (corrective rerun, reconciled):** **13 recorded probe observations** = 5 ID-accept probes (one per model ID) + 8 payload-shape probes. The earlier "9 probes" figure was incorrect — it undercounted the payload-shape probes (8, not 4). Some probes encountered 429 rate-limit collisions and were retried with 45s spacing (retry HTTP requests in addition to the 13 logical probes); all retries returned 200. **Probes were NOT rerun in the corrective batch** — counts reconciled from existing evidence only. No secret-bearing probe was re-executed.

---

## Probe Results (sanitized)

| Probe | Model | Payload | HTTP | executed_tools count | executed_tools types | Notes |
|-------|-------|---------|------|----------------------|----------------------|-------|
| ID-ACCEPT | `groq/compound` | minimal, no tools | 200 | 0 | — | ID accepted |
| ID-ACCEPT | `compound-beta` | minimal | 429→retry 200 | 0 | — | Legacy ID ALSO accepted (keep `groq/compound`) |
| ID-ACCEPT | `groq/compound-mini` | minimal | 200 | 0 | — | ID accepted |
| ID-ACCEPT | `openai/gpt-oss-120b` | minimal | 200 | 0 | — | ID accepted |
| ID-ACCEPT | `openai/gpt-oss-safeguard-20b` | minimal | 200 | 0 | — | ID accepted |
| COMPOUND-EMPTY-TOOLS | `groq/compound` | `compound_custom.tools.enabled_tools:[]` | 200 | 1 | `search` | **🚨 Empty array did NOT disable auto-tooling** |
| RETRY-COMPOUND-WEBS | `groq/compound` | `enabled_tools:['web_search']` | 200 | 1 | `search` | Subset limits tools; type normalized to `search` |
| RETRY-COMPOUND-NO-CUSTOM | `groq/compound` | no `compound_custom` key | 200 | 1 | `search` | **🚨 Omitting compound_custom does NOT disable auto-tooling** |
| RETRY-COMPOUND-ALL4 | `groq/compound` | `enabled_tools:[all 4]` | 200 | 1 | `python` | All-4 accepted; code_interpreter ran as `python` |
| GPTOSS-CODE-INTERP | `openai/gpt-oss-120b` | `tools:[{type:'code_interpreter'}]` | 200 | 0 | — | Shape ACCEPTED (trivial prompt, no exec) |
| GPTOSS-BOTH-TOOLS | `openai/gpt-oss-120b` | `tools:[{type:'browser_search'},{type:'code_interpreter'}]` | 200 | 3 | `browser_search,browser.open,function` | Shape ACCEPTED + executed |
| SAFEGUARD-CODE-INTERP | `openai/gpt-oss-safeguard-20b` | `tools:[{type:'code_interpreter'}]` | 200 | 2 | `function,function` | **safeguard-20b IS tool-capable** |
| COMPOUND-MINI-CUSTOM | `groq/compound-mini` | `compound_custom.tools.enabled_tools:['web_search']` | 200 | 0 | — | Shape accepted (no 400); execution not observed (inconclusive) |

Rate-limit (429) collisions occurred on the first batch; inconclusive probes were retried with 45s spacing — all retries returned 200. No 400/404 observed on any verified ID or payload shape.

---

## Findings

### 1. Accepted Model IDs (all HTTP 200)
- `groq/compound` ✅ — primary compound ID (kept in `groqModels.ts`)
- `compound-beta` ✅ — legacy ID also accepted; **keep `groq/compound`** as the canonical ID per proposal
- `groq/compound-mini` ✅
- `openai/gpt-oss-120b` ✅
- `openai/gpt-oss-safeguard-20b` ✅

### 2. GPT-OSS `tools:[{type}]` shape — ACCEPTED ✅
`tools: [{type:'browser_search'}, {type:'code_interpreter'}]` returned 200 and executed tools (`browser_search` → `browser.open` → `function`). Confirms the design's GPT-OSS payload shape. `safeguard-20b` also accepts and executes this shape.

### 3. Compound `compound_custom.tools.enabled_tools` shape — ACCEPTED ✅
Non-empty subset limits which tools run: `enabled_tools:['web_search']` → only `search` executed. All-4 array accepted.

### 4. 🚨 `enabled_tools:[]` does NOT disable auto-tooling
Sending `compound_custom.tools.enabled_tools: []` returned 200 with `executed_tools` count=1, type=`search`. **Empty array = "all tools enabled" (default), NOT "all tools disabled".** This is the critical semantic the design's pre-apply blocker required.

### 5. 🚨 Omitting `compound_custom` does NOT disable auto-tooling
Sending no `compound_custom` key at all returned 200 with `executed_tools` count=1, type=`search`. Compound models auto-use tools by default regardless of `compound_custom`.

### 6. `groq/compound-mini` accepts `compound_custom` shape — PROVISIONAL
200 (no 400) when sending `compound_custom.tools.enabled_tools`. Tool execution was not observed in the test prompt (model answered directly). **Payload-safe → included as compound-family tool-capable but marked PROVISIONAL** via `PROVISIONAL_TOOL_MODELS` in `groqTools.ts`. If Phase 3 smoke-test shows no execution, Phase 2 tagging (`supportsBuiltinTools`) can be revoked without infra changes (remove from `PROVISIONAL_TOOL_MODELS` / `isToolCapableModel`).

### 7. `openai/gpt-oss-safeguard-20b` IS tool-capable ✅
Accepted `tools:[{type:'code_interpreter'}]` and executed 2 tools (types `function,function`). Include as gpt-oss family.

### 8. Observed `executed_tools` type names (API-normalized)
The API normalizes input tool names to different output type names:

| Input (`enabled_tools`/`tools[].type`) | Observed output `executed_tools[].type` |
|------------------------------------------|----------------------------------------|
| `web_search` | `search` |
| `code_interpreter` (compound, all-4) | `python` |
| `code_interpreter` (gpt-oss/safeguard) | `function` |
| `browser_search` | `browser_search` (+ `browser.open` sub-step) |

**Implication for `parseExecutedTools`:** the normalizer must handle the ACTUAL observed types (`search`, `python`, `function`, `browser_search`, `browser.open`), not just the input names. The implemented `parseExecutedTools` (corrective rerun contract) **skips entries without a non-empty string `type`** (after trim — not emitted as `unknown`), **preserves recognized fields** (`arguments`, `search_results`, `code_results`, `output`), and for **unknown but well-formed types** (non-empty `type` not in `KNOWN_TOOL_TYPES`) retains an explicit **`raw` fallback** holding the original entry plus index-signature extra-field copy. It never throws and returns `[]` for absent/non-array. Phase 3's chip renderer will map `search`/`browser_search`/`browser.open` → search-results rendering, `python`/`function`/`code_interpreter` → code-results rendering.

---

## Answers to Design Open Questions

- [x] **Does `enabled_tools:[]` / omitting `compound_custom` disable auto-tooling?** → **NO.** Both still result in auto-tool execution. **The last-off guard (Task 2.5) MUST remain enabled** — do NOT relax. Letting the user disable the final tool would produce `enabled_tools:[]` which the API treats as "all on", making the UI state misleading (UI says off, API runs all). Keeping ≥1 tool enabled is the only way to actually limit tools to a subset.
- [x] **GPT-OSS `tools` element shape — confirm live.** → Confirmed: `tools: [{type: 'browser_search'|'code_interpreter'}]` (objects with a single `type` field). Accepted and executed.
- [x] **`groq/compound-mini` + `openai/gpt-oss-safeguard-20b` tool-capable?** → safeguard-20b: YES (executed tools). compound-mini: payload-accepted (200, no 400), execution inconclusive — included as compound-family (payload-safe); revisit in Phase 3 if needed.

---

## Implications Confirmed for Phase 1 Implementation

1. **`isToolCapableModel`** (groqTools.ts) — **conservative classification (corrective rerun):** `groq/compound` → `'compound'` (verified); `groq/compound-mini` → `'compound'` (PROVISIONAL via `PROVISIONAL_TOOL_MODELS` — payload-accepted, execution inconclusive); `openai/gpt-oss-120b` + `openai/gpt-oss-safeguard-20b` → `'gpt-oss'` (verified via `VERIFIED_GPT_OSS_TOOL_MODELS`); else `null`. **No prefix match on `openai/gpt-oss-*`** — `openai/gpt-oss-20b` (in catalog) is NOT classified as tool-capable because it was not live-verified. Future `openai/gpt-oss-*` IDs must be verified live and added to `VERIFIED_GPT_OSS_TOOL_MODELS` before classification.
2. **`compoundToolPayload`**: emits `compound_custom.tools.enabled_tools` with only enabled tools (non-empty subset limits tools; empty = all-on, so Phase 2's last-off guard prevents reaching empty).
3. **`gptOssToolPayload`**: emits `tools: [{type}]` with only enabled tools.
4. **`parseExecutedTools`** (corrective rerun contract): skips entries without non-empty string `type` (not emitted as `unknown`); preserves recognized fields (`arguments`, `search_results`, `code_results`, `output`); `raw` fallback for unknown but well-formed types; never throws; `[]` for absent/non-array.
5. **`search_settings` removed** unconditionally from Groq `payloadBuilder` — confirmed safe (was already broken per proposal; compound auto-tools without it).
6. **Phase 1 call sites pass `undefined`** (compatibility placeholder, NOT live config — real per-chat `toolConfig` deferred to Task 2.4) → no behavior change: compound auto-uses tools (per finding 5), GPT-OSS uses none (current behavior).

---

## Rollback Boundary (Phase 1 / Slice 1)

Revert/delete these and only these to undo Phase 1 without affecting unrelated working-tree mods:
- **Delete:** `src/config/groqTools.ts` (new file)
- **Revert deltas in:** `src/config/providers.ts` (imports, interface `toolsConfig?`/`parseExecutedTools?`, Groq payloadBuilder rewrite, `parseExecutedTools` wiring), `src/interfaces/chat/chatTypes.ts` (new types + `executedTools?` + `TOOLS_STORAGE_KEY`), `src/components/chat/ChatContainer.tsx` (4th arg `undefined` + comment), `src/components/FOOTER/Footer.tsx` (4th arg `undefined` + comment)
- No UI dependencies. No Control (Phase 2) or Visibility (Phase 3) code references these yet. Phase 2/3 are not implemented.
