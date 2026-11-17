<?php
/**
 * Prints a compact Laravel/PHP project profile, cached at <projectRoot>/.agents/laravel-project-profile.md.
 * Tool-agnostic: works with any AI assistant or IDE that can run a shell command.
 *
 * - First run: inspects composer.json/composer.lock, app structure and tooling config, writes the profile.
 * - Later runs: if the config fingerprint is unchanged, prints the cached profile (no re-inspection).
 * - Config changed (or --refresh): regenerates the "Detected" section and keeps "Learned conventions".
 *
 * Usage: php laravel-profile.php [startDir] [--refresh]
 * No dependencies; runs on PHP 8.0+; never reads .env (secrets).
 */

declare(strict_types=1);

const PROFILE_REL_PATH = '.agents' . DIRECTORY_SEPARATOR . 'laravel-project-profile.md';
const LEGACY_PROFILE_REL_PATH = '.claude' . DIRECTORY_SEPARATOR . 'laravel-project-profile.md'; // older location, migrated automatically
const LEARNED_HEADING = '## Learned conventions';
const CONFIG_FILES = [
    'composer.json', 'composer.lock', 'bootstrap/app.php', 'phpunit.xml', 'phpunit.xml.dist',
    'compose.yaml', 'compose.yml', 'docker-compose.yml', 'docker-compose.yaml',
    'phpstan.neon', 'phpstan.neon.dist', 'pint.json', 'rector.php', 'package.json',
];
const PACKAGE_GROUPS = [
    'Frontend stack' => ['livewire/livewire', 'inertiajs/inertia-laravel', 'filament/filament', 'laravel/folio', 'livewire/volt'],
    'Auth' => ['laravel/sanctum', 'laravel/passport', 'laravel/fortify', 'laravel/breeze', 'laravel/jetstream', 'laravel/socialite', 'spatie/laravel-permission'],
    'Queues/ops' => ['laravel/horizon', 'laravel/octane', 'laravel/pulse', 'laravel/telescope', 'laravel/reverb', 'laravel/sail'],
    'Data/domain' => ['spatie/laravel-data', 'spatie/laravel-query-builder', 'laravel/scout', 'laravel/cashier', 'spatie/laravel-medialibrary', 'spatie/laravel-activitylog', 'brick/money', 'moneyphp/money'],
    'Quality' => ['laravel/pint', 'larastan/larastan', 'nunomaduro/larastan', 'phpstan/phpstan', 'rector/rector', 'driftingly/rector-laravel'],
    'Tests' => ['pestphp/pest', 'phpunit/phpunit', 'mockery/mockery', 'laravel/dusk'],
];
const STRUCTURE_DIRS = [
    'app/Actions', 'app/Services', 'app/Repositories', 'app/Data', 'app/DTOs', 'app/Enums', 'app/Policies',
    'app/Http/Requests', 'app/Http/Resources', 'app/Jobs', 'app/Events', 'app/Listeners', 'app/Livewire', 'app/Filament',
];

$args = array_slice($argv, 1);
$forceRefresh = in_array('--refresh', $args, true);
$startArg = array_values(array_filter($args, fn (string $arg): bool => !str_starts_with($arg, '--')))[0] ?? getcwd();
$startDir = realpath($startArg) ?: getcwd();
if (is_file($startDir)) {
    $startDir = dirname($startDir);
}

function findProjectRoot(string $dir): ?string
{
    while (true) {
        if (is_file($dir . '/composer.json')) {
            return $dir;
        }
        $parent = dirname($dir);
        if ($parent === $dir) {
            return null;
        }
        $dir = $parent;
    }
}

function readText(string $path): ?string
{
    return is_file($path) ? (string) file_get_contents($path) : null;
}

function fingerprintOf(string $root): string
{
    $context = hash_init('sha1');
    hash_update($context, (string) file_get_contents(__FILE__)); // script updates refresh old profiles
    foreach (CONFIG_FILES as $file) {
        $text = readText($root . '/' . $file);
        if ($text !== null) {
            hash_update($context, $file . "\0" . $text . "\0");
        }
    }
    return substr(hash_final($context), 0, 12);
}

