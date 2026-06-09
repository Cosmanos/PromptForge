# PromptForge — App Shell & Visual Redesign Spec

Establish the design-token foundation and the persistent sidebar shell, and restyle the existing
screens to the new neutral visual language. This is **structure + styling only** — no functional
changes.

**Explicitly out of scope** (separate phases): the variable editor redesign (keep the current variable
UI as-is, just restyle the chrome around it) and the tag UX surfaces (the "+" popover, Tags management
screen, admin editor). Don't build those here.

Stack reminder: React (Vite). Centralize everything below as **design tokens** — CSS custom properties
or your Tailwind theme — and never hardcode colors/sizes in components.

---

## 1. Design tokens

### Color

| Token | Value | Use |
|---|---|---|
| `--surface` | `#ffffff` | Main content background, cards, panels |
| `--surface-sidebar` | `#f7f6f3` | Sidebar background |
| `--surface-muted` | `#faf9f6` | Subtle fills (selected rows, inset areas) |
| `--track` | `#efefec` | Segmented-toggle track |
| `--border` | `#e6e6e3` | Card/input/panel borders |
| `--border-subtle` | `#efefec` | Dividers, row separators |
| `--text` | `#202020` | Primary text |
| `--text-secondary` | `#6b6b68` | Secondary text |
| `--text-tertiary` | `#9a9a96` | Placeholders, hints, muted icons |
| `--accent` | `#202020` | Primary buttons, selected pills/toggles |
| `--accent-hover` | `#404040` | Hover for accent surfaces |
| `--success` | `#157a4a` | "Connected" status |
| `--success-bg` | `#e8f6ee` | Success badge background |
| `--danger` | `#a3322f` | Destructive actions (delete) |

Notes: this is intentionally **not** Anthropic's palette. The only saturated colors in the app are the
**per-variable colors**, which are functional and defined in the builder phase — not part of these
shell tokens. Keep the theme light; no dark mode required for the MVP.

### Typography

- **Sans (UI):** a clean grotesk — recommend keeping your current UI font if it's neutral, otherwise
  something like Geist or Hanken Grotesk. Avoid defaulting to plain Inter.
- **Mono:** for variable names, model identifiers, and code-ish bits (e.g. JetBrains Mono or the
  system mono stack).
- **Weights:** 400 (normal) and 500 (medium) only — no bold/700.
- **Scale (approx):** page title 18px/500, section label 13px, body 14–15px, meta/caption 12px,
  uppercase micro-labels 11px with `letter-spacing: .05em`. Don't go below 11px.

### Shape & elevation

- **Radii:** pills `999px`; buttons, inputs, toggle segments `8px`; cards and panels `12px`.
- **Borders:** `1px solid var(--border)` (or `0.5px` if your rendering supports it cleanly).
- **Elevation:** flat. No drop shadows — separation comes from borders and the sidebar background.
- **Spacing:** use a consistent scale (e.g. 4/8/12/14/16/18px); generous line-height (~1.6) in prose.

---

## 2. Shared components

Build these as reusable components so every screen is consistent.

- **Button — primary:** `--accent` background, white text, `--accent` border, radius 8px. Hover →
  `--accent-hover`.
- **Button — secondary:** white background, `--border` border, `--text` text. Hover → `--surface-muted`.
- **Button — icon:** square, secondary styling, icon only.
- **Button — destructive:** secondary shape, `--danger` text and a tinted border.
- **Segmented toggle:** `--track` background, 3px padding; active segment = `--accent` background with
  white text, radius 6px. Used for Build/Use and Original/Rewritten.
- **Pill / tag:** default = white with `--border`, `--text-secondary`; selected = `--accent` background,
  white text (with a check icon); "add" variant = dashed border, `--text-tertiary`, plus icon.
- **Card:** white, `--border`, radius 12px, internal padding ~13–14px.
- **Input / textarea:** white, `--border`, radius 8px, `--text` text, `--text-tertiary` placeholder.
- **Badge:** small 11px label, rounded 6px — neutral (`--track`/`--text-secondary`) or status
  (`--success`/`--success-bg`).
- **Model selector chip:** bordered pill with a small provider dot, mono model name, and a chevron.

Icons: use a single consistent icon set (e.g. Tabler/Lucide), sized 14–18px, inheriting text color.

---

## 3. App shell & navigation

A persistent **left sidebar** + a main content area. The shell wraps the whole authenticated app.

**Sidebar (~220–240px, `--surface-sidebar`, right border):**
- Top: wordmark "PromptForge" with a small flame/forge icon.
- **Build / Use segmented toggle** — the primary mode switch.
- **New prompt** button.
- **Recent prompts** — a scrollable list of the user's saved prompts (most recent first), each a row
  with an icon + name; the active one has a `--surface-muted` highlight. Clicking opens it.
- Bottom: account area — current user's name/avatar and a sign-out action.

**Main area:**
- **Build mode:** lands on an empty "new prompt" state (like a fresh chat) that is the builder.
  Selecting a recent prompt opens it in the builder.
- **Use mode:** the My Prompts grid; selecting a prompt goes to its execution screen.

**Routing (suggested):**
- `/build` (new), `/build/:promptId` (open existing)
- `/use` (grid), `/use/:promptId/run` (execution)
- The Build/Use toggle reflects and controls which section is active.

**Auth integration:** the shell is behind the auth guard (from the auth phase); the account area uses
the signed-in user and the sign-out flow.

---

## 4. Apply to existing screens

Restyle these to the tokens/components above **without changing behavior**:

- **Builder** — top bar (title + model chip), tag row, editor card, Original/Rewritten toggle, Analyze
  / Try out, Save. Keep the **current variable UI** intact for now; only restyle surrounding chrome.
- **My Prompts grid** — New prompt card + prompt cards (title, edited date, variable count, model
  badge, Execute / edit / delete), search.
- **Execution screen** — keep as-is functionally; apply the palette and components.
- **Settings / connect-models** (from the keys phase) — apply tokens.
- **Auth screens** — sign-in/up styled with the same tokens.

---

## 5. Responsive

Desktop-first. Below a narrow breakpoint, collapse the sidebar into a toggleable drawer (hamburger);
the main area goes full width. Keep this minimal for the MVP — correctness over polish.

---

## 6. Implementation notes

- Define the tokens once (CSS variables on `:root`, or the Tailwind theme) and reference them
  everywhere — no inline hex values in components.
- Build the shared components in section 2 first, then compose screens from them.
- This phase sets the foundation the variable-editor and tag-UX phases will build on, so getting the
  tokens and shared components right here pays off twice.

**Done when:** the app has a persistent sidebar with working Build/Use switching, a recent-prompts
list, and an account/sign-out area; every existing screen wears the neutral palette via shared,
tokenized components; and there are no functional regressions.
