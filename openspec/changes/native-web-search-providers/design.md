# Design: Native Web Search Providers

## Technical Approach

`src/config/webSearch.ts` keys capability by `(provider, model)`; reuses groq Slice 1 seam (`ToolConfig`, `TOOLS_STORAGE_KEY`, 4th `payloadBuilder` param, `parseExecutedTools?`). Adds `searchEnabled?` on `ToolConfig`; optional `buildRequest?`/`parseCitations?`/`parseSearchState?`/`preflight?` on `ProviderConfig`. Globe/toggle truth = static `supportsWebSearch` AND cached `RuntimeCapability` populated by an effect/preflight — NEVER a network call in render.

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Capability key | `(provider, model)` tuple | collision-free cross-provider |
| Runtime readiness | cached `RuntimeCapability` via `preflight?` effect | no network in render |
| Request adapter | `buildRequest?`→{url,body,parser}|null; fallback `endpoint`+`payloadBuilder` | Responses MUST NOT rely on `endpoint(model)` seeing `searchEnabled` |
| OpenAI Responses | switch when `searchEnabled && proxy && credential && runtime=available`; parse `output[].content[].text`+`output[].url_citation.url`; rollback on 404/non-Responses (Threat Matrix) | gate; preserves Chat Completions |
| Security log | remove `errorResponse` body (`:673`); keep status+`Object.keys` | bodies may echo secrets |
| Citation safety | `sanitizeCitations`: http/https only, strip URL userinfo+sensitive query, redact active API-key in url/title/snippet, escaped | remote metadata may carry keys |
| Compound | `searchEnabled` ignored; effective ToolConfig forces `web_search`+`browser_search`; no operable off | API contract `enabled_tools:[]`=all-on |
| `compound-mini` | hidden | disable unverified |

## Data Flow

```
Client ──→ CapabilityCache[preflight? effect] ──→ RequestAdapter[buildRequest?]
  ──→ Provider ──→ Normalizer[parseCitations? → sanitizeCitations] ──→ UI[Fuentes + aria-live]
```

Render reads `getWebSearchCapability(provider, model, runtime)`; effect calls `preflight?` per provider+model, caches in ref/store. Toggle writes `searchEnabled` to `TOOLS_STORAGE_KEY[chatId]`. Preflight: OpenAI=proxy+`openaiApiKey`; Anthropic=`anthropicApiKey`; Gemini=`geminiApiKey`; Groq=static.

## File Changes

| File | Action | Description |
|---|---|---|
| `src/config/webSearch.ts` | Create | capability types, `getWebSearchCapability`, `canUseNativeSearchToggle`, `sanitizeCitations` |
| `src/interfaces/chat/chatTypes.ts` | Modify | `Citation`; `searchEnabled?`/`citations?`/`searchState?` |
| `src/config/providers.ts` | Modify | optional `buildRequest?`/`parseCitations?`/`parseSearchState?`/`preflight?`/`supportsWebSearch?`; inject; Responses |
| `HEADER/ModelSelector.tsx` | Modify | decorative globe `aria-hidden`+sr-only capability text |
| `HEADER/menu/RightMenu.tsx` | Modify | add `geminiModels`+`opencodeFreeModels`+`opengoModels`; globe next to name |
| `FOOTER/Footer.tsx` | Modify | `aria-pressed` toggle, 44px, `:focus-visible`; only when `canUseNativeSearchToggle`; hide Compound |
| `App.tsx` | Modify | lift `searchEnabled`; persist `TOOLS_STORAGE_KEY[chatId]`; runtime cache effect |
| `chat/ChatContainer.tsx` | Modify | 4th param `:551`; `buildRequest?`; `citations`/`searchState`; `aria-live` |
| `chat/ChatMessage.tsx` | Modify | "Fuentes" escaped `<a>`; "search incomplete" |
| `chat/ChatArea.tsx` | Modify | `aria-live="polite"` searching |

## Interfaces / Contracts

