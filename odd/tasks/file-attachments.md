# File attachments: text, Markdown and PDF

## Objective
Besides images, let the user attach text-like files (Markdown, plain text, code, CSV, JSON) and PDFs to any provider and model (user request 2026-09-28: "las 3 opciones para todos").

## Scope
1. **Text files for every model**: `.md`, `.markdown`, `.txt`, `.csv`, `.json`, `.xml`, `.yaml`/`.yml`, `.log`, and common code (`.js`, `.ts`, `.tsx`, `.jsx`, `.py`, `.java`, `.go`, `.rs`, `.sql`, `.html`, `.css`, `.sh`, `.ps1`). Read in the browser as UTF-8 and appended to the message text sent to the API as fenced blocks with the file name (e.g. `Archivo: notas.md` + ```` ```md ... ``` ````). Size cap per file (~200 KB) and total (~1 MB) with a clear message when exceeded.
2. **Native PDF** for models that accept PDF, per protocol:
   - Anthropic Messages (Anthropic, OpenCode Zen/Go `messages` route, Claude (suscripción)): `{type:'document', source:{type:'base64', media_type:'application/pdf', data}}`. Verified live 2026-09-28 with `claude -p` stream-json on the bridge's path: answered the text inside a generated PDF.
   - OpenAI Responses (OpenAI, Zen/Go `responses`): `{type:'input_file', filename, file_data:'data:application/pdf;base64,...'}`.
   - OpenAI Chat Completions (where supported): `{type:'file', file:{filename, file_data:'data:application/pdf;base64,...'}}`.
   - Gemini generateContent (Gemini, Zen `gemini`): `inline_data {mime_type:'application/pdf', data}`.
   Capability from models.dev `modalities.input` includes `pdf` (extend `bun run update:models` to generate `pdfModels.generated.ts`, like vision). Snapshot: Anthropic 15/15, OpenAI 19/52, Gemini 20/39, Zen 45/112, Go 6/33, Groq 0/16. Claude (suscripción): all Claude models.
3. **PDF fallback for every other model**: extract the text in the browser with `pdfjs-dist` (exact version 6.3.289, lazy-loaded only when a PDF is attached, worker bundled by Vite) and send it like a text file. Mark it in the UI ("PDF como texto").

## UI
- The 📎 button is available on every model (no longer vision-only); its `accept` covers images (only when the model has vision), PDF and the text extensions. Pasting images keeps working as today.
- Attachments row shows image thumbnails (click opens the in-app `ImageLightbox`) and file chips (icon, name, size, remove button; PDF chip shows "nativo" or "texto").
- A PDF capability icon 📄 next to the vision eye and the globe in the model selector / right menu (tooltip "Acepta PDF").
- Sent messages show file chips; history persistence keeps only names/counts (no file contents, like images).
- Limits: max 4 images + 4 files per message.

## Bridge (Claude suscripción)
- `/chat` accepts `documents: [{name, mimeType:'application/pdf', data}]` (base64, validated, counted in the 16 MB body limit) and sends them as `document` blocks in the stream-json user message. Text files arrive already inlined in the message.

## Constraints
- bun, exact versions, Biome, `bunx tsc -b`. Only new dependency: `pdfjs-dist` 6.3.289 (user approved). Text-only requests unchanged.

## TDD / checks
- TDD off. `bun test` for builders (per-protocol PDF parts, text inlining, size caps, capability lookup) and the bridge validation. `bunx tsc -b`, Biome, `bun run build`.
- Live: bridge on port 4099 with a generated PDF (native path) and a Markdown file; PDF text extraction unit-tested with a generated PDF.

## Tasks
- [x] T1 Capability data (pdf) + text-file inlining + UI chips for every model.
- [x] T2 Native PDF per protocol + bridge documents.
- [x] T3 pdf.js fallback + README.

## Progress
- 2026-09-28: spike — `claude -p` stream-json with a `document` block read a generated PDF ("PERA-42"). Also fixed: in-app ImageLightbox (data: URLs in new tabs are blocked by Chrome/Edge); globe shown again for Claude (suscripción) with the footer toggle hidden (`isWebSearchAlwaysOn`).
- 2026-09-28: T1-T3 done (delegated): text/Markdown/code inlined for every model, native PDF per protocol (+bridge documents, live PERA-42), pdfjs-dist 6.3.289 lazy fallback, 📄 capability icon. Follow-up (user): files shown as chips like images (pending and in the bubble), content = typed text only, inlining at API time per message (follow-ups keep context in memory), persistence keeps text only for small files (<=20 KB each, <=40 KB per message); text/PDF preview modal (PDF via blob URL). `bun test` 217 pass, `bunx tsc -b` exit 0, build OK. Uncommitted.
