# Design: React Doctor Top 3

## Technical Approach

Execute three gated groups serially from repository root `C:\www\web-chat`, preserving the dirty tree and exactly four selected records; 29 records remain follow-up. Evidence lives under `%TEMP%\react-doctor-top-3\<run>\group-N\`. Each group owns only its authored/package delta. `docs/` is one cumulative final-build snapshot, never independently owned or restored per group.

## Architecture Decisions

| Option | Tradeoff | Decision / rationale |
|---|---|---|
| Change crypto-like values | Silences correct behavior/vendor output | Reject. Prove provenance against canonical secret contexts; never suppress or patch source/vendor/generated assets. |
| Bun package removal | May prune reachable lock entries | Run `bun remove --ignore-scripts react-syntax-highlighter @types/react-syntax-highlighter`; never update/upgrade. Accept only removal-reachable lock metadata and unchanged unrelated direct versions, then `bun install --frozen-lockfile --ignore-scripts`. |
| Extract version constant | Adds a leaf module | Preserve the exact expression in `src/constants/appVersion.ts`; `App.tsx` becomes component-only. |

## Work Units, Data Flow, and Rollback

1. **Crypto provenance (0 authored lines):** before build, snapshot docs as specified below. Trace `docs/assets/index-DvIl3LL9.js:287` to `src/components/chat/ChatContainer.tsx` non-secret chat/message/error/request-correlation IDs. Trace `docs/assets/vendor-CmjH2uL2.js:8` to installed `react-dom@19.2.7`, specifically private collision-avoidance DOM keys such as `__reactFiber$...` and `_reactListening...`. Compare each use against the canonical secret-context list: token, secret, password, nonce, salt, CSRF value, credential, OTP. Retain generated/vendor locations, package version, provenance, and latest scanner output.
2. **Dependency cleanup (~2 manifest lines plus lock metadata):** remove both packages via the exact Bun commands, verify absence from manifest/lock, rebuild, and smoke Markdown headings, GFM table/list/link rendering through `MarkdownRenderer`.
3. **Fast Refresh (~8–15 authored lines/imports):** preserve this graph unchanged: `vite.config.ts define` → global `__APP_VERSION__` in `src/vite-env.d.ts` → `src/constants/appVersion.ts` → `App`, `ApiKeyModal`, `PieBrand`. Preserve fallback `'v.development'`; `App.tsx` exports only `App`.

Authored total is ~10–17 lines, far below 400. Generated docs are excluded from authored forecast but included in complete snapshot evidence. To roll back one group, revert only its authored/package delta, then rebuild from remaining current source so later groups' generated output survives. No commits, staging, reset, checkout, broad formatting, or unrelated edits.

## Generated-Docs Transaction

Immediately before **every** `bun run build`, record a sorted docs manifest with SHA-256 hashes and copy the complete `docs/` pre-image outside the repository into the group evidence directory. If the build fails, or post-build comparison shows unexplained loss unrelated to the current source/package delta, restore that pre-image and stop. On success, hashed asset replacement is accepted only as reproducible output of current source; never manually merge, delete, or edit generated assets.

## Serial Acceptance and Outcome Contract

Run exactly, serially, after each group; stop on nonzero exit:

```powershell
bun run typecheck
bunx biome lint src
bun run format:check
bun run build
npx react-doctor@latest --verbose
```

Biome and format checks are read-only; never run `bun run lint`. A rebuilt, provenance-verified crypto finding that remains in the completed latest run is a completed-but-not-cleared verified false positive, **not** an acceptance failure; later groups may continue. Only incomplete or failed commands/provenance block. React Doctor 0.7.8 is baseline evidence only. Retain transcripts, status, owned-file hashes, docs manifests/hashes, diffs, smoke notes, and latest output externally.

External canonical evidence is refreshed with:

```powershell
$stamp=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(); curl.exe -L -H "Cache-Control: no-cache" -H "Pragma: no-cache" "https://react.doctor/docs/rules/react-doctor/insecure-crypto-risk?cachebust=$stamp"
$stamp=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(); curl.exe -L -H "Cache-Control: no-cache" -H "Pragma: no-cache" "https://react.doctor/docs/rules/react-doctor/only-export-components?cachebust=$stamp"
```

## File Changes

| File | Action |
|---|---|
| `package.json`, `bun.lock` | Remove dependency pair |
| `src/constants/appVersion.ts` | Create version contract |
| `src/App.tsx`, `src/components/ApiKeyModal/ApiKeyModal.tsx`, `src/components/HEADER/menu/PieBrand.tsx` | Redirect boundary/imports |
| `docs/` | Reproducible cumulative build snapshot |

## Threat Matrix

| Boundary | Applicability | Safe/failure behavior; planned RED test |
|---|---|---|
| Documentation-like paths | Applicable: executable HTML/JS | Build-only; unexpected loss restores backup and blocks. RED: unrelated docs pre-image survives failed build. |
| Git repository selection | Applicable | Exact root required. RED: wrong cwd blocks before mutation. |
| Commit state | N/A: no stage/commit | No task. |
| Push state | N/A: no push | No task. |
| PR commands | N/A: no PR | No task. |
| Package/process | Applicable | Exact args, ignored scripts, serial gates. RED: lifecycle/drift/nonzero blocks. |
| Generated output | Applicable | Current-source reproducibility only. RED: single-unit rollback plus rebuild preserves later output. |

## Migration / Open Questions

No migration, feature flag, commits, or open questions.
