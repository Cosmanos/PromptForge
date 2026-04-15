# Feature: Local Files MCP Companion App

Status: future
Implemented: -
Affects: new standalone companion application, backend MCP client layer, execution pipeline

---

## Overview

PromptForge is a web app and therefore cannot access the user's local filesystem directly — the browser sandbox prevents it. This feature introduces a small **companion desktop app** that runs as a local MCP server on the user's machine. When installed, it gives PromptForge controlled access to local files without compromising security.

When a user wants to reference a local file in a prompt and the companion app is not installed, PromptForge surfaces a suggestion to install it. If installed, local file inputs work seamlessly alongside the standard file upload flow.

This is a **future feature** — deferred until the Inputs system is stable and the use case demand is validated.

---

## Design Decisions

**Why a companion app and not a browser extension?** A tray app running as a local MCP server is a cleaner security model. The user explicitly installs it, explicitly grants folder access, and can see it running. Extensions have their own security surface and browser-specific complexity.

**Why not just use file upload (the Inputs feature)?** File upload covers the case where the user manually selects a file at execution time. Local Files MCP covers a different case: prompts that reference files by path, or workflows where the user wants PromptForge to read a file automatically without a manual upload step each time. Example: always loading the latest version of a living document.

**Security model.** The companion app does not expose the entire filesystem. The user explicitly grants access to specific folders during setup — similar to how Claude Desktop handles MCP folder access. PromptForge can only read from those whitelisted folders.

**The app is a website — companion is opt-in.** The companion app is never required. Standard file upload (from the Inputs system) always works. The companion is an enhancement for power users who want to reference local paths directly.

**Detection.** The web app pings a known localhost port on load. If the companion is running, it connects silently. If not, no error — file upload still works. Only when a user explicitly tries a local path input does the app suggest installing the companion.

**Platform.** Windows first (primary user base). Mac support as follow-up. Lightweight — no Electron. A simple Go or Rust tray app exposing a local HTTP/MCP endpoint is the right approach for minimal footprint.

---

## Implementation Notes

This feature has two separate codebases:

### 1. Companion App (new repo)
- Lightweight tray application (Go or Rust recommended for small binary size)
- Exposes a local MCP-compatible HTTP server on a fixed localhost port (e.g. `localhost:47821`)
- Endpoints: list allowed folders, read file by path, check if path is within allowed folders
- First-run setup: folder picker UI to whitelist directories
- Runs on system startup (optional, user controlled)
- Signed installer for Windows (important for user trust)

### 2. PromptForge Web App changes
- On app load: silent ping to companion port. Store connection state.
- New input type: `local-file` — shows a local path text field instead of a file picker. Only available when companion is detected.
- When companion not detected and user attempts local-file input: show inline prompt — "Install PromptForge Desktop to use local file paths" with download link
- Execution pipeline: for `local-file` inputs, request file content from companion via localhost, inject into prompt as text (same as file upload flow)
- Backend: proxy the companion request server-side to avoid CORS issues

### Suggested build order (when this becomes active)
1. Companion app MVP (read files from whitelisted folders, local HTTP API)
2. Detection ping in web app
3. Local-file input type (gated on companion detection)
4. Install prompt / download flow
5. Windows installer + signing

---

## Bugs & Improvements

### Bugs
_(none yet — not implemented)_

### Improvements
- [ ] Mac support after Windows
- [ ] Watch mode — detect when a whitelisted file changes and offer to re-run the prompt
- [ ] Folder browser UI inside PromptForge (via companion) instead of typing paths manually