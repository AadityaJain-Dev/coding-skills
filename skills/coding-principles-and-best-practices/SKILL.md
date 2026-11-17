---
name: "coding-principles-and-best-practices"
description: "Language-agnostic coding principles to apply whenever writing, modifying, refactoring or reviewing code in any language, including small fixes, PR reviews and 'look over this' requests."
---

# Coding Principles and Best Practices

These principles apply in every language. The examples use neutral pseudocode. When you write real code, use the target language's own idioms, conventions and standard tooling.

Treat the principles as strong defaults, not laws. Each exists to keep code **correct, readable, and cheap to change**. If following one rule would make the code worse in a specific case, break it on purpose and leave a short comment explaining why.

**Precedence:** If the project already has conventions (style guide, linter config, existing patterns), follow them first. Use the language community's idioms second and this skill third. A codebase that is consistent beats one that is "correct" in patches.

---

## How to use this skill

### When generating code

1. **Understand.** Clarify inputs, outputs, edge cases and business constraints before writing anything. If something is ambiguous, ask or state your assumption.
2. **Design.** Choose responsibilities and boundaries (sections 1–3). Keep the design as small as the requirement allows.
3. **Implement.** Use intention-revealing names, small functions and the language's idioms (section 4).
4. **Guard the boundaries.** Validate and sanitize external input, and fail fast on invalid state (section 5).
5. **Handle errors.** Use specific errors with context. Never swallow them silently (section 5).
6. **Make it testable, and test it.** Inject dependencies. Write or update tests for behaviour and edge cases (section 7).
7. **Document the why.** Explain business rules and non-obvious decisions (section 6).
8. **Self-review.** Go through the Quick Checklist below before presenting the code.

### When reviewing code

Work through the Quick Checklist. Report findings grouped by severity so the author knows what to fix first:

```
## Review summary
<one or two sentences: overall assessment>

### 🔴 Must fix (bugs, security, data loss, broken contracts)
- <file:line> — <problem> → <concrete fix>

### 🟡 Should fix (maintainability, design, missing tests)
- <file:line> — <problem> → <concrete fix>

### 🟢 Nits / suggestions (style, naming, optional improvements)
- <file:line> — <suggestion>

### ✅ What's done well
- <brief, specific>
```

For each finding, cite the principle only if that helps the author understand it ("violates Law of Demeter"). Always say what to change and why it matters. Don't flag a style issue that the project's linter or formatter already handles or that matches the existing codebase.

---

## Quick Checklist

- [ ] **Correctness:** Edge cases handled (empty/null, zero, negative, very large, Unicode, time zones, concurrency). The logic matches the requirement.
- [ ] **Design:** Single responsibility, loose coupling, high cohesion. Composition is preferred over deep inheritance. No speculative features.
- [ ] **Naming:** Names are clear and reveal intent. They follow the language's casing conventions. There are no cryptic abbreviations.
- [ ] **Functions:** Small, one level of abstraction, ideally three parameters or fewer, no boolean flag parameters.
- [ ] **Constants:** No magic numbers or strings. Named constants or enums are used.
- [ ] **Inputs:** Validated early with guard clauses. External data is sanitized. Queries are parameterized.
- [ ] **Errors:** Caught specifically, logged or raised with context, never swallowed.
- [ ] **State:** Inputs are not mutated unexpectedly. Global or shared mutable state is kept to a minimum. Operations are idempotent where retries are possible.
- [ ] **Security:** No hardcoded secrets. Least privilege. No injection vectors.
- [ ] **Tests:** Behaviour and edge cases are covered. A regression test exists for each bug fix.
- [ ] **Documentation:** Business logic and non-obvious decisions are explained, with references (ticket, spec, RFC).
- [ ] **Performance:** No obvious hotspots, such as I/O or queries in loops (N+1), unnecessary repeated work, or the wrong data structure. No premature micro-optimization.
- [ ] **Hygiene:** Dead code is removed. The change is small, focused and atomic.

---

## 1. Core Design Principles

