# Link and image previews in chat answers

## Objective
Links in assistant answers must not navigate away from the chat, and maps/images should be viewable inside the app. Requested 2026-09-29 after Codex answered a "Google Maps image of <address>" request with a Maps link.

## Problem
`MarkdownRenderer` renders plain `ReactMarkdown`: links open in the same tab (the chat is lost) and markdown images have no size limits or preview. Providers other than Codex have no instruction to answer location requests with a Maps link.

## Scope
- Links: open in a new tab (`target="_blank"`, `rel="noopener noreferrer"`). Links that can be embedded (Google Maps, YouTube) open an in-app responsive modal with an iframe plus an "open in new tab" button. Other sites usually block iframes (X-Frame-Options), so they go straight to a new tab.
- Markdown images `![alt](url)`: responsive, click opens the existing `ImageLightbox`; broken URLs fall back to a link.
- Instructions: same Maps-link + real-image-URL rule for every provider: app system message (API-key providers), Claude bridge, OpenCode Free agent prompt (config.ts, mac.sh, windows.bat, install-mac.sh), Codex bridge. Rebuild both bridge bundles.

## Tasks
- [x] T1 `toEmbedUrl` helper + tests (Maps search/place/coords, YouTube, others -> null).
- [x] T2 `LinkPreviewModal` + custom `a`/`img` in `MarkdownRenderer`.
- [x] T3 Shared rule in every provider prompt + bundles.
- [x] T4 README + checks (`bun test`, `bunx tsc -b`, `bun run build`).
- [x] T5 Every http(s) link (answer text and citations) opens the modal; `/api/frame-check` (Vercel Function + Vite dev middleware) reads X-Frame-Options / CSP frame-ancestors of the final response and the modal shows a notice + new-tab button when blocked; sandboxed iframe without top navigation; Maps "directions" links embed the destination.

## Checks
TDD: not configured for this project (ordinary checks). Runner: `bun test`.

## Progress
- 2026-09-29: T1-T4 done. Verified: Maps embed URL `maps.google.com/maps?q=...&output=embed` redirects to `/maps/embed` (200, no X-Frame-Options on the final response); YouTube nocookie embed 200. SSR render: map link gets 📍 + modal, other links `target=_blank`, markdown image wrapped in a zoom button. Live answers to "Google Maps image of Azcuénaga 2736": Claude bridge (sonnet 4.6), Codex bridge (gpt-5.6-sol) and OpenCode Free (big-pickle, sandbox config regenerated) all reply with a Google Maps link. API-key providers (Groq, OpenAI, Anthropic, Gemini, Zen, Go) get the rule through the app system message; not tested live (keys not used). Mac OpenCode Free needs the installer re-run to refresh its opencode.json. `bun test` 272 pass, `bunx tsc -b` exit 0, `bun run build` OK, both bridge bundles rebuilt. Not verified in a real browser (no browser tool). Uncommitted.
- 2026-09-29: T5 after user report ("pages navigate to a new tab"): the T2 assumption that most sites block iframes was wrong. Measured: kiosko.net, clarin.com, wikipedia allow framing; openstreetmap, waze, github, google.com/maps (non-embed) block. `checkFrameable` rejects non-public hosts (localhost, private IPv4, IPv6 literals, credentials) including after redirects; DNS-based rebinding is not handled (endpoint only returns a boolean). Dev endpoint verified with vite on :5199 (kiosko true, github false, 127.0.0.1 null). `bun test` 281+ pass, `bunx tsc -b` exit 0, api function typechecked separately, build OK. Vercel Function not verified until deployed. Uncommitted.
- 2026-09-29: Deployed (e89d6fb + df5a22e). First deploy failed with ERR_MODULE_NOT_FOUND (Node ESM needs the .js extension in api/ imports); fixed. Production /api/frame-check verified: github false, kiosko true, clarin true, 127.0.0.1 null.
