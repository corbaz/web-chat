# Proposal: Groq Built-In Tools — Visibility + Control

## Intent

Compound models already auto-use `web_search`, `code_interpreter`, `visit_website`, `wolfram_alpha` — but `executed_tools` is discarded, `search_settings` is broken, and users can't control which tools run. This change surfaces execution, eliminates `search_settings`, and adds per-chat tool control.

## Scope

### In Scope
- Surface `executed_tools`: chips (tool type) + expandable detail (arguments + output, truncate 500 chars + "Ver más" + scroll)
- Per-chat tool toggles: 4 for compound, 2 for GPT-OSS (`browser_search` + `code_interpreter`), hidden for others
- Non-tool Groq models: disabled controls + tooltip "Requiere modelo compound"
- Persist tool state per chat in localStorage
- Eliminate `search_settings` from Groq payloadBuilder entirely
- Inject `compound_custom.tools.enabled_tools` (compound) / `tools` array (GPT-OSS) via optional `toolsConfig?` param
- "Ejecutando herramientas..." indicator; chips on completion
- Verify `groq/compound` vs `compound-beta` IDs against live API

### Out of Scope
- Remote MCP (Nivel 2), local tool calling (Nivel 3), multi-modal (Nivel 4)
- `search_settings` config UI — eliminated

## Capabilities

### New Capabilities
- `built-in-tool-visibility`: Display `executed_tools` as chips + collapsible detail with truncation
- `built-in-tool-control`: Per-chat tool toggles, provider-adaptive panel, persistence, payload injection

### Modified Capabilities
- None (no existing specs in `openspec/specs/`)

## Approach

Add optional `toolsConfig?` to `payloadBuilder` (`providers.ts:20-24`); 6 providers ignore, Groq uses. Compound: inject `compound_custom.tools.enabled_tools`. GPT-OSS: inject `tools` array. Remove `search_settings` unconditionally. Parse `choices[0].message.executed_tools` → `ChatMessageType.executedTools?` (additive). Render chips + collapsible in `ChatMessage`. Store tool state per chat in localStorage.

## Affected Areas

| Area | Impact |
|------|--------|
| `src/config/providers.ts` | Remove `search_settings`; add `toolsConfig?`; inject `compound_custom`/`tools` |
| `src/components/chat/ChatContainer.tsx` | Parse `executed_tools`; pass `toolsConfig`; streaming indicator |
| `src/interfaces/chat/chatTypes.ts` | Add `executedTools?` + `toolConfig?` (additive) |
| `src/components/chat/ChatMessage.tsx` | Chips + expandable detail with truncation |
| `src/components/HEADER/menu/RightMenu.tsx` | Tool toggle panel, provider-adaptive |
| `src/components/HEADER/models/groqModels.ts` | Verify IDs; `supportsBuiltinTools` flag |
| `src/App.tsx` | Plumb per-chat tool config state |

## Risks

| Risk | Mitigation |
|------|------------|
| Model IDs wrong (`compound` vs `compound-beta`) | Live smoke test before implementation |
| `executed_tools` shape varies by type | Generic renderer + graceful fallback |
| `payloadBuilder` sig touches 7 providers | Optional param — 6 no-op |
| No test runner | `typecheck` + `lint` + manual smoke test |

## Rollback Plan

Revert all changes — additions are optional/additive. localStorage tool keys ignored by old code.

## Dependencies

- Groq API (compound models + built-in tools)

## Success Criteria

- [ ] `search_settings` removed from Groq payloadBuilder
- [ ] Compound responses show tool chips + expandable detail
- [ ] Tool toggles persist per chat and affect payload
- [ ] Non-compound: disabled controls + tooltip
- [ ] GPT-OSS: only `browser_search` + `code_interpreter`
- [ ] `bun run typecheck` + `bun run lint` pass