| Principle                        | What it means                                                                                         | Why it matters                                                                                                                                                                           |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **KISS**                         | Prefer straightforward solutions over clever ones                                                     | Code is read far more than it's written. Write for the person debugging it at 2 AM.                                                                                                      |
| **DRY**                          | Each piece of business knowledge has one authoritative representation                                 | Duplicated logic multiplies maintenance work and bug surface. _But_ don't merge code that only looks similar by coincidence. The wrong abstraction costs more than a little duplication. |
| **YAGNI**                        | Build what's needed now, not what you think might be needed later                                     | Speculative code is dead weight that still has to be maintained                                                                                                                          |
| **Separation of Concerns**       | Each module or layer owns one aspect (presentation, business logic, data access)                      | Changes stay local, and parts can be tested in isolation                                                                                                                                 |
| **Composition over Inheritance** | Combine small, independent pieces rather than building deep class hierarchies                         | Inheritance creates rigid, fragile coupling                                                                                                                                              |
| **Law of Demeter**               | Talk only to immediate collaborators. Avoid `a.getB().getC().doThing()`                               | Long chains couple you to the internal structure of distant objects                                                                                                                      |
| **Least Astonishment**           | APIs behave the way callers naturally expect, without hidden side effects or surprising return values | Surprises cause bugs in caller code                                                                                                                                                      |

## 2. SOLID

SOLID is phrased in object-oriented terms, but the ideas apply equally to modules, functions and services.

- **Single Responsibility:** A unit has one reason to change. It serves one purpose or one stakeholder.
- **Open/Closed:** You can extend behaviour (through interfaces, strategies, plugins or higher-order functions) without editing tested code.
- **Liskov Substitution:** A subtype or implementation must work anywhere its base type or contract is expected, without breaking correctness.
- **Interface Segregation:** Several small, role-specific interfaces are better than one bloated one. Clients shouldn't depend on methods they don't use.
- **Dependency Inversion:** High-level policy depends on abstractions, not on concrete details such as a specific database driver.

---

## 3. Architecture & Separation of Concerns

Layer the code: **Presentation / Transport → Business Logic → Data Access**. Each layer only knows about the one below it, through an abstraction.

```pseudocode
# ❌ Avoid: one function mixes HTTP, validation, SQL (injectable!), and business rules
function getUser(request, response):
    id = request.params.id
    if not id: return response.status(400)
    user = db.query("SELECT * FROM users WHERE id = " + id)   # SQL injection
    user.lastAccessed = now()
    db.query("UPDATE users SET last_accessed = ? WHERE id = ?", user.lastAccessed, id)
    return response.json(user)

# ✅ Prefer: separated layers
# Presentation: translate transport <-> domain, map errors to status codes
function getUserHandler(request, response):
    userId = parseUserId(request.params.id)          # raises ValidationError
    user = userService.getUserById(userId)
    return response.json(user)

# Business logic: rules only, no HTTP, no SQL
class UserService:
    constructor(userRepository, clock):
        this.userRepository = userRepository
        this.clock = clock

    getUserById(userId):
        user = userRepository.findById(userId)
        if user is null: raise NotFoundError("User {userId} not found")
        userRepository.updateLastAccessed(userId, clock.now())
        return user

# Data access: persistence only, parameterized queries
class UserRepository:
    findById(userId):
        return db.query("SELECT ... FROM users WHERE id = ?", userId)
```

**Dependency injection:** pass dependencies in rather than constructing them inside.

```pseudocode
# ❌ Tightly coupled: can't test without a real database and SMTP server
class UserService:
    constructor():
        this.db = new PostgresDatabase()
        this.mailer = new SmtpMailer()

# ✅ Loosely coupled: real or fake implementations can be swapped in
class UserService:
    constructor(userRepository, mailer):
        this.userRepository = userRepository
        this.mailer = mailer
```

In functional or procedural languages, apply the same idea by passing functions or interfaces as parameters instead of calling globals.

---

## 4. Naming, Readability & Functions

**Use intention-revealing names.** A good name makes a comment unnecessary.

```pseudocode
# ❌ Avoid
d = now()
x = filter(users, u -> u.status == 1)
calc(n) = n * 0.15

# ✅ Prefer
currentDate = now()
activeUsers = filter(users, user -> user.status == UserStatus.ACTIVE)
calculateTaxAmount(amount) = amount * TAX_RATE
```

**Semantic conventions (all languages):**

