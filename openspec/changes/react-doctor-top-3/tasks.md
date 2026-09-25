# Tasks: React Doctor Top 3

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~10–17 authored lines; generated `docs/` excluded but snapshot-bound |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | One uncommitted, three-unit serial sequence |
| Delivery strategy | single-pr |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

Execution contract: one uncommitted sequence; after each unit run, serially, `bun run typecheck` → `bunx biome lint src` → `bun run format:check` → `bun run build` → `npx react-doctor@latest --verbose`, stopping on nonzero. `docs/` is one cumulative final snapshot: no unit independently owns/restores it; authored/package rollback is followed by rebuild.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Prove crypto provenance | None | `npx react-doctor@latest --verbose` | N/A: diagnostic/build evidence only | No source delta; failed docs transaction restores pre-image |
| 2 | Remove unused packages | None | `bun install --frozen-lockfile --ignore-scripts` | `bun run dev`; Markdown heading/table/list/link smoke | `package.json`, `bun.lock`; rebuild current source |
| 3 | Repair Fast Refresh boundary | None | `bun run typecheck` | `bun run dev`; injected/fallback version and refresh-state smoke | Version module/imports only; rebuild current source |

## Unit 1: Crypto Provenance

- [x] 1.1 From exact root `C:\www\web-chat`, create `%TEMP%\react-doctor-top-3\<run>\group-1\`; RED-check wrong cwd blocks, then save pre-unit `git status --short`, binary diff, and diff stat.
- [x] 1.2 Run the first three read-only checks; immediately before build, save sorted SHA-256 `docs/` manifest and complete external pre-image. RED-check failed/unexplained-loss restoration preserves unrelated docs.
- [x] 1.3 Build, then save refreshed canonical rule, generated locations, `react-dom@19.2.7` ownership, and source/vendor traces; compare IDs/keys against token, secret, password, nonce, salt, CSRF, credential, and OTP contexts.
- [x] 1.4 Run and retain exact latest acceptance; record completed-cleared or completed-unresolved verified false positive. Gate Unit 2 only if verification/provenance is incomplete or failed.
- [x] 1.5 Save post-unit dirty-tree evidence, owned hashes, cumulative-docs manifest, command statuses, and plain-language teaching; no commits. Rollback owns no source and rebuilds remaining current source.

## Unit 2: Dependency Cleanup

- [x] 2.1 Create external `group-2` evidence and pre-unit dirty-tree diff; RED-check package lifecycle/drift/nonzero blocks before later work.
- [x] 2.2 Run `bun remove --ignore-scripts react-syntax-highlighter @types/react-syntax-highlighter`; prove both absent from `package.json`/`bun.lock`, unrelated direct versions unchanged, then run frozen ignored-script install.
- [x] 2.3 Run the first three checks; transactionally back up/manifest `docs/` immediately before build, then build and run exact latest acceptance.
- [x] 2.4 Smoke `MarkdownRenderer` headings, GFM table/list/link; retain transcript, post-diff, lock proof, cumulative-docs hashes, and plain-language teaching. No commits; source-only rollback restores package/lock delta then rebuilds.

## Unit 3: Fast Refresh Boundary

- [x] 3.1 Create external `group-3` evidence and pre-unit dirty-tree diff; RED-check old non-component export/import keeps the unit incomplete.
- [x] 3.2 Create `src/constants/appVersion.ts` with the exact injected expression/fallback; update `src/App.tsx`, `src/components/ApiKeyModal/ApiKeyModal.tsx`, and `src/components/HEADER/menu/PieBrand.tsx` imports so `App.tsx` exports only `App`.
- [x] 3.3 Run the first three checks; transactionally back up/manifest `docs/` immediately before build, then build and run exact latest acceptance; smoke injected/fallback values and Fast Refresh state preservation.
- [x] 3.4 Save post-diff, owned hashes, cumulative final-docs manifest, outputs, and plain-language teaching accounting for four selected records and 29 out of scope. No commits; rollback only version source/imports then rebuild.