/** Lowest major.minor a constraint like "^8.2", ">=8.1 <8.4" or "^8.1|^8.2" allows. */
function minimumVersion(string $constraint): ?string
{
    preg_match_all('/(\d+)\.(\d+)/', $constraint, $matches, PREG_SET_ORDER);
    if ($matches === []) {
        return null;
    }
    $versions = array_map(fn (array $m): string => $m[1] . '.' . $m[2], $matches);
    usort($versions, 'version_compare');
    return $versions[0];
}

function buildDetectedSection(string $root, array $composer): string
{
    $lock = json_decode(readText($root . '/composer.lock') ?? '{}', true) ?: [];
    $installed = [];
    foreach ([...($lock['packages'] ?? []), ...($lock['packages-dev'] ?? [])] as $package) {
        $installed[$package['name']] = ltrim($package['version'], 'v');
    }
    $required = array_merge($composer['require'] ?? [], $composer['require-dev'] ?? []);
    $versionOf = fn (string $name): ?string => $installed[$name] ?? $required[$name] ?? null;

    $phpConstraint = $composer['config']['platform']['php'] ?? $composer['require']['php'] ?? null;
    $phpMinimum = $phpConstraint !== null ? minimumVersion($phpConstraint) : null;
    $phpLine = $phpConstraint !== null
        ? "constraint `{$phpConstraint}` → write syntax for PHP {$phpMinimum} (lowest allowed); CLI here is " . PHP_VERSION
        : 'no PHP constraint in composer.json; CLI here is ' . PHP_VERSION . ' — ask before using features newer than the production version';

    $laravel = $versionOf('laravel/framework');
    $laravelLine = $laravel !== null
        ? ($installed['laravel/framework'] ?? null ? "{$laravel} (installed, from composer.lock)" : "{$laravel} (constraint only — composer.lock missing)")
        : 'laravel/framework not found — may be a plain PHP or package project';

    $bootstrap = readText($root . '/bootstrap/app.php') ?? '';
    $skeleton = str_contains($bootstrap, 'Application::configure')
        ? 'slim (11+): middleware, exceptions and routing configured in bootstrap/app.php'
        : (is_file($root . '/app/Http/Kernel.php') ? 'classic: app/Http/Kernel.php + app/Exceptions/Handler.php' : 'unknown');

    $lines = [
        "- PHP: {$phpLine}",
        "- Laravel: {$laravelLine}",
        "- Skeleton: {$skeleton}",
    ];

    foreach (PACKAGE_GROUPS as $label => $names) {
        $found = [];
        foreach ($names as $name) {
            $version = $versionOf($name);
            if ($version !== null) {
                $found[] = "{$name}@{$version}";
            }
        }
        if ($found !== []) {
            $lines[] = "- {$label}: " . implode(', ', $found);
        }
    }

    $existingDirs = array_values(array_filter(STRUCTURE_DIRS, fn (string $dir): bool => is_dir($root . '/' . $dir)));
    $lines[] = '- Existing app layers: ' . ($existingDirs !== [] ? implode(', ', $existingDirs) : 'default Laravel structure only');

    $strictTypes = false;
    foreach (glob($root . '/app/{Http/Controllers,Models}/*.php', GLOB_BRACE) ?: [] as $file) {
        $strictTypes = str_contains((string) file_get_contents($file, false, null, 0, 300), 'strict_types=1');
        break;
    }
    $lines[] = '- declare(strict_types=1): ' . ($strictTypes ? 'used' : 'not seen in a sampled controller/model');

    // Sail/Docker: PHP may exist only inside the container, so commands need a prefix there.
    $composeFile = null;
    foreach (['compose.yaml', 'compose.yml', 'docker-compose.yml', 'docker-compose.yaml'] as $file) {
        if (is_file($root . '/' . $file)) {
            $composeFile = $file;
            break;
        }
    }
    $usesSail = isset($required['laravel/sail']) && $composeFile !== null;
    if ($usesSail) {
        $lines[] = "- Runtime: Laravel Sail ({$composeFile}) — if `php` isn't on the host PATH, run every command below via `./vendor/bin/sail` (`php artisan` → `sail artisan`, `vendor/bin/pest` → `sail bin pest`, `composer` → `sail composer`)";
    } elseif ($composeFile !== null) {
        $lines[] = "- Runtime: Docker ({$composeFile}) — if `php` isn't on the host PATH, run commands inside the app container (`docker compose exec <service> …`)";
    }
    if (isset($required['laravel/octane'])) {
        $lines[] = '- Octane: long-lived workers — no request state in static properties, singletons or mutated config';
    }

    $artisan = 'php artisan';
    $bin = fn (string $tool): string => "vendor/bin/{$tool}";
    $composerCmd = 'composer';

    $verify = [];
    if (isset($required['pestphp/pest'])) {
        $verify[] = "`{$bin('pest')}` (or `{$artisan} test`)";
    } elseif (isset($required['phpunit/phpunit'])) {
        $verify[] = "`{$artisan} test`";
    }
    if (isset($required['laravel/pint'])) {
        $verify[] = "`{$bin('pint')} --test`";
    }
    if (isset($required['larastan/larastan']) || isset($required['nunomaduro/larastan']) || isset($required['phpstan/phpstan'])) {
        $verify[] = "`{$bin('phpstan')} analyse`";
    }
    if (isset($required['rector/rector'])) {
        $verify[] = "`{$bin('rector')} --dry-run`";
    }
    foreach (array_keys($composer['scripts'] ?? []) as $script) {
        if (in_array($script, ['test', 'lint', 'analyse', 'analyze', 'check', 'format'], true)) {
            $verify[] = "`{$composerCmd} {$script}`";
        }
    }
    $lines[] = '- Verify with: ' . ($verify !== [] ? implode(', ', array_unique($verify)) : 'no test/lint tooling detected');

    return implode("\n", $lines);
}

