# Feature: Inputs System

Status: planned
Implemented: -
Affects: prompt builder UI, execution screen, variable chip components, database schema, backend API, prompt compilation logic

---

## Overview

Rename and redesign the "Variables" system into a more intuitive "Inputs" system. Variables is a developer concept — Inputs is what the user actually understands. More importantly, expand inputs beyond plain text to support typed data, starting with **File** as the first new type.

This makes it possible to attach real documents to a prompt at execution time — the file content is read and injected at the `{{input_name}}` position in the compiled prompt. This unlocks the core dogfooding use case: loading `principles.md` as context directly inside the app.

---

## Design Decisions

**Rename Variables → Inputs everywhere in the UI.** "Variables" is a programming concept. "Inputs" is plain language — it's what you fill in before running a prompt. No user-facing mention of "variables" anywhere.

**Syntax stays the same.** `{{input_name}}` continues to work exactly as before. The type is set through the chip UI, not the syntax. This avoids breaking existing prompts and avoids adding complexity to the writing experience.

**Input types for MVP of this feature:**
- `text` — existing behavior, single or multiline text field at execution
- `file` — shows a file picker at execution; file content is read client-side and injected as plain text at the `{{input_name}}` position

**Rejected: type annotation in syntax** (e.g. `{{name:file}}`). Too technical, breaks the "the app disappears" principle. Type is a UI concern, not a syntax concern.

**Default values for file inputs.** Not supported in v1 of this feature. A file input is always required at execution. Could revisit as an improvement later.

**Future input types to consider (not in scope now):** URL (fetch and inject content), number, date, dropdown/select.

**Chip UI change.** The expand button on a chip currently shows a text field for default value. For file-type inputs, this area instead shows the input type selector (text vs file). Once set to file, the default value field is hidden.

---

## Implementation Notes

### Database
Add a `type` column to the `variables` table (or rename table to `inputs`). Values: `text` | `file`. Default: `text`. Migration required for existing data.

### Backend
- Update Variable model and API to include `type`
- Prompt compilation logic: for `file` type inputs, the compiled prompt expects the content to be passed at execution time (same as text — the frontend handles reading the file and passing the content as the variable value)
- No backend file storage needed — file content is read client-side and sent as a string

### Frontend
- Rename all instances of "variable" / "Variables" in UI copy to "input" / "Inputs"
- Chip component: add type selector in the expand panel (text / file toggle)
- Execution screen: render a file picker for `type: file` inputs instead of a text field
- File reading: use the browser FileReader API to read file content as text, then pass it as the input value for prompt compilation
- Try Out (in builder): if a file input has no default, either skip it (inject empty string) or show a placeholder like `[file not provided]`

### Suggested file order
1. DB migration + backend model update
2. Chip UI type selector
3. Execution screen file picker
4. FileReader integration + prompt compilation
5. Rename all UI copy

---

## Bugs & Improvements

### Bugs
_(none yet)_

### Improvements
- [ ] Support URL as an input type — fetch URL content and inject
- [ ] Support default file (pre-loaded path) for power users
- [ ] Show file name as chip label when file is selected at execution
- [ ] Handle large files gracefully (truncation warning or size limit)