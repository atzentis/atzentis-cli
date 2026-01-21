#!/usr/bin/env bun

import { Command } from 'commander';
import pc from 'picocolors';
import { createRunCommand } from './commands/run.ts';
import { createStatusCommand } from './commands/status.ts';
import { createResumeCommand } from './commands/resume.ts';
import { createSetupCommand } from './commands/setup.ts';
import { createConfigCommand } from './commands/config.ts';

const VERSION = '0.1.0';

/**
 * Atzentis CLI - Autonomous Development Orchestrator
 *
 * Combines Atzentis Agents System with Ralphy execution patterns
 * for multi-project autonomous development.
 */
const program = new Command()
  .name('atzentis')
  .description('Autonomous development CLI for Atzentis projects')
  .version(VERSION)
  .option('-v, --verbose', 'Enable verbose output')
  .hook('preAction', () => {
    // Global pre-action hook
  });

// =============================================================================
// Commands
// =============================================================================

// Run command - main executor
program.addCommand(createRunCommand());

// Resume command - resume from checkpoint
program.addCommand(createResumeCommand());

// Status command - show progress
program.addCommand(createStatusCommand());

// Setup command - initialize project
program.addCommand(createSetupCommand());

// Config command - manage configuration
program.addCommand(createConfigCommand());

// =============================================================================
// Error Handling
// =============================================================================

program.showHelpAfterError();

// Handle unknown commands
program.on('command:*', () => {
  console.error(pc.red(`\nUnknown command: ${program.args.join(' ')}\n`));
  program.help();
});

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    if (error instanceof Error) {
      console.error(pc.red(`\nError: ${error.message}\n`));
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
    }
    process.exit(1);
  }
}

main();