```ts
interface Citation { url; title?; snippet? }
type WebSearchCapability = 'always-on'|'toggleable'|'hidden'
type RuntimeCapability = 'unknown'|'checking'|'available'|'unavailable'
interface BuiltRequest { url; body; parser: 'gemini'|'anthropic'|'openai-responses'|'openai-chat'|'groq' }
// ProviderConfig (optional): buildRequest?→BuiltRequest|null; preflight?→Promise<RuntimeCapability>;
//   parseCitations?→Citation[]; parseSearchState?→'incomplete'|undefined; sanitizeCitations→Citation[]
// Shapes: Gemini tools:[{google_search:{}}]+candidates[].groundingMetadata.groundingChunks[].web;
//   Anthropic tools:[{type:'web_search_20250305'}]+content[].citations[]+stop_reason:'pause_turn'→incomplete;
//   OpenAI tools:[{type:'web_search'}]+output[].url_citation.url (gated). Groq reuses parseExecutedTools. try/catch→[]/undefined. No dangerouslySetInnerHTML.
```

## Testing Strategy

| Layer | What | How |
|---|---|---|
| Unit | `sanitizeCitations` rejects `javascript:`/`data:`/`http://u:p@`/`?api_key=`/echoed-key; `parseCitations` malformed→`[]`; no Compound `aria-pressed=false`; `buildRequest` null without gate | `typecheck`+`lint`+`format:check` (no runner) |
| Integration | Gemini inject on/off; Anthropic pause_turn→incomplete; OpenAI hidden without proxy/credential/preflight; Compound always-on | `bun run dev`+probes |
| Regression | groq toggles intact; magic-wand unchanged; no `errorResponse` body in console | `git diff`+manual |

## Threat Matrix

Reference (`skills/sdd-design/references/threat-matrix.md`):

| Boundary | Applicability | Reason |
|---|---|---|
| Documentation-like paths | N/A | no doc-like paths touched |
| Git repository selection | N/A | no git/cwd selection |
| Commit state | N/A | no commit/index automation |
| Push state | N/A | no push/refspec |
| PR commands | N/A | no PR composition |

Custom:

| Boundary | Cases | Response | RED |
|---|---|---|---|
| Provider routing | 404/proxy unreachable/credential missing/Chat-Completions shape | `buildRequest` null→Chat Completions; hide; rollback path+proxy before disabling `web_search` | `hidden` without gate; 404→rollback+hide |
| Remote metadata | `javascript:`/`data:`/`http://u:p@`/`?api_key=`/malformed shapes/echoed key | rejects+strips+redacts; try/catch→`[]`; escaped; no body log | each→null/empty/redacted |
| API credentials | key absent/proxy unset/key in error | gate on key+proxy+preflight; never log keys; remove body (`:673`); status+`Object.keys` | `hidden` when missing; no-key-in-console |
| Runtime preflight | network failure/stale cache/render-time fetch | effect-only; cached; render reads cache | render never awaits; stays `unknown`/`unavailable` |

## Implementation Slices (Feature Branch Chain)

No migration. `searchEnabled?` optional → backward-compatible. **Apply gates**: Gemini (before S3); Anthropic credential+`pause_turn` (before S3); OpenAI credential+proxy+preflight+Responses model (before S4). No credentials → hidden/pending, NOT falsely operational.

Verify per slice: `typecheck` && `lint` && `format:check`.

- **S1 Globe + RightMenu catalog (~250)** — `webSearch.ts`, `chatTypes.ts`, `ModelSelector`, `RightMenu`. Deps: groq S1. Rollback: revert; globe gone; no request change.
- **S2 Capability cache + security + Compound (~350)** — `providers.ts` preflight+`buildRequest?`; `App` runtime effect; `Footer` toggle; Compound forces `web_search`+`browser_search`; `compound-mini` hidden. Deps: S1. Rollback: revert; `payloadBuilder` ignores `searchEnabled`.
- **S3 Gemini + Anthropic injection (~300)** — `parseCitations`+`parseSearchState`; `ChatContainer` 4th param+`aria-live`; `ChatMessage` Fuentes. Deps: S2+Gemini probe; Anthropic credential+`pause_turn` (hidden until verified). Rollback: revert; no Fuentes.
- **S4 OpenAI Responses (~300)** — OpenAI `buildRequest` Responses switch+parser+rollback to Chat Completions; preflight needs proxy+credential+Responses model (hidden until verified). Deps: S2+S3+OpenAI probe. Rollback: restore Chat Completions+proxy, then disable `web_search`.

Each ≤400 changed lines, independent rollback, child PRs target previous branch.

## Open Questions

- `pause_turn` field; Responses proxy key+`/v1/responses` — verify when credentials available.
