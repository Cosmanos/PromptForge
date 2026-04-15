# PromptForge

A prompt template builder and executor. Build reusable prompts with variables, refine them with AI-powered tag suggestions, and run them with full chat support.

## Quick Start

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Set up environment

Copy `.env.example` to `.env` and add your OpenAI API key:

```bash
cp .env.example .env
# Edit .env and set OPENAI_API_KEY=sk-...
```

### 3. Run

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## What it does

**Prompt Builder** (`/builder/:id`)
- Write prompts with `{{variable}}` syntax — variables auto-convert to colored chips
- Click a chip's expand button to set a default value inline
- Click **Analyze** to get AI tag suggestions
- Toggle tags, click **Rewrite** to have AI improve your prompt
- Switch between original and rewritten versions
- Click **Try Out** to test with default variable values

**Execution Screen** (`/execute/:id`)
- Fill in variable values (pre-populated with defaults)
- Copy the compiled prompt, or Execute to start an AI chat
- Continue the conversation with follow-up messages
- History sidebar shows all previous runs

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| State | TanStack Query v5 |
| Backend | Express + TypeScript |
| Database | SQLite (better-sqlite3) |
| AI | OpenAI API (gpt-4o) |