- **Functions** are a verb plus a noun: `get_user_by_id`, `calculateTotal`, `ParseConfig`.
- **Booleans** start with `is`, `has`, `can` or `should`: `is_active`, `hasPermission`.
- **Collections** are plural: `orders`, `activeUsers`.
- **Units go in the name** when the type doesn't carry them: `timeout_ms`, `sizeBytes`.
- **Avoid** cryptic abbreviations (`usrCnt`, `tmpData`), misleading names, and noise words (`data`, `info`, `manager`) when a more specific word exists.

**Casing follows the language's convention:**

| Language                | Variables / functions                                | Types / classes | Constants                  |
| ----------------------- | ---------------------------------------------------- | --------------- | -------------------------- |
| Python                  | `snake_case`                                         | `PascalCase`    | `UPPER_SNAKE_CASE`         |
| JavaScript / TypeScript | `camelCase`                                          | `PascalCase`    | `UPPER_SNAKE_CASE`         |
| Java / Kotlin           | `camelCase`                                          | `PascalCase`    | `UPPER_SNAKE_CASE`         |
| C#                      | `camelCase` locals, `PascalCase` methods             | `PascalCase`    | `PascalCase`               |
| Go                      | `camelCase` (unexported) / `PascalCase` (exported)   | `PascalCase`    | `PascalCase` / `camelCase` |
| Rust                    | `snake_case`                                         | `PascalCase`    | `UPPER_SNAKE_CASE`         |
| C / C++                 | follow the project's convention (often `snake_case`) | varies          | `UPPER_SNAKE_CASE` macros  |
| Ruby / PHP              | `snake_case` / `camelCase`                           | `PascalCase`    | `UPPER_SNAKE_CASE`         |

For any language not listed, follow its official style guide and standard formatter (gofmt, rustfmt, Black, Prettier, ktlint and so on).

**Functions:**

- Keep functions short. Each should do one thing at one level of abstraction.
- Use **three parameters or fewer** where you can. Group related parameters into an object or record.
- **Don't use boolean flag parameters** that split a function's behaviour in two (`render(true)`). Write two functions or use an enum instead.
- **Avoid surprising side effects.** Treat inputs as read-only unless the function's name says it mutates them. Prefer returning new values.

**Eliminate magic numbers and strings:**

```pseudocode
# ❌ if elapsed > 86400 and status == "STATUS_3": ...
# ✅ if elapsed > SECONDS_PER_DAY and status == OrderStatus.SHIPPED: ...
```

---

## 5. Defensive Programming & Error Handling

**Use guard clauses: fail fast and avoid nesting.**

```pseudocode
# ❌ Avoid: arrow-shaped nesting, silent null
function processOrder(order):
    if order:
        if order.items not empty:
            if order.customer.isActive:
                return calculateTotal(order)
    return null

# ✅ Prefer: preconditions up front, explicit failures
function processOrder(order):
    if order is null:               raise ValidationError("Order is required")
    if order.items is empty:        raise ValidationError("Order must have items")
    if not order.customer.isActive: raise ValidationError("Customer is inactive")
    return calculateTotal(order)
```

**Handle errors explicitly. Never swallow them.**

```pseudocode
# ❌ Avoid: generic catch, no context, silent failure
function fetchUser(id):
    try:
        return api.get("/users/" + id)
    catch error:
        log("Error")
        return null

# ✅ Prefer: specific error types, context, preserve the cause
function fetchUser(id):
    try:
        return api.get("/users/" + id)
    catch HttpError as error where error.status == 404:
        raise UserNotFoundError("User {id} not found", cause=error)
    catch HttpError as error where error.status == 401:
        raise AuthenticationError("Invalid credentials", cause=error)
    catch NetworkError as error:
        raise ServiceUnavailableError("Failed to reach user service", context={userId: id}, cause=error)
```

Use the language's own error model idiomatically: exceptions (Java, Python, C#), `Result` / `Option` (Rust), returned `error` values with wrapping (Go), and so on. The principle doesn't change: **errors are specific, carry context, preserve the original cause, and are never silently discarded.** Catch an error only where you can do something useful with it. Otherwise let it propagate.

**Never trust external input.** That includes users, third-party APIs, files, environment and configuration.

