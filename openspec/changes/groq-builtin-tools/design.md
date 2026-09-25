# Design: Groq Built-In Tools — Visibility + Control

## Technical Approach

Surface Groq `executed_tools`; add per-chat, provider-adaptive tool toggles. Seam: `payloadBuilder` (`ChatContainer.tsx:547`) gains optional 4th param `toolsConfig?` — six ignore, Groq consumes; `search_settings` removed. `parseExecutedTools?` (Groq only) normalizes `choices[0].message.executed_tools`.

## Architecture Decisions

- **`payloadBuilder` arity** — Optional 4th param `toolsConfig?`. Additive; one call site.
- **`executed_tools` parsing** — `parseExecutedTools?` hook. Provider knowledge isolated.
- **Tool-capability source** — `supportsBuiltinTools: ToolFamily`. Single source; drives disabled help.
- **Per-chat persistence** — `TOOLS_STORAGE_KEY`[chatId]. Versioned-key pattern; rollback-safe.
- **`ChatMessageType.toolConfig?`** — **Omit.** State lives in `TOOLS_STORAGE_KEY[chatId]` in `App.tsx`; adding duplicates state and couples message persistence to tool config.
- **Chip component** — New `ToolChips.tsx`. Reviewable `ChatMessage`.
- **All-tools-disabled** — UI prevents last-off until live-verified (see Migration).
- **GPT-OSS `tools` shape** — `{type}` objects. `tools` holds `code_interpreter` definition.

## Data Flow

```
RightMenu → App.toolConfig → localStorage[TOOLS_KEY][chatId] → payloadBuilder(...,toolsConfig)
  → Groq API (compound_custom.tools.enabled_tools | tools:[{type}]) → executed_tools
  → parseExecutedTools → ExecutedTool[] (set only if length > 0) → ToolChips
```

`isToolRequestInFlight = isLoading && isToolCapableModel(...)` → `ChatArea` renders "Ejecutando herramientas..." in the existing `aria-live="polite"` region. `executed_tools` in final JSON (no streaming).

## File Changes

- `src/config/groqTools.ts` — **Create.** Catalog, payload builders, `isToolCapableModel`, `defaultToolConfig`, `TOOL_TRUNCATION_LIMIT=500`.
- `src/components/chat/ToolChips.tsx` — **Create.** Chips + detail + truncation + unknown fallback; renders only when `length > 0`.
- `src/config/providers.ts` — **Modify.** Remove `search_settings`; add `toolsConfig?` + Groq impl; add `parseExecutedTools?`.
- `src/interfaces/chat/chatTypes.ts` — **Modify.** Add `ExecutedTool`, `ToolConfig`, `executedTools?`, `TOOLS_STORAGE_KEY`. **No `toolConfig?` on `ChatMessageType`.**
- `src/components/HEADER/models/groqModels.ts` — **Modify.** `supportsBuiltinTools?: ToolFamily`; tag compound + gpt-oss.
- `src/components/HEADER/menu/RightMenu.tsx` — **Modify.** Tool section; provider-adaptive; prevent last-off until verified.
- `src/components/chat/ChatMessage.tsx` — **Modify.** Render `<ToolChips>` only when `executedTools` present AND `length > 0`.
- `src/components/chat/ChatArea.tsx` — **Modify.** Accept `isToolRequestInFlight?`; render indicator.
- `src/components/chat/ChatContainer.tsx` — **Modify.** Plumb `toolConfig`; pass `toolsConfig`; set `executedTools` when non-empty; compute indicator.
- `src/App.tsx` — **Modify.** Lift `toolConfig`; load/save per-chat; plumb to `ChatContainer` + `RightMenu`.

Unrelated working-tree mods — apply MUST diff-merge, never `git checkout`.

## Interfaces / Contracts

New in `chatTypes.ts`: `BuiltinToolId` union; `ToolFamily = "compound" | "gpt-oss"`; `ToolConfig` (bool per tool); `ExecutedTool` (`type` + optional `arguments`/`search_results`/`code_results`/`output` + index sig). `ChatMessageType` gains only `executedTools?: ExecutedTool[]`. `TOOLS_STORAGE_KEY = "prompting_chat_tools:v1"`.

