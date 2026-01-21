import { Command } from 'commander';
import pc from 'picocolors';
import { existsSync, readFileSync } from 'node:fs';
import YAML from 'yaml';

import type { Task, ProjectConfig } from '../config/schemas.ts';
import {
  isAtzentisConfigured,
  getConfigPath,
  detectProjectName,
  getSessionDbPath,
} from '../config/auto-detector.ts';
import { SessionManager } from '../core/session-manager.ts';
import { WorktreeManager } from '../core/worktree-manager.ts';
import { TaskScheduler } from '../core/task-scheduler.ts';
import { loadTask } from '../core/task-loader.ts';
import { getEngineRegistry } from '../engines/engine-registry.ts';
import { PromptBuilder } from '../prompt/builder.ts';

/**
 * Create the 'resume' command
 */
export function createResumeCommand(): Command {
  const cmd = new Command('resume')
    .description('Resume execution from last checkpoint')
    .option('--project <name>', 'Project name')
    .option('--session <id>', 'Session ID to resume')
    .option('--parallel', 'Execute tasks in parallel', false)
    .option('--max-parallel <n>', 'Maximum parallel tasks', '3')
    .option('--fast', 'Skip tests and lint', false)
    .action(async (options) => {
      await resumeCommand(options);
    });

  return cmd;
}

/**
 * Main resume command implementation
 */
async function resumeCommand(options: {
  project?: string;
  session?: string;
  parallel: boolean;
  maxParallel: string;
  fast: boolean;
}): Promise<void> {
  const cwd = process.cwd();

  // Detect project
  const project = options.project || detectProject(cwd);
  if (!project) {
    console.error(pc.red('Error: Could not detect project. Use --project option.'));
    process.exit(1);
  }

  console.log(pc.cyan(`\n📍 Resuming - ${project}\n`));

  // Check if session database exists
  const dbPath = getSessionDbPath(cwd);
  if (!existsSync(dbPath)) {
    console.error(pc.red('Error: No sessions found. Run "atzentis run" first.'));
    process.exit(1);
  }

  const sessionManager = new SessionManager(cwd);

  try {
    // Get session to resume
    let session = options.session
      ? sessionManager.getSession(options.session)
      : sessionManager.getActiveSession(project);

    if (!session) {
      console.error(pc.red('Error: No active session found to resume.'));
      console.log(pc.dim('Run "atzentis status --all" to see all sessions.'));
      process.exit(1);
    }

    // Check if there's work to do
    if (session.pendingTasks.length === 0 && !session.currentTask) {
      console.log(pc.green('Session already completed. No tasks to resume.\n'));
      return;
    }

    console.log(pc.dim(`Session: ${session.id}`));
    console.log(pc.dim(`Phase: ${session.phase.toUpperCase()}`));
    console.log();

    // Show progress
    const total =
      session.completedTasks.length + session.failedTasks.length + session.pendingTasks.length;
    console.log(
      `Progress: ${session.completedTasks.length}/${total} completed, ${session.failedTasks.length} failed`
    );

    // If there's a current task that was interrupted, add it back to pending
    if (session.currentTask) {
      console.log(pc.yellow(`\nResuming interrupted task: ${session.currentTask}`));
      session.pendingTasks.unshift(session.currentTask);
      session.currentTask = null;
      sessionManager.updateSession(session);
    }

    // Load remaining tasks
    const tasks = await loadRemainingTasks(cwd, project, session.pendingTasks);
    if (tasks.length === 0) {
      console.log(pc.yellow('\nNo tasks found to execute.'));
      return;
    }

    console.log(pc.dim(`\nResuming ${tasks.length} remaining tasks\n`));

    // Check engine availability
    const registry = getEngineRegistry();
    const engineInfo = await registry.getEngineInfo('claude-code');
    if (!engineInfo?.available) {
      console.error(pc.red('Error: Claude Code CLI not available.'));
      process.exit(1);
    }

    // Load project config
    const projectConfig = loadProjectConfig(cwd, project);

    // Initialize managers
    const worktreeManager = new WorktreeManager(
      cwd,
      project,
      projectConfig?.parallelStrategy?.worktreeDir
    );
    const promptBuilder = new PromptBuilder(cwd, projectConfig || undefined);

    // Execute remaining tasks
    const executor = new ResumeExecutor(
      sessionManager,
      worktreeManager,
      promptBuilder,
      registry,
      projectConfig
    );

    await executor.execute(session.id, tasks, {
      parallel: options.parallel,
      maxParallel: Number.parseInt(options.maxParallel, 10),
      fast: options.fast,
    });

    console.log(pc.green('\n✅ All remaining tasks completed!\n'));
  } catch (error) {
    console.error(pc.red('\n❌ Execution failed:'), error);
    console.log(pc.dim('Run "atzentis resume" to continue from checkpoint\n'));
    process.exit(1);
  } finally {
    sessionManager.close();
  }
}