```pseudocode
function createUser(input):
    # Presence
    if not input.email or not input.password:
        raise ValidationError("Email and password are required")
    # Format
    if not isValidEmail(input.email):            raise ValidationError("Invalid email")
    if length(input.password) < MIN_PASSWORD_LENGTH: raise ValidationError("Password too short")
    # Normalize & sanitize
    user = {
        email:        lowercase(trim(input.email)),
        passwordHash: hashPassword(input.password),     # never store plaintext
        name:         sanitize(input.name or ""),
    }
    # Uniqueness (also enforce with a DB unique constraint to avoid races)
    if userRepository.existsByEmail(user.email):
        raise ConflictError("Email already registered")
    return userRepository.insert(user)
```

---

## 6. Documentation

Make the code explain **what** it does through its names and structure. Use comments for **why**: business rules, workarounds, trade-offs and constraints that aren't visible in the code. Reference the source (ticket, spec, RFC, incident) when there is one.

```pseudocode
# ❌ Avoid: restates the code
if userType == PREMIUM:   # check if premium
    return amount * 0.85  # apply 15% discount

# ✅ Prefer: explains the business reason, cites the source
# Premium users get a retention discount to encourage annual renewals.
# Rate set by Finance; see ticket SALES-4521.
if userType == PREMIUM:
    return amount * (1 - PREMIUM_DISCOUNT_RATE)
```

Public APIs, modules and functions get doc comments in the language's standard format (docstrings, JSDoc, Javadoc, rustdoc, XML docs, GoDoc). Cover parameters, return values, errors raised and any side effects.

---

## 7. Testing, Security & Engineering Hygiene

- **Automated tests.** Write unit tests for logic, integration tests for boundaries and end-to-end tests for critical flows. Test observable behaviour and edge cases, not internal details, so refactoring doesn't break the tests. Tests should be fast, isolated and deterministic.
- **Regression tests for bugs.** Reproduce the bug in a failing test first, then fix it.
- **Least privilege.** Every service, role, DB connection and API key gets the minimum permissions it needs.
- **No hardcoded secrets.** Use environment variables or a secrets manager. Never commit credentials.
- **Injection safety.** Use parameterized queries. Encode or escape output for its context (HTML, shell, SQL). Don't build commands by concatenating strings.
- **Don't roll your own crypto or auth.** Use vetted libraries.
- **Dependencies.** Keep them up to date and scan them for known vulnerabilities.
- **Idempotency and statelessness.** Design APIs, jobs and pipelines so that retrying an operation produces the same result with no unintended side effects. Use idempotency keys and upserts where appropriate.
- **Avoid premature optimization.** Get it correct and clear first. Profile before optimizing. Still, avoid obvious waste: I/O or queries inside loops (N+1), repeated expensive work, the wrong data structure, and excessive reads and writes in UI or render loops.
- **Logging and observability.** Log meaningful events with context such as IDs, at the right level. Never log secrets or personal data.

---

## 8. Maintainability & Collaboration

- **Boy Scout rule.** Leave every file you touch slightly cleaner. Rename an unclear variable, extract a messy block or remove dead code, but keep large refactors out of feature changes.
- **Delete dead code.** Version control remembers it.
- **Atomic changes.** Make small, self-contained commits and PRs with messages that explain _why_.
- **Code review is collaborative.** It's for sharing knowledge, keeping the architecture aligned and catching bugs early. Critique the code, not the author.

---

## Tips for AI Agents

- **Read existing code first.** Match the project's patterns, naming, error model and test style before adding new code.
- **Read guard clauses first** when reviewing. They show a function's preconditions.
- **Trace the layers.** Check that handlers, services and repositories (or the equivalent) don't leak concerns into each other.
- **Verify error paths.** Look for empty catches, generic errors, lost causes, and `null` returned where an error was expected.
- **Scan for mutation.** Check for inputs modified in place, shared mutable state and hidden side effects.
- **Look for hotspots.** Watch for queries, network calls or expensive work inside loops and render or event handlers.
- **Don't over-engineer.** Adding interfaces, factories or layers that the requirement doesn't need violates YAGNI and KISS. Match the solution's size to the problem.
- **Be explicit about assumptions.** If a requirement is unclear, say what you assumed in your response.
