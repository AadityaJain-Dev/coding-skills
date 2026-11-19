# JS best practices

Helps your AI assistant write and review JavaScript and TypeScript (`.js`, `.mjs`, `.cjs`, `.ts`, `.mts`, `.cts`), including Node.js and plain browser code.

It doesn't teach the language. The assistant already knows it. It lists the mistakes that slip through most often (like `||` where `??` was meant, promises nobody waits for, or `fetch` not failing on 404) and the choices our team prefers.

## How it works

1. The assistant reads the shared coding principles once per conversation.
2. It runs `scripts/js-profile.mjs`, which looks at your `package.json`, `tsconfig` and lint/test setup and writes a short summary to `.agents/js-project-profile.md` in your project.
3. Next time, it reads that summary instead of digging through your config again. The summary refreshes by itself when your config changes.
4. As the assistant learns things about your project (how you name things, how you handle errors, things you corrected), it adds short notes under "Learned conventions" in that file.

Commit the profile file so your team shares those notes. In a monorepo, each package gets its own profile, and the package manager and shared scripts are read from the workspace root. The script needs Node.js 18 or later.

If your tool can't run terminal commands, the skill still works. The assistant just reads your config files directly.

## Install

```bash
npx skills add https://github.com/AadityaJain-Dev/coding-skills/tree/release/skills/js-best-practices
```
