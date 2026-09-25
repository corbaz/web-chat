# Built-In Tool Control Specification

## Purpose

Provide per-chat, provider-adaptive toggles for Groq built-in tools, persist settings per chat in localStorage, and inject the selected tools into the Groq payload — replacing the broken `search_settings` mechanism.

## Requirements

### Requirement: Per-Tool Toggles

The system MUST provide an individual on/off toggle for each built-in tool the selected model supports.

#### Scenario: Toggle a tool off

- GIVEN a compound model is selected with `web_search` enabled
- WHEN the user toggles `web_search` off
- THEN the next payload sent to Groq excludes `web_search` from enabled tools

### Requirement: Provider-Adaptive Tool Set

The panel MUST show 4 tools (`web_search`, `code_interpreter`, `visit_website`, `wolfram_alpha`) for compound models, and 2 tools (`browser_search`, `code_interpreter`) for GPT-OSS models.

#### Scenario: Compound model selected

- GIVEN `groq/compound` is selected
- WHEN the tool panel renders
- THEN four toggles appear: `web_search`, `code_interpreter`, `visit_website`, `wolfram_alpha`

#### Scenario: GPT-OSS model selected

- GIVEN a GPT-OSS model is selected
- WHEN the tool panel renders
- THEN two toggles appear: `browser_search`, `code_interpreter`

### Requirement: Payload Injection

The system MUST inject enabled tools via `compound_custom.tools.enabled_tools` for compound models and via the `tools` array for GPT-OSS models.

#### Scenario: Compound payload

- GIVEN a compound model with `web_search` and `wolfram_alpha` enabled
- WHEN the payload is built
- THEN `compound_custom.tools.enabled_tools` contains `["web_search", "wolfram_alpha"]`

#### Scenario: GPT-OSS payload

- GIVEN a GPT-OSS model with `code_interpreter` enabled
- WHEN the payload is built
- THEN the `tools` array contains the `code_interpreter` definition

### Requirement: Non-Tool Groq Model Handling

For Groq models that do not support built-in tools, toggles MUST be disabled (greyed out) with a tooltip "Requiere modelo compound".

#### Scenario: Non-compound Groq model

- GIVEN `llama-3.3-70b-versatile` is selected
- WHEN the tool panel renders
- THEN all toggles are disabled and greyed out
- AND hovering shows "Requiere modelo compound"

### Requirement: Other Provider Handling

For non-Groq providers, the tool panel MUST be hidden entirely.

#### Scenario: Non-Groq provider selected

- GIVEN a non-Groq provider (e.g. openai, anthropic) is selected
- WHEN the menu renders
- THEN no tool panel is visible

### Requirement: Per-Chat Persistence

Tool toggle state MUST persist per chat in localStorage and be restored when switching back to that chat.

#### Scenario: Persist and restore

- GIVEN a chat has `web_search` off and `code_interpreter` on
- WHEN the user switches to another chat and back
- THEN the original toggle state is restored

#### Scenario: New chat defaults

- GIVEN a new chat is created with a compound model
- WHEN the tool panel renders
- THEN all supported tools default to enabled

### Requirement: Search Settings Removal

The Groq `payloadBuilder` MUST NOT include `search_settings` in any payload, for any model.

#### Scenario: Compound model payload

- GIVEN a compound model request is built
- WHEN the payload is inspected
- THEN no `search_settings` key is present

#### Scenario: Non-compound Groq payload

- GIVEN a non-compound Groq model request is built
- WHEN the payload is inspected
- THEN no `search_settings` key is present

### Requirement: Model ID Correctness

The system MUST use model identifiers accepted by the live Groq API for compound models (the configured `groq/compound` vs `compound-beta` IDs MUST be verified against the live API).

#### Scenario: Compound model request succeeds

- GIVEN the configured compound model ID
- WHEN a request is sent to the Groq API
- THEN the API accepts the model ID without a 404 or model-not-found error
