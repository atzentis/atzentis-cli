import { Command } from 'commander';
import pc from 'picocolors';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import YAML from 'yaml';
import {
  findProjectConfigDir,
  detectProjectName,
  getConfigPath,
} from '../config/auto-detector.ts';
import type { ProjectConfig } from '../config/schemas.ts';

/**
 * Create the 'config' command
 */
export function createConfigCommand(): Command {
  const cmd = new Command('config')
    .description('Manage project configuration')
    .argument('[action]', 'Action: show, edit, add-rule, remove-rule, set')
    .option('--project <name>', 'Project name (auto-detected if not specified)')
    .action(async (action, options) => {
      await configCommand(action, options);
    });

  // Subcommand: show
  cmd
    .command('show')
    .description('Display current configuration')
    .option('--project <name>', 'Project name')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      await showConfig(options);
    });

  // Subcommand: set
  cmd
    .command('set <key> <value>')
    .description('Set a configuration value')
    .option('--project <name>', 'Project name')
    .action(async (key, value, options) => {
      await setConfigValue(key, value, options);
    });

  // Subcommand: add-rule
  cmd
    .command('add-rule <rule>')
    .description('Add a project rule')
    .option('--project <name>', 'Project name')
    .action(async (rule, options) => {
      await addRule(rule, options);
    });

  // Subcommand: remove-rule
  cmd
    .command('remove-rule <index>')
    .description('Remove a project rule by index (1-based)')
    .option('--project <name>', 'Project name')
    .action(async (index, options) => {
      await removeRule(Number.parseInt(index, 10), options);
    });

  // Subcommand: path
  cmd
    .command('path')
    .description('Show config file path')
    .option('--project <name>', 'Project name')
    .action(async (options) => {
      await showConfigPath(options);
    });

  return cmd;
}

/**
 * Main config command handler
 */
async function configCommand(
  action: string | undefined,
  options: { project?: string }
): Promise<void> {
  if (!action) {
    // Default to show
    await showConfig(options);
    return;
  }

  // Handle legacy action argument
  switch (action) {
    case 'show':
      await showConfig(options);
      break;
    case 'path':
      await showConfigPath(options);
      break;
    default:
      console.log(pc.yellow(`Unknown action: ${action}`));
      console.log(pc.dim('Available actions: show, set, add-rule, remove-rule, path'));
  }
}

/**
 * Show current configuration
 */
async function showConfig(options: { project?: string; json?: boolean }): Promise<void> {
  const cwd = process.cwd();
  const project = options.project || findProjectConfigDir(cwd) || detectProjectName(cwd);

  if (!project) {
    console.error(pc.red('Error: Could not detect project. Use --project option.'));
    process.exit(1);
  }

  const configPath = getConfigPath(cwd);

  if (!existsSync(configPath)) {
    console.error(pc.red(`Error: Config file not found: ${configPath}`));
    console.log(pc.dim('Run "atzentis setup" to initialize the project.'));
    process.exit(1);
  }

  const content = readFileSync(configPath, 'utf-8');
  const config = YAML.parse(content) as ProjectConfig;

  if (options.json) {
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  console.log(pc.cyan(`\n🔧 Configuration: ${project}\n`));
  console.log(pc.dim(`Path: ${configPath}\n`));

  console.log(pc.bold('Project Settings:'));
  console.log(`  Name: ${config.name}`);
  console.log(`  Language: ${config.language || 'not set'}`);
  console.log(`  Package Manager: ${config.packageManager || 'not set'}`);
  console.log(`  Runtime: ${config.runtime || 'not set'}`);

  if (config.commands) {
    console.log(pc.bold('\nCommands:'));
    console.log(`  Test: ${config.commands.test || 'not set'}`);
    console.log(`  Lint: ${config.commands.lint || 'not set'}`);
    console.log(`  Build: ${config.commands.build || 'not set'}`);
  }

  if (config.agent) {
    console.log(pc.bold('\nAgent:'));
    console.log(`  Type: ${config.agent.type}`);
    if (config.agent.model) {
      console.log(`  Model: ${config.agent.model}`);
    }
  }

  if (config.rules && config.rules.length > 0) {
    console.log(pc.bold('\nRules:'));
    config.rules.forEach((rule, i) => {
      console.log(`  ${i + 1}. ${rule}`);
    });
  }

  if (config.parallelStrategy) {
    console.log(pc.bold('\nParallel Strategy:'));
    console.log(`  Max Concurrent: ${config.parallelStrategy.maxConcurrent}`);
    console.log(`  Task Groups: ${config.parallelStrategy.taskGroups}`);
    console.log(`  Worktree Dir: ${config.parallelStrategy.worktreeDir}`);
  }

  if (config.contextProviders && config.contextProviders.length > 0) {
    console.log(pc.bold('\nContext Providers:'));
    config.contextProviders.forEach((provider) => {
      console.log(`  - ${provider.name}: ${provider.file}`);
    });
  }

  console.log(pc.bold('\nCompletion Pattern:'));
  console.log(`  ${config.completionPattern}`);

  console.log();
}

/**
 * Set a configuration value
 */
async function setConfigValue(
  key: string,
  value: string,
  options: { project?: string }
): Promise<void> {
  const cwd = process.cwd();
  const project = options.project || findProjectConfigDir(cwd) || detectProjectName(cwd);

  if (!project) {
    console.error(pc.red('Error: Could not detect project. Use --project option.'));
    process.exit(1);
  }

  const configPath = getConfigPath(cwd);

  if (!existsSync(configPath)) {
    console.error(pc.red(`Error: Config file not found: ${configPath}`));
    process.exit(1);
  }

  const content = readFileSync(configPath, 'utf-8');
  const config = YAML.parse(content) as Record<string, unknown>;

  // Handle nested keys (e.g., "commands.test")
  const keys = key.split('.');
  let current = config;

  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!(k in current) || typeof current[k] !== 'object') {
      current[k] = {};
    }
    current = current[k] as Record<string, unknown>;
  }

  const finalKey = keys[keys.length - 1];

  // Try to parse value as JSON for arrays/objects/numbers
  let parsedValue: unknown = value;
  try {
    parsedValue = JSON.parse(value);
  } catch {
    // Keep as string
  }

  current[finalKey] = parsedValue;

  writeFileSync(configPath, YAML.stringify(config));
  console.log(pc.green(`✓ Set ${key} = ${value}`));
}

