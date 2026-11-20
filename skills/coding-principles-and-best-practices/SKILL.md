---
name: coding-principles-and-best-practices
description: "Language-agnostic coding principles to apply whenever writing, modifying, refactoring or reviewing code in any language, including small fixes, PR reviews and 'look over this' requests."
---

# Coding Principles

These are strong defaults, not laws. Break one only when doing so makes the code clearer, and say why in your response. Add a code comment only if a future reader would otherwise "fix" it back.

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

**Scope and when to ask.** Preserve existing behavior unless the task is to change it. Keep cleanup within the requested area and the code directly coupled to it. Make obvious, low-risk improvements directly. Ask first only when a choice changes behavior or a public API, adds a dependency, widens the scope, or is costly to reverse.

**Reuse before adding.** Prefer the platform, the framework and libraries the project already has. Don't add a dependency that duplicates one already installed (a second HTTP client, validator or date library), and don't add any new dependency without saying so.

## Checklist

Treat this checklist as a set of decision prompts. Apply items that are relevant to the changed behavior, boundary, or risk level; don't force every item into every task.

**Design**
- Keep concerns separate (transport → business logic → data access), with no HTTP or SQL inside business logic. One reason to change per module.
- Prefer composition over inheritance. Avoid reaching through objects you don't own (`order.getCustomer().getAddress().getCity()`); fluent and builder APIs that return the same kind of object (query builders, collections, HTTP clients) are fine. No hidden side effects or surprising return values.
- Apply DRY to business knowledge, but don't merge code that is only similar by coincidence.
- Make dependencies replaceable in tests: inject them, or use the framework's own mechanism (service container, facades with fakes, module mocks). Don't construct hard-to-fake collaborators deep inside logic.
- Keep modules cohesive and loosely coupled. Don't break public APIs, data formats or schemas without flagging it and providing a migration path.

**Readability**
- Use intention-revealing names in the language's casing convention. Functions usually read as a verb plus a noun. Booleans start with `is`, `has`, `can` or `should`. Put units in names (`timeoutMs`). No cryptic abbreviations, misleading names or vague words like `data`, `info` or `manager`.
- Keep functions small and at one level of abstraction. When a function takes more than about three parameters, consider an options object. Prefer two clearly named functions over a boolean parameter that switches behavior.
- Replace magic numbers and strings with named constants or enums.
- Comments explain *why* (a business rule, workaround or trade-off). Reference a ticket or spec when one exists; never invent one. Public APIs get doc comments in the language's standard format, covering parameters, return values, errors and side effects.

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
- Test behavior, not internals. Tests are deterministic and independent of each other. For each bug fix, write a regression test that fails first.
- Make it correct and clear first, and profile before optimizing. Still avoid obvious waste: I/O or queries inside loops (N+1), repeated expensive work, the wrong data structure.

**Hygiene**
- Follow the Boy Scout rule with small cleanups only; keep big refactors out of feature changes. Delete dead code. Make small, atomic changes with messages that explain why.

## Selecting changes for a Git review

Use this only when the user asks to review "my changes", a branch or a PR without pointing at specific code. If they name files or functions, or paste code, review that instead.

**What to include.** Staged changes (`git diff --cached`) plus everything committed on the branch since it left the base, up to `HEAD`, so unpushed commits are covered. Review only what's pushed (`@{u}` instead of `HEAD`) when the user asks for "the PR" or "what's pushed". Exclude unstaged and untracked changes unless asked, but mention them if they exist.

**Choosing the base**, in order:
1. A base the user gave, or the PR's known target branch.
2. The remote's default branch (`origin/HEAD`).
3. Whichever of `origin/main`, `origin/master`, `origin/develop` exists.
4. A local branch of those names, only when no remote ref is available.

If no reliable base can be identified, ask rather than guessing.

Don't fetch automatically. Remote-tracking refs reflect the last local fetch, so say so when freshness matters, and say when `HEAD` is ahead of or behind its upstream.

Typical command sequence (adapt to your shell/tooling):

```bash
git diff --cached                                   # staged changes
git symbolic-ref --short refs/remotes/origin/HEAD   # remote default branch, if set
git diff <base>...HEAD                              # branch changes since the merge-base, incl. unpushed commits
git rev-list --left-right --count HEAD...@{u}       # ahead/behind upstream, if there is one
git status --short                                  # unstaged/untracked work you're leaving out
```

## Reviewing code
Review the changed code and what it directly affects, against the checklist. Skip anything the linter or formatter already handles, and anything that matches the existing codebase's conventions. Before marking something Must fix, trace it to confirm it's real; if you aren't sure, say so. Report only evidence-backed defects or material risks; don't report style preferences or low-impact polish. Include 🟢 Nits only when the user explicitly asked for polish or style feedback. Use this format:

```
## Review summary
<1–2 sentences>
### 🔴 Must fix (bugs, security, data loss, broken contracts)
- <file:line> — <problem>; <why it matters> → <fix>
### 🟡 Should fix (design, maintainability, missing tests)
- <file:line> — <problem>; <why it matters> → <fix>
### 🟢 Nits (only when requested)
- <file:line> — <suggestion>
### ✅ Done well
- <brief>
```

Leave out any empty section. Name a principle only when it helps the author understand the issue. Critique the code, not the author.
