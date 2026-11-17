---
name: laravel-best-practices
description: 'Enforce Laravel and PHP best practices, matching the project''s own PHP/Laravel versions and preferring built-in Laravel features over hand-rolled PHP. Use whenever writing, modifying, refactoring, debugging or reviewing PHP code in a Laravel project — controllers, models, migrations, jobs, Form Requests, policies, Blade, tests, artisan commands — including small fixes, PR reviews and pasted snippets, even if the user never says "best practices".'
user-invocable: true
---

# Laravel & PHP Best Practices

You already know PHP and Laravel, so skip generic advice. This skill only records **the rules that are easy to get wrong and the choices this team wants**. It sits on top of the core principles; it doesn't repeat them.

## Setup (keep it cheap)

1. **Core principles:** if `references/coding-principles-and-best-practices/SKILL.md` isn't already in this conversation, read it once. It defines precedence, the conflict ranking, the writing workflow, the general checklist and the review format. Don't re-read it on later invocations in the same conversation.
2. **Project profile:** run `php <folder-containing-this-SKILL.md>/scripts/laravel-profile.php <dir-of-the-file-you're-working-on>`. It prints the cached profile from `<projectRoot>/.agents/laravel-project-profile.md` and only re-inspects composer.json/composer.lock, `bootstrap/app.php` and tooling config when they've changed. Use it instead of opening those files yourself. Skip this step if the profile is already in this conversation and no config has changed.
   - "No composer.json found" → standalone snippet; state the PHP and Laravel versions you assumed.
   - `php` not on the host PATH → if the project uses Sail or Docker (`laravel/sail`, `compose.yaml`/`docker-compose.yml`), run it as `./vendor/bin/sail php …` or inside the app container. Otherwise read composer.json and composer.lock directly, once.
3. **Learn as you go:** when you discover a convention the config can't show (layering, naming, error model, test style) or the user corrects you, add one short bullet under `## Learned conventions` in the profile. Keep that section under ~15 lines; it's read on every invocation. If the code contradicts a bullet, the code wins: fix or remove the bullet.

The profile file is meant to be committed, so the team shares the learned conventions.

## Versions decide the syntax

Write for the **lowest PHP version the project allows** (the profile states it) and the **installed Laravel version** (from composer.lock). Use the newest idioms those versions support, and nothing newer. When you're unsure whether a method exists in the installed version, check `vendor/laravel/framework` instead of guessing.

| Version | Gate these features on it |
|---|---|
| PHP 8.1 | enums, `readonly` properties, first-class callables `foo(...)`, `new` in initializers, `never` |
| PHP 8.2 | `readonly` classes, DNF types, standalone `true`/`false`/`null` types |
| PHP 8.3 | typed class constants, `#[\Override]`, `json_validate()` |
| PHP 8.4 | property hooks, asymmetric visibility, `new Foo()->bar()` without parentheses, `array_find`/`array_any`/`array_all` |
| PHP 8.5 | pipe operator `\|>`, `array_first`/`array_last` |
| Laravel 9 | `Attribute::make()` accessors/mutators, enum casts |
| Laravel 10 | native return/param types in the skeleton, `Process` facade |
| Laravel 11 | slim skeleton (middleware, exceptions, routing in `bootstrap/app.php`; schedule in `routes/console.php`), `casts()` method, `Context`, `once()` |
| Laravel 12 | mainly new starter kits; no syntax changes to gate |
| Laravel 13 (PHP 8.3+) | model/job/command attributes (`#[Table]`, `#[Fillable]`, `#[Hidden]`…) as an alternative to properties — follow whichever style the project uses; `Queue::route()`, `Cache::touch()`, JSON:API resources |

Follow the skeleton style the profile reports: don't create `app/Http/Kernel.php` in a slim app, or `bootstrap/app.php` configuration in a classic one. Use `declare(strict_types=1)` only if the project already does.

## Scope

Laravel back end, Blade and PHP. For Livewire, Inertia, Filament and similar stacks, follow their own conventions (and their skill, if one exists); apply the PHP/Laravel rules here, plus the security rules under "Rules that matter". Front-end JS/TS belongs to the JS skill.

## Prefer Laravel over hand-rolled PHP

If Laravel (or a package the project already has) provides it, use that. It's tested, secure by default, integrates with config/testing fakes and is what the next developer expects. Write custom PHP only when nothing built in fits, and comment why.

| Instead of… | Use |
|---|---|
| curl / `file_get_contents` / raw Guzzle | `Http::timeout()->retry()->throw()`; test with `Http::fake()` |
| manual `isset`/regex validation | Form Requests (`rules()`, `authorize()`), `Rule::` objects, custom rule classes |
| `if ($user->id === $post->user_id)` scattered in code | Policies/Gates, `can` middleware, `authorize()` |
| `password_hash`, `openssl_*`, `random_bytes` strings | `Hash`, `Crypt`, `Str::random`/`Str::password`/`Str::uuid` |
| `exec`/`shell_exec`/`proc_open` | `Process` facade (10+) |
| `fopen`/`file_put_contents` for app files | `Storage` disks |
| hand-built caching, locks, rate limits | `Cache::remember`, `Cache::lock`, `RateLimiter` / `throttle` middleware |
| array loops and string munging | Collections, `Arr`, `Str`, `Number`; `lazy()`/`cursor()` for large sets |
| `date()`/`DateTime` | Carbon via `now()`/`today()`, date casts |
| cron scripts, sync heavy work in requests | Scheduler, queued jobs, `Bus::chain`/`batch`, queued listeners/notifications |
| manual retries, try/finally transactions | `retry()`, `DB::transaction()` |
| hand-rolled pagination, signed links, JSON shaping | `paginate()`/`cursorPaginate()`, `URL::signedRoute`, API Resources |
| custom logging context | `Log` with context arrays, `Context` (11+) |
| `PDO`/string SQL | Eloquent/query builder with bindings |

