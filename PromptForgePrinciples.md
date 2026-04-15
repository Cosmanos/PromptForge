# Feature: Output Cards

Status: planned
Implemented: -
Affects: execution screen, chat response rendering, prompt tag system, backend response handling

---

## Overview

Some chat responses are documents, not conversations. A feature spec, a structured report, a drafted email — these deserve to be treated as files, not just text blocks. Output Cards render these responses as a distinct card within the chat with a **Copy** button and a **Download** button, so the user can take the output somewhere without manually selecting and copying text.

This is activated by a new tag: **"Document Output"**. When this tag is applied to a prompt, the execution pipeline knows to render the response as a card. The user can also manually trigger it per-run if needed.

Primary use case: the PromptForge dev workflow — generate a `feature.md` file inside the app, download it directly, drop it in the repo.

---

## Design Decisions

**Tag-driven, not auto-detected.** Automatic detection of "is this a document?" is fragile and unpredictable. A tag is explicit — the prompt author signals intent upfront. This fits the existing tag system and keeps behavior predictable. The Analyze step can suggest the "Document Output" tag when the prompt appears to be asking for structured output.

**One card per response, not per block.** The entire response is one card. We don't try to split a response into card and non-card sections. If Document Output is active, the whole response is the document.

**Download as markdown.** Default download format is `.md`. File name defaults to the prompt name + timestamp (e.g. `feature-search-online-2026-03-28.md`). No format picker in v1 — keep it simple.

**Copy behavior unchanged for non-card responses.** Existing per-block copy behavior stays as-is for normal conversational responses. Output Cards are additive, not a replacement.

**Card design is calm, not intrusive.** The card sits inline in the chat flow. It has a subtle border or background to distinguish it from a conversational response. Copy and Download actions appear at the top-right of the card — visible but not dominant. Fits the "seamless over explicit" principle.

**Rejected: auto-detect based on markdown structure.** Too easy to false-positive on any response that uses headers. Tag-based is more intentional and consistent.

**Rejected: separate "export" screen.** Stays on one screen. The card is the export UI.

---

## Implementation Notes

### Tag
Add `"Document Output"` to the predefined tag list. Its `prompt_transformation_logic` adds a system instruction to produce clean, well-structured markdown suitable for saving as a file.

### Response rendering
- Check if active prompt has the Document Output tag applied
- If yes: wrap the response in an `OutputCard` component instead of the standard message bubble
- `OutputCard` renders the markdown content, with a Copy button and Download button in the top-right corner
- Copy: copies raw markdown to clipboard
- Download: triggers a file download of the raw markdown content, filename = `{prompt-name}-{YYYY-MM-DD}.md` (slugified)

### Backend
No backend changes required. The response content is the same — only the frontend rendering differs.

### FileReader / Blob approach for download
Use the browser's `Blob` API to generate the file client-side:
```ts
const blob = new Blob([markdownContent], { type: 'text/markdown' });
const url = URL.createObjectURL(blob);
// trigger anchor click with download attribute
```
No server round-trip needed.

### Tag suggestion
In the Analyze step, if the prompt contains words like "write", "generate", "create", "produce", "draft" combined with document-like nouns ("spec", "report", "file", "document", "summary"), suggest the Document Output tag.

---

## Bugs & Improvements

### Bugs
_(none yet)_

### Improvements
- [ ] Support `.txt` download as an alternative format
- [ ] Allow user to rename the file before downloading
- [ ] Support multiple output cards in a single conversation (e.g. follow-up refinements)
- [ ] Show a subtle "saved" confirmation when download completes