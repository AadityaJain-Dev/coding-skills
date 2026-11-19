#!/usr/bin/env node
/**
 * Copies the shared coding principles into every language skill that has a references/ folder:
 *   skills/coding-principles-and-best-practices/SKILL.md
 *   → skills/<skill>/references/coding-principles-and-best-practices/SKILL.md
 *
 * Run it after editing the shared principles so local testing uses the current rules.
 * The copies are git-ignored on main; the release workflow runs this same script.
 *
 * Usage: node scripts/sync-references.mjs
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const skillsDir = join(repoRoot, 'skills');
const sharedName = 'coding-principles-and-best-practices';
const source = join(skillsDir, sharedName, 'SKILL.md');

if (!existsSync(source)) {
  console.error(`Shared principles not found at ${source}`);
  process.exit(1);
}

let copied = 0;
for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const referencesDir = join(skillsDir, entry.name, 'references');
  if (!existsSync(referencesDir)) continue;
  const targetDir = join(referencesDir, sharedName);
  mkdirSync(targetDir, { recursive: true });
  copyFileSync(source, join(targetDir, 'SKILL.md'));
  console.log(`Synced ${entry.name}`);
  copied += 1;
}
console.log(copied > 0 ? `Done: ${copied} skill(s) updated.` : 'No skills with a references/ folder found.');