`payloadBuilder: (model, messages, maxTokens, toolsConfig?: ToolConfig) => Record<string,unknown>` (six non-Groq accept+ignore). `parseExecutedTools?: (data, model) => ExecutedTool[]` (Groq only). `GroqModel.supportsBuiltinTools?: ToolFamily`.

**Payload boundaries** — Compound `compound_custom.tools.enabled_tools`; GPT-OSS `tools:[{type}]`; only enabled tools emitted; `search_settings` never sent.

**Normalization** — `parseExecutedTools` returns `[]` when absent/malformed. `web_search`→`search_results`; `code_interpreter`→`code_results`; others→`output`. Unknown type → raw JSON in `<pre>` with `aria-label="Tipo de herramienta desconocido"`; never throws.

## Cross-Cutting (Security / CORS / A11y / Errors)

- **CORS / XSS**: No new surface — `api.groq.com` already called with `Bearer` (`providers.ts:187`). Static defs; escaped text; no `dangerouslySetInnerHTML`; URLs as text; key never logged.
- **A11y (chips)**: `<button type="button">` + `aria-expanded` + `aria-controls` + `aria-label`; detail `role="region"`.
- **A11y (disabled help)**: Native `disabled` isn't keyboard-focusable; use a focusable `<button type="button" aria-disabled="true">` with guarded `onClick`/`onKeyDown` (Enter/Space) `preventDefault()` and no state change. Wrap in `<span class="tool-toggle-wrapper">` exposing `<span role="tooltip" id="tool-disabled-help">` "Requiere modelo compound. Las herramientas integradas solo están disponibles para modelos compound y GPT-OSS." via CSS `:hover`/`:focus-within` (not `title`-only); button `aria-describedby` binds the id. SR help duplicated `sr-only`. Keyboard: Tab → tooltip visible + announced; Enter/Space noop; blur hides.
- **A11y (button type)**: All non-submit interactive buttons introduced here (`aria-disabled` toggles, chips/disclosure, `Ver más` expand) use `type="button"`; in-form placement cannot submit.
- **Errors**: localStorage failure → `defaultToolConfig` (all on); malformed/empty via Normalization; `search_settings` via Payload boundaries.

## Testing Strategy

- **Unit**: typecheck — optional `toolsConfig`; 6 ignore; Groq injects; `search_settings` absent; no `toolConfig?` on `ChatMessageType`. lint — ESLint flat + Prettier. → `bun run typecheck` + `lint` + `format:check`.
- **Integration**: Compound 200; `executed_tools`→chips; empty/absent→no chips; toggle off removes from next payload (`ChatContainer:559`); GPT-OSS 2 toggles; non-tool Groq `aria-disabled` + focus-reachable tooltip + Enter/Space noop; non-Groq hidden; last-off prevented. → `bun run dev`.
- **Regression**: Per-chat persistence + tool-state restore on switch; working-tree diffs intact. → Manual + `git diff`.

Threat Matrix: N/A — no routing/shell/subprocess/VCS boundary.

## Migration / Rollout

No migration. `toolsConfig` optional → 6 unaffected. `executedTools?` additive. Old chats all-on. **Pre-apply blocker**: verify compound + gpt-oss IDs live, AND whether `enabled_tools:[]` / omitting `compound_custom` disables auto-tooling. UI blocks last-off meanwhile.

## Implementation Sequence (Reviewable)

400-line guard exceeded (8+2). Slices:

1. **Infra** — `chatTypes.ts` + `groqTools.ts` + `providers.ts` (signature, `parseExecutedTools?`, remove `search_settings`). No UI.
2. **Control** — `groqModels.ts` tagging (post live) + `RightMenu.tsx` + `App.tsx` + `ChatContainer.tsx` wiring.
3. **Visibility** — `ToolChips.tsx` + `ChatMessage.tsx` + `ChatArea.tsx` + `ChatContainer.tsx` parsing.

Each ≤ 400 lines, independent rollback. `sdd-tasks` MUST emit `Decision needed before apply: Yes`, `Chained PRs: Yes`, `400-line risk: High`.

## Open Questions

- [ ] Does `enabled_tools:[]` / omitting `compound_custom` disable auto-tooling?
- [ ] GPT-OSS `tools` element shape — confirm live.
- [ ] `groq/compound-mini` + `openai/gpt-oss-safeguard-20b` tool-capable? Verify or exclude.
