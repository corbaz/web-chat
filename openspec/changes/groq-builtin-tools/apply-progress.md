# Apply Progress: Groq Built-In Tools — Slice 1 (Phase 1 Infrastructure)

**Change:** groq-builtin-tools
**Mode:** Standard (strict_tdd: false — no test runner per `openspec/config.yaml`)
**Slice:** 1 / Phase 1 — Infrastructure only (tasks 1.1–1.6)
**Delivery strategy:** auto-chain → feature-branch-chain (user-selected tracker/integration topology)
**Review budget:** 400 lines
**Git publication:** NONE — user authorized implementation only. No branches, commits, PRs, or pushes. Maintained as one reviewable uncommitted work unit.
**Started:** 2026-07-19
**Corrective rerun:** 2026-07-19 (attempt 2 — phase-contract gate found four discrepancies; reconciled below)

---

## Completed Tasks (cumulative)

- [x] 1.1 Live-verify vs Groq API — accepted IDs, tool shapes, all-tools-disabled semantics, compound-mini custom-tools support, safeguard-20b capability. Persisted to `verification.md` + Engram `sdd/groq-builtin-tools/verification`. **Probe count reconciled: 13 recorded observations (5 ID-accept + 8 payload-shape probes), NOT 9 — see verification.md.**
- [x] 1.2 `src/interfaces/chat/chatTypes.ts` — added `BuiltinToolId`, `ToolFamily`, `ToolConfig`, `ExecutedTool` (with `raw?: unknown` fallback for unknown but well-formed types), `executedTools?: ExecutedTool[]` on `ChatMessageType`, `TOOLS_STORAGE_KEY`. No `toolConfig?` on `ChatMessageType`.
- [x] 1.3 Created `src/config/groqTools.ts` — `COMPOUND_TOOLS`/`GPT_OSS_TOOLS` catalogs, `compoundToolPayload`/`gptOssToolPayload`, `isToolCapableModel` (conservative: explicit verified IDs only, no prefix match), `defaultToolConfig`, `TOOL_TRUNCATION_LIMIT=500`, `parseExecutedTools` (normalized contract: skips malformed entries without non-empty string `type`, preserves recognized fields, `raw` fallback for unknown well-formed types), `VERIFIED_GPT_OSS_TOOL_MODELS`, `PROVISIONAL_TOOL_MODELS`, `KNOWN_TOOL_TYPES`.
- [x] 1.4 `src/config/providers.ts` — added `toolsConfig?: ToolConfig` to `payloadBuilder` signature; added `parseExecutedTools?` to interface; Groq injects compound/GPT-OSS payloads (enabled tools only); **removed `search_settings` unconditionally**; wired `parseExecutedTools` to Groq. Six non-Groq builders unchanged (TypeScript arity-contravariance — 3-param functions satisfy the optional-4th-param interface; they implicitly ignore `toolsConfig`). **`parseExecutedTools` contract (corrective rerun):** entries without a non-empty string `type` (after trim) are SKIPPED, not emitted as `unknown`; recognized result/output fields (`arguments`, `search_results`, `code_results`, `output`) preserved for every well-formed entry; unknown but well-formed types (non-empty `type` not in `KNOWN_TOOL_TYPES`) get an explicit `raw` fallback holding the original entry plus index-signature extra-field copy.
- [x] 1.5 Updated both call sites (`ChatContainer.tsx:551`, `Footer.tsx:163`) to pass 4th-arg **compatibility placeholder `undefined`** — NOT live config. Real per-chat `toolConfig` wiring is intentionally deferred to Task 2.4 (Phase 2 Control). Phase 1 behavior unchanged: compound auto-uses tools (finding 5), GPT-OSS uses none (current behavior). No Control logic implemented early.
- [x] 1.6 Verified `bun run typecheck` + `bunx biome lint src` (read-only, no `--write`) + `bun run format:check` — all exit 0. **`bun run lint` was NOT run** because it expands to `biome lint --write src` (write-mode) and could modify unrelated working-tree files. `git diff` scope confirmed: only intended deltas + preserved unrelated working-tree mods. Expect `search_settings` absent; no `toolConfig?` on `ChatMessageType`.