$root = findProjectRoot($startDir);
if ($root === null) {
    echo "[laravel-profile] no composer.json found above this directory — treat as a standalone snippet and state your assumptions (PHP and Laravel versions).\n";
    exit(0);
}

$profilePath = $root . DIRECTORY_SEPARATOR . PROFILE_REL_PATH;
$fingerprint = fingerprintOf($root);
$legacyPath = $root . DIRECTORY_SEPARATOR . LEGACY_PROFILE_REL_PATH;
$migratedFrom = !is_file($profilePath) && is_file($legacyPath) ? $legacyPath : null;
$existing = readText($migratedFrom ?? $profilePath);
$cachedFingerprint = $existing !== null && preg_match('/fingerprint: ([0-9a-f]+)/', $existing, $m) ? $m[1] : null;

if ($existing !== null && $cachedFingerprint === $fingerprint && !$forceRefresh && $migratedFrom === null) {
    echo "[laravel-profile] status=fresh path={$profilePath}\n\n{$existing}";
    exit(0);
}

$composer = json_decode(readText($root . '/composer.json') ?? '', true);
if (!is_array($composer)) {
    echo "[laravel-profile] composer.json at {$root} could not be parsed; read it directly.\n";
    exit(0);
}

$learnedPos = $existing !== null ? strpos($existing, LEARNED_HEADING) : false;
$learnedSection = $learnedPos !== false
    ? substr($existing, $learnedPos)
    : LEARNED_HEADING . "\n<!-- AI assistant: add short bullets about conventions the config can't show (layering, naming, error model,\n     test style, things the user corrected). Keep this section under ~15 lines. -->\n";

$today = date('Y-m-d');
$profile = "<!-- laravel-best-practices profile | fingerprint: {$fingerprint} | generated: {$today} -->\n"
    . "# Laravel project profile\n\n"
    . "## Detected (auto-generated — rerun scripts/laravel-profile.php, don't hand-edit)\n"
    . buildDetectedSection($root, $composer) . "\n\n"
    . rtrim($learnedSection) . "\n";

if (!is_dir(dirname($profilePath))) {
    mkdir(dirname($profilePath), 0777, true);
}
file_put_contents($profilePath, $profile);
$status = $migratedFrom !== null ? "migrated (from {$migratedFrom}; the old file can be deleted)" : ($existing === null ? 'created' : 'updated');
echo "[laravel-profile] status={$status} path={$profilePath}\n\n{$profile}";
