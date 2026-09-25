# Tasks: Groq Built-In Tools — Visibility + Control

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated authored changed lines | ~620–760 (Infra ~180, Control ~260, Visibility ~220) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 Infra → PR 2 Control → PR 3 Visibility |
| Delivery strategy | auto-chain (feature-branch-chain) |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Resolved
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain (resolved — tracker/integration branch topology)
400-line budget risk: High

Decision resolved: feature-branch-chain selected. Slices are autonomous; merge in order. No branches/commits/PRs created in this apply batch — user authorized implementation only, not Git publication. Slice 1 (Infra) maintained as one reviewable uncommitted work unit.

### Suggested Work Units

| Unit | Likely PR | Focused test | Runtime harness | Rollback boundary |
|------|-----------|--------------|-----------------|-------------------|
| 1 Infra | PR 1 | `bun run typecheck && bun run lint && bun run format:check` | `bun run dev`; curl Groq for `groq/compound`, `groq/compound-mini`, `openai/gpt-oss-120b`, `openai/gpt-oss-safeguard-20b` — record accepted IDs + `tools`/`compound_custom` shapes + all-tools-disabled semantics | Revert `groqTools.ts` (new) + `providers.ts`/`chatTypes.ts` deltas; no UI deps |
| 2 Control | PR 2 (base = PR 1) | `bun run typecheck && bun run lint` | `bun run dev`; per-chat persistence, non-tool Groq `aria-disabled`+focusable tooltip+Enter/Space noop, non-Groq hidden, last-off guard | Revert `groqModels.ts`+`RightMenu.tsx`+`App.tsx`+`ChatContainer.tsx`+`Footer.tsx` toggles; Infra stays |
| 3 Visibility | PR 3 (base = PR 2) | `bun run typecheck && bun run lint` | `bun run dev`; compound `executed_tools`→chips, empty→none, truncation+"Ver más"+scroll, unknown fallback, GPT-OSS identical | Revert `ToolChips.tsx` (new)+`ChatMessage.tsx`/`ChatArea.tsx`/`ChatContainer.tsx` parse deltas; Control stays |

Working-tree preservation: apply MUST diff-merge; no `git checkout`/`revert`/`reset`. Verify `git diff` before each commit.

## Phase 1: Infrastructure — Slice 1 (PR 1)

- [x] 1.1 Live-verify vs Groq API: accepted IDs (`groq/compound` vs `compound-beta`, `groq/compound-mini`, `openai/gpt-oss-120b`, `openai/gpt-oss-safeguard-20b`); GPT-OSS `tools:[{type}]` shape; compound `compound_custom.tools.enabled_tools` shape; whether `enabled_tools:[]`/omitting `compound_custom` disables auto-tooling; whether `compound-mini` accepts custom tools; whether `safeguard-20b` is tool-capable. Persist to `openspec/changes/groq-builtin-tools/verification.md` + Engram `sdd/groq-builtin-tools/verification`. Blocks 2.1 and last-off guard.
- [x] 1.2 `src/interfaces/chat/chatTypes.ts`: add `BuiltinToolId`, `ToolFamily`, `ToolConfig`, `ExecutedTool`, `executedTools?: ExecutedTool[]`, `TOOLS_STORAGE_KEY="prompting_chat_tools:v1"`. No `toolConfig?` on `ChatMessageType`.
- [x] 1.3 Create `src/config/groqTools.ts`: catalog per family, `compoundToolPayload`/`gptOssToolPayload`, `isToolCapableModel`, `defaultToolConfig`, `TOOL_TRUNCATION_LIMIT=500`. Capabilities per 1.1 (exclude `compound-mini`/`safeguard-20b` if not verified).
- [x] 1.4 `src/config/providers.ts`: add optional `toolsConfig?` to `payloadBuilder` signature; Groq injects compound/GPT-OSS payloads (enabled tools only); six non-Groq accept+ignore; **remove `search_settings` (lines 201-204) unconditionally**; add `parseExecutedTools?` (Groq only; `[]` when absent/malformed; `web_search`→`search_results`, `code_interpreter`→`code_results`, others→`output`; unknown → raw JSON, never throws).
- [x] 1.5 Update both call sites `ChatContainer.tsx:550` and `Footer.tsx:162` to pass a 4th-arg **compatibility placeholder `undefined`** so the new `payloadBuilder` signature compiles. Real per-chat `toolConfig` wiring is deferred to Task 2.4 (Phase 2 Control). No behavior change in Phase 1 (compound auto-tools per finding 5; GPT-OSS uses none — current behavior).
- [x] 1.6 Verify `bun run typecheck && bunx biome lint src && bun run format:check` (read-only lint — `bun run lint` uses `biome lint --write` and could modify unrelated working-tree files, so it is NOT run); `git diff` shows only intended deltas + preserved unrelated mods. Expect `search_settings` absent; no `toolConfig?` on `ChatMessageType`.

