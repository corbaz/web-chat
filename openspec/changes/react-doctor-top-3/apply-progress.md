# Apply Progress: React Doctor Top 3

## Status

- Mode: Standard (strict TDD disabled; no test runner)
- Delivery: single uncommitted sequence, low 400-line budget risk
- Tasks: 13/13 complete
- Evidence root: `C:\Users\Sancho\AppData\Local\Temp\react-doctor-top-3\20260720T140507796Z`
- Scope accounting: four selected records across three units; two true-positive records removed, two crypto records retained as verified false positives, and 29 findings remain out of scope.

## Completed Tasks

- [x] 1.1–1.5 Crypto provenance and truthful false-positive handling
- [x] 2.1–2.4 Unused dependency cleanup and Markdown behavior smoke
- [x] 3.1–3.4 Fast Refresh boundary extraction and final acceptance

## Work Unit Evidence

| Unit | Focused test command and exact result | Runtime harness command/scenario and exact result | Rollback boundary |
|---|---|---|---|
| 1 — Crypto provenance | `npx react-doctor@latest --verbose`: React Doctor 0.8.1 completed with diagnostic exit 1, 33 total records, crypto ×2 retained; provenance attributes app output to non-secret correlation IDs and vendor output to `react-dom@19.2.7` private collision-avoidance keys. Supporting gates: typecheck 0; Biome 35 files/0; format 35 files/0; build 417 modules/0. | N/A: no source/runtime behavior changed; canonical rule, generated-source trace, package ownership, and rebuilt scanner output are the applicable diagnostic harness. | No authored source delta. If the docs transaction failed, restore `group-1/docs-preimage`; otherwise rebuild current source for cumulative docs. |
| 2 — Dependency cleanup | `bun install --frozen-lockfile --ignore-scripts`: exit 0, 229 installs across 298 packages, no changes. Target search: `package.json` exit 1 and `bun.lock` exit 1 (absent). Acceptance gates: typecheck 0; Biome 35 files/0; format 35 files/0; build 417 modules/0; React Doctor 0.8.1 completed with diagnostic exit 1 and 32 total records, with unused-dependency absent. | `bun C:\...\group-2\markdown-runtime-smoke.tsx`: exit 0; server-rendered heading, GFM table, list, and link checks all `true`. The earlier dev/browser attempt was not accepted because port 5173 was occupied and the browser rejected the local certificate; the focused renderer runtime replaced that invalid evidence. | Restore only the Unit 2 dependency delta in `package.json` and `bun.lock`, then rebuild docs from remaining current source. |
| 3 — Fast Refresh boundary | `bun run typecheck`: exit 0. Structural smoke: `App.tsx` has exactly one export (`App`), all three consumers import `constants/appVersion`, old App imports are absent, and the Vite define/type contract remains. Acceptance gates: Biome 36 files/0; format 36 files/0; build 418 modules/0; React Doctor 0.8.1 completed with diagnostic exit 1 and 31 total records, with only-export and unused-dependency absent. | `bun C:\...\group-3\version-runtime-smoke.ts`: exit 0; fallback=`v.development`, injected=`v.injected-smoke`, both checks `true`. Production build proves the complete import graph without a long browser session. | Remove `src/constants/appVersion.ts`, restore the original App declaration and three consumer imports, then rebuild docs from remaining current source. |

## Exact Serial Acceptance

| Unit | typecheck | `bunx biome lint src` | format check | build | React Doctor latest |
|---|---:|---:|---:|---:|---|
| 1 | 0 | 0 — 35 files | 0 — 35 files | 0 — 417 modules | v0.8.1, diagnostic exit 1, 33 issues, crypto ×2 |
| 2 | 0 | 0 — 35 files | 0 — 35 files | 0 — 417 modules | v0.8.1, diagnostic exit 1, 32 issues, unused dependency gone, crypto ×2 |
| 3 | 0 | 0 — 36 files | 0 — 36 files | 0 — 418 modules | v0.8.1, diagnostic exit 1, 31 issues, only-export gone, unused dependency still gone, crypto ×2 |

React Doctor's exit 1 is caused by retained findings, including the pre-existing state-updater error. The exact verbose run completed and was retained for each unit; scanner diagnostics, not a zero process status, establish the requested record-level acceptance.

## External Evidence

- Unit 1: `group-1/` — canonical insecure-crypto rule, provenance traces, command transcripts, docs pre/post manifests, dirty-tree evidence, and summary.
- Unit 2: `group-2/` — Bun removal/frozen-install transcripts, package/lock proofs, build/scanner output, Markdown runtime smoke, final docs manifest, dirty-tree evidence, and teaching summary.
- Unit 3: `group-3/` — no-cache canonical only-export rule, RED boundary proof, docs backup/manifests, serial command outputs, diagnostic assertions, structural/version runtime smokes, final hashes/diff, and teaching summary.

## Plain-Language Teaching

The first finding was not fixed by changing random-looking values because those values are not secrets; evidence showed scanner false positives in generated app/vendor code. The second finding was fixed at the dependency boundary and then checked through real Markdown rendering, not only a lockfile edit. The third finding was a module-boundary problem: moving an unchanged constant lets Fast Refresh treat `App.tsx` as component-only while preserving both build injection and fallback behavior.

## Deviations and Issues

- No design deviation in production code.
- The planned Unit 2 dev/browser smoke evidence was invalid (occupied port and local certificate rejection), so a smaller real React server-render runtime harness proved the exact Markdown structures instead.
- The 29 follow-up findings were not modified.
- No commits, staging, reset, checkout, broad formatting, or manual docs edits were performed.
