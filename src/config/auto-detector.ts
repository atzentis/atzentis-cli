import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

// =============================================================================
// Constants
// =============================================================================

/**
 * CLI configuration directory (always .atzentis)
 * Contains: cli/config.yaml, cli/templates, cli/skills, cli/hooks, session.db
 */
export const ATZENTIS_CLI_DIR = '.atzentis';

// Legacy alias for backwards compatibility
export const ATZENTIS_DIR = ATZENTIS_CLI_DIR;

// =============================================================================
// CLI Directory Helpers (always .atzentis/)
// =============================================================================

/**
 * Get the atzentis CLI directory path (always .atzentis)
 */
export function getAtzentisDir(cwd: string): string {
  return join(cwd, ATZENTIS_CLI_DIR);
}

/**
 * Get the CLI configuration directory path (.atzentis/cli)
 */
export function getCliDir(cwd: string): string {
  return join(cwd, ATZENTIS_CLI_DIR, 'cli');
}

/**
 * Get the config.yaml path (.atzentis/cli/config.yaml)
 */
export function getConfigPath(cwd: string): string {
  return join(cwd, ATZENTIS_CLI_DIR, 'cli', 'config.yaml');
}

/**
 * Get the session database path (.atzentis/session.db)
 */
export function getSessionDbPath(cwd: string): string {
  return join(cwd, ATZENTIS_CLI_DIR, 'session.db');
}

/**
 * Check if atzentis is configured in the given directory
 */
export function isAtzentisConfigured(cwd: string): boolean {
  return existsSync(getConfigPath(cwd));
}

// =============================================================================
// Project Directory Helpers (fixed: .project/)
// =============================================================================

/**
 * Project content directory (always .project)
 * Contains: docs/, specs/
 */
export const PROJECT_DIR = '.project';

/**
 * Get the project directory path (.project/)
 */
export function getProjectDir(cwd: string): string {
  return join(cwd, PROJECT_DIR);
}

/**
 * Get the specs directory path (.project/specs)
 */
export function getSpecsDir(cwd: string): string {
  return join(cwd, PROJECT_DIR, 'specs');
}

/**
 * Get the docs directory path (.project/docs)
 */
export function getDocsDir(cwd: string): string {
  return join(cwd, PROJECT_DIR, 'docs');
}

// =============================================================================
// Types
// =============================================================================

/**
 * Detected project settings from filesystem analysis
 */
export interface DetectedSettings {
  language?: string;
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun' | 'poetry' | 'pipenv' | 'cargo';
  runtime?: string;
  testCommand?: string;
  lintCommand?: string;
  buildCommand?: string;
  framework?: string;
  monorepo?: boolean;
}

/**
 * Auto-detect project settings from filesystem
 */
export async function detectProjectSettings(cwd: string): Promise<DetectedSettings> {
  const settings: DetectedSettings = {};

  // Detect JavaScript/TypeScript project
  await detectJavaScriptProject(cwd, settings);

  // Detect Python project
  detectPythonProject(cwd, settings);

  // Detect Go project
  detectGoProject(cwd, settings);

  // Detect Rust project
  detectRustProject(cwd, settings);

  // Detect monorepo
  detectMonorepo(cwd, settings);

  return settings;
}

/**
 * Detect JavaScript/TypeScript project settings
 */
async function detectJavaScriptProject(cwd: string, settings: DetectedSettings): Promise<void> {
  const packageJsonPath = join(cwd, 'package.json');

  if (!existsSync(packageJsonPath)) {
    return;
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    // Detect language (TypeScript vs JavaScript)
    settings.language = detectJsLanguage(cwd, packageJson);

    // Detect package manager from lockfiles
    settings.packageManager = detectPackageManager(cwd);
    settings.runtime = settings.packageManager === 'bun' ? 'bun' : 'node';

    // Detect commands from scripts
    const pm = settings.packageManager || 'npm';
    if (packageJson.scripts?.test) {
      settings.testCommand = `${pm} test`;
    }
    if (packageJson.scripts?.lint) {
      settings.lintCommand = `${pm} run lint`;
    }
    if (packageJson.scripts?.build) {
      settings.buildCommand = `${pm} run build`;
    }

    // Detect framework
    settings.framework = detectFramework(packageJson);
  } catch {
    // Ignore parse errors
  }
}