## Remaining Tasks (not in this slice)

- [ ] 2.1–2.6 Phase 2 Control (depends on PR 1) — Task 2.1 updated to tag only verified IDs and mark `groq/compound-mini` PROVISIONAL via `PROVISIONAL_TOOL_MODELS`; do NOT tag `openai/gpt-oss-20b` (not verified); no prefix match for future `openai/gpt-oss-*`.
- [ ] 3.1–3.5 Phase 3 Visibility (depends on PR 2)
- [ ] 4.1 Phase 4 Cleanup

---

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `src/config/groqTools.ts` | Created | Catalog (`COMPOUND_TOOLS`, `GPT_OSS_TOOLS`), `compoundToolPayload`/`gptOssToolPayload`, `isToolCapableModel` (conservative: explicit verified IDs via `VERIFIED_GPT_OSS_TOOL_MODELS`, no prefix match), `defaultToolConfig`, `TOOL_TRUNCATION_LIMIT=500`, `parseExecutedTools` (normalized contract: skips entries without non-empty string `type`, preserves recognized fields, `raw` fallback for unknown well-formed types, never throws, `[]` for absent/non-array), `PROVISIONAL_TOOL_MODELS` (`groq/compound-mini`), `KNOWN_TOOL_TYPES` (observed output types). |
| `src/config/providers.ts` | Modified | Imports from `chatTypes` + `groqTools`; `payloadBuilder` signature gains optional `toolsConfig?: ToolConfig` (4th param); interface gains `parseExecutedTools?`; Groq `payloadBuilder` rewritten to remove `search_settings` and conditionally inject compound/GPT-OSS payloads; `parseExecutedTools` wired to Groq. Six non-Groq builders unchanged (contravariance). |
| `src/interfaces/chat/chatTypes.ts` | Modified | Added `ToolFamily`, `BuiltinToolId`, `ToolConfig`, `ExecutedTool` (with `raw?: unknown` fallback + clarified `type` non-empty contract), `TOOLS_STORAGE_KEY`; added `executedTools?: ExecutedTool[]` to `ChatMessageType`. No `toolConfig?` on `ChatMessageType`. |
| `src/components/chat/ChatContainer.tsx` | Modified | `payloadBuilder` call (line 551) passes 4th arg `undefined` (compatibility placeholder) + Spanish comment (Phase 2 plumbs real config). |
| `src/components/FOOTER/Footer.tsx` | Modified | `payloadBuilder` call (line 163) passes 4th arg `undefined` (compatibility placeholder) + Spanish comment (varita mágica, no tools). |
| `openspec/changes/groq-builtin-tools/verification.md` | Created/Updated | Sanitized live-probe findings (Task 1.1). Corrective rerun: probe count reconciled to 13 recorded observations; added conservative-classification note (no prefix match); compound-mini marked PROVISIONAL. |
| `openspec/changes/groq-builtin-tools/tasks.md` | Modified | Tasks 1.1–1.6 marked `[x]`; chain strategy resolved to `feature-branch-chain`. Corrective rerun: 1.5 reworded to state placeholder behavior; 1.6 uses `bunx biome lint src` (read-only); 2.1 updated with explicit-ID + provisional guidance. |

---

## Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `bun run typecheck` → exit 0 (`tsc --noEmit`, 0 errors). `bunx biome lint src` (read-only, no `--write`) → exit 0, "Checked 35 files in 46ms. No fixes applied." `bun run format:check` → exit 0, "Checked 35 files in 22ms. No fixes applied." All three green. **`bun run lint` was NOT run** — it expands to `biome lint --write src` (write-mode) and could modify unrelated working-tree files; the read-only `bunx biome lint src` is the safe equivalent used for evidence. Rerun after corrective source changes (groqTools.ts + chatTypes.ts): all three still green. |
| Runtime harness command/scenario and exact result | **Live Groq API probes** (PowerShell `Invoke-WebRequest` to `api.groq.com/openai/v1/chat/completions`, Bearer from `$env:GROQ_API_KEY` — key never printed/logged/persisted): **13 recorded probe observations** across 5 model IDs + 8 payload-shape probes (NOT 9 — the earlier count was wrong; see verification.md for the full table). Results: `groq/compound`/`compound-beta`/`groq/compound-mini`/`openai/gpt-oss-120b`/`openai/gpt-oss-safeguard-20b` all HTTP 200; GPT-OSS `tools:[{type}]` accepted + executed (`browser_search,browser.open,function`); compound `compound_custom.tools.enabled_tools` accepted (subset limits tools); `enabled_tools:[]` and omitting `compound_custom` do NOT disable auto-tooling (compound still ran `search`); safeguard-20b tool-capable (executed 2); compound-mini accepts `compound_custom` (200, no 400, execution inconclusive → PROVISIONAL). Some probes encountered 429 rate-limit collisions and were retried with 45s spacing — all retries returned 200. No 400/404 on any verified ID or payload shape. **Probes were NOT rerun in this corrective batch** — counts reconciled from existing evidence only. |
| Rollback boundary | Delete `src/config/groqTools.ts` (new) and revert the additive deltas in `src/config/providers.ts`, `src/interfaces/chat/chatTypes.ts`, `src/components/chat/ChatContainer.tsx` (line 551 region), `src/components/FOOTER/Footer.tsx` (line 163 region). No UI/Control/Visibility code depends on these yet (Phase 2/3 not implemented). Unrelated working-tree mods (Biome formatting pass, message-deletion feature in ChatContainer/ChatArea/ChatMessage, package.json/bun.lock, untracked config/planning files) are untouched and remain in the tree. |

---

## Deviations from Design

1. **`parseExecutedTools` contract — normalized (corrective rerun)** — The design stated `web_search`→`search_results`, `code_interpreter`→`code_results`, others→`output`. Live probes revealed the API normalizes type names: input `web_search` → output type `search`; input `code_interpreter` → output type `python` (compound) or `function` (gpt-oss/safeguard). The implemented `parseExecutedTools` **preserves ALL recognized fields** (`type`, `arguments`, `search_results`, `code_results`, `output`) plus any extras via index-signature. **Corrective rerun tightened the contract:** entries without a non-empty string `type` (after trim) are SKIPPED (not emitted as `unknown`); unknown but well-formed types (non-empty `type` not in `KNOWN_TOOL_TYPES`) get an explicit `raw` fallback holding the original entry. Phase 3's chip renderer will map observed types (`search`/`browser_search`/`browser.open` → search-results; `python`/`function`/`code_interpreter` → code-results) at render time. The `ExecutedTool` interface now declares `raw?: unknown` explicitly.

2. **Six non-Groq `payloadBuilder` signatures unchanged** — Task 1.4 said "six non-Groq accept+ignore". Rather than adding an unused `_toolsConfig` 4th param to all six (extra diff + risk of Biome unused-param warnings), they keep their 3-param signatures. TypeScript function-arity contravariance makes a 3-param function assignable to the new 4-param-optional interface, so they implicitly accept and ignore `toolsConfig`. `tsc --noEmit` confirms this compiles. Outcome identical to the design intent; diff minimized; unrelated mods preserved.

3. **`compound-mini` included as compound-family tool-capable — PROVISIONAL** — Task 1.3 said "exclude `compound-mini`/`safeguard-20b` if not verified". Live verification: `compound-mini` **accepts** `compound_custom.tools.enabled_tools` (HTTP 200, no 400) — payload-safe. Tool execution was NOT observed in the test prompt (inconclusive on execution, not on acceptance). Decision: **include** `compound-mini` as compound-family, but explicitly **PROVISIONAL** via `PROVISIONAL_TOOL_MODELS` constant. Rationale: (a) the payload is safe (no 400), (b) it is named "compound-mini" in the compound family, (c) excluding it would show a misleading "Requiere modelo compound" tooltip for a compound model. If Phase 3 smoke-test shows no execution, Phase 2's `supportsBuiltinTools` tag can be revoked without infra changes (remove from `PROVISIONAL_TOOL_MODELS` / `isToolCapableModel`). `safeguard-20b` was fully verified tool-capable (executed 2 tools) and is included as gpt-oss-family (in `VERIFIED_GPT_OSS_TOOL_MODELS`).