/**
 * Add a project rule
 */
async function addRule(rule: string, options: { project?: string }): Promise<void> {
  const cwd = process.cwd();
  const project = options.project || findProjectConfigDir(cwd) || detectProjectName(cwd);

  if (!project) {
    console.error(pc.red('Error: Could not detect project. Use --project option.'));
    process.exit(1);
  }

  const configPath = getConfigPath(cwd);

  if (!existsSync(configPath)) {
    console.error(pc.red(`Error: Config file not found: ${configPath}`));
    process.exit(1);
  }

  const content = readFileSync(configPath, 'utf-8');
  const config = YAML.parse(content) as ProjectConfig;

  if (!config.rules) {
    config.rules = [];
  }

  config.rules.push(rule);

  writeFileSync(configPath, YAML.stringify(config));
  console.log(pc.green(`✓ Added rule: "${rule}"`));
  console.log(pc.dim(`  Total rules: ${config.rules.length}`));
}

/**
 * Remove a project rule by index
 */
async function removeRule(index: number, options: { project?: string }): Promise<void> {
  const cwd = process.cwd();
  const project = options.project || findProjectConfigDir(cwd) || detectProjectName(cwd);

  if (!project) {
    console.error(pc.red('Error: Could not detect project. Use --project option.'));
    process.exit(1);
  }

  const configPath = getConfigPath(cwd);

  if (!existsSync(configPath)) {
    console.error(pc.red(`Error: Config file not found: ${configPath}`));
    process.exit(1);
  }

  const content = readFileSync(configPath, 'utf-8');
  const config = YAML.parse(content) as ProjectConfig;

  if (!config.rules || config.rules.length === 0) {
    console.error(pc.red('Error: No rules to remove.'));
    process.exit(1);
  }

  if (index < 1 || index > config.rules.length) {
    console.error(pc.red(`Error: Invalid index. Must be between 1 and ${config.rules.length}`));
    process.exit(1);
  }

  const removed = config.rules.splice(index - 1, 1)[0];

  writeFileSync(configPath, YAML.stringify(config));
  console.log(pc.green(`✓ Removed rule: "${removed}"`));
  console.log(pc.dim(`  Remaining rules: ${config.rules.length}`));
}

/**
 * Show config file path
 */
async function showConfigPath(options: { project?: string }): Promise<void> {
  const cwd = process.cwd();
  const project = options.project || findProjectConfigDir(cwd) || detectProjectName(cwd);

  if (!project) {
    console.error(pc.red('Error: Could not detect project. Use --project option.'));
    process.exit(1);
  }

  const configPath = getConfigPath(cwd);
  console.log(configPath);
}

export { createConfigCommand as configCommand };
