---
name: js-best-practices
description: 'Enforce modern JavaScript best practices, SOLID principles, and clean code standards. Use when writing or refactoring JS/TS code, ensuring ES6+ syntax, meaningful naming, separation of concerns, input validation, and maintainable architecture.'
user-invocable: true
---

# JavaScript & TypeScript Best Practices

Always use modern JS/TS. This skill only records **the rules that are easy to get wrong**. It sits on top of the core principles; it doesn't repeat them.

## Setup (keep it cheap)

1. **Core principles:** if `references/coding-principles-and-best-practices/SKILL.md` isn't already in this conversation, read it once. It defines precedence, the conflict ranking, the writing workflow, the general checklist and the review format. Don't re-read it on later invocations in the same conversation.
2. **Project profile:** run `node <this-skill-dir>/scripts/js-profile.mjs <dir-of-the-file-you're-working-on>`. It prints the cached profile from `<projectRoot>/.claude/js-project-profile.md`, and only re-inspects the config (package.json, tsconfig, lint/test config) when that config has changed. Use the printed profile instead of opening those files yourself. Skip this step if the profile is already in this conversation and you haven't changed any config.
   - "No package.json found" → it's a standalone snippet; state your assumptions (runtime, ESM/CJS, TS or not).
   - Node unavailable → read package.json and tsconfig directly, once.
3. **Learn as you go:** when you discover a convention the config can't show (folder layering, error model, naming, test style) or the user corrects you, add one short bullet under `## Learned conventions` in the profile. Keep that section under ~15 lines; it's read on every invocation.

The profile decides syntax availability (target/engines), module system, which libraries to reuse (don't add a second validator, HTTP client or date library) and which commands to verify with.

## Rules that matter

**Values & mutation**
- `??` for defaults, never `||` (it drops `0`, `''`, `false`). `?.` only for genuinely optional data — don't use it to hide values that should always exist.
- `===` everywhere; `x == null` is the only accepted loose check.
- Spread/`Object.assign` are shallow → `structuredClone` for deep copies. `sort`/`reverse`/`splice` mutate the caller's array → use `toSorted`/`toReversed`/`toSpliced`/`with` (if the target allows) or copy first.
- No money in floats (integer minor units or a decimal lib). `Number.parseInt(x, 10)`, `Number.isNaN`. `BigInt` for IDs above `MAX_SAFE_INTEGER`.
- Dates: date-only ISO strings parse as UTC, date-time strings without offset as local; `Date` months are 0-based. Store/transmit UTC ISO 8601, format at the edge with `Intl`.

**Async**
- Every promise is awaited, returned or given an explicit `.catch`. `array.forEach(async …)` never waits — use `for…of` (ordered) or `Promise.all` (parallel).
- Independent awaits run in parallel (`Promise.all` / `allSettled`), with a concurrency cap for large batches.
- `fetch` doesn't reject on 4xx/5xx — check `response.ok`. Every network call gets `AbortSignal.timeout(ms)` or a passed-in `signal`.
- Guard against races: stale responses overwriting newer ones, double submits, read-modify-write across an `await`.

**Errors**
- Throw `Error` subclasses with `this.name` set, never strings/objects; wrap with `{ cause }`. Map them to HTTP status/UI state in one place at the boundary.
- `catch (err)` is `unknown`: narrow with `instanceof`, re-throw what you can't handle. An empty catch needs a comment explaining why.

**TypeScript** (when the profile says TS)
- No `any` (use `unknown` + narrowing); no `!` assertions; `@ts-expect-error <reason>` instead of `@ts-ignore`.
- Types vanish at runtime: validate request bodies, API responses, `JSON.parse`, storage and env vars with the project's schema library. `as` is not validation.
- Model states as discriminated unions with an exhaustive `switch` (`never` default). Annotate exported signatures; let locals infer. `satisfies` over widening annotations.

**Node.js**
- No `*Sync` fs/crypto/child_process calls in request paths; stream large payloads with `stream/promises`.
- Validate env config once at startup into a typed object; no scattered `process.env` reads.
- `node:` prefix for built-ins. Log and exit on `unhandledRejection`/`uncaughtException`. Handle `SIGTERM` gracefully.
- Commands: `execFile`/`spawn` with an args array, never `exec` with interpolation. Normalize and contain file paths (`../` traversal).

**Browser DOM**
- Batch layout reads, then writes — never interleave `offsetHeight`/`getBoundingClientRect` with style writes in a loop. Toggle classes over inline styles; insert in one go (`DocumentFragment`/`append(...nodes)`).
- Throttle/debounce scroll, resize and input handlers; `{ passive: true }` on scroll/touch; observers instead of polling.
- Every listener, timer, observer and subscription has a teardown; one `AbortController` signal can remove many listeners.

**Security**
- No untrusted data into `innerHTML`/`outerHTML`/`insertAdjacentHTML`/`document.write`; use `textContent` or sanitize (DOMPurify). Reject `javascript:` URLs in `href`/`src`. No `eval`, `new Function` or string timers.
- Prototype pollution: never merge/assign untrusted keys into objects; use `Map` or `Object.create(null)` for input-keyed dictionaries.
- No nested-quantifier regexes on user input (ReDoS); cap input length.
- Client bundles are public: no secrets (watch `VITE_`/`NEXT_PUBLIC_`-style env vars).

**Memory**
- No unbounded module-level caches/arrays/Maps — add a size limit or TTL. `WeakMap` for metadata on objects you don't own.

**Tests**
- Await async assertions (`await expect(p).rejects.toThrow(X)`); an un-awaited one passes silently.
- Mock at boundaries (network, clock, fs) with the project's tools and fake timers; no real network, time zone or order dependence.

## Writing

Follow the core workflow. Prefer the platform (`fetch`, `structuredClone`, `Intl`, `URL`, `crypto.randomUUID`, `AbortSignal.timeout`) before adding a dependency. Exported functions get JSDoc/TSDoc (params, returns, throws, side effects). Verify with the commands listed in the profile and say which you couldn't run.

## Reviewing

Use the core review scope and format exactly. Skip anything ESLint/Prettier/Biome already enforces. Typical severities (adjust by impact and say why):
- 🔴 XSS sinks or `eval` with untrusted data; injection or prototype pollution; secrets in client code; floating promises that lose errors or break ordering; `||` defaults corrupting valid falsy values; float money; missing `response.ok` on calls that matter; caller-visible mutation; stale-response races.
- 🟡 Missing cleanup or timeouts; sequential independent awaits; `any`/`as`/`!` on external data without runtime validation; layout thrashing; unbounded caches; missing or un-awaited tests.
- 🟢 `.then()` chains that read better as `await`; unnecessary `?.`; small naming fixes.
