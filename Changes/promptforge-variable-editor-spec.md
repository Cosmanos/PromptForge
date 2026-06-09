# PromptForge — Variable Editor Redesign Spec

Replace the current variable UI (the name-pill + separate default-value box) with an **inline,
in-prompt variable system**: a variable renders as its **default value, highlighted inside the prompt
text**, so you read the prompt as it will actually run. The variable name stays hidden until you act
on it. This is the centerpiece of the redesign.

Builds on the design tokens from the shell phase. **Out of scope:** the tag system and any backend
changes beyond persisting variables (the `variables` table already exists).

---

## 0. Engineering foundation (decide this first)

**Do not hand-roll `contenteditable`.** The required behavior — inline entities whose inner text is
editable in place, that wrap across multiple lines, carry per-variable color and a name, stay cohesive
under cursor navigation and deletion, and keep repeated instances in sync — is exactly where raw
`contenteditable` becomes an endless source of caret and selection bugs.

Use a mature rich-text framework with support for custom inline nodes/marks:
- **Recommended: TipTap** (built on ProseMirror) — strong React support, custom nodes and marks,
  decorations for the floating toolbar.
- **Alternative: Lexical** (Meta) — also supports custom nodes and is React-first.

Model a variable as either a **custom inline node** (atomic-ish, with editable inner text holding the
default) or a **mark/decoration** applied to a span of editable text (the marked text = the default,
the mark carries the variable's id/name/color). Pick whichever the chosen framework makes cleanest;
both must satisfy the behaviors below. This decision drives everything else, so settle it before
building UI.

---

## 1. The model

- A variable is **ordinary editable text with extra powers.** It renders as its **default value text,
  highlighted inline** in the prompt — not as its name. The name is hidden during building and only
  appears when the variable is selected.
- Each variable has its own **programmatic color**, consistent everywhere it appears.
- **Repeated variables share one definition.** If `{{Company}}` appears multiple times, those are the
  same variable (one row): same name, color, and default. Editing the default in one instance updates
  every instance, live. (Matches the `UNIQUE(prompt_id, name)` constraint.)

## 2. Visual states

- **Multiline highlight:** the highlight flows and wraps with the text across line breaks (e.g.
  `box-decoration-break: clone` if CSS-rendered) — never a rigid pill that breaks layout.
- **Unselected:** dashed outline in the variable's color + a light tinted fill.
- **Selected:** solid outline in the variable's color, a live blinking text cursor inside (you're
  editing it like normal text), and a **floating toolbar** anchored above it. The toolbar shows: a
  color dot, the variable **name** (mono), an **edit** (rename) control, and a **remove** control.
  Selection plays a brief animation (toolbar fades/slides in).
- **Empty variable:** a small dashed colored **slot** (no name shown) marking "something goes here."

## 3. Per-variable colors

Define a functional palette of distinct, readable colors (separate from the shell's neutral tokens),
each with a tinted fill + a saturated border/text, e.g. indigo, emerald, amber, rose, violet, teal.
Assign **deterministically** (round-robin by creation order or hashed name) and **persist** the choice
in the variable's `color` field so it's stable across reloads. Each color must read on white in both
fill and text.

## 4. Interactions

- **Select** = click the variable. This places a cursor inside (edit mode) and shows the toolbar.
  Toolbar appears on **select/click, not hover**, so it doesn't flicker while reading.
- **Edit the default** = type inside the highlighted text. The inline text *is* the default value;
  editing it edits the default (and syncs all instances of that variable).
- **Rename** = the toolbar's edit control turns the name into an inline editable field (with confirm /
  cancel). Renaming updates the variable everywhere it's referenced and its `{{Name}}` token.
- **Remove** = the toolbar's remove control **converts the variable back into plain text** — its
  current default value stays in the prompt as literal text (least destructive). It does not delete the
  words.
- **Atomic behavior:** for cursor navigation and backspace/delete from *outside*, the variable behaves
  as a single unit (you don't accidentally shatter the token); editing only happens when the cursor is
  *inside* in edit mode.
- **Empty → filled:** typing a default into an empty slot turns it into a normal highlighted variable;
  clearing a variable's default returns it to the empty-slot state.

## 5. Creation paths (three)

1. **Type `{{Name}}`** anywhere → creates a variable named `Name` with an empty default → renders as
   the empty slot (you just typed the name, so you know which it is).
2. **Select text → New variable** (button in the builder's top/building area) → the selection is
   **replaced** by the variable, the **selected text becomes the default value**, and focus jumps to
   the inline name field to name it.
3. **New variable with nothing selected** → inserts an empty slot at the cursor and opens the name
   field.

## 6. Data & serialization

- **Canonical/stored form:** the prompt text contains `{{Name}}` placeholders; the `variables` table
  holds one row per variable (`name`, `default_value`, `color`, `sort_order`, `prompt_id`).
- **On load:** parse `{{Name}}` tokens, join to `variables` for default + color, and render each as the
  inline highlight (showing the default, or the empty slot if no default).
- **On change** (create / rename / remove / edit default): update the in-memory model and persist both
  the text (with tokens) and the variables list. Renaming updates the token and the row; removing drops
  the row and replaces the token with the literal default text.
- The editor's job is the two-way mapping between the **rendered form** (highlighted defaults) and the
  **stored form** (`{{Name}}` + variables).

## 7. Integration with existing flows

- **Analyze:** runs on the prompt with variables untouched (values ignored), as today.
- **Rewrite:** the rewrite call **must preserve `{{Name}}` placeholders verbatim** — add an explicit
  instruction to the rewrite prompt so the model keeps the tokens intact. Variables persist across the
  Original/Rewritten toggle.
- **Try out:** compiles by substituting each `{{Name}}` with its **default value** and runs.
- **Execute:** substitutes the user-filled values at run time.
- **The separate "test values" list is removed** — the defaults now live inline in the prompt, so
  there's no second place to manage them.

## 8. Done when

- Variables render inline as their highlighted default values, wrapping correctly across lines, each in
  its own persistent color.
- Selecting a variable shows the floating toolbar (name, rename, remove) with the select animation, and
  the default is editable in place.
- All three creation paths work; renaming and removing behave per section 4; repeated variables stay in
  sync.
- Saving round-trips correctly to `{{Name}}` + the `variables` table, and Analyze / Rewrite (tokens
  preserved) / Try out / Execute all work against the new model.

## 9. Out of scope

The tag system/UX, execution-screen changes, and any auth/keys work. Backend changes are limited to
persisting variable `name` / `default_value` / `color` / `sort_order` if not already supported.
