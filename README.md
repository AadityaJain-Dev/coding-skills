# coding-skills

A small set of skills that help AI coding assistants write and review code the way we like it: clean, safe, and in line with each project's own setup.

They use the open `SKILL.md` format, so they work with any assistant that supports skills: GitHub Copilot in VS Code, Cursor, Codex, Gemini CLI, Claude Code, Windsurf and others.

| Skill | What it's for |
|---|---|
| [coding-principles-and-best-practices](skills/coding-principles-and-best-practices/) | General rules for any language. The other two skills build on it. |
| [js-best-practices](skills/js-best-practices/) | JavaScript and TypeScript (Node.js and plain browser code). |
| [laravel-best-practices](skills/laravel-best-practices/) | PHP and Laravel. |

## How they fit together

The general principles live in one place. The JS and Laravel skills keep their own copy of it in `references/` and only add what's specific to their language. That way each skill stays short, and you only update the shared rules once.

## Adding or updating a language skill

Treat a language skill as a focused extension of `coding-principles-and-best-practices`, not a syntax guide or a second copy of the general rules. Assume agents know the language; add only language/framework-specific decision cues, non-obvious failure modes, relevant runtime or version constraints, and project-profile commands.

Apply guidance when it addresses a concrete choice or risk, not as a checklist. Preserve behavior, respect the project's conventions, and keep authoring changes scoped. For reviews, use the shared scope, Git diff selection, and finding format; report evidence-backed defects or material risks, not style preferences.

When a rule applies across languages, update the shared skill once. The release workflow copies it into each language skill's `references/` folder.

### Quick checklist for new language skills

- Build on `coding-principles-and-best-practices`; don't duplicate general workflow or review format.
- Add only ecosystem-specific guidance: high-impact pitfalls, version/runtime gates, and boundary/security concerns.
- Keep "Writing" guidance scoped and contextual: preserve behavior, apply low-risk improvements directly, ask only on consequential trade-offs.
- Keep "Reviewing" guidance evidence-based: material risks and concrete fixes, not style policing.
- Add a lightweight profile script and reuse its output so setup stays cheap across repeated invocations.

## Install

The ready-to-use skills live on the [`release`](https://github.com/AadityaJain-Dev/coding-skills/tree/release) branch. It's built automatically from `main`, with the shared principles already copied in.

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

You don't need `coding-principles-and-best-practices` separately if you install the JS or Laravel skill. They already include it.

## Contributing

Make changes on `main`. On every push, a GitHub workflow copies the shared principles into each skill's `references/` folder, checks the skills and publishes the result to `release`. Don't edit `release` by hand; it's rebuilt each time.

## License

GPL-3.0. See [LICENSE](LICENSE).
