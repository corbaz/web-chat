# Web Search Capability Indicator Specification

## Purpose

Classify which chat models natively support provider-hosted web browsing and surface a globe indicator for them. Native-only: no external or app-level fallback, and prompt wording alone never means browsing. The globe communicates "native search is available", not "a search will run".

## Requirements

### Requirement: Native-only capability classification

A model MUST be classified `supportsWebSearch` only when its browsing is provider-hosted AND provider-documented or verified. Prompt text, instructions, or client heuristics MUST NOT count as browsing. The system MUST NOT fall back to external or app-level search for incapable models.

#### Scenario: Prompt wording does not imply browsing

- GIVEN a model with `supportsWebSearch = false`
- WHEN a prompt contains "search the web" or similar wording
- THEN no globe or toggle appears and no native search is injected

#### Scenario: No external fallback

- GIVEN an unsupported or unknown model
- WHEN the user asks a time-sensitive question
- THEN no external or app-level search fallback runs and no globe is shown

### Requirement: Globe indicator visibility

The globe MUST show for verified or provider-documented capable models and MUST hide for unsupported, unknown, and unverified models.

#### Scenario: Verified-capable model shows globe

- GIVEN a model whose native browsing is verified or provider-documented
- WHEN the model renders in the selector, header menu, and active chat
- THEN the globe appears next to the model name

#### Scenario: Unknown or unverified model hides globe

- GIVEN a model that is unknown, unsupported, or unverified
- WHEN the model renders anywhere in the UI
- THEN the globe is hidden

### Requirement: Compound always-on without operable toggle

`groq/compound` MUST present an always-on globe indicator and MUST NOT render an operable on/off composer toggle. The toggle MUST be hidden so `aria-pressed=false` is never exposed for `groq/compound`. `groq/compound-mini` MUST hide the globe and control until its execution and disable behavior are verified.

#### Scenario: Compound shows always-on globe, no toggle

- GIVEN `groq/compound` is selected
- WHEN the composer renders
- THEN the globe shows always-on, the on/off toggle is hidden, and `aria-pressed=false` is never rendered

#### Scenario: compound-mini hidden pending verification

- GIVEN `groq/compound-mini` with unverified execution or disable behavior
- WHEN it is rendered
- THEN the globe and control are hidden

### Requirement: Capability does not guarantee a search

The indicator MUST communicate availability, not execution. Per-request search remains provider-autonomous unless a verified force mode is engaged.

#### Scenario: Indicator promises availability only

- GIVEN a verified-capable model with the globe visible
- WHEN the user submits a request
- THEN the UI does not promise that a search ran
- AND provider autonomy over each request is preserved

### Requirement: RouteLLM and OpenCode deferred

RouteLLM and OpenCode (Go/Free) models MUST NOT show a globe or control until native capability is verified. They are deferred, never provisionally enabled.

#### Scenario: RouteLLM/OpenCode hidden until verified

- GIVEN a RouteLLM or OpenCode model
- WHEN it is rendered or selected
- THEN no globe and no composer control appear

### Requirement: Verification gates are spec-neutral

Provider verification gates MUST be required before that provider's apply slice, NOT before this spec. Unresolved gates yield hidden or runtime-gated capability, not a spec blocker.

#### Scenario: Unresolved gate does not block spec

- GIVEN a provider whose verification gate is unresolved
- WHEN this spec is evaluated
- THEN the spec is acceptable and the provider's capability is marked hidden or runtime-gated