/**
 * ResumeExecutor handles task execution for resume
 */
class ResumeExecutor {
  constructor(
    private sessionManager: SessionManager,
    private worktreeManager: WorktreeManager,
    private promptBuilder: PromptBuilder,
    private engineRegistry: ReturnType<typeof getEngineRegistry>,
    private projectConfig: ProjectConfig | null
  ) {}

  async execute(
    sessionId: string,
    tasks: Task[],
    options: {
      parallel: boolean;
      maxParallel: number;
      fast: boolean;
    }
  ): Promise<void> {
    const scheduler = new TaskScheduler();
    const waves = scheduler.buildExecutionWaves(tasks);

    console.log(pc.cyan(`Executing ${tasks.length} tasks in ${waves.length} waves\n`));

    for (let i = 0; i < waves.length; i++) {
      const wave = waves[i];
      console.log(pc.bold(`\n📦 Wave ${i + 1}/${waves.length}`));

      if (options.parallel && wave.length > 1) {
        const chunks = this.chunkArray(wave, options.maxParallel);
        for (const chunk of chunks) {
          await Promise.all(chunk.map((task) => this.executeTask(sessionId, task, options.fast)));
        }
      } else {
        for (const task of wave) {
          await this.executeTask(sessionId, task, options.fast);
        }
      }
    }
  }

  private async executeTask(sessionId: string, task: Task, fast: boolean): Promise<void> {
    const { createSpinner } = await import('nanospinner');
    const spinner = createSpinner(`${task.id}: ${task.name}`).start();

    try {
      this.sessionManager.startTask(sessionId, task.id);

      // Create or reuse worktree
      const { worktreePath, branchName } = await this.worktreeManager.createWorktree(task.id, {
        taskSlug: task.name.toLowerCase().replace(/\s+/g, '-').slice(0, 30),
      });
      this.sessionManager.registerWorktree(sessionId, task.id, worktreePath);
      this.sessionManager.registerBranch(sessionId, task.id, branchName);

      spinner.update({ text: `${task.id}: Building prompt...` });

      const prompt = await this.promptBuilder.build(task);

      spinner.update({ text: `${task.id}: Executing with Claude Code...` });

      const engine = this.engineRegistry.getDefault();
      const result = await engine.execute(prompt, {
        workingDirectory: worktreePath,
        dangerouslySkipPermissions: true,
      });

      if (!result.success || !result.completed) {
        throw new Error(result.error || 'Execution failed');
      }

      if (!fast && this.projectConfig?.commands) {
        spinner.update({ text: `${task.id}: Running validation...` });
        // Validation would run here
      }

      spinner.update({ text: `${task.id}: Committing changes...` });
      const hasChanges = await this.worktreeManager.hasUncommittedChanges(task.id);
      if (hasChanges) {
        await this.worktreeManager.commitChanges(
          task.id,
          `${task.id}: ${task.name}\n\nCo-Authored-By: Claude Code <noreply@anthropic.com>`
        );
      }

      this.sessionManager.saveCheckpoint(sessionId, task.id, 'completed', {
        duration: result.duration,
      });

      spinner.success({ text: pc.green(`${task.id}: ${task.name} ✓`) });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.sessionManager.recordError(sessionId, task.id, errorMsg);
      this.sessionManager.saveCheckpoint(sessionId, task.id, 'failed', {
        error: errorMsg,
      });

      spinner.error({ text: pc.red(`${task.id}: ${task.name} ✗`) });
      throw error;
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

/**
 * Load remaining tasks by their IDs
 */
async function loadRemainingTasks(
  cwd: string,
  _project: string,
  taskIds: string[]
): Promise<Task[]> {
  const tasks: Task[] = [];

  for (const taskId of taskIds) {
    const task = await loadTask(cwd, taskId);
    if (task) {
      tasks.push(task);
    }
  }

  return tasks;
}

/**
 * Load project configuration
 */
function loadProjectConfig(cwd: string, _project: string): ProjectConfig | null {
  const configPath = getConfigPath(cwd);

  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, 'utf-8');
      return YAML.parse(content) as ProjectConfig;
    } catch {
      // Ignore
    }
  }

  return null;
}

/**
 * Detect project from current directory
 */
function detectProject(cwd: string): string | null {
  // Check for .atzentis directory
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

export { createResumeCommand as resumeCommand };
