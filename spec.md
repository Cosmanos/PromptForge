# PromptForge – MVP Spec

## 1. Overview

PromptForge is a prompt template builder and refinement tool designed to help users create high-quality, reusable prompts for LLMs without requiring deep prompt engineering knowledge.

It acts as a structured layer between user intent and LLM execution, enabling:

* prompt validation (static analysis)
* guided improvements via tags
* reusable templates with dynamic variables
* execution with real inputs

The core idea: **“Figma for LLM prompts”** — a visual, iterative, and structured way to build prompts.

---

## 2. Problem Statement

Most users struggle with:

### 2.1 Poor Prompt Quality

Users:

* don’t know what makes a good prompt
* rely on trial and error
* forget important instructions (format, tone, constraints)

### 2.2 Lack of Reusability

Prompts are:

* copy-pasted
* not parameterized
* hard to reuse across contexts

### 2.3 No Structured Prompt Engineering Workflow

There is no equivalent of:

* linting (validation)
* templating (variables)
* versioning (refinement loop)

### 2.4 Inefficient Iteration

Users:

* rewrite prompts manually
* cannot easily compare versions
* lose improvements

---

## 3. Goals (MVP)

* Improve **first-response quality**
* Enable **prompt reusability**
* Provide **guided prompt refinement**
* Introduce **structured prompt templates**

---

## 4. Core Concepts

### 4.1 Prompt Template

A prompt is not just text. It is:

```
PromptTemplate {
  name
  raw_prompt
  variables: Variable[]
  tags: Tag[]
  compiled_prompt
  model (OpenAI)
}
```

---

### 4.2 Variables

Defined using:

```
{{variable_name}}
```

#### Behavior:

* Detected on "Analyze"
* Represent dynamic inputs
* Stored separately

#### Properties:

```
Variable {
  name
  default_value
}
```

#### Execution:

* Variables are replaced with values
* Validation ignores variable values

---

### 4.3 Tags

Tags represent prompt enhancements.

Examples:

* Structured Output
* Be Critical
* Beginner Friendly
* Use Examples
* Step-by-Step
* Research Mode (future)

#### Properties:

```
Tag {
  name
  prompt_transformation_logic
}
```

#### MVP:

* Predefined list
* Selected manually
* Applied during rewrite

---

## 5. System Modes

### 5.1 Prompt Builder

Used to:

* write prompt
* define variables
* validate prompt
* refine prompt
* test prompt

---

### 5.2 Prompt Execution

Used to:

* select saved prompt
* fill variables
* execute prompt
* continue chat

---

## 6. User Flow

### 6.1 Main Screen

* Grid of saved prompts
* Search bar
* "New Prompt" card
* Each card:

  * Execute
  * Edit
  * Delete

---

### 6.2 Prompt Builder

#### Layout:

* Top: name + back button
* Center: prompt editor (chat-style input)
* Top of editor: tag suggestions
* Bottom buttons:

  * Analyze
  * Try Out

---

### 6.3 Analyze Flow (Validation)

1. User clicks "Analyze"
2. LLM analyzes prompt (without variable values)
3. System returns:

   * suggested tags
4. Tags appear above editor

---

### 6.4 Tag Selection + Rewrite

1. User selects tags
2. "Rewrite" becomes active
3. User clicks "Rewrite"
4. LLM rewrites full prompt

#### Behavior:

* Original prompt preserved
* Rewritten version generated
* Toggle between versions

#### Editing:

* Editing original → disables rewrite
* Editing rewritten → allowed

---

### 6.5 Variables UI

* Variables appear as **inline chips (colored)**
* Each has:

  * name
  * edit
  * delete

(MVP: no split bubble UI yet)

---

### 6.6 Try Out (Execution inside builder)

* Replaces variables with default values
* Calls LLM
* Shows response below prompt
* Editing prompt invalidates response

---

### 6.7 Execution Screen

1. Select prompt
2. Form appears with variables
3. User fills inputs
4. Click Execute

#### Result:

* Starts chat session
* Response displayed in blocks
* Each block copyable

---

## 7. Prompt Refinement Engine

### 7.1 Validation Call

Input:

* raw prompt (variables untouched)

Output:

```
{
  suggested_tags: []
}
```

---

### 7.2 Rewrite Call

Input:

* raw prompt
* selected tags

Output:

* full rewritten prompt

Constraint:

* no hidden system context
* all improvements embedded in prompt

---

## 8. LLM Integration

* OpenAI only (MVP)
* API key configurable
* Model selection (basic)

---

## 9. Design Principles

* Clean, minimal UI (Notion-inspired)
* Visual clarity over complexity
* Immediate feedback
* No unnecessary friction

---

## 10. Non-Goals (MVP)

* Custom tags
* Multi-provider support
* Advanced variable types
* Prompt version history
* Agent workflows

---

## 11. Future Directions

* Custom tag creation
* Tag conflict system
* Prompt versioning
* RAG / context injection
* Prompt performance metrics
* Collaboration
* Agentic workflows

---

## 12. Success Criteria

* Users get better results in fewer attempts
* Users reuse prompts regularly
* Users understand how prompts improve
