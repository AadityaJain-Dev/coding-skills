#!/usr/bin/env node
/**
 * Prints a compact JS/TS project profile, cached at <projectRoot>/.agents/js-project-profile.md.
 * Tool-agnostic: works with any AI assistant or IDE that can run a shell command.
 *
 * - First run: inspects package.json, tsconfig/jsconfig, lint/format/test config and writes the profile.
 * - Later runs: if the config fingerprint is unchanged, prints the cached profile (no re-inspection).
 * - Config changed (or --refresh): regenerates the "Detected" section and keeps "Learned conventions".
 *
 * Usage: node js-profile.mjs [startDir] [--refresh]
 * Zero dependencies; works on Windows, macOS and Linux with Node 18+.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROFILE_REL_PATH = join('.agents', 'js-project-profile.md');
const LEGACY_PROFILE_REL_PATH = join('.claude', 'js-project-profile.md'); // older location, migrated automatically
const LEARNED_HEADING = '## Learned conventions';
const CONFIG_FILES = [
  'package.json', 'tsconfig.json', 'jsconfig.json', 'pnpm-workspace.yaml',
  'eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs', 'eslint.config.ts',
  '.eslintrc', '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.json', '.eslintrc.yml', '.eslintrc.yaml',
  '.prettierrc', '.prettierrc.json', '.prettierrc.js', '.prettierrc.cjs', '.prettierrc.mjs', 'prettier.config.js', 'prettier.config.mjs',
  'biome.json', 'biome.jsonc',
  'vitest.config.ts', 'vitest.config.js', 'vitest.config.mjs', 'jest.config.js', 'jest.config.ts', 'jest.config.cjs', 'jest.config.mjs',
];
const LIBRARY_GROUPS = {
  'Frameworks (their rules come from framework skills/conventions)': ['react', 'next', 'vue', 'nuxt', '@angular/core', 'svelte', '@sveltejs/kit', 'solid-js', 'express', 'fastify', '@nestjs/core', 'koa', 'hono'],
  Validation: ['zod', 'valibot', 'yup', 'joi', 'ajv', '@sinclair/typebox', 'arktype'],
  'HTTP client': ['axios', 'ky', 'got', 'undici', 'node-fetch'],
  Logging: ['pino', 'winston', 'bunyan', 'consola'],
  'Data access': ['prisma', '@prisma/client', 'drizzle-orm', 'typeorm', 'sequelize', 'knex', 'mongoose', 'pg', 'mysql2', 'better-sqlite3'],
  'Dates/utils': ['date-fns', 'dayjs', 'luxon', 'moment', 'lodash', 'lodash-es', 'ramda'],
  'Lint/format': ['eslint', 'prettier', '@biomejs/biome', 'oxlint', 'typescript-eslint', '@typescript-eslint/eslint-plugin'],
  Tests: ['vitest', 'jest', 'mocha', 'ava', '@playwright/test', 'cypress', '@testing-library/dom', 'msw', 'supertest'],
};
const SCRIPT_KEYS = ['lint', 'typecheck', 'type-check', 'tsc', 'test', 'build', 'format', 'check'];

const args = process.argv.slice(2);
const forceRefresh = args.includes('--refresh');
const startDir = resolve(args.find((arg) => !arg.startsWith('--')) ?? process.cwd());

const findProjectRoot = (dir) => {
  let current = dir;
  while (true) {
    if (existsSync(join(current, 'package.json'))) return current;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
};

const readText = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : null);

/** tsconfig allows comments and trailing commas; strip them before JSON.parse. */
const parseJsonc = (text) => {
  const withoutComments = text.replace(/("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (_, str) => str ?? '');
  return JSON.parse(withoutComments.replace(/,(\s*[}\]])/g, '$1'));
};

const fingerprintOf = (root) => {
  const hash = createHash('sha1');
  hash.update(readFileSync(fileURLToPath(import.meta.url))); // script updates refresh old profiles
  for (const file of CONFIG_FILES) {
    const text = readText(join(root, file));
    if (text !== null) hash.update(`${file}\0${text}\0`);
  }
  return hash.digest('hex').slice(0, 12);
};

