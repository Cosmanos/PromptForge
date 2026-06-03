# PromptForge — Auth, Ownership, Tags & Keys Spec

The "login phase," expanded to the full bundle agreed in design review. It turns the current
single-user app into a real multi-user app where **all data is owned by a user**, adds the per-user
tag model, and adds encrypted bring-your-own API keys. Built on the existing stack: React (Vite)
frontend + Express API on Vercel + Supabase (Auth + Postgres).

Build it in the four sequenced parts below — each is independently shippable.

---

## Architectural ground rules (read first)

- **The API enforces ownership, not RLS.** The Express API connects to Postgres through the direct
  pooler connection as the `postgres` owner, which **bypasses Supabase RLS entirely.** Therefore
  per-user security lives in the API's query layer: every read and write is scoped to the
  authenticated user. RLS may be added later as defense-in-depth, but it is *not* the enforcement
  mechanism here.
- **IDOR is the main risk.** Ids are sequential integers, so any endpoint that fetches by id
  (`/api/prompts/:id`, `/api/sessions/:id`, nested resources) MUST verify the resource belongs to the
  caller before returning or mutating it — never fetch by id alone. A missing check lets one user read
  another's prompts or conversations by guessing an id. This check is mandatory on every id-bearing
  route.
- **Auth model.** The React app signs in via Supabase (`@supabase/supabase-js`), holds the session,
  and sends the access token as `Authorization: Bearer <token>` on every API call. The API verifies
  the token and extracts the user id; no server-side session store.

---

## Part 1 — Auth core

**Providers:** email/password (with **email verification required**), Google, GitHub — all via
Supabase Auth.

**Frontend:**
- Use `@supabase/supabase-js` for sign-up, sign-in (all three providers), sign-out, and password reset.
- Email/password sign-up requires the user to confirm their email before they can sign in.
- Protect the app: unauthenticated users are redirected to a sign-in screen. The session token is
  attached to every API request.
- Account menu in the sidebar (current user, sign out).

**Backend (Express):**
- An auth middleware on all `/api` routes reads the `Authorization: Bearer` token and verifies it
  **locally against the project's JWKS** (asymmetric ES256, the default for this project) — e.g. via
  the Supabase client's `getClaims()` or a JWKS-based verifier. No per-request call to the Auth server.
- Extract the `sub` claim as `user_id`; attach it to the request. Reject with 401 if the token is
  missing, invalid, or expired.

**Config tasks (dashboard, you):**
- Enable Google and GitHub providers in Supabase Auth; register OAuth apps in Google Cloud + GitHub;
  set redirect URLs for the production domain and localhost.
- Keep "Confirm email" enabled in Supabase Auth settings.

**Done when:** a user can sign up (and must verify email), sign in via all three methods, and the API
rejects requests without a valid token.

---

## Part 2 — Per-user data ownership (everything is user-specific)

Nothing is shared between users. Ownership is direct on top-level tables and inherited through parents
for nested ones.

**Direct `user_id` (FK → `auth.users`):**
- `prompts`
- `tags` (see Part 3)
- `provider_credentials` (see Part 4)
- `sessions` — also add `user_id` directly (denormalized) so conversation history can be scoped and
  queried without always joining through `prompts`.

