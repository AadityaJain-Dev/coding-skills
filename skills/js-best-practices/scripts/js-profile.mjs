#!/usr/bin/env node
/**
 * Prints a compact JS/TS project profile, cached at <projectRoot>/.agents/js-project-profile.md.
 * Tool-agnostic: works with any AI assistant or IDE that can run a shell command.
 *
 * - First run: inspects package.json, tsconfig/jsconfig, lint/format/test config and writes the profile.
 * - Later runs: if the config fingerprint is unchanged, prints the cached profile (no re-inspection).
 * - Config changed (or --refresh): regenerates the "Detected" section and keeps "Learned conventions".
 * - Monorepos: the profile belongs to the nearest package; package manager and workspace facts come from
 *   the workspace root (nearest ancestor with "workspaces" in package.json or a pnpm-workspace.yaml).
 *
 * Usage: node js-profile.mjs [startDir] [--refresh]
 * Zero dependencies; works on Windows, macOS and Linux with Node 18+.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
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
const LOCKFILES = ['pnpm-lock.yaml', 'yarn.lock', 'bun.lockb', 'bun.lock', 'package-lock.json'];
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

const readPackageJson = (dir) => {
  try {
    return JSON.parse(readText(join(dir, 'package.json')) ?? 'null');
  } catch {
    return null;
  }
};

const isWorkspaceRoot = (dir) =>
  existsSync(join(dir, 'pnpm-workspace.yaml')) || Boolean(readPackageJson(dir)?.workspaces);

/** Nearest ancestor (including dir itself) that declares workspaces, or null. */
const findWorkspaceRoot = (dir) => {
  let current = dir;
  while (true) {
    if (existsSync(join(current, 'package.json')) && isWorkspaceRoot(current)) return current;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
};

/** tsconfig allows comments and trailing commas; strip them before JSON.parse. */
const parseJsonc = (text) => {
  const withoutComments = text.replace(/("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (_, str) => str ?? '');
  return JSON.parse(withoutComments.replace(/,(\s*[}\]])/g, '$1'));
};

const fingerprintOf = (dirs) => {
  const hash = createHash('sha1');
  hash.update(readFileSync(fileURLToPath(import.meta.url))); // script updates refresh old profiles
  for (const dir of dirs) {
    hash.update(`dir\0${dir}\0`);
    for (const file of CONFIG_FILES) {
      const text = readText(join(dir, file));
      if (text !== null) hash.update(`${file}\0${text}\0`);
    }
    for (const lockfile of LOCKFILES) {
      if (existsSync(join(dir, lockfile))) hash.update(`lock\0${lockfile}\0`); // presence only: decides the package manager
    }
  }
  return hash.digest('hex').slice(0, 12);
};

const detectPackageManager = (root, pkg) => {
  if (pkg.packageManager) return pkg.packageManager.split('@')[0];
  if (existsSync(join(root, 'pnpm-lock.yaml')) || existsSync(join(root, 'pnpm-workspace.yaml'))) return 'pnpm';
  if (existsSync(join(root, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(root, 'bun.lockb')) || existsSync(join(root, 'bun.lock'))) return 'bun';
  return 'npm';
};

const describeTypeScript = (dirs, deps) => {
  for (const [dir, file] of dirs.flatMap((d) => [[d, 'tsconfig.json'], [d, 'jsconfig.json']])) {
    const text = readText(join(dir, file));
    if (text === null) continue;
    const where = dirs.length > 1 && dir !== dirs[0] ? ' (from workspace root)' : '';
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
      return parts.filter(Boolean).join(', ') + where;
    } catch {
      return `${file} present but could not be parsed — read it directly if settings matter`;
    }
  }
  return deps.typescript ? 'TypeScript dependency but no tsconfig.json at root' : 'Plain JavaScript (no tsconfig)';
};

const depsOf = (pkg) => ({ ...pkg?.dependencies, ...pkg?.devDependencies, ...pkg?.peerDependencies });

const buildDetectedSection = (packageRoot, pkg, workspaceRoot) => {
  const rootPkg = workspaceRoot ? readPackageJson(workspaceRoot) ?? {} : pkg;
  const inWorkspacePackage = workspaceRoot !== null && workspaceRoot !== packageRoot;
  // Lint/test tooling often lives only in the workspace root's devDependencies.
  const deps = inWorkspacePackage ? { ...depsOf(rootPkg), ...depsOf(pkg) } : depsOf(pkg);
  const packageManager = detectPackageManager(workspaceRoot ?? packageRoot, rootPkg);
  const engines = pkg.engines?.node ?? rootPkg.engines?.node;
  const lines = [
    `- Package: ${pkg.name ?? '(unnamed)'}; package manager: ${packageManager}`,
    `- Modules: ${pkg.type === 'module' ? 'ESM ("type": "module")' : 'CommonJS by default (no "type": "module"); .mjs files are ESM'}`,
    `- Runtime: ${engines ? `Node ${engines}` : 'Node version not pinned (engines.node unset)'}`,
    `- Types: ${describeTypeScript(inWorkspacePackage ? [packageRoot, workspaceRoot] : [packageRoot], deps)}`,
  ];
  if (inWorkspacePackage) {
    const rel = relative(workspaceRoot, packageRoot).split('\\').join('/');
    lines.push(`- Monorepo: workspace package \`${rel}\` of the workspace at ${workspaceRoot}; this profile covers this package only`);
  } else if (workspaceRoot !== null) {
    lines.push('- Monorepo: this is the workspace root — run the profile from inside a package to see that package\'s setup');
  }
  for (const [label, names] of Object.entries(LIBRARY_GROUPS)) {
    const found = names.filter((name) => deps[name]).map((name) => `${name}@${deps[name]}`);
    if (found.length > 0) lines.push(`- ${label}: ${found.join(', ')}`);
  }
  const packageScripts = SCRIPT_KEYS.filter((key) => pkg.scripts?.[key]);
  const rootScripts = inWorkspacePackage ? SCRIPT_KEYS.filter((key) => rootPkg.scripts?.[key]) : [];
  const commands = (keys) => keys.map((key) => `\`${packageManager} run ${key}\``).join(', ');
  if (packageScripts.length > 0) {
    lines.push(`- Verify with: ${commands(packageScripts)}${inWorkspacePackage ? ' (run in this package\'s folder)' : ''}`);
  }
  if (rootScripts.length > 0) {
    lines.push(`- Verify from the workspace root: ${commands(rootScripts)}`);
  }
  if (packageScripts.length === 0 && rootScripts.length === 0) {
    lines.push('- Verify with: no lint/test/build scripts in package.json');
  }
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

const workspaceRoot = findWorkspaceRoot(root);
const profilePath = join(root, PROFILE_REL_PATH);
const fingerprint = fingerprintOf(workspaceRoot && workspaceRoot !== root ? [root, workspaceRoot] : [root]);
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
${buildDetectedSection(root, pkg, workspaceRoot)}

${learnedSection.trimEnd()}
`;

mkdirSync(dirname(profilePath), { recursive: true });
writeFileSync(profilePath, profile, 'utf8');
const status = migratedFrom ? `migrated (from ${migratedFrom}; the old file can be deleted)` : existing === null ? 'created' : 'updated';
console.log(`[js-profile] status=${status} path=${profilePath}\n`);
console.log(profile);
