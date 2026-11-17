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

## License

GPL-3.0. See [LICENSE](LICENSE).
