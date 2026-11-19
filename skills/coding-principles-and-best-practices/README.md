# Coding principles and best practices

The base rules an AI assistant follows when writing or reviewing code in any language. Think of it as the team's shared idea of what "good code" means.

## What it covers

- **What wins when rules clash.** Your project's own conventions come first, then the language's usual style, then this skill. When two principles pull in different directions: correctness, then security, then readability.
- **How to write code.** Read the surrounding code first, build the smallest thing that works, test it, and check your own work before handing it over. Keep changes in scope, reuse what the project already has, and ask only about choices that matter.
- **A checklist** for design, naming, error handling, security, tests and performance.
- **Which changes to review.** When you ask for a review of "my changes", it looks at staged changes plus every commit on your branch, including ones you haven't pushed, compared with the repo's default branch.
- **A review format.** Findings are sorted into 🔴 must fix, 🟡 should fix and 🟢 nits, each with a location, why it matters and a suggested fix. Nits only appear if you ask for them.

## Install

```bash
npx skills add https://github.com/AadityaJain-Dev/coding-skills/tree/release/skills/coding-principles-and-best-practices
```