## Rules that matter

**Architecture**
- Match the layers the project already has (profile: "Existing app layers"). Default when none: thin controller → Form Request → Action or Service → Eloquent (with scopes). Don't add a repository layer over Eloquent unless the project already uses one.
- Return API Resources, not models (models leak hidden attributes and couple the response to the schema). Use route model binding, with scoped bindings for nested resources.
- Config: `env()` only inside `config/*.php`. Elsewhere it returns `null` once config is cached; use `config()`.
- Side effects in observers and model events are invisible at the call site. Prefer explicit calls in the Action/Service; if you add an observer, say so.
- Octane (see profile): workers are long-lived, so never keep request or user state in static properties, singletons or mutated `config()`; use scoped bindings.

**Eloquent & database**
- No N+1: eager load (`with`, `withCount`, `withSum`), and suggest `Model::shouldBeStrict(! app()->isProduction())` (lazy loading, silently discarded attributes, missing attributes) if the project doesn't enable it. Select only needed columns on large tables.
- `exists()` instead of `count() > 0`; index columns used in `where`, `orderBy`, joins and foreign keys.
- Status/type columns use backed enums with enum casts. Store timestamps in UTC; convert at the edge.
- Never `Model::all()` or `->get()` on unbounded tables; paginate, `chunkById` (not `chunk` when updating the rows you iterate) or `lazyById`.
- Mass assignment: define `$fillable`; pass `$request->validated()`/`safe()`, never `$request->all()`.
- Raw SQL (`whereRaw`, `DB::raw`, `orderByRaw`) only with bindings — never interpolate input, including column names for sorting (allow-list them).
- Multi-write operations go in `DB::transaction()`. Jobs, events and notifications dispatched inside a transaction use `afterCommit`.
- Carbon is mutable: `$date->addDay()` changes `$date`. Use `CarbonImmutable` (or `->copy()`) when the value is shared.
- Money in integer minor units or a money library — never floats.
- Migrations: never edit one that has run; add a new one. Write `down()`. Adding `unique`/`NOT NULL` to existing data needs a backfill step first; dropping or renaming columns needs a deploy plan.

**Security**
- Scope record lookups to the owner or tenant: `$request->user()->orders()->findOrFail($id)`, not `Order::findOrFail($id)` followed by hoping a check happens later. The same applies to `exists:`/`unique:` validation rules in multi-tenant apps (`Rule::exists(...)->where(...)`).
- Blade `{{ }}` escapes; `{!! !!}` is raw — only for HTML you sanitized yourself. Never put user input into `{!! !!}`, `@php echo`, or inline JS without `@js()`/`Js::from()`.
- Authorize every action that touches a specific record (policy or Form Request `authorize()`); `return true` in `authorize()` is a red flag unless a route middleware handles it.
- File uploads: validate `mimes`/`max`, store with generated names on a private disk unless public by design.
- Never log passwords, tokens or full request bodies; use `$hidden` on models and `#[\SensitiveParameter]` (8.2+) for secrets in signatures.
- Livewire: public properties can be changed from the browser. Mark IDs and anything security-relevant `#[Locked]`, and authorize inside every action method, not only in `mount()`.

**Errors & logging**
- Throw specific exceptions; render/report them centrally (`withExceptions()` in `bootstrap/app.php` on 11+, `Handler` on ≤10), not with try/catch in every controller. Catch only where you can act, rethrow with `previous:`.
- `abort_if`/`abort_unless`/`throw_if` for guard clauses at boundaries.

**Queues**
- Jobs must be idempotent and set `$tries`/`backoff`/`timeout`; use `ShouldBeUnique` or `WithoutOverlapping` where duplicates hurt. Implement `failed()` when a failure needs cleanup.
- Pass models (serialized as IDs by `SerializesModels`) or IDs, not large payloads; reload state in `handle()`.
- Mail and notifications sent from a request implement `ShouldQueue`.

**Tests**
- Use the project's runner (Pest or PHPUnit — see profile) and its style. Feature tests via HTTP for endpoints; `RefreshDatabase` or `LazilyRefreshDatabase`; factories with states, not hand-built arrays.
- Fake at boundaries: `Http::fake()`, `Queue::fake()`, `Mail::fake()`, `Event::fake()`, `Storage::fake()`, `Carbon::setTestNow()`/`travel()`. `Http::preventStrayRequests()` keeps tests off the network.

## Writing

Follow the core workflow. Generate files with `php artisan make:*` where it exists so structure and namespaces match the installed version. Public methods get PHPDoc only where types don't already say it (generics like `Collection<int, User>`, thrown exceptions, the *why*). Verify with the commands listed in the profile and say which you couldn't run.

## Reviewing

Use the core review scope and format exactly. Skip what Pint/PHPStan/Larastan already enforce. Typical severities (adjust by impact and say why):
- 🔴 Missing authorization or unscoped lookups on record access (IDOR); unlocked Livewire properties used for authorization; request state in statics/singletons under Octane; mass assignment from `all()`; interpolated raw SQL; `{!! !!}` with user data; `env()` outside config; float money; dispatch inside a transaction without `afterCommit` when the job needs committed data; syntax above the project's PHP/Laravel version; edited migrations that already ran.
- 🟡 N+1 queries; unbounded `get()`/`all()`; hand-rolled code that duplicates a Laravel feature; business logic in controllers; returning models instead of Resources; non-idempotent jobs; missing tests or fakes.
- 🟢 Older idioms where the installed version has a cleaner one; naming; small Collection simplifications.
