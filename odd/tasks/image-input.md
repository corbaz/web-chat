# Image input for vision models

## Objective
Let the user paste or attach images in the chat input and send them to vision-capable models of every provider. Non-vision models do not offer image input.

## Problem / Why
The app is text-only: `Message.content` is a `string` in `src/config/providers.ts` and `src/interfaces/chat/chatTypes.ts`, and the input has no paste/file handling. Vision models such as Groq `qwen/qwen3.8-27b` cannot receive images.

## Scope
- Input: paste (Ctrl+V) and an attach button in the Footer, with thumbnail preview and remove, only when the selected model supports vision.
- Sending: per-protocol request formats (below) for all providers.
- Display: thumbnails in the sent user message.
- Persistence: images are NOT stored in chat history in `localStorage` (quota ~5 MB); the saved message keeps a `[imagen]` marker.
- Out of scope: images in model responses, PDFs/other files, image generation.

## Request formats
| Protocol | Used by | Image part |
|---|---|---|
| OpenAI Chat Completions | Groq, OpenCode Go/Zen `chat`, RouteLLM | `content: [{type:'text',text}, {type:'image_url', image_url:{url:'data:<mime>;base64,<data>'}}]` |
| OpenAI Responses | OpenAI, OpenCode Go/Zen `responses` | `content: [{type:'input_text',text}, {type:'input_image', image_url:'data:...'}]` |
| Anthropic Messages | Anthropic, OpenCode Go/Zen `messages` | `content: [{type:'image', source:{type:'base64', media_type, data}}, {type:'text', text}]` |
| Gemini generateContent | Gemini, OpenCode Zen `gemini` | `parts: [{inline_data:{mime_type, data}}, {text}]` |

## Vision capability (conservative, unverified models excluded)
- Groq: explicit set `{qwen/qwen3.8-27b}`.
- OpenAI: `gpt-4o*`, `gpt-4.1*`, `gpt-5*`, `o3*`, `o4*`.
- Anthropic: all `claude-*`.
- Gemini: all.
- OpenCode Zen: `claude-*`, `gpt-*`, `gemini-*`, ids containing `vision` or `omni`.
- OpenCode Go: ids containing `vision` or `omni`.
- RouteLLM: none.

## Constraints
- Images: `image/png`, `image/jpeg`, `image/webp`, `image/gif`; max 4 per message; downscale client-side (canvas) to a 2048 px long side and re-encode as JPEG when the base64 would exceed ~3.5 MB (Groq limit 4 MB for base64).
- bun only, exact versions, no new dependencies, Biome.
- Keep text-only requests byte-identical to today.

## TDD / checks
- TDD mode: off (no project configuration). Runner: `bun test`.
- Checks per task: `bun test`, `bunx tsc -b`, `bunx biome check` on touched files, `bun run build`.
- Live keyed checks: user, in browser.

## Tasks
- [x] T1 Vision capability module + tests.
- [x] T2 Message types carry optional images; per-protocol payload builders + tests; text-only unchanged.
- [x] T3 Footer paste/attach, preview, downscale; only for vision models.
- [x] T4 Show images in user messages; strip images from persisted history.
- [x] T5 README + verification.
- [x] T6 Vision capability from models.dev (user request 2026-09-25): `scripts/update-vision-models.ts` generates `src/config/visionModels.generated.ts` from https://models.dev/api.json (`modalities.input` includes `image`), mapping groq->groq, openai->openai, anthropic->anthropic, gemini->google, opencodezen->opencode, opengo->opencode-go. `supportsVision`: known vision id -> true, known text-only id -> false, unknown id -> previous heuristics. Snapshot 2026-09-25: Go 26/42 vision, Zen 65/81, Groq 1/4.
- [x] T7 Vision marker in the model selector: eye icon in `theme.accentAlt` next to vision models (options and selected value), tooltip "Acepta imágenes".

## Acceptance criteria
- Pasting an image with a vision model selected shows a preview and sends it; the model answers about it.
- With a non-vision model, paste of an image does nothing special and no attach button is shown.
- Chat history in `localStorage` never contains base64 image data.
- Text-only chats behave exactly as before.

## Progress
- Exploration done (2026-09-25): no image handling exists anywhere in `src`.
- T1-T5 done (delegated writer): `src/config/vision.ts` (+ tests); `ImageAttachment` type and optional `images` / `imageCount` on messages; per-protocol helpers in `providers.ts` (`toChatCompletionsMessage`, `toResponsesItem`, `toAnthropicMessage`, `toGeminiParts`); OpenAI switches to the Responses API when images are present; Gemini skips the `interactions` (web search) path when images are present; Footer paste/attach/preview/downscale; ChatMessage thumbnails or `[imagen]` marker; history write in ChatContainer strips `images` (other write sites only store welcome messages or re-store already persisted data, checked by parent); README section.
  - `bun test`: 65 pass, 0 fail. `bunx tsc -b`: exit 0. Biome: touched files clean (pre-existing warnings only). Build: OK. Payload shapes printed for the four protocols.
  - Notes: GIFs lose animation (canvas captures the first frame).
  - Live check (user, 2026-09-25): Groq `qwen/qwen3.8-27b` answered correctly about a pasted image. Other providers not yet checked live.
- T6-T7 done: `scripts/update-vision-models.ts` + `bun run update:vision`, generated `src/config/visionModels.generated.ts`, `supportsVision` uses it with prefix fallback; eye icon (`accentAlt`) in ModelSelector options/value and RightMenu list; README updated. `bun test` 63 pass, 0 fail; `bunx tsc -b` exit 0; build OK. Uncommitted.
  - Risk: models.dev marks many OpenCode Go/Zen models as vision; each still needs a live check (sent through chat, messages or responses routes).

## Next step
Optional live checks with a Claude, a GPT and a Gemini model.