4. **Call sites pass `undefined` (compatibility placeholder, NOT live config)** — Task 1.5 originally said "pass `toolsConfig` (4th arg)". Phase 1 has no per-chat `toolConfig` state (that lands in Phase 2 via `App.tsx`). Passing `undefined` compiles the new signature and preserves current behavior (no injection → compound auto-uses tools per finding 5, GPT-OSS uses none — current behavior). **Corrective rerun clarified the wording:** the completed task states this is a compatibility placeholder, not live config wiring. Phase 2 (Task 2.4) will replace `undefined` with the real plumbed config. No Control logic implemented early.

5. **`isToolCapableModel` uses explicit verified IDs, NOT prefix match (corrective rerun)** — The original implementation used `model.startsWith('openai/gpt-oss-')` which would classify ANY future `openai/gpt-oss-*` ID as tool-capable without verification. Corrective rerun: replaced with `VERIFIED_GPT_OSS_TOOL_MODELS` set containing only `openai/gpt-oss-120b` and `openai/gpt-oss-safeguard-20b` (both verified live, executed tools). `openai/gpt-oss-20b` (in catalog) is NOT classified as tool-capable because it was not live-verified. Future `openai/gpt-oss-*` IDs must be verified live and added to the set before being classified. This is a conservative tightening — safe for Phase 1 (call sites pass `undefined`, so `isToolCapableModel` return value has no behavioral effect yet) and correct for Phase 2 UI tagging.

---

## Issues Found

- **Pre-existing toolchain note:** `openspec/config.yaml` references "ESLint flat config + Prettier" but the actual project (per `package.json`) uses **Biome 2.5.4** for both lint and format. Scripts: `typecheck` = `tsc --noEmit`, `lint` = `biome lint --write src` (WRITE mode), `format:check` = `biome format src` (read-only). This is a config-doc drift, not a failure — all three safe commands ran successfully. (Not fixed in this slice — out of Phase 1 scope.)
- **`bun run lint` uses `--write`** which could reformat unrelated working-tree files. To preserve unrelated mods per the user's hard constraint, the read-only equivalent `bunx biome lint src` (no `--write`) is used for verification. Outcome identical (0 issues). **Corrective rerun:** task 1.6 contract updated to name the exact safe command; `bun run lint` is explicitly NOT run.
- **Rate-limit (429) collisions** on the first probe batch — resolved by retrying inconclusive probes with 45s spacing. All retries returned 200. No findings were left inconclusive. **Probes were NOT rerun in the corrective batch** — counts reconciled from existing evidence.
- **Probe-count inconsistency (corrective rerun):** earlier apply-progress/Engram said "9 probes across 5 model IDs + 4 payload shapes" but `verification.md` records 13 table rows. Reconciled to **13 recorded observations** = 5 ID-accept + 8 payload-shape probes. The "9" figure was incorrect; it undercounted the payload-shape probes (8, not 4). Both artifacts now state 13 explicitly.

---

## Workload / PR Boundary

- **Mode:** chained PR slice (feature-branch-chain) — Slice 1 of 3
- **Current work unit:** Infra (types/constants + groqTools config helper + provider interface/payload/parser + both call sites)
- **Boundary:** Starts from no prior apply-progress; ends with Phase 1 infrastructure complete and verified. Phase 2 (Control) and Phase 3 (Visibility) NOT started. Corrective rerun (attempt 2) reconciled four phase-contract discrepancies without expanding scope.
- **Estimated review budget impact:** Infra authored lines ~210 (within the ~180 forecast + corrective tightening; under 400-line budget). No Git publication in this batch.

---

## Status

**6/18** tasks complete (Phase 1: 1.1–1.6 all `[x]`). **Ready for next slice** (Phase 2 Control) or hand-off to verify for the Infra slice. Not blocked. No Git publication authorized or performed. Corrective rerun attempt 2 reconciled all four discrepancies: (1) parser contract tightened, (2) task 1.5 placeholder wording corrected, (3) task 1.6 safe lint command named, (4) probe count reconciled to 13. Conservative validator risks addressed: no prefix-match for `openai/gpt-oss-*`; `compound-mini` marked PROVISIONAL via `PROVISIONAL_TOOL_MODELS`.
