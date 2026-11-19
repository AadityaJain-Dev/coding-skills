# coding-skills

Opinionated skills that help AI coding assistants write and review code: clean, safe, and in line with each project's own setup and versions.

They use the open `SKILL.md` format, so they work with any assistant that supports skills: GitHub Copilot in VS Code, Cursor, Codex, Gemini CLI, Claude Code, Windsurf and others.

| Skill | What it's for |
|---|---|
| [coding-principles-and-best-practices](skills/coding-principles-and-best-practices/) | General rules for any language: when to ask, a checklist, which Git changes to review, and a review format. The other two skills build on it. |
| [js-best-practices](skills/js-best-practices/) | JavaScript and TypeScript (Node.js, browser code, and the plain JS/TS inside framework projects). |
| [laravel-best-practices](skills/laravel-best-practices/) | PHP and Laravel, written for the PHP and Laravel versions your project actually uses. |

## What they add to your project

The JS and Laravel skills run a small script that summarises your project's setup (versions, libraries, test and lint commands) and saves it so it doesn't have to be worked out again each time:

- `.agents/js-project-profile.md`
- `.agents/laravel-project-profile.md`

Each file has an auto-generated part, refreshed whenever your config changes, and a short "Learned conventions" list the assistant adds to as it learns how your project works. **Commit these files** so your whole team shares what's been learned. The Laravel script never reads `.env`.

The scripts need Node.js 18+ (JS) or PHP 8.0+ (Laravel), run inside Sail or Docker if that's where PHP lives. If the assistant can't run commands, the skills still work: it reads your config files directly.

## Install

The ready-to-use skills live on the [`release`](https://github.com/AadityaJain-Dev/coding-skills/tree/release) branch, which has the shared principles already copied in. Install from there, not from `main`.

**With the skills CLI** (needs Node.js). It works with GitHub Copilot, Cursor, Codex, Gemini CLI, Claude Code, Windsurf and more, and asks which tools to install to:

```bash
# one skill
npx skills add https://github.com/AadityaJain-Dev/coding-skills/tree/release/skills/js-best-practices
npx skills add https://github.com/AadityaJain-Dev/coding-skills/tree/release/skills/laravel-best-practices
npx skills add https://github.com/AadityaJain-Dev/coding-skills/tree/release/skills/coding-principles-and-best-practices

# all of them
npx skills add https://github.com/AadityaJain-Dev/coding-skills/tree/release --skill '*'
```

Add `-g` to install for all your projects instead of just this one, and `--copy` if you're on Windows without Developer Mode.

**By hand:** download the [release branch as a zip](https://github.com/AadityaJain-Dev/coding-skills/archive/refs/heads/release.zip) and copy the skill folders (the whole folder, including `references/` and `scripts/`) to where your tool looks for skills:

| Tool | Folder in your project |
|---|---|
| GitHub Copilot (VS Code), Cursor, Codex, Gemini CLI, Cline, OpenCode | `.agents/skills/` |
| Claude Code | `.claude/skills/` (or `~/.claude/skills/` for all projects) |
| Windsurf | `.windsurf/skills/` |
| Anything else | Check your tool's docs for its skills folder |

These locations change from time to time, so check your tool's docs if a skill doesn't show up.

**Which ones do you need?** The JS and Laravel skills already include the shared principles, so you don't need `coding-principles-and-best-practices` as well. Install it on its own for projects in other languages. Installing all three is fine: the language skills skip re-reading the principles if they're already loaded.

## How they fit together

The general principles live in one place, `skills/coding-principles-and-best-practices/SKILL.md`. Each language skill reads a copy of it from its own `references/` folder and only adds what's specific to its language. That way each skill stays short, and the shared rules are updated once.

## Contributing

Make changes on `main`. Don't edit `release` by hand; it's rebuilt from `main` each time it's published.

**Publishing.** The `release` branch only changes when you run the workflow yourself: on GitHub, go to **Actions → Build release branch → Run workflow**. It copies the shared principles into each skill's `references/` folder, leaves out the evals, checks the skills (frontmatter, name matches folder, script syntax) and force-pushes the result to `release`. Until you run it, `release` can lag behind `main`.

**Testing locally.** The `references/` copies are git-ignored on `main`. After changing the shared principles, run `node scripts/sync-references.mjs` so local copies of the JS and Laravel skills read the current rules.

**Adding a language skill.** Treat it as an extension of the shared principles, not a syntax guide or a second copy of them. Assume the assistant already knows the language.

- Add only what's specific to the ecosystem: easy-to-miss pitfalls, version and runtime gates, and security concerns at its boundaries.
- Don't repeat the shared workflow, scope rules or review format; point to them.
- Write rules as prompts that apply when their failure mode is relevant, and review guidance as evidence-backed findings, not style policing.
- Add a `references/` folder (with a `.gitignore` containing `coding-principles-and-best-practices/`) so the release workflow copies the principles in.
- Add a small profile script that caches its output, so setup stays cheap on repeated use.

## License

GPL-3.0. See [LICENSE](LICENSE).
