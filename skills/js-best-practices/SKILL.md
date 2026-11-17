---
name: js-best-practices
description: 'Enforce modern JavaScript best practices, SOLID principles, and clean code standards. Use when writing or refactoring JS/TS code, ensuring ES6+ syntax, meaningful naming, separation of concerns, input validation, and maintainable architecture.'
argument-hint: 'Optional: specific code section or file type focus (e.g., "React component", "API handler", "utility function")'
user-invocable: true
---

# JavaScript Best Practices Skill

## Quick Checklist

Before submitting code, verify:

- [ ] **Syntax** — ES6+ only (const/let, arrows, destructuring, templates, optional chaining)
- [ ] **Design** — Single responsibility; SOLID principles; loose coupling
- [ ] **Naming** — Clear, descriptive; camelCase for vars/functions; UPPER_SNAKE_CASE for constants
- [ ] **Inputs** — Validated early with guard clauses; external data sanitized
- [ ] **Errors** — Caught specifically; logged with context; never swallowed
- [ ] **⚠️ Performance** — No layout thrashing; DOM mutations batched; async for heavy work
- [ ] **⚠️ Memory** — Listeners cleaned up; no circular closures; immutability respected
- [ ] **Documentation** — Business logic & non-obvious decisions documented with references

---

## 1. Core Principles

| Principle | What It Means | Why |
|-----------|---------------|-----|
| **KISS** | Keep code straightforward | Easier to understand, test, maintain |
| **DRY** | Don't Repeat Yourself | Consolidate duplication into reusable functions |
| **YAGNI** | You Aren't Gonna Need It | Avoid speculative features and over-engineering |
| **SOLID** | Single Responsibility + Open/Closed + Liskov + Interface Segregation + Dependency Inversion | Clean architecture; easy to extend without breaking |

---

## 2. Modern JavaScript (ES6+)

**Always use modern syntax:**

```javascript
// ❌ Avoid
var x = 'John';
const obj = Object.assign({}, source);
function greet(person) { return 'Hello ' + person.name; }
user?.profile?.address || 'Unknown'; // Falls back on falsy, not just null/undefined

// ✅ Prefer
const x = 'John';
const obj = { ...source };
const greet = (person) => `Hello ${person.name}`;
user?.profile?.address ?? 'Unknown'; // Nullish coalescing
```

**Key patterns:**
- **Declarations** — `const` by default; `let` only when reassignment needed; never `var`
- **Functions** — Arrow functions for callbacks/inline; named declarations for public APIs
- **Strings** — Template literals (`` `${value}` ``) instead of concatenation
- **Objects/Arrays** — Destructuring (`const { id, name } = user;`) and spread (`{ ...obj }`)
- **Async** — `async/await` with `try...catch` instead of `.then()` chains
- **Safety** — Optional chaining (`?.`) and nullish coalescing (`??`)

---

## 3. Naming & Readability

```javascript
// ❌ Avoid
const d = new Date();
const x = users.filter(item => item.status === 1);
const calc = (n) => n * 0.15;

// ✅ Prefer
const currentDate = new Date();
const activeUsers = users.filter(user => user.status === 'ACTIVE');
const calculateTaxAmount = (amount) => amount * TAX_RATE;
```

**Conventions:**
- **Functions** — Verb + noun: `getUserById`, `calculateTotal`, `isValidEmail`, `hasPermission`
- **Booleans** — Prefix with `is`, `has`, `can`, `should`: `isActive`, `hasPermission`, `canDelete`
- **Constants** — `UPPER_SNAKE_CASE`: `MAX_RETRIES`, `API_TIMEOUT_MS`
- **Classes/Types** — `PascalCase`: `UserController`, `ApiError`
- **Variables** — `camelCase`: `userName`, `processedItems`

---

## 4. Architecture & Separation of Concerns

Divide code into layers: **Presentation → Business Logic → Data Access**

```javascript
// ❌ Avoid - mixed concerns (HTTP, validation, database, logging)
async function getUser(req, res) {
  const userId = req.params.id;
  if (!userId) return res.status(400).json({ error: 'Invalid ID' });
  const user = await db.query(`SELECT * FROM users WHERE id = ${userId}`);
  if (!user) return res.status(404).json({ error: 'Not found' });
  user.lastAccessed = new Date();
  await db.query(`UPDATE users SET lastAccessed = ? WHERE id = ?`, [user.lastAccessed, userId]);
  res.json(user);
}

// ✅ Prefer - separated layers
// Presentation
async function getUserController(req, res) {
  try {
    const userId = parseAndValidateUserId(req.params.id);
    const user = await userService.getUserById(userId);
    res.json(user);
  } catch (error) {
    res.status(mapErrorToHttpStatus(error)).json({ error: error.message });
  }
}

// Business Logic
class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }
  
  async getUserById(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    user.lastAccessed = new Date();
    await this.userRepository.update(userId, { lastAccessed: user.lastAccessed });
    return user;
  }
}

// Data Access
class UserRepository {
  async findById(userId) {
    return await db.users.findOne({ id: userId });
  }
  
  async update(userId, data) {
    return await db.users.updateOne({ id: userId }, data);
  }
}
```

