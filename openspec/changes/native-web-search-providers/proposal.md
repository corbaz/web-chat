# Proposal: Native Web Search Providers

**Relationship:** `dependsOn: groq-builtin-tools`; reuses Slice 1 infra; NOT supersede/amend. `searchEnabled` at `TOOLS_STORAGE_KEY[chatId]` (no parallel key). `compound-mini` hidden until disable verified; RouteLLM unsupported via proxy. **Credentials:** Groq/Gemini/OpenCode live-probable; Anthropic credential-gated (direct-browser exists); OpenAI alone credential + proxy gated; no secrets exposed.

## Intent
Globe = provider-native browsing; toggle exposes **native search is available**. Native only; no fallback; prompt wording alone NEVER counts as browsing. Capability != guaranteed — never promise "runs a search". Compound always-on (`enabled_tools:[]`=all-on): no false off; `compound-mini` hidden until verified.

## Scope
**In:** Gemini/Anthropic/OpenAI-Responses injection + citation parsing (Anthropic `pause_turn`="search incomplete"; OpenAI proxy-gated); `webSearch.ts`; globe + toggle; `parseCitations?`; "Fuentes"; `searchEnabled` at `TOOLS_STORAGE_KEY[chatId]`. Unsupported/unknown: no control.
**Out:** external/app search; prompt simulation; RouteLLM globe; OpenCode Go/Free, `compound-mini`, PROVISIONAL globe; `pause_turn` loop; Gemini Interactions; 5th `payloadBuilder` param.

## Capabilities
**New** `web-search-capability-indicator`: globe + `supportsWebSearch` classification. **New** `native-web-search-injection`: toggle + per-provider injection + `parseCitations?` + `searchEnabled`. **Modified:** none.

## Approach
Central `webSearch.ts` capability set + composer toggle extending `ToolConfig` (no 5th param); per-provider native tool injection in `payloadBuilder`; normalized `Citation[]` via `parseCitations?` parallel to `parseExecutedTools?`. `parseCitations` seam in providers/webSearch normalization (NOT `groqTools.ts`); Groq derives from `parseExecutedTools`. Gemini `generateContent`+`google_search`; OpenAI Responses (proxy-gated); Anthropic `web_search_20250305` (`pause_turn`="search incomplete"). Sliced <=400 lines (feature-branch-chain): 1. Globe (~150) -> S1; 2. Toggle+Gemini/Anthropic (~350) -> S1; 3. OpenAI Responses (~300) -> S2. Deferred: RouteLLM; OpenCode Go/Free; `compound-mini`.

## Affected Areas
`src/config/webSearch.ts` (New): capability set, `supportsWebSearch`, `Citation`. `src/config/providers.ts` (Modified): non-Groq `payloadBuilder` inject native tool; `parseCitations?` hook. `src/components/HEADER/ModelSelector.tsx` (Modified): `components.Option`/`SingleValue` globe. `src/components/HEADER/menu/RightMenu.tsx` (Modified): globe by `model.name`. `src/components/FOOTER/Footer.tsx` (Modified): composer toggle. `src/App.tsx` (Modified): lift `searchEnabled`; persist; plumb. `src/components/chat/ChatContainer.tsx` (Modified): pass `searchEnabled` to `payloadBuilder`. `src/components/chat/ChatMessage.tsx` (Modified): "Fuentes" section. `src/interfaces/chat/chatTypes.ts` (Modified): `Citation`, `searchEnabled?` on `ToolConfig`.

## Risks
Compound false off (Med): always-on globe, toggle hidden. `compound-mini` unverified (Low): hidden. OpenAI proxy breaks Responses (Med): gated, rollback. `pause_turn` loop (Low): "search incomplete".

## Verification gates
Gates specified before implementation MUST pass before that provider's sdd-apply slice, NOT before sdd-spec. Unresolved OpenAI/Anthropic gates yield hidden/runtime-gated capability, not a spec blocker. Gemini: `google_search`+`groundingMetadata` vs Interactions; OpenAI: `web_search`+proxy; Anthropic: `pause_turn` on Claude 4.x; `groq/compound-mini`: execution+disable.

## Rollback
Mostly additive. **Slice 1+2:** revert; `payloadBuilder`->`undefined`; `searchEnabled` ignored; globe gone. **Slice 3 (OpenAI Responses) — conditional:** if Responses replaces Chat Completions routing, restore prior path + proxy before disabling `web_search`.

## Dependencies
- `groq-builtin-tools` Slice 1 (applied): 4th `payloadBuilder` param, `parseExecutedTools?`, `TOOLS_STORAGE_KEY`.
- Proxy for OpenAI Responses `web_search`.

## Success criteria
- [ ] Globe only for verified/provider-documented-capable (hidden: unsupported/unknown/`compound-mini`); Compound always-on; toggle only when `supportsWebSearch` AND not Compound; Gemini `groundingMetadata`, Anthropic `citations[]`, OpenAI `url_citation` (proxy-gated); `searchEnabled` at `TOOLS_STORAGE_KEY[chatId]`.
- [ ] Prompt wording alone never triggers browsing; UX: "native search is available"; `bun run typecheck`+`bunx biome lint src` (read-only)+`bun run format:check` pass.
