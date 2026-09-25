# Proposal: React Doctor Top 3

## Intent

Resolve exactly three root-cause groups (four records) without changing correct behavior or disguising diagnostics. The other 29 records remain follow-up work.

## Scope

### In Scope
- **Group 1 — insecure crypto (2 records, Low/Informational here):** rebuild `docs`, apply canonical false-positive checks, then run latest React Doctor before Group 2. Do not alter correct UI/request IDs, React internals, generated bundles, or scanner configuration. If findings remain, stop this group as verified false-positive/unresolved tool diagnostics; do not claim a code fix.
- **Group 2 — unused dependency (1 record, Low):** remove `react-syntax-highlighter` and orphan `@types/react-syntax-highlighter`, regenerate `bun.lock` through Bun, and rebuild docs. This reduces unused supply-chain and maintenance surface.
- **Group 3 — Fast Refresh boundary (1 record, Low):** extract unchanged `APP_VERSION` logic to `src/constants/appVersion.ts`; update App, ApiKeyModal, and PieBrand imports so `App.tsx` exports components only. This improves development state preservation without production behavior changes.

### Out of Scope
- The remaining 29 diagnostic records; suppression/exclusions; direct `docs/assets` or dependency-internal patches; commits or PRs.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
None; this is dependency and module-boundary maintenance.

## Approach

Execute groups serially and preserve the extensive dirty tree with pre/post diffs. For Group 1 run `bun run build`, canonical provenance checks, then `npx react-doctor@latest --verbose`. Only after its outcome, implement Group 2; then Group 3. After each implemented group run, serially:

```powershell
bun run typecheck
bunx biome lint src
bun run format:check
bun run build
npx react-doctor@latest --verbose
```

Biome lint is read-only; never run mutating `bun run lint`. Rebuild docs only through the build.

## Affected Areas

| Area | Impact |
|---|---|
| `package.json`, `bun.lock`, `docs/` | Dependency removal and generated rebuild |
| `src/App.tsx`, `src/constants/appVersion.ts` | Version constant boundary |
| `src/components/ApiKeyModal/ApiKeyModal.tsx`, `src/components/HEADER/menu/PieBrand.tsx` | Import updates |
| Providers | None |

## Risks

| Risk | Mitigation |
|---|---|
| Persistent scanner false positives | Record unresolved diagnostic; never suppress or mislabel |
| Generated hash churn or dirty-tree loss | No manual asset edits; inspect unit-level diffs; preserve unrelated changes |
| Stale lockfile | Use Bun and verify package/lock removal |

## Rollback Plan

Rollback each group independently: Group 1 owns no source fix; Group 2 restores only package/lock/generated build deltas; Group 3 restores only its constant and four import/export edits. Never reset unrelated dirty-tree work.

## Success Criteria

- [ ] Exactly three groups/four records handled serially; 29 records remain follow-up.
- [ ] Group 1 is cleared or honestly recorded as verified false-positive/unresolved.
- [ ] Dependency pair is absent, lockfile regenerated, and version imports preserve behavior.
- [ ] Every group passes the stated checks and ends with exact latest verbose acceptance.
- [ ] Authored change forecast remains below 400 lines; generated docs are tracked separately.