/**
 * Detect if project uses TypeScript or JavaScript
 */
function detectJsLanguage(cwd: string, packageJson: Record<string, unknown>): string {
  // Check for tsconfig.json
  if (existsSync(join(cwd, 'tsconfig.json'))) {
    return 'typescript';
  }

  // Check for typescript in dependencies
  const deps = {
    ...(packageJson.dependencies as Record<string, string> | undefined),
    ...(packageJson.devDependencies as Record<string, string> | undefined),
  };

  if (deps.typescript) {
    return 'typescript';
  }

  return 'javascript';
}

/**
 * Detect package manager from lockfiles
 */
function detectPackageManager(cwd: string): DetectedSettings['packageManager'] {
  if (existsSync(join(cwd, 'bun.lockb')) || existsSync(join(cwd, 'bun.lock'))) {
    return 'bun';
  }
  if (existsSync(join(cwd, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (existsSync(join(cwd, 'yarn.lock'))) {
    return 'yarn';
  }
  if (existsSync(join(cwd, 'package-lock.json'))) {
    return 'npm';
  }
  return 'npm'; // Default to npm
}

/**
 * Detect framework from package.json dependencies
 */
function detectFramework(packageJson: Record<string, unknown>): string | undefined {
  const deps = {
    ...(packageJson.dependencies as Record<string, string> | undefined),
    ...(packageJson.devDependencies as Record<string, string> | undefined),
  };

  // Check for common frameworks
  if (deps.next) return 'nextjs';
  if (deps.nuxt) return 'nuxt';
  if (deps['@remix-run/node'] || deps['@remix-run/react']) return 'remix';
  if (deps.astro) return 'astro';
  if (deps.svelte || deps['@sveltejs/kit']) return 'svelte';
  if (deps.vue) return 'vue';
  if (deps.react) return 'react';
  if (deps.express) return 'express';
  if (deps.fastify) return 'fastify';
  if (deps.hono) return 'hono';
  if (deps.elysia) return 'elysia';

  return undefined;
}

/**
 * Detect Python project settings
 */
function detectPythonProject(cwd: string, settings: DetectedSettings): void {
  const hasPyproject = existsSync(join(cwd, 'pyproject.toml'));
  const hasRequirements = existsSync(join(cwd, 'requirements.txt'));
  const hasSetupPy = existsSync(join(cwd, 'setup.py'));

  if (!hasPyproject && !hasRequirements && !hasSetupPy) {
    return;
  }

  settings.language = 'python';
  settings.runtime = 'python';

  // Detect package manager
  if (existsSync(join(cwd, 'poetry.lock'))) {
    settings.packageManager = 'poetry';
    settings.testCommand = 'poetry run pytest';
    settings.lintCommand = 'poetry run ruff check .';
  } else if (existsSync(join(cwd, 'Pipfile.lock'))) {
    settings.packageManager = 'pipenv';
    settings.testCommand = 'pipenv run pytest';
    settings.lintCommand = 'pipenv run ruff check .';
  } else {
    settings.testCommand = 'pytest';
    settings.lintCommand = 'ruff check .';
  }

  // Detect framework from pyproject.toml
  if (hasPyproject) {
    try {
      const content = readFileSync(join(cwd, 'pyproject.toml'), 'utf-8');
      if (content.includes('fastapi')) settings.framework = 'fastapi';
      else if (content.includes('django')) settings.framework = 'django';
      else if (content.includes('flask')) settings.framework = 'flask';
    } catch {
      // Ignore read errors
    }
  }
}

/**
 * Detect Go project settings
 */
function detectGoProject(cwd: string, settings: DetectedSettings): void {
  if (!existsSync(join(cwd, 'go.mod'))) {
    return;
  }

  settings.language = 'go';
  settings.runtime = 'go';
  settings.testCommand = 'go test ./...';
  settings.lintCommand = 'golangci-lint run';
  settings.buildCommand = 'go build ./...';
}

/**
 * Detect Rust project settings
 */
function detectRustProject(cwd: string, settings: DetectedSettings): void {
  if (!existsSync(join(cwd, 'Cargo.toml'))) {
    return;
  }

  settings.language = 'rust';
  settings.runtime = 'cargo';
  settings.packageManager = 'cargo';
  settings.testCommand = 'cargo test';
  settings.lintCommand = 'cargo clippy';
  settings.buildCommand = 'cargo build';
}

/**
 * Detect if project is a monorepo
 */
function detectMonorepo(cwd: string, settings: DetectedSettings): void {
  // Check for common monorepo indicators
  const hasWorkspaces = existsSync(join(cwd, 'pnpm-workspace.yaml'));
  const hasLerna = existsSync(join(cwd, 'lerna.json'));
  const hasNx = existsSync(join(cwd, 'nx.json'));
  const hasTurborepo = existsSync(join(cwd, 'turbo.json'));
  const hasPackagesDir = existsSync(join(cwd, 'packages'));
  const hasAppsDir = existsSync(join(cwd, 'apps'));

  // Check package.json for workspaces
  let hasPackageWorkspaces = false;
  try {
    const packageJsonPath = join(cwd, 'package.json');
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      hasPackageWorkspaces = Array.isArray(packageJson.workspaces);
    }
  } catch {
    // Ignore
  }

  settings.monorepo =
    hasWorkspaces ||
    hasLerna ||
    hasNx ||
    hasTurborepo ||
    hasPackageWorkspaces ||
    (hasPackagesDir && hasAppsDir);
}

/**
 * Detect project name from directory or package.json
 */
export function detectProjectName(cwd: string): string | null {
  // Try package.json name
  const packageJsonPath = join(cwd, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      if (packageJson.name) {
        // Extract name without scope
        const name = packageJson.name.replace(/^@[^/]+\//, '');
        // Convert to simple alphanumeric name
        return name.toLowerCase().replace(/[^a-z0-9]/g, '') || null;
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Try Cargo.toml name
  const cargoPath = join(cwd, 'Cargo.toml');
  if (existsSync(cargoPath)) {
    try {
      const content = readFileSync(cargoPath, 'utf-8');
      const nameMatch = content.match(/name\s*=\s*"([^"]+)"/);
      if (nameMatch) {
        return nameMatch[1].toLowerCase().replace(/[^a-z0-9]/g, '') || null;
      }
    } catch {
      // Ignore
    }
  }

  // Try pyproject.toml name
  const pyprojectPath = join(cwd, 'pyproject.toml');
  if (existsSync(pyprojectPath)) {
    try {
      const content = readFileSync(pyprojectPath, 'utf-8');
      const nameMatch = content.match(/name\s*=\s*"([^"]+)"/);
      if (nameMatch) {
        return nameMatch[1].toLowerCase().replace(/[^a-z0-9]/g, '') || null;
      }
    } catch {
      // Ignore
    }
  }

  // Use directory name as fallback
  const dirName = basename(cwd);
  return dirName.toLowerCase().replace(/[^a-z0-9]/g, '') || null;
}

/**
 * Find existing atzentis project configuration directory
 * Now simplified to just check for .atzentis/cli/config.yaml
 */
export function findProjectConfigDir(cwd: string): string | null {
  // Check for standard .atzentis directory
  if (isAtzentisConfigured(cwd)) {
    return 'atzentis';
  }

  return null;
}
