# React Doctor Top 3 Remediation Specification

## Purpose

Define observable remediation and acceptance for the selected React Doctor findings without changing application behavior, suppressing diagnostics, or disturbing unrelated work.

## Requirements

### Requirement: Fixed Remediation Scope

The remediation MUST handle exactly three root-cause groups representing four diagnostic records, and MUST leave the other 29 records as follow-up.

#### Scenario: Scope is reported

- GIVEN the remediation is complete
- WHEN its outcome is reviewed
- THEN exactly three groups and four records are accounted for
- AND the remaining 29 records are identified as follow-up.

### Requirement: Truthful Crypto Diagnostic Handling

The crypto group MUST rebuild `docs`, establish canonical provenance for each finding, and MUST NOT manually edit generated or dependency-owned files. It MUST run `npx react-doctor@latest --verbose` before any subsequent group. A finding MUST be cleared only when absent from that real latest output; otherwise it MUST remain truthfully recorded as an unresolved verified false positive without suppression.

#### Scenario: Latest output clears findings

- GIVEN rebuilt output and provenance checks are complete
- WHEN the exact latest verbose command no longer reports both records
- THEN the crypto group is recorded as cleared.

#### Scenario: Generated or dependency false positive remains

- GIVEN provenance attributes a reported record to generated or dependency-owned content
- WHEN the exact latest verbose output still reports it
- THEN it remains unresolved and documented as a verified false positive
- AND no source, generated file, dependency file, or scanner suppression is changed for it.

#### Scenario: Gate blocks later work

- GIVEN the crypto rebuild, provenance checks, or latest verbose run is incomplete
- WHEN Group 2 is considered
- THEN Group 2 MUST NOT begin.

### Requirement: Unused Dependency Removal

The remediation MUST remove runtime dependency `react-syntax-highlighter` and type dependency `@types/react-syntax-highlighter`, keep `package.json` and `bun.lock` consistent, and rebuild `docs`. Rendered Markdown behavior MUST remain unchanged.

#### Scenario: Dependency group succeeds

- GIVEN both packages are unused
- WHEN the dependency group completes
- THEN both manifests omit them, the lock is consistent, and docs are rebuilt
- AND Markdown behavior is observably unchanged.

#### Scenario: Package state is inconsistent

- GIVEN either package remains in a manifest or lock resolution
- WHEN the group is checked
- THEN the group remains incomplete and MUST NOT claim acceptance.

### Requirement: Fast Refresh Boundary

The remediation MUST extract `APP_VERSION` while preserving its build-time injection and fallback behavior. `App`, `ApiKeyModal`, and `PieBrand` MUST import it from the extracted module, `App.tsx` MUST export components only, and the resulting module boundary MUST satisfy Fast Refresh.

#### Scenario: Version behavior is preserved

- GIVEN injected and non-injected builds
- WHEN each consumer displays or uses `APP_VERSION`
- THEN every consumer observes the same injected value or fallback as before.

#### Scenario: Boundary remains invalid

- GIVEN `App.tsx` still exports a non-component value or a consumer uses the old export
- WHEN the boundary is inspected
- THEN the group remains incomplete.

### Requirement: Serial Read-Only Acceptance

Groups MUST execute serially. After each group, checks MUST run serially as `bun run typecheck`, `bunx biome lint src`, `bun run format:check`, `bun run build`, then `npx react-doctor@latest --verbose`; only that exact latest output MUST determine diagnostic state. Mutating lint MUST NOT run.

#### Scenario: Group passes acceptance

- GIVEN a group change is complete
- WHEN all checks run in order and succeed
- THEN its exact latest verbose output is retained as that group's acceptance state.

#### Scenario: A check fails

- GIVEN a serial check fails
- WHEN acceptance is evaluated
- THEN the group remains unaccepted and subsequent groups MUST NOT begin.

### Requirement: Worktree and Rollback Safety

The remediation MUST preserve pre-existing dirty-tree changes, distinguish generated output from authored changes, and support independent rollback of each group without resetting unrelated work.

#### Scenario: Existing changes survive

- GIVEN unrelated authored or generated changes exist before remediation
- WHEN any group completes or rolls back
- THEN those pre-existing changes remain unchanged.

#### Scenario: One group is rolled back

- GIVEN multiple groups have changes
- WHEN one group is reverted
- THEN only that group's owned authored and generated deltas are removed.