const detectPackageManager = (root, pkg) => {
  if (pkg.packageManager) return pkg.packageManager.split('@')[0];
  if (existsSync(join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(root, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(root, 'bun.lockb')) || existsSync(join(root, 'bun.lock'))) return 'bun';
  return 'npm';
};

const describeTypeScript = (root, deps) => {
  for (const file of ['tsconfig.json', 'jsconfig.json']) {
    const text = readText(join(root, file));
    if (text === null) continue;
    try {
      const { compilerOptions = {}, extends: base } = parseJsonc(text);
      const parts = [
        file === 'tsconfig.json' ? 'TypeScript' : 'JS with jsconfig',
        `strict=${compilerOptions.strict ?? 'unset'}`,
        compilerOptions.target && `target=${compilerOptions.target}`,
        compilerOptions.module && `module=${compilerOptions.module}`,
        compilerOptions.checkJs && 'checkJs',
        compilerOptions.noUncheckedIndexedAccess && 'noUncheckedIndexedAccess',
        compilerOptions.paths && `path aliases: ${Object.keys(compilerOptions.paths).join(', ')}`,
        base && `extends ${base} (inherited options not read)`,
      ];
      return parts.filter(Boolean).join(', ');
    } catch {
      return `${file} present but could not be parsed — read it directly if settings matter`;
    }
  }
  return deps.typescript ? 'TypeScript dependency but no tsconfig.json at root' : 'Plain JavaScript (no tsconfig)';
};

const buildDetectedSection = (root, pkg) => {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
  const packageManager = detectPackageManager(root, pkg);
  const scripts = pkg.scripts ?? {};
  const lines = [
    `- Package: ${pkg.name ?? '(unnamed)'}; package manager: ${packageManager}`,
    `- Modules: ${pkg.type === 'module' ? 'ESM ("type": "module")' : 'CommonJS by default (no "type": "module"); .mjs files are ESM'}`,
    `- Runtime: ${pkg.engines?.node ? `Node ${pkg.engines.node}` : 'Node version not pinned (engines.node unset)'}`,
    `- Types: ${describeTypeScript(root, deps)}`,
  ];
  if (pkg.workspaces || existsSync(join(root, 'pnpm-workspace.yaml'))) {
    lines.push('- Monorepo: workspaces present — check the nearest package.json of the file you edit');
  }
  for (const [label, names] of Object.entries(LIBRARY_GROUPS)) {
    const found = names.filter((name) => deps[name]).map((name) => `${name}@${deps[name]}`);
    if (found.length > 0) lines.push(`- ${label}: ${found.join(', ')}`);
  }
  const usefulScripts = SCRIPT_KEYS.filter((key) => scripts[key]);
  lines.push(
    usefulScripts.length > 0
      ? `- Verify with: ${usefulScripts.map((key) => `\`${packageManager} run ${key}\``).join(', ')}`
      : '- Verify with: no lint/test/build scripts in package.json',
  );
  return lines.join('\n');
};

const defaultLearnedSection = `${LEARNED_HEADING}
<!-- AI assistant: add short bullets about conventions the config can't show (naming, folder layering,
     error model, test style, things the user corrected). Keep this section under ~15 lines. -->
`;

const root = findProjectRoot(startDir);
if (root === null) {
  console.log('[js-profile] no package.json found above this directory — treat as a standalone snippet and state your assumptions (runtime, module system, TS or not).');
  process.exit(0);
}

const profilePath = join(root, PROFILE_REL_PATH);
const fingerprint = fingerprintOf(root);
const legacyPath = join(root, LEGACY_PROFILE_REL_PATH);
const migratedFrom = !existsSync(profilePath) && existsSync(legacyPath) ? legacyPath : null;
const existing = readText(migratedFrom ?? profilePath);
const cachedFingerprint = existing?.match(/fingerprint: ([0-9a-f]+)/)?.[1];

if (existing !== null && cachedFingerprint === fingerprint && !forceRefresh && migratedFrom === null) {
  console.log(`[js-profile] status=fresh path=${profilePath}\n`);
  console.log(existing);
  process.exit(0);
}

let pkg;
try {
  pkg = JSON.parse(readText(join(root, 'package.json')));
} catch (error) {
  console.log(`[js-profile] package.json at ${root} could not be parsed (${error.message}); read it directly.`);
  process.exit(0);
}

const learnedIndex = existing?.indexOf(LEARNED_HEADING) ?? -1;
const learnedSection = learnedIndex >= 0 ? existing.slice(learnedIndex) : defaultLearnedSection;
const today = new Date().toISOString().slice(0, 10);
const profile = `<!-- js-best-practices profile | fingerprint: ${fingerprint} | generated: ${today} -->
# JS project profile

## Detected (auto-generated — rerun scripts/js-profile.mjs, don't hand-edit)
${buildDetectedSection(root, pkg)}

${learnedSection.trimEnd()}
`;

mkdirSync(dirname(profilePath), { recursive: true });
writeFileSync(profilePath, profile, 'utf8');
const status = migratedFrom ? `migrated (from ${migratedFrom}; the old file can be deleted)` : existing === null ? 'created' : 'updated';
console.log(`[js-profile] status=${status} path=${profilePath}\n`);
console.log(profile);
