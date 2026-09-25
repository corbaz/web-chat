## Exploration: React Doctor top 3 fix groups

### Current State
The original diagnostic evidence was produced by React Doctor 0.7.8 and contains 33 records. That version identifies the evidence baseline only; final acceptance MUST use `npx react-doctor@latest --verbose`. The requested scope is exactly three root-cause groups (four records): `react-doctor/insecure-crypto-risk` (2), `deslop/unused-dependency` for `react-syntax-highlighter` (1), and `react-doctor/only-export-components` for `APP_VERSION` (1). `diagnostics.json` has no literal `fixGroupId` field, so the stable plugin/rule identity is used as the fix-group ID. Each group below is one implementation task; all other diagnostics are follow-up only.

Canonical rule documentation was fetched before diagnosis with redirect following, no-cache headers, and a unique query:

```powershell
$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(); curl.exe -L -H "Cache-Control: no-cache" -H "Pragma: no-cache" "https://react.doctor/docs/rules/react-doctor/insecure-crypto-risk?cachebust=$stamp"
$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(); curl.exe -L -H "Cache-Control: no-cache" -H "Pragma: no-cache" "https://react.doctor/docs/rules/react-doctor/only-export-components?cachebust=$stamp"
```

The canonical security false-positive check is whether randomness protects a token, secret, password, nonce, salt, CSRF value, credential, or OTP; non-secret cache/UI IDs are explicitly false positives. The Fast Refresh check is whether a component module also exports a non-component value and is not an exempt entry/constants module.

#### 1. `react-doctor/insecure-crypto-risk` (two generated findings, one root cause)

- **Meaning:** `Math.random()` is unsafe for secrets because its output is predictable enough to guess. This is serious for authentication tokens, reset links, nonces, salts, or credentials.
- **Evidence:** `docs/assets/index-DvIl3LL9.js:287` is a minified generated application bundle. Its long collapsed line places API-key text near `Math.random()` calls originating from `src/components/chat/ChatContainer.tsx`, where the values are only local chat/message/error IDs and a request-timing map key. The request ID is not sent as authorization material, signed, persisted as a secret, or used to grant access. Minification creates the security-shaped proximity that triggers the rule.
- **Dependency trace:** `docs/assets/vendor-CmjH2uL2.js:8` comes from `react-dom@19.2.7`. The original production dependency uses `Math.random()` to suffix private DOM bookkeeping property names such as `__reactFiber$...` and `_reactListening...`; these are runtime collision-avoidance markers, not credentials or security boundaries.
- **Classification:** both records are generated/dependency false positives, not exploitable application cryptography. No source map exists in `docs/assets`, but the application source and installed `react-dom` production source provide direct provenance.
- **Real-world impact / human severity:** actual insecure token generation would be High severity; these two concrete findings are Low/Informational because they only affect non-secret identifiers. Do not replace them merely to silence the scanner, and never patch `docs/assets` directly.

#### 2. `deslop/unused-dependency` (`react-syntax-highlighter`)

- **Meaning:** an unused package increases install time, lockfile complexity, and supply-chain exposure without delivering runtime behavior.
- **Evidence:** repository source/config/runtime searches find `react-syntax-highlighter` only in `package.json` and `bun.lock`; `MarkdownRenderer.tsx` uses `react-markdown` plus `remark-gfm` and has no syntax-highlighter import. `@types/react-syntax-highlighter` is also orphaned. Installed-package documentation/cache hits are not application usage.
- **Real-world impact / human severity:** Low maintainability risk today, with a small but real dependency and transitive-package attack surface. Remove both runtime and type packages, regenerate `bun.lock`, then rebuild published `docs` rather than editing bundles manually.

#### 3. `react-doctor/only-export-components` (`APP_VERSION`)

- **Meaning:** a React component module that also exports non-component values is not a clean Fast Refresh boundary, so development edits can lose component state or force a broader reload.
- **Evidence:** `src/App.tsx` exports both `App` and `APP_VERSION`. Consumers are `App` itself, `src/components/ApiKeyModal/ApiKeyModal.tsx`, and `src/components/HEADER/menu/PieBrand.tsx`; the latter two import upward from `App`, creating avoidable coupling. Vite injects `__APP_VERSION__` in `vite.config.ts`, and `src/vite-env.d.ts` declares it.
- **Real-world impact / human severity:** Low user-facing severity; production behavior is unaffected. Developer feedback and state preservation during HMR are less reliable.
- **Smallest safe extraction:** move only the unchanged fallback expression to `src/constants/appVersion.ts`, import it into the three consumers, and leave `App.tsx` exporting only the component. This preserves the build-time value and removes upward imports without redesigning version generation.

#### Follow-up inventory (out of scope)

The supplied request says “remaining 30 issues,” but `diagnostics.json` contains 33 records and the three selected groups contain four records, so the evidence-based remainder is **29 diagnostic records**: Accessibility 3, Bugs 8, Maintainability 17, Performance 1. If each selected group is counted as one headline item rather than by diagnostic record, the report can be described as 30 non-headline records/items, but implementation scope must continue to use the 29 concrete records. No follow-up rule is expanded into this change.