**Dependency Injection — Pass dependencies, don't hardcode:**

```javascript
// ❌ Avoid - tightly coupled
class UserService {
  constructor() {
    this.db = new PostgresDatabase();
    this.email = new SmtpEmailService();
  }
}

// ✅ Prefer - loose coupling
class UserService {
  constructor(userRepository, emailService) {
    this.userRepository = userRepository;
    this.emailService = emailService;
  }
}
```

---

## 5. Defensive Programming & Error Handling

**Guard Clauses — Fail fast, avoid nesting:**

```javascript
// ❌ Avoid - deep nesting
function processOrder(order) {
  if (order) {
    if (order.items?.length > 0) {
      if (order.customer?.isActive) {
        return calculateTotal(order);
      }
    }
  }
  return null;
}

// ✅ Prefer - guard clauses
function processOrder(order) {
  if (!order) throw new ValidationError('Order required');
  if (!order.items?.length) throw new ValidationError('Order must have items');
  if (!order.customer?.isActive) throw new ValidationError('Customer inactive');
  return calculateTotal(order);
}
```

**Explicit Error Handling:**

```javascript
// ❌ Avoid - swallowing/generic errors
async function fetchUser(id) {
  try {
    return await api.get(`/users/${id}`);
  } catch (error) {
    console.log('Error'); // No context!
    return null; // Silent failure
  }
}

// ✅ Prefer - specific, informative errors
async function fetchUser(id) {
  try {
    return await api.get(`/users/${id}`);
  } catch (error) {
    if (error.status === 404) throw new UserNotFoundError(`User ${id} not found`);
    if (error.status === 401) throw new AuthenticationError('Invalid credentials');
    if (error.isNetworkError) throw new NetworkError('Failed to reach service', { userId: id, originalError: error });
    throw new UnexpectedError('Failed to fetch user', { userId: id, originalError: error });
  }
}
```

**Input Validation & Sanitization:**

```javascript
// ✅ Comprehensive validation
async function createUser(userData) {
  // Presence
  if (!userData.email || !userData.password) {
    throw new ValidationError('Email and password required');
  }
  
  // Format
  if (!isValidEmail(userData.email)) throw new ValidationError('Invalid email');
  if (userData.password.length < 12) throw new ValidationError('Password too short');
  
  // Sanitize
  const sanitized = {
    email: userData.email.toLowerCase().trim(),
    password: await hashPassword(userData.password),
    name: sanitizeHtml(userData.name || ''),
    createdAt: new Date()
  };
  
  // Duplicates
  if (await db.users.findOne({ email: sanitized.email })) {
    throw new ConflictError('Email already registered');
  }
  
  return await db.users.insert(sanitized);
}
```

---

## 6. Performance Essentials

**Layout Thrashing — Batch DOM reads, then writes:**

```javascript
// ❌ Avoid - triggers reflow in each iteration
for (let i = 0; i < elements.length; i++) {
  elements[i].style.height = (elements[i].offsetHeight + 10) + 'px'; // Read + Write each loop
}

// ✅ Prefer - read all, write all
const heights = elements.map(el => el.offsetHeight); // All reads first
elements.forEach((el, i) => el.style.height = (heights[i] + 10) + 'px'); // All writes after

// ✅ Prefer - use CSS classes for batch changes
elements.forEach(el => el.classList.add('expanded'));
// CSS: .expanded { height: calc(var(--base) + 10px); }
```

**Avoid layout-triggering reads in high-frequency events:**

```javascript
// ❌ Avoid - reflow fires on every scroll
window.addEventListener('scroll', () => {
  const height = container.offsetHeight; // Reflow! Can fire 60+ times/sec
  updateAnimation(height);
});

// ✅ Prefer - cache layout values
let cachedHeight = container.offsetHeight;
window.addEventListener('scroll', () => updateAnimation(cachedHeight));
window.addEventListener('resize', () => { cachedHeight = container.offsetHeight; });
```

**Batch DOM insertions:**

```javascript
// ❌ Avoid - each appendChild triggers reflow
const list = document.getElementById('list');
for (let i = 0; i < 1000; i++) {
  const item = document.createElement('div');
  item.textContent = `Item ${i}`;
  list.appendChild(item); // Reflow each time!
}

// ✅ Prefer - use DocumentFragment
const fragment = document.createDocumentFragment();
for (let i = 0; i < 1000; i++) {
  const item = document.createElement('div');
  item.textContent = `Item ${i}`;
  fragment.appendChild(item);
}
list.appendChild(fragment); // Single reflow
```