**Inherited ownership (scoped via parent, no direct column needed):**
- `variables` → via `prompt_id`
- `prompt_tags` → via `prompt_id` (and the `tag_id` must be one of the user's own tags)
- `messages` → via `session_id` → `sessions.user_id`

**Query rules:**
- Every list endpoint filters by `user_id = <caller>`.
- Every id-bearing endpoint (get/update/delete a prompt, open a session, fetch a session's messages,
  edit a variable, etc.) verifies ownership before acting — directly via `user_id`, or by joining to
  the owning prompt/session and checking its `user_id`. Return 404 (not 403) on mismatch so ids aren't
  confirmed to exist.
- Every insert sets `user_id` from the authenticated user, never from the request body.

**Existing data:** wipe the current prompts and all their dependent rows (variables, prompt_tags,
sessions, messages) — start fresh. (Tags are handled in Part 3.)

**Done when:** two different accounts see entirely separate prompts and conversation histories, and no
id-guessing on any route returns another user's data.

---

## Part 3 — Tags: admin template + inherit at signup

The earlier "read-only system tags" tier is **removed.** New model:

- **`default_tags`** — a template set the admin maintains (columns mirror a tag: `name`, `hint`,
  `sort_order`). This is the seed, not a live shared source.
- **`tags`** — per-user tags (`user_id` owner, plus `name`, `hint`, `sort_order`).
- **On account creation, copy every `default_tags` row into the new user's `tags`.** From then on they
  are the user's own.
- The user has **full CRUD** on all their tags, including inherited ones. Deleting one shows a
  **warning** but is allowed.
- **No propagation:** editing a `default_tags` row later does **not** update existing users' tags.
  (Propagation to all users is a future feature, explicitly out of scope now.)
- **Admin editor:** gated by an `is_admin` flag on the user's profile; it edits `default_tags`. This is
  the only admin surface for now.

**Migration:** move the current global tags into `default_tags` (they become the seed). The admin
account, like any account, gets them copied into its own `tags` at creation.

**Done when:** a brand-new account starts with a personal copy of the default tags, can edit and delete
them (with a warning on delete), and admin edits to `default_tags` affect only future signups.

---

## Part 4 — Per-user encrypted API keys

Replaces the single shared OpenAI key. Each user brings their own keys.

**Storage — `provider_credentials`:** `user_id`, `provider` (`anthropic` | `openai`), `ciphertext`,
`iv`, `auth_tag`, `last4`, `created_at`.
- Encrypt with **AES-256-GCM**; the master key is an env var on the API project. Encrypt on write,
  **decrypt only server-side at call time.** Never return the full key — expose only `last4` and a
  connected/not-connected status.
- The user always pastes the key themselves; the app never fills it.

**Onboarding & settings:**
- After sign-up, a "connect models" step prompts the user to add at least one provider key (skippable).
- A settings screen to add / replace / remove a key per provider.

**Wiring into the LLM routes:**
- `analyze`, `rewrite`, `tryout`, `execute` switch from the shared `OPENAI_API_KEY` to the
  **authenticated user's decrypted key**, routed through the provider abstraction (Anthropic + OpenAI).
- **Gate actions:** if the user has no key for the selected model's provider, disable Analyze /
  Try out / Run with the label "Connect a model."
- The model selector lists only providers the user has connected.

**Done when:** a user connects their own Anthropic and/or OpenAI key, the LLM routes run on that key
(not a shared one), keys are stored encrypted and never returned, and actions gate correctly when no
key is present.

---

## Data model changes (summary)

- `profiles`: add `is_admin boolean default false`.
- `prompts`: add `user_id`.
- `sessions`: add `user_id`.
- `tags`: add `user_id`.
- New `default_tags` (admin template).
- New `provider_credentials` (encrypted keys).
- `variables`, `prompt_tags`, `messages`: unchanged columns; scoped via their parent.

---

## Security checklist

- [ ] Token verified locally via JWKS; `sub` → `user_id`; 401 on invalid/missing.
- [ ] Every id-bearing route verifies ownership (no fetch-by-id-alone); 404 on mismatch.
- [ ] `user_id` always set from the token, never from the request body.
- [ ] API keys encrypted (AES-256-GCM), decrypted only at call time, only `last4` ever returned.
- [ ] Encryption master key and all provider secrets live only on the API project's env, never the
      frontend.
- [ ] Email verification required for email/password signups.

---

## Build sequence

Part 1 (auth core) → Part 2 (ownership) → Part 3 (tags) → Part 4 (keys). Each can be built, tested, and
deployed before the next. Hand them to Claude Code one part at a time; verify each "Done when" before
moving on.