### Affected Areas
- `docs/assets/index-DvIl3LL9.js` — generated finding only; rebuild output, never a manual edit target.
- `docs/assets/vendor-CmjH2uL2.js` — generated React DOM dependency finding only; rebuild output, never a manual edit target.
- `src/components/chat/ChatContainer.tsx` — provenance for non-secret UI/request-correlation IDs; verification target, not currently a recommended edit.
- `node_modules/react-dom/cjs/react-dom-client.production.js` — dependency provenance only; never edit.
- `package.json` — remove unused runtime package and its unused type package.
- `bun.lock` — regenerate through Bun after dependency removal.
- `src/App.tsx` — stop exporting `APP_VERSION`; import it from a constants module.
- `src/constants/appVersion.ts` — smallest proposed home for `APP_VERSION`.
- `src/components/ApiKeyModal/ApiKeyModal.tsx` — redirect version import away from `App`.
- `src/components/HEADER/menu/PieBrand.tsx` — redirect version import away from `App`.
- `vite.config.ts` and `src/vite-env.d.ts` — verify the existing `__APP_VERSION__` injection/typing remains unchanged.
- `docs/` — generated deployment snapshot rebuilt only after source/dependency changes.

### Approaches
1. **Root-cause fixes with generated-output discipline** — verify the two crypto records with the canonical false-positive recipe, remove the genuinely unused dependency pair through Bun, extract `APP_VERSION` to a constants module, rebuild, and rerun React Doctor latest.
   - Pros: fixes real maintainability issues, preserves runtime behavior, avoids vendor/generated patches, and keeps one task per root cause.
   - Cons: the two generated security warnings may remain as unresolved tool diagnostics if React Doctor latest still reports them; generated asset hashes will churn on build.
   - Effort: Low

2. **Silence every reported location** — replace all application `Math.random()` IDs, patch/configure around React DOM output, remove the dependency, and perform broader module restructuring.
   - Pros: may reduce the visible warning count immediately.
   - Cons: changes correct non-security behavior, cannot legitimately fix React DOM by editing bundles, broadens scope, and risks masking scanner false positives rather than addressing root causes.
   - Effort: Medium

### Recommendation
Use Approach 1 as three work units/tasks:

1. Rebuild generated `docs`, then rerun React Doctor latest before classifying the crypto group. Do not change the correct `Math.random()` UI/request-correlation IDs in `ChatContainer`, React dependency internals, or documentation/assets merely to silence the rule. If latest skips the generated/dependency paths or no longer reports them, record the group as cleared. If latest still reports them, record the group as a verified false positive and unresolved tool diagnostic. Never suppress the rule, invent an exclusion, or claim this group was code-fixed unless the real latest run confirms that the findings disappeared.
2. Remove `react-syntax-highlighter` and `@types/react-syntax-highlighter`, regenerate `bun.lock`, and rebuild `docs` in the same dependency-removal work unit.
3. Extract `APP_VERSION` to `src/constants/appVersion.ts` and update all three consumers in one Fast Refresh work unit.

Verification should run serially from the repository root because parallel package-runner invocations produced Windows cache `EBUSY` errors during exploration. Do not use the mutating `bun run lint` script (`biome lint --write src`) in this dirty tree. Run these exact checks in order:

```powershell
bun run typecheck
bunx biome lint src
bun run format:check
bun run build
$out = Join-Path $env:TEMP ("react-doctor-react-doctor-top-3-" + [guid]::NewGuid()); npx react-doctor@latest --verbose --output-dir $out
```

React Doctor defaults to full scope with lint, dead-code, and supply-chain scans enabled; `--verbose` prints every rule instead of only the top three. Use the unique temporary output directory when React Doctor latest supports `--output-dir`; if that option is unavailable, rerun the required acceptance command exactly as `npx react-doctor@latest --verbose` from the repository root and capture its console output without writing into the tree. React Doctor 0.7.8 remains only the recorded original-diagnostics version and MUST NOT be pinned for acceptance. There is no test runner; verification is typecheck, read-only Biome lint, format check, build, latest scanner rerun, and focused manual smoke checks for version display, modal, chat IDs, and Markdown rendering.

The forecast is below the 400 authored-line review budget. One feature branch/PR should be sufficient; a feature-branch chain is not currently warranted. Generated `docs` churn is excluded from the authored-line forecast but must remain in snapshot/review evidence. Existing working-tree changes are extensive (45 changed paths and thousands of changed lines before this exploration), so apply must use surgical edits, compare pre/post diffs per work unit, preserve all unrelated changes, and avoid cleanup or whole-repo formatting.

### Risks
- React Doctor 0.7.8 reported generated paths even though its canonical rule documentation says generated/doc/build directories are skipped. React Doctor latest may clear/classify them after the generated-docs rebuild; if not, they remain verified false positives and unresolved tool diagnostics, without suppression or invented exclusions.
- Removing the unused package must also remove its type package and transitive lock entries; a stale lockfile would leave the cleanup incomplete.
- A production rebuild changes hashed files under `docs`; manual edits or broad deletion could overwrite unrelated pre-existing generated changes.
- The working tree already contains extensive unrelated modifications, making reset, checkout, broad formatter, and indiscriminate staging unsafe.
- The user-provided “remaining 30” count conflicts with the 33-record diagnostic file; concrete follow-up accounting is 29 records after excluding the four records in the selected groups.

### Ready for Proposal
Yes. The proposal should preserve the exact three-group boundary, apply the canonical rebuild-then-latest recipe to the crypto findings, define dependency removal plus lock/build regeneration, and specify the minimal `APP_VERSION` extraction. It must not claim the crypto group is code-fixed unless `npx react-doctor@latest --verbose` confirms disappearance; otherwise it must record a verified false positive/unresolved tool diagnostic. It should explicitly leave the 29 remaining diagnostic records for follow-up, retain one task per root cause, and preserve the 400-line review guard and surgical dirty-tree protections.
