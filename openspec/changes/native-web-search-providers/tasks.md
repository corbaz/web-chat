# Tasks: Native Web Search Providers

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1100 lines |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | S1 (Globe) → S2 (Toggle) → S3 (Gemini/Anthropic) → S4 (OpenAI Responses) |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Globe & RightMenu | PR 1 | bun run typecheck | bun run dev | src/config/webSearch.ts |
| 2 | Toggle & Cache | PR 2 | bun run typecheck | bun run dev | src/components/FOOTER/Footer.tsx |
| 3 | Gemini & Anthropic | PR 3 | bun run typecheck | bun run dev | parseCitations |
| 4 | OpenAI Responses | PR 4 | bun run typecheck | bun run dev | openaiResponses |

## Phase 1: Infrastructure & Indicator

- [ ] 1.1 Create `src/config/webSearch.ts` with `supportsWebSearch`, capability types, and `sanitizeCitations`.
- [ ] 1.2 Modify `src/components/HEADER/ModelSelector.tsx` to render globe for capable models using custom `components.Option`/`SingleValue`.
- [ ] 1.3 Modify `src/components/HEADER/menu/RightMenu.tsx` to extend model filter to all 7 providers and render globe next to capable model names.
- [ ] 1.4 Add `Citation` type and optional properties to `src/interfaces/chat/chatTypes.ts`.

## Phase 2: Composer Control & Runtime Cache

- [ ] 2.1 Add `searchEnabled` and `preflight?` to `ProviderConfig` in `src/config/providers.ts`.
- [ ] 2.2 Lift `searchEnabled` per-chat state in `src/App.tsx` and persist in `TOOLS_STORAGE_KEY[chatId]`.
- [ ] 2.3 Modify `src/components/FOOTER/Footer.tsx` to render composer search toggle when `supportsWebSearch(selectedModel)`.
- [ ] 2.4 Modify `src/components/chat/ChatContainer.tsx` to pass `searchEnabled` state to `payloadBuilder`.

## Phase 3: Gemini & Anthropic Integration

- [ ] 3.1 Implement `payloadBuilder` injection of `google_search` in `src/config/providers.ts` for Gemini.
- [ ] 3.2 Implement `payloadBuilder` injection of `web_search_20250305` in `src/config/providers.ts` for Anthropic.
- [ ] 3.3 Implement `parseCitations` for Gemini and Anthropic in `src/config/providers.ts`.
- [ ] 3.4 Modify `src/components/chat/ChatMessage.tsx` to render "Fuentes" section with safe link formatting.
- [ ] 3.5 Modify `src/components/chat/ChatArea.tsx` to display "Buscando en la web..." in the polite live region.

## Phase 4: OpenAI Responses API

- [ ] 4.1 Migrate OpenAI endpoint in `src/config/providers.ts` to `/v1/responses` when `searchEnabled` and proxy are active.
- [ ] 4.2 Update OpenAI `payloadBuilder` to include `web_search` tool and parse the citation annotations.
