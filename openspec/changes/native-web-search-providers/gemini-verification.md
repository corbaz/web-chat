# Gemini Web Search Verification

**Date:** 2026-07-21  
**API:** Gemini REST (`x-goog-api-key` from environment; secret not persisted)  
**Evidence rule:** current-looking text alone is insufficient. Navigation is confirmed only by Google Search execution metadata plus source annotations/chunks.

## Catalog Check

`GET /v1beta/models` returned all five configured IDs with `generateContent` support:

- `gemini-3.5-flash`
- `gemini-3.1-flash-lite`
- `gemini-2.5-flash`
- `gemini-2.5-flash-lite`
- `gemini-flash-latest`

## Probe Matrix

Three domain-constrained current-information prompts were used: latest Clarín headline, latest La Nación headline, and today's Ámbito dollar-blue quote.

| Model | Route | Observed evidence | Verdict |
|---|---|---|---|
| `gemini-3.5-flash` | `generateContent` | 0/3 sourced runs; `MAX_TOKENS`/`MALFORMED_FUNCTION_CALL` | Wrong route for app search |
| `gemini-3.5-flash` | `v1beta/interactions` | 2/2 completed; 4 then 7 search calls; 4 citations each | Verified |
| `gemini-3.1-flash-lite` | `generateContent` | Search sources in 2/3 runs | Verified, variable grounding |
| `gemini-2.5-flash` | `generateContent` | Grounding in 3/3; source URLs in 2/3 | Verified |
| `gemini-2.5-flash-lite` | `generateContent` | Grounded sources; one transient HTTP 503 | Verified, transient capacity risk |
| `gemini-flash-latest` | `generateContent` | One sourced run, one unsourced `MAX_TOKENS`, one timeout | Verified, unstable alias |

## Implementation Result

- Every search-enabled Gemini request now uses `POST /v1beta/interactions` with `tools: [{"type":"google_search"}]`; `generateContent` is retained only when the search switch is off.
- Interaction `model_output` text and URL annotations are normalized through the existing provider hooks.
- Duplicate interaction citations are removed.
- `gemini-flash-latest` is no longer mislabeled as Gemini 1.5 Flash.
- `generateContent` parsing joins every visible, non-thought text part instead of reading only `parts[0]`.
- Search-enabled Gemini requests include the current Buenos Aires date and require Google Search for time-sensitive facts.
- Gemini requests explicitly preserve conversational continuity across model switches and resolve short follow-ups from recent turns before asking for clarification.
- With search enabled, Gemini is instructed to run Google Search before every answer; ambiguous sports queries default to the most recent match and must identify date and competition.
- Empty provider responses are rejected and surfaced as an explicit error instead of being stored as blank assistant messages.
- For time-sensitive Gemini conversations, responses without sanitized source citations are discarded instead of being presented as verified current facts.
- Interactions token usage reads `usage.total_input_tokens` and `usage.total_output_tokens` instead of displaying zero output tokens.

## Credential Observation

The environment key passed the catalog and multi-model probes, then later returned `API_KEY_INVALID`. This is an external credential state change, not a model-routing result. No key value was persisted in this report or in source.

## Verification

- `bun run lint`: passed (existing warnings remain non-blocking).
- `bun run typecheck`: passed.
- `bun run build`: passed.
