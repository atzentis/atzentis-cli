import { Command } from 'commander';
import pc from 'picocolors';
import { existsSync, readFileSync } from 'node:fs';
import YAML from 'yaml';

import { SessionManager } from '../core/session-manager.ts';
import type { Session } from '../config/schemas.ts';
import {
  isAtzentisConfigured,
  getConfigPath,
  getSessionDbPath,
  detectProjectName,
} from '../config/auto-detector.ts';

/**
 * Create the 'status' command
 */
export function createStatusCommand(): Command {
  const cmd = new Command('status')
    .description('Show execution status')
    .option('--project <name>', 'Project name')
    .option('--json', 'Output as JSON')
    .option('--all', 'Show all sessions, not just active')
    .action(async (options) => {
      await statusCommand(options);
    });

  return cmd;
}

/**
 * Main status command implementation
 */
async function statusCommand(options: {
  project?: string;
  json?: boolean;
  all?: boolean;
}): Promise<void> {
  const cwd = process.cwd();

  // Detect project
  const project = options.project || detectProject(cwd);
  if (!project) {
    console.error(pc.red('Error: Could not detect project. Use --project option.'));
    process.exit(1);
  }

  // Check if session database exists
  const dbPath = getSessionDbPath(cwd);
  if (!existsSync(dbPath)) {
    if (options.json) {
      console.log(JSON.stringify({ sessions: [], active: null }));
    } else {
      console.log(pc.yellow('\nNo sessions found. Run "atzentis run" to start.\n'));
    }
    return;
  }

  const sessionManager = new SessionManager(cwd);

  try {
    if (options.all) {
      // Show all sessions
      const sessions = sessionManager.getAllSessions(project);
      if (options.json) {
        console.log(JSON.stringify({ sessions }, null, 2));
      } else {
        displayAllSessions(sessions, project);
      }
    } else {
      // Show active session only
      const session = sessionManager.getActiveSession(project);
      if (options.json) {
        console.log(JSON.stringify({ session }, null, 2));
      } else {
        displayActiveSession(session, project);
      }
    }
  } finally {
    sessionManager.close();
  }
}

/**
 * Display active session status
 */
function displayActiveSession(session: Session | null, project: string): void {
  console.log(pc.cyan(`\n📊 Session Status - ${project}\n`));

  if (!session) {
    console.log(pc.yellow('No active session found.\n'));
    console.log(pc.dim('Run "atzentis run --phase p00" to start a new session.\n'));
    return;
  }

  // Session info
  console.log(pc.bold('Session:'), session.id);
  console.log(pc.bold('Phase:'), session.phase.toUpperCase());
  console.log(pc.bold('Started:'), formatDate(session.startedAt));
  if (session.lastCheckpointAt) {
    console.log(pc.bold('Last Checkpoint:'), formatDate(session.lastCheckpointAt));
  }
  console.log();

  // Current task
  if (session.currentTask) {
    console.log(pc.yellow(`🔄 Current Task: ${session.currentTask}`));
    console.log();
  }

  // Progress
  const total =
    session.completedTasks.length + session.failedTasks.length + session.pendingTasks.length;
  const completed = session.completedTasks.length;
  const failed = session.failedTasks.length;
  const pending = session.pendingTasks.length;

  console.log(pc.bold('Progress:'));
  console.log(`  ${pc.green('✓')} Completed: ${completed}/${total}`);
  console.log(`  ${pc.red('✗')} Failed: ${failed}`);
  console.log(`  ${pc.dim('○')} Pending: ${pending}`);
  console.log();

  // Progress bar
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const barLength = 30;
  const filledLength = Math.round((progressPercent / 100) * barLength);
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
  console.log(`  [${bar}] ${progressPercent}%`);
  console.log();

  // Completed tasks
  if (session.completedTasks.length > 0) {
    console.log(pc.green('Completed Tasks:'));
    for (const taskId of session.completedTasks) {
      const prUrl = session.prs[taskId];
      const prLink = prUrl ? pc.dim(` → ${prUrl}`) : '';
      console.log(`  ${pc.green('✓')} ${taskId}${prLink}`);
    }
    console.log();
  }

  // Failed tasks
  if (session.failedTasks.length > 0) {
    console.log(pc.red('Failed Tasks:'));
    for (const taskId of session.failedTasks) {
      const error = session.errors[taskId];
      const errorMsg = error ? pc.dim(` (${error.lastError.slice(0, 50)}...)`) : '';
      console.log(`  ${pc.red('✗')} ${taskId}${errorMsg}`);
    }
    console.log();
  }

  // Pending tasks
  if (session.pendingTasks.length > 0) {
    console.log(pc.dim('Pending Tasks:'));
    for (const taskId of session.pendingTasks.slice(0, 5)) {
      console.log(`  ${pc.dim('○')} ${taskId}`);
    }
    if (session.pendingTasks.length > 5) {
      console.log(pc.dim(`  ... and ${session.pendingTasks.length - 5} more`));
    }
    console.log();
  }

  // Resume hint
  if (session.failedTasks.length > 0 || session.pendingTasks.length > 0) {
    console.log(pc.dim('Run "atzentis resume" to continue execution.\n'));
  }
}

/**
 * Display all sessions
 */
function displayAllSessions(sessions: Session[], project: string): void {
  console.log(pc.cyan(`\n📊 All Sessions - ${project}\n`));

  if (sessions.length === 0) {
    console.log(pc.yellow('No sessions found.\n'));
    return;
  }

  console.log(
    pc.bold(
      `${'ID'.padEnd(38)} ${'Phase'.padEnd(6)} ${'Status'.padEnd(12)} ${'Progress'.padEnd(12)} Started`
    )
  );
  console.log(pc.dim('─'.repeat(90)));

  for (const session of sessions) {
    const total =
      session.completedTasks.length + session.failedTasks.length + session.pendingTasks.length;
    const completed = session.completedTasks.length;

    let status: string;
    if (session.pendingTasks.length === 0 && !session.currentTask) {
      status = session.failedTasks.length > 0 ? pc.red('failed') : pc.green('completed');
    } else if (session.currentTask) {
      status = pc.yellow('running');
    } else {
      status = pc.blue('paused');
    }

    const progress = `${completed}/${total}`;
    const date = formatDate(session.startedAt, true);

    console.log(
      `${session.id} ${session.phase.toUpperCase().padEnd(6)} ${status.padEnd(20)} ${progress.padEnd(12)} ${date}`
    );
  }

  console.log();
}

/**
 * Format date for display
 */
function formatDate(isoString: string, short = false): string {
  const date = new Date(isoString);
  if (short) {
    return date.toLocaleDateString();
  }
  return date.toLocaleString();
}

/**
 * Detect project from current directory
 */
function detectProject(cwd: string): string | null {
  // Check for .atzentis/cli/config.yaml
  if (isAtzentisConfigured(cwd)) {
    const configPath = getConfigPath(cwd);
    try {
      const content = readFileSync(configPath, 'utf-8');
      const config = YAML.parse(content);
      if (config?.project) {
        return config.project;
      }
    } catch {
      // Fall through
    }
  }

  return detectProjectName(cwd);
}

export { createStatusCommand as statusCommand };
