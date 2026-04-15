# Feature: Continue Chat

Status: planned
Implemented: -
Affects: prompt builder screen, Try Out response rendering, chat state management, navigation flow

---

## Overview

Currently, Try Out in the builder shows a single response and stops. There is no way to continue the conversation from that response. This feature adds a **Continue Chat** button that appears after the Try Out response, transitioning the screen into a full chat session on the same screen. The user can then send follow-up messages naturally.

Hitting back from chat mode returns to edit mode — not to the list. No skipping steps.

---

## Design Decisions

**Same screen, no navigation.** Chat mode is not a new screen. It is the builder screen in a different state. The prompt editor collapses or moves up, the conversation thread takes over the main area, and an input field appears at the bottom. Back returns to edit mode.

**Continue Chat is a button, not automatic.** The single response from Try Out is preserved as-is. The user consciously decides to continue. This keeps the Try Out flow lightweight — most of the time the user just wants to check if the prompt works, not have a full conversation.

**Editing the prompt exits chat mode.** If the user goes back to edit and changes the prompt, the chat session is invalidated. This matches existing behavior where editing the prompt invalidates the Try Out response.

**Chat in builder is ephemeral.** The conversation from Try Out is not saved to history. History is for execution runs, not builder experiments. This keeps the mental model clean: builder is for refining, execution is for using.

**Input types in chat.** Follow-up messages are plain text only. No variable filling, no file inputs. The compiled prompt (with defaults) was already sent — the chat continues from there.

**Rejected: opening a new chat screen from builder.** Would break the linear flow and create confusion about where you are. Keeping it on the same screen preserves the mental model.

---

## Implementation Notes

### State
Add a `builderMode` state to the builder screen: `editing | tryout | chat`. Transitions:
- `editing` → `tryout`: user clicks Try Out
- `tryout` → `chat`: user clicks Continue Chat
- `chat` → `editing`: user clicks Back
- `editing` → list: user clicks Back (prompt auto-saved)

### UI changes
**In `tryout` mode:**
- Render the single response as before
- Add a **Continue Chat** button below the response (primary action style)
- Keep a Back / Edit button to return to editing

**In `chat` mode:**
- Prompt editor collapses to a small header showing prompt name (tappable to expand/go back to edit)
- Full conversation thread renders below — initial Try Out exchange + follow-ups
- Message input fixed at bottom of screen
- Back button in header returns to `editing` mode

### API
- Try Out already sends a single completion request
- On Continue Chat, switch to a streaming chat completions endpoint
- Pass the full conversation history (system prompt = compiled prompt, then user/assistant turns)
- Each new message appends to the local conversation array

### No persistence
Builder chat sessions are not written to the history/runs table. They live in component state only and are discarded when the user leaves the builder.

---

## Bugs & Improvements

### Bugs
_(none yet)_

### Improvements
- [ ] Allow expanding the collapsed prompt header in chat mode to review (not edit) the prompt
- [ ] Show token/message count indicator in long sessions
- [ ] Consider saving particularly useful builder conversations to history on user request