## Phase 2: Control — Slice 2 (PR 2, depends on PR 1)

- [ ] 2.1 `src/components/HEADER/models/groqModels.ts`: add `supportsBuiltinTools?: ToolFamily`; tag ONLY verified IDs — `groq/compound` (compound, verified), `groq/compound-mini` (compound, **PROVISIONAL** — payload-accepted but execution inconclusive per 1.1; surface uncertainty in UI guidance and mark via `PROVISIONAL_TOOL_MODELS` from `groqTools.ts`; revocable without infra change if Phase 3 smoke-test shows no execution), `openai/gpt-oss-120b` + `openai/gpt-oss-safeguard-20b` (gpt-oss, verified). Do NOT tag `openai/gpt-oss-20b` (in catalog but NOT live-verified) and do NOT classify future `openai/gpt-oss-*` IDs by prefix — verify live first and add to `VERIFIED_GPT_OSS_TOOL_MODELS`.
- [ ] 2.2 `src/components/HEADER/menu/RightMenu.tsx`: tool section (4 compound / 2 GPT-OSS toggles); non-tool Groq → focusable `<button type="button" aria-disabled="true">` + guarded `onClick`/`onKeyDown` (Enter/Space `preventDefault`, noop) + `<span role="tooltip" id="tool-disabled-help">` "Requiere modelo compound. Las herramientas integradas solo están disponibles para modelos compound y GPT-OSS." shown via CSS `:hover`/`:focus-within`, bound via `aria-describedby`; SR help `sr-only`; non-Groq → section hidden.
- [ ] 2.3 `src/App.tsx`: lift `toolConfig`; load/save `localStorage[TOOLS_STORAGE_KEY][chatId]`; failure → `defaultToolConfig`; plumb to `ChatContainer` + `RightMenu`.
- [ ] 2.4 `src/components/chat/ChatContainer.tsx`: accept `toolConfig`; pass `toolsConfig` to `payloadBuilder`; compute `isToolRequestInFlight = isLoading && isToolCapableModel(selectedModel, family)`.
- [ ] 2.5 Last-off guard: prevent disabling final enabled tool until 1.1 all-tools-disabled semantics verified; relax only if verified safe.
- [ ] 2.6 Verify `bun run typecheck && bun run lint`; `bun run dev` — persistence/restore on chat switch, disabled+focusable tooltip+Enter/Space noop, non-Groq hidden, toggle off removes tool from next payload, last-off guard per 1.1.

## Phase 3: Visibility — Slice 3 (PR 3, depends on PR 2)

- [ ] 3.1 Create `src/components/chat/ToolChips.tsx`: chip per `executed_tools` entry; `<button type="button">`+`aria-expanded`/`aria-controls`/`aria-label`; detail `role="region"`; truncate 500 + "Ver más" scrollable; unknown → raw JSON `<pre aria-label="Tipo de herramienta desconocido">`; render only when `length > 0`; no `dangerouslySetInnerHTML`.
- [ ] 3.2 `src/components/chat/ChatMessage.tsx`: render `<ToolChips>` only when `executedTools` present AND `length > 0`.
- [ ] 3.3 `src/components/chat/ChatArea.tsx`: accept `isToolRequestInFlight?`; render "Ejecutando herramientas..." in existing `aria-live="polite"` region.
- [ ] 3.4 `src/components/chat/ChatContainer.tsx`: call `providerConfig.parseExecutedTools?.`; set `executedTools` only when non-empty; pass `isToolRequestInFlight` to `ChatArea`.
- [ ] 3.5 Verify `bun run typecheck && bun run lint`; `bun run dev` — compound `executed_tools`→chips+detail, empty/absent→none, truncation+"Ver más"+scroll, short output no truncation, unknown fallback no crash, GPT-OSS identical, indicator→chips on completion.

## Phase 4: Cleanup

- [ ] 4.1 Run `bun run typecheck && bun run lint && bun run format:check`; confirm `git diff` shows only intended deltas + preserved unrelated mods; archive 1.1 verification notes to Engram.
