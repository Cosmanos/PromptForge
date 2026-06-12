# PromptForge — Save, Draft & History Spec

Fix the prompt save/history mess. Root cause today: a prompt becomes a permanent saved row the moment
you start one, so "My Prompts" fills with untitled junk and there's never a clear "save this" moment.

The fix is a **draft vs. saved** model with an explicit Save action, a **Recent** list for working
prompts, and a My Prompts/Execution view that shows **only saved** prompts.

Builds on the shell and existing screens. **Out of scope:** the variable editor and the tag system.

---

## 1. The model

Every prompt is either a **draft** or **saved**.

- **Draft:** what you get when you start a new prompt. Auto-saved quietly so a refresh never loses
  work, but **not** shown in My Prompts. Appears in the **Recent** list, **auto-titled from the first
  few words of the prompt** (so "Untitled" stops existing). Stale drafts are purged.
- **Saved:** created by **Save for later** — it asks for a name, marks the prompt saved, and from then
  on it appears in **My Prompts** and is what you run in **Execution**.

Mental model: **Recent = your scratchpad** (recently touched prompts), **My Prompts = your saved,
reusable library.** Saving is the moment you decide a prompt is worth keeping.

---

## 2. Data model

- Add `is_saved boolean not null default false` to `prompts`.
- My Prompts / Execution query: `WHERE is_saved = true` (scoped to the user, per the auth rules).
- Recent query: the user's prompts ordered by `updated_at` desc, limited (~15–20), regardless of
  `is_saved` — Recent is about recency, not saved status.
- Display title: use the prompt's `name` if the user set a real one; otherwise derive a label from the
  first ~6–8 words of `raw_prompt`, truncated. (Derive at read time; a cached `display_title` column is
  optional.)

---

## 3. Draft behavior

- **Create on first real edit, not on page load.** Opening Build with an empty editor must NOT create a
  row. The draft row is created/updated only once there's actual content, via a **debounced autosave**
  (save a second or two after typing stops, and on navigate-away/blur).
- **Never persist empty drafts.** No content → no row.
- A draft shows in **Recent**, auto-titled (section 2), and never in My Prompts.
- **Purge rule:** delete unsaved drafts (`is_saved = false`) after N days of inactivity (by
  `updated_at`; suggest 30, make it a constant), and drop empty/abandoned drafts promptly. This keeps
  Recent from bloating.

---

## 4. Save for later

- A **Save for later** action next to the name in the builder.
- On click: if the prompt has no real name, prompt for one (inline field or small modal); set
  `is_saved = true`; show a clear **Saved** state.
- The name area shows an explicit **Draft / Saved** indicator so it's never ambiguous what's persisted
  (e.g. a muted "Draft" label until saved, then the name with a "Saved" check).
- Editing a saved prompt keeps it saved and updates it. Saving again is idempotent.

---

## 5. Sidebar (expanded)

Expand the navigation into a **labeled sidebar** (this supersedes the icon-rail-only layout from the
shell/tags spec):

- **Top:** the section nav — Build, Prompts, Tags, Settings — as labeled items.
- **Below:** a **Recent** list — recently touched prompts (drafts + saved), most recent first, each
  showing its display title (auto-titled if a draft), clickable to reopen. A subtle marker may
  distinguish draft from saved (optional).
- **Bottom:** the account / sign-out area.

---

## 6. My Prompts & Execution

- **My Prompts** grid shows **only saved** prompts. The untitled drafts disappear from here.
- **Execution** runs a saved prompt.
- On prompt cards and in the execution view, show the prompt's **variables as tags/chips** (the variable
  names, e.g. `Company`, `Sector`) instead of just a count, so you can see what it expects before
  running.

---

## 7. Migrate existing prompts

Your current library has ~14 untitled rows. On rollout:
- Mark prompts that have a real (non-"Untitled") name **or** meaningful content as `is_saved = true`.
- Mark the rest as drafts (`is_saved = false`) so they leave My Prompts and fall under the purge rule.
(Or simply purge the empty untitled ones outright — your call; either way My Prompts ends up clean.)

---

## 8. Done when

- Starting a new prompt creates a draft only after you type, shows in Recent auto-titled, and never
  appears in My Prompts.
- Save for later names + saves a prompt with a clear Draft/Saved indicator; saved prompts appear in My
  Prompts and Execution.
- The sidebar shows labeled sections + a Recent list + account; Recent reflects recently touched
  prompts.
- My Prompts/Execution show only saved prompts, with variables rendered as tags; stale drafts purge.

## 9. Out of scope

The variable editor, the tag system, and (for now) wiring Save into the guest-mode login gate — when
guest mode lands, "Save for later" becomes one of the login-gated actions, but don't block on it here.
