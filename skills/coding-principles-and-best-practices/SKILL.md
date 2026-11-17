---
name: "coding-principles-and-best-practices"
description: "Language-agnostic coding principles to apply whenever writing, modifying, refactoring or reviewing code in any language, including small fixes, PR reviews and 'look over this' requests."
---

# Coding Principles

These are strong defaults, not laws. Break one only when doing so makes the code clearer, and leave a short comment saying why.

**Precedence:** project conventions (linter, style guide, existing patterns) come first. The language's own idioms, official style guide and formatter come second. This skill comes third.

**When principles conflict**, rank them: correctness, then security, then readability, then everything else.

**Scale to the task.** A one-off script or prototype doesn't need layers, dependency injection or full test coverage; production code does. A small fix should stay a small diff.

## Writing code
1. Read the surrounding code first. Match its patterns, naming, error model and test style.
2. Clarify requirements and edge cases. If something is unclear, state the assumption you made.
3. Build the smallest design that meets the need (KISS, YAGNI). Don't add speculative layers, interfaces or options.
4. Apply the checklist while you write. Add or update tests for the behavior you changed.
5. Verify: run the project's tests, linter, type checker and build where available, and fix what fails. Say what you couldn't run.
6. Self-review the diff against the checklist before presenting it.

## Checklist

**Design**
- Follow SOLID. Keep concerns separate (transport → business logic → data access), with no HTTP or SQL inside business logic.
- Prefer composition over inheritance. Follow the Law of Demeter (no `a.b().c().d()` chains) and the principle of least astonishment (no hidden side effects or surprising return values).
- Apply DRY to business knowledge, but don't merge code that is only similar by coincidence.
- Inject dependencies rather than constructing them inside, so code is testable.
- Keep modules cohesive and loosely coupled. Don't break public APIs, data formats or schemas without flagging it and providing a migration path.

**Readability**
- Use intention-revealing names in the language's casing convention. Functions are a verb plus a noun. Booleans start with `is`, `has`, `can` or `should`. Put units in names (`timeoutMs`). No cryptic abbreviations, misleading names or vague words like `data`, `info` or `manager`.
- Keep functions small, at one level of abstraction, with three parameters or fewer (group the rest into an object) and no boolean flag parameters.
- Replace magic numbers and strings with named constants or enums.
- Comments explain *why* (a business rule, workaround or trade-off) and reference the ticket or spec. Public APIs get doc comments in the language's standard format, covering parameters, return values, errors and side effects.

**Correctness & robustness**
- The code does what the requirement asks. Re-read the requirement before finishing.
- Use guard clauses: check preconditions first, fail fast, avoid deep nesting.
- Handle edge cases: empty or null, zero or negative, very large, Unicode, time zones, concurrency.
- Errors are specific, carry context, preserve the original cause and are never swallowed. Catch an error only where you can act on it. Use the language's native error model (exceptions, `Result`, error returns).
- Don't mutate inputs unexpectedly. Keep shared mutable state to a minimum. Make APIs and jobs idempotent so retries are safe.
- Release resources deterministically (files, connections, locks) with the language's construct (`with`, `defer`, `using`, try-with-resources, RAII). Give network calls timeouts, and retry only with backoff and a limit.

**Security**
- Never trust external input (users, APIs, files, config). Validate and sanitize it, parameterize queries, and encode output for its context.
- No hardcoded secrets. Apply least privilege. Use vetted crypto and auth libraries, and hash passwords with a dedicated algorithm.
- Log meaningful events at the right level, with context such as request or entity IDs. Never log secrets or personal data.

**Tests & performance**
- Test behavior and edge cases, not internals: unit tests for logic, integration tests at boundaries. Tests are fast, isolated and deterministic. For each bug fix, write a regression test that fails first.
- Make it correct and clear first, and profile before optimizing. Still avoid obvious waste: I/O or queries inside loops (N+1), repeated expensive work, the wrong data structure.

**Hygiene**
- Follow the Boy Scout rule with small cleanups only; keep big refactors out of feature changes. Delete dead code. Make small, atomic changes with messages that explain why.

## Reviewing code
Review the changed code and what it directly affects, against the checklist. Skip anything the linter or formatter already handles, and anything that matches the existing codebase's conventions. Before marking something Must fix, trace it to confirm it's real; if you aren't sure, say so. Keep nits to the few that matter. Use this format:

```
## Review summary
<1–2 sentences>
### 🔴 Must fix (bugs, security, data loss, broken contracts)
- <file:line> — <problem> → <fix>
### 🟡 Should fix (design, maintainability, missing tests)
- <file:line> — <problem> → <fix>
### 🟢 Nits
- <file:line> — <suggestion>
### ✅ Done well
- <brief>
```

Each finding gives its location, the problem, why it matters and a concrete fix. Name a principle only when it helps the author understand the issue. Critique the code, not the author.