**Immutability — Never mutate inputs or external state:**

```javascript
// ❌ Avoid
function updateUser(user) {
  user.name = 'John'; // Mutates original!
  return user;
}

// ✅ Prefer
function updateUser(user) {
  return { ...user, name: 'John' }; // New object
}

// ❌ Avoid - mutations in data transformations
const data = [{ active: false }, { active: false }];
data.forEach(item => item.active = true); // Mutates original

// ✅ Prefer
const data = [{ active: false }, { active: false }];
const activated = data.map(item => ({ ...item, active: true })); // New array
```

**Event handler performance:**

```javascript
// ❌ Avoid - expensive work on high-frequency events
window.addEventListener('scroll', () => {
  updateLayout(); // Can fire 60+ times/sec!
});

// ✅ Prefer - throttle expensive operations
const throttledScroll = throttle(() => updateLayout(), 250);
window.addEventListener('scroll', throttledScroll);

// ✅ Prefer - cleanup listeners
class Component {
  constructor(element) {
    this.element = element;
    this.controller = new AbortController();
    this.element.addEventListener('click', 
      () => this.handleClick(),
      { signal: this.controller.signal }
    );
  }
  
  destroy() {
    this.controller.abort(); // Removes all listeners
  }
}
```

---

## 7. Documentation Best Practices

Document **why**, not **what**. Comments should explain business logic and non-obvious decisions.

```javascript
// ❌ Avoid - obvious what the code does
function calculateDiscount(amount, userType) {
  if (userType === 'premium') { // Check if premium
    return amount * 0.85; // Apply 15% discount
  }
  return amount;
}

// ✅ Prefer - explain the "why" and reference source
/**
 * Applies premium user discount per company retention policy.
 * Premium users receive 15% off to incentivize long-term subscriptions.
 * See ticket SALES-4521 and AWS backoff strategy.
 */
function calculateDiscount(amount, userType) {
  if (userType === 'premium') {
    return amount * (1 - PREMIUM_DISCOUNT_RATE);
  }
  return amount;
}
```

---

## 8. Implementation Workflow

1. **Understand** — Clarify inputs, outputs, edge cases, and business constraints
2. **Design** — Apply SOLID principles; plan layers and dependencies
3. **Implement** — Use ES6+; keep functions small and single-purpose
4. **Validate inputs** — Guard clauses for early failure; sanitize external data
5. **Handle errors** — Throw specific errors with context; never silently fail
6. **Test** — Ensure code is testable; separate concerns for mocking
7. **Document** — Explain business logic and non-obvious decisions
8. **Review** — Check checklist; verify performance and memory safety

---

## Common Patterns

### Request/Response Handler
```javascript
async function getUserController(req, res) {
  try {
    const userId = parseAndValidateUserId(req.params.id);
    const user = await userService.getUserById(userId);
    res.json(user);
  } catch (error) {
    res.status(mapToHttpStatus(error)).json({ error: error.message });
  }
}
```

### Service Layer with Dependency Injection
```javascript
class UserService {
  constructor(userRepository, emailService) {
    this.userRepository = userRepository;
    this.emailService = emailService;
  }
  
  async register(userData) {
    const user = await this.userRepository.create(userData);
    await this.emailService.sendWelcome(user.email);
    return user;
  }
}
```

### Reusable Utility Function
```javascript
/**
 * Safely retrieves nested property with fallback.
 * Returns defaultValue if any level is undefined/null.
 * @example getNestedValue(user, 'profile.address.zip', 'N/A')
 */
export const getNestedValue = (obj, path, defaultValue = undefined) => {
  if (!obj || typeof obj !== 'object') return defaultValue;
  const keys = path.split('.');
  return keys.reduce((current, key) => current?.[key] ?? defaultValue, obj);
};
```

---

## Related Topics

- Custom error classes and error hierarchies
- Testing patterns and testable architecture
- Async patterns: Promise.all() vs Promise.allSettled(), race conditions
- TypeScript: type safety, generics, discriminated unions
- State management patterns (Zustand, Redux, Recoil)
- Framework-specific (React hooks, Vue reactivity, Angular DI)
- **DevTools** — Performance profiling, Lighthouse, heap snapshots
- **Browser APIs** — Web Workers, Intersection Observer, ResizeObserver, requestAnimationFrame
- **Security** — XSS prevention, input sanitization, CSRF protection

---

## Tips for AI Agents

- **Read guard clauses first** — They show preconditions and early returns
- **Check separation of concerns** — Controllers → Services → Repositories
- **Verify error handling** — Look for specific error types and context
- **Scan for mutations** — Ensure inputs are treated as read-only
- **Audit DOM operations** — Watch for layout thrashing in loops and event handlers
- **Validate inputs early** — Guard clauses should come first
