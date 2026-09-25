# Native Web Search Injection Specification

## Purpose

Inject each provider's native web-search tool, parse citations, persist per-chat `searchEnabled` for capable non-Compound models; Groq reuses groq-builtin-tools.

## Requirements

### Requirement: Composer toggle and per-chat persistence

The toggle MUST appear only for a truthful on/off state, hiding for Compound, unsupported/unknown, and unresolved providers; `aria-pressed=false` MUST NOT render for Compound. `searchEnabled` MUST persist inside `TOOLS_STORAGE_KEY[chatId]` with no new key, falling back to in-memory on write failure.

#### Scenario: Toggle visible, Compound no-toggle, switch

- GIVEN a capable non-Compound, `groq/compound`, or unsupported model
- WHEN the composer renders, then the user switches
- THEN toggle shows for capable, hides for Compound (no `aria-pressed=false`), re-evaluates on switch

#### Scenario: Persistence writes or falls back

- GIVEN a chat with `TOOLS_STORAGE_KEY[chatId]` storage
- WHEN the user toggles search on
- THEN `searchEnabled: true` writes to that entry, or stays in memory on failure

### Requirement: Native request injection and runtime gating

With `searchEnabled = true`, the provider's native tool MUST be injected; with `searchEnabled = false`, none is injected. OpenAI `web_search` MUST be gated on valid credentials AND a working proxy; Anthropic direct-browser requires a valid client-side API credential, never credentialless.

#### Scenario: Gemini and Anthropic injection

- GIVEN a verified Gemini or Anthropic model, `searchEnabled = true`
- WHEN the request is built
- THEN `google_search` or `web_search_20250305` is injected

#### Scenario: OpenAI Responses injection

- GIVEN verified OpenAI Responses model, valid credentials, working proxy, `searchEnabled = true`
- WHEN the request is built
- THEN `web_search` is injected into the Responses payload

#### Scenario: Groq reuses and searchEnabled false injects none

- GIVEN `groq/compound`, or a capable non-Compound model, `searchEnabled = false`
- WHEN the request is built
- THEN Groq reuses groq-builtin-tools, or no native search tool is injected

#### Scenario: OpenAI proxy or credentials missing hide capability

- GIVEN an OpenAI model with no valid credentials or unreachable proxy
- WHEN rendered or a request is attempted
- THEN globe and toggle hide at runtime

#### Scenario: Anthropic direct-browser requires client-side credential

- GIVEN an Anthropic model with no server credentials
- WHEN a valid client-side API credential with direct-browser access exists or not
- THEN the direct-browser path is used, or globe and toggle hidden

### Requirement: Citations, safe links, and no secret exposure

Provider citations MUST be parsed into a normalized `Citation[]` with escaped, `http`/`https`-only links and no secret exposure; malformed or absent citations MUST NOT crash or render empty sources.

#### Scenario: Normalized, escaped, http/https-only citations

- GIVEN an Anthropic `citations[]` response, or a special/non-http(s) URL (`javascript:`, `data:`)
- WHEN parsed and rendered
- THEN a normalized `Citation[]` renders under "Fuentes", escaped, and non-http(s) citations rejected

#### Scenario: Absent, empty, malformed citations safe and no secret

- GIVEN a response with no/empty or malformed Gemini `groundingMetadata`, Anthropic `citations[]`, or OpenAI `url_citation`, or echoing credentials
- WHEN parsed and rendered
- THEN no "Fuentes" renders, safe empty fallback, no crash, no secret in UI or citations

### Requirement: UX states, accessibility, and mobile

The system MUST independently surface "searching" in flight, "search incomplete" for Anthropic `pause_turn`, and provider errors without crashing; all surfaces MUST be keyboard reachable and mobile-usable.

#### Scenario: Searching in flight

- GIVEN a capable model with `searchEnabled = true`
- WHEN a native-search request is in flight
- THEN the composer surfaces a "searching" state

#### Scenario: pause_turn or provider error surfaced

- GIVEN an Anthropic `pause_turn` or failed provider search
- WHEN parsed or received
- THEN shows "search incomplete" (no loop) or surfaces the error, remaining usable

#### Scenario: Keyboard-reachable toggle

- GIVEN the composer toggle is visible
- WHEN the user navigates by keyboard
- THEN the toggle is reachable, operable, and labeled

#### Scenario: Mobile-width usable

- GIVEN the composer renders at mobile widths
- WHEN globe, toggle, citations, and states are visible
- THEN they remain operable, labeled, readable
