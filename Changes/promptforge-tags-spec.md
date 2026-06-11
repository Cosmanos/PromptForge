# PromptForge — Tags & Navigation Spec

Two connected pieces: replace the navigation with an icon rail (Tags becomes its own tab), and build
the full tag UX — a Tags management tab with the complete tag fields, and a Suggestions → Applied flow
in the builder.

Builds on the design tokens and shared components from the shell phase. **This supersedes the
navigation section of the app-shell spec** (the Build/Use toggle and the Claude-style recent-prompts
list are removed). **Out of scope:** the variable editor, auth/keys.

---

## Part A — Navigation: icon rail

Replace the Build/Use segmented toggle and the recent-prompts sidebar with a narrow **vertical icon
rail** (take the *layout* of the reference screenshot, not its visuals — style it with the app's
neutral tokens).

- **Top:** the PromptForge logo mark.
- **Tabs (icons, each a top-level section):**
  - **Build** — new prompt → the builder.
  - **Prompts** — the saved-prompts grid (formerly "Use"); selecting one opens its execution screen.
  - **Tags** — the Tags management view (Part C).
  - **Settings** — keys/account.
- **Bottom:** account icon (current user, sign out).

Each tab swaps the main content area. Active tab is visually marked. Routing, suggested:
`/build`, `/build/:id`, `/prompts`, `/prompts/:id/run`, `/tags`, `/settings`.

---

## Part B — Tag data model & backend changes

Each tag has four fields: **name**, **applies-when** (when to suggest it), **rewrite** (the rewrite
instructions), and **counter-tags**.

**Schema changes:**
- `tags` (per-user, from the auth phase): ensure columns for `name`, `applies_when` (the existing
  `hint` column — keep it or rename to `applies_when`, just map the UI "Applies when" to it),
  **`rewrite_instructions` (new)**, `sort_order`, `user_id`.
- `default_tags` (admin template): same fields, so seeded tags carry rewrite instructions too.
- **Counter-tags:** a join table (e.g. `tag_counter_tags(tag_id, counter_tag_id)`), **bidirectional**
  — store once, enforce both ways. Mirror for `default_tags`.
- `prompt_tags` (existing): this is the **Applied** set — the tags attached to a prompt.

**Inherit-at-signup (extends the auth phase):** when copying `default_tags` into a new user's `tags`,
also copy `rewrite_instructions` and remap the counter-tag links to the new user's tag ids.

**Flow wiring:**
- **Analyze** sends the candidate tags' `applies_when` text and returns the relevant ones as
  **Suggestions** (transient — not persisted).
- **Rewrite** applies the **Applied** tags' `rewrite_instructions` (one call, all applied tags).
- Endpoints: tag CRUD (with all four fields), apply/unapply a tag to a prompt (`prompt_tags`), and the
  counter-tag relationship reads. All scoped to the authenticated user (enforce ownership per the auth
  spec — no fetch-by-id without the user check).

---

## Part C — Tags tab (management)

The management view we mocked, now with the full fields.

- **List/table** of the user's tags: name, an `applies_when` preview, and a counter-tag indicator.
  Search/filter at the top. "New tag" action.
- **Editor** (inline expand or panel) with all four fields editable:
  - **Name**
  - **Applies when** (textarea)
  - **Rewrite** (textarea — the rewrite instructions)
  - **Counter-tags** (chips + add control; show the bidirectional / warn-only note)
- Full CRUD on the user's own tags; **delete shows a warning** but is allowed (per the per-user tag
  model).
- **Admin editor:** gated by `is_admin`, same layout, but edits `default_tags` (the seed template).
  Mark it clearly as admin. Edits here affect only future signups (no propagation yet).

---

## Part D — Builder tag flow (Suggestions → Applied)

In the builder, the tag area has **two sections**:

**Suggestions** — auto-filled by Analyze with the relevant tags for the current prompt. Each renders as
a tag card. **Clicking a suggestion moves it into Applied** (removing it from Suggestions).

**Applied** — the tags actually used when you Rewrite (persisted as `prompt_tags`). Each is removable
(returns nothing to Suggestions automatically; Analyze can re-suggest on the next run). At the end of
the Applied row sits a **"+" button styled like a tag card** that opens a **searchable dropdown**:
- A filter input at top + a **scrollable checkbox list** of the user's tags (the pattern from the
  reference dropdown, restyled to the app's neutral tokens — no raw checkboxes that clash with the UI).
- Checking a tag adds it to Applied; it's a multi-select.

**Counter-tag warning:** if the Applied set contains two tags that counter each other, show a
non-blocking warning (bidirectional, warn-only) — the user may proceed anyway.

**Rewrite** consumes the Applied tags' `rewrite_instructions`.

(Naming: "Applied" is the working name for that section — swap to "Active" or "In use" if you prefer;
keep it consistent.)

---

## Done when

- The icon rail is in place with Build / Prompts / Tags / Settings tabs and an account area; the old
  toggle and recents list are gone.
- Tags have all four fields, editable in the Tags tab, with counter-tags (bidirectional, warn-only) and
  a delete warning; the admin editor edits `default_tags`.
- The backend persists the new fields and counter-tag links, copies them correctly at signup, and the
  analyze/rewrite flows use applies-when and rewrite-instructions respectively.
- In the builder, Analyze fills Suggestions; clicking a suggestion moves it to Applied; the "+" opens a
  searchable checkbox dropdown to add tags manually; countering tags warn; Rewrite uses the Applied set.

## Out of scope

The variable editor, execution-screen changes, auth/keys, and propagating admin tag edits to existing
users (future).
