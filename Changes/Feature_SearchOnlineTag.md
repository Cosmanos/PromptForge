# Feature: Search Online Tag

Status: planned
Implemented: -
Affects: tag system, execution pipeline, backend search integration, response rendering, Analyze suggestion logic

---

## Overview

When a user's prompt needs real-world information — research, current events, facts that could go stale — the LLM is likely to hallucinate. The **Search Online** tag fixes this by enforcing a web search step before the LLM ever generates a response. The search results are injected as grounded context, and the LLM answers based on that instead of its training data alone.

This is not an AI-decides-to-search flow. It is enforced: if the tag is active, a search always happens first. The user doesn't configure it, doesn't see the mechanics, and doesn't need to understand what's happening. They just get a more accurate answer and a small sources list below the response.

Primary beneficiary: Maria, who was getting hallucinated research answers.

---

## Design Decisions

**Tag-driven, always enforced.** When Search Online is active, every execution does a search pass first. The LLM does not decide whether to search — the system does. This is the core difference from how ChatGPT or Claude handle search (model decides). Here it is the user's explicit, persistent choice.

**Suggested by Analyze, not always present.** Search Online is not shown by default in the tag list. The Analyze step detects when a prompt is research-oriented and surfaces it. The user selects it consciously. After that it's sticky on the prompt.

**One search round, 2–3 queries max.** Not deep research. The system extracts the key question(s) from the compiled prompt, runs 2–3 targeted searches, takes the top results, and injects them as a `[Sources]` block before the user's prompt. Fast enough that the user barely notices the extra step.

**Sources appear below the response, collapsed by default.** A small "Sources" disclosure at the bottom of the response. Tapping it reveals the list of URLs with titles. Not in the way, but there if the user wants to verify. Follows the "seamless over explicit" principle.

**No sources UI for non-Search-Online responses.** Sources only appear when the tag is active. Other responses are unchanged.

**Rejected: letting the user write their own search queries.** Too much friction, too technical. The system infers the queries from the prompt — the user doesn't need to think about it.

**Rejected: showing the search step progress in UI.** Adds visual noise. A brief loading state ("Searching...") during the search pass is enough.

---

## Implementation Notes

### Search provider
Use a web search API on the backend. Recommended: **Brave Search API** (privacy-respecting, affordable, no user tracking) or **Serper** (Google results, easy integration). API key stored in `.env`. Start with one provider — make it swappable later.

### Execution pipeline change
When Search Online tag is active, the backend execution flow becomes:

```
1. Extract search queries from compiled prompt (LLM call: "Given this prompt, write 2-3 targeted web search queries")
2. Run queries against search API
3. Fetch and truncate top results (title + snippet + URL, max ~2000 tokens total)
4. Inject results into prompt as a [Sources] block prepended to the user prompt
5. Run normal LLM call with grounded context
6. Return response + source list to frontend
```

### Prompt injection format
```
[Sources - retrieved {date}]
1. {title} — {snippet} ({url})
2. {title} — {snippet} ({url})
3. {title} — {snippet} ({url})

---

{original compiled prompt}
```

The LLM system prompt (tag transformation logic) instructs it to: prioritize the provided sources, cite facts using the source numbers, and flag anything it's uncertain about.

### Response format
Backend returns:
```json
{
  "response": "...",
  "sources": [
    { "title": "...", "url": "...", "snippet": "..." }
  ]
}
```

### Frontend
- During search pass: show "Searching..." label in place of the normal loading indicator
- After response: if `sources` array is non-empty, render a collapsed `Sources` disclosure below the response
- Sources list: numbered, each showing title as a link and a truncated snippet

### Analyze suggestion logic
In the Analyze step, if the prompt contains terms like "research", "find out", "what is", "latest", "current", "news", "facts about", "who", "when", "statistics", suggest the Search Online tag with a brief explanation: "This prompt asks for factual information — searching online first will improve accuracy."

### Environment variable
```
SEARCH_API_KEY=...
SEARCH_PROVIDER=brave  # or serper
```

---

## Bugs & Improvements

### Bugs
_(none yet)_

### Improvements
- [ ] Allow user to see the raw search queries that were generated (debug/transparency mode)
- [ ] Let user manually add a search query on top of the auto-generated ones
- [ ] Cache search results for identical queries within a session to reduce API calls
- [ ] Support multiple search providers with fallback
- [ ] Show source freshness (date of article) in the sources list