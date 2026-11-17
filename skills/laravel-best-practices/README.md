# Laravel best practices

Helps your AI assistant write and review PHP code in Laravel projects: controllers, models, migrations, jobs, Blade views, tests and more.

Two things make it different from generic advice:

- **It writes for your versions.** The assistant checks which PHP and Laravel versions your project uses and doesn't reach for features they don't have.
- **Laravel comes first.** If Laravel already has a tool for the job (HTTP calls, validation, caching, queues, file storage…), the assistant uses it instead of writing its own PHP version.

It also lists the mistakes that slip through most often, like users being able to open other users' records, `env()` used outside config files, or jobs dispatched before the database has saved.

## How it works

1. The assistant reads the shared coding principles once per conversation.
2. It runs `scripts/laravel-profile.php`, which reads `composer.json`, `composer.lock` and your app structure, and writes a short summary to `.agents/laravel-project-profile.md` in your project. It never reads `.env`.
3. Next time, it reads that summary instead. The summary refreshes by itself when your dependencies or config change.
4. The assistant adds short notes about your project under "Learned conventions" as it goes.

If your tool can't run terminal commands, the skill still works. The assistant just reads `composer.json` and `composer.lock` directly.

## Install

```bash
npx skills add https://github.com/AadityaJain-Dev/coding-skills/tree/release/skills/laravel-best-practices
```
