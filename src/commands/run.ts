import { Command } from 'commander';
import pc from 'picocolors';
import { createSpinner } from 'nanospinner';
import { existsSync, readFileSync } from 'node:fs';
import YAML from 'yaml';

import { type Task, type RunOptions, type ProjectConfig } from '../config/schemas.ts';
import {
  isAtzentisConfigured,
  getConfigPath,
  detectProjectName,
} from '../config/auto-detector.ts';
import { SessionManager } from '../core/session-manager.ts';
import { WorktreeManager } from '../core/worktree-manager.ts';
import { TaskScheduler, type ExecutionPlan } from '../core/task-scheduler.ts';
import { loadTasks as loadTasksFromLoader } from '../core/task-loader.ts';
import { HooksExecutor } from '../core/hooks-executor.ts';
import { getEngineRegistry } from '../engines/engine-registry.ts';
import { PromptBuilder } from '../prompt/builder.ts';

/**
 * Create the 'run' command
 */
export function createRunCommand(): Command {
  const cmd = new Command('run')
    .description('Execute tasks for a phase')
    .option('-p, --phase <phase>', 'Phase to execute (e.g., p00)')
    .option('-t, --tasks <tasks>', 'Specific tasks to run (comma-separated)')
    .option('--parallel', 'Execute tasks in parallel', false)
    .option('--max-parallel <n>', 'Maximum parallel tasks', '3')
    .option('--dry-run', 'Preview execution without running', false)
    .option('--fast', 'Skip tests and lint', false)
    .option('--project <name>', 'Project name (auto-detected if not specified)')
    .action(async (options) => {
      await runCommand(options);
    });

  return cmd;
}

/**
 * Main run command implementation
 */
async function runCommand(options: {
  phase?: string;
  tasks?: string;
  parallel: boolean;
  maxParallel: string;
  dryRun: boolean;
  fast: boolean;
  project?: string;
}): Promise<void> {
  const cwd = process.cwd();

  // Parse options
  const runOptions: RunOptions = {
    phase: options.phase,
    tasks: options.tasks?.split(',').map((t) => t.trim()),
    parallel: options.parallel,
    maxParallel: Number.parseInt(options.maxParallel, 10),
    dryRun: options.dryRun,
    fast: options.fast,
    project: options.project,
  };

  // Detect project
  const project = runOptions.project || detectProject(cwd);
  if (!project) {
    console.error(pc.red('Error: Could not detect project. Use --project or run from project root.'));
    process.exit(1);
  }

  console.log(pc.cyan(`\n🚀 Atzentis CLI - ${project}\n`));

  // Load project config
  const projectConfig = loadProjectConfig(cwd, project);

  // Load tasks
  const tasks = await loadTasksFromLoader(cwd, project, {
    phase: runOptions.phase,
    taskIds: runOptions.tasks,
  });
  if (tasks.length === 0) {
    console.log(pc.yellow('No tasks found to execute.'));
    return;
  }

  console.log(pc.dim(`Found ${tasks.length} tasks\n`));

  // Create scheduler and build execution plan
  const scheduler = new TaskScheduler();
  const plan = scheduler.generateExecutionPlan(tasks);

  // Dry run - just show the plan
  if (runOptions.dryRun) {
    displayExecutionPlan(plan);
    return;
  }

  // Check engine availability
  const registry = getEngineRegistry();
  const engineInfo = await registry.getEngineInfo('claude-code');
  if (!engineInfo?.available) {
    console.error(pc.red('Error: Claude Code CLI not available. Please install it first.'));
    console.log(pc.dim('  npm install -g @anthropic/claude-code'));
    process.exit(1);
  }

  // Initialize managers
  const sessionManager = new SessionManager(cwd);
  const worktreeManager = new WorktreeManager(
    cwd,
    project,
    projectConfig?.parallelStrategy?.worktreeDir
  );
  const promptBuilder = new PromptBuilder(cwd, projectConfig || undefined);

  // Create or resume session
  const session = sessionManager.createSession(
    project,
    runOptions.phase || 'p00',
    tasks.map((t) => t.id)
  );

  console.log(pc.dim(`Session: ${session.id}\n`));

  // Execute tasks
  const executor = new TaskExecutor(
    sessionManager,
    worktreeManager,
    promptBuilder,
    registry,
    projectConfig,
    project,
    cwd
  );

  try {
    await executor.execute(session.id, tasks, {
      parallel: runOptions.parallel,
      maxParallel: runOptions.maxParallel,
      fast: runOptions.fast,
      phase: runOptions.phase || 'p00',
    });

    console.log(pc.green('\n✅ All tasks completed successfully!\n'));
  } catch (error) {
    console.error(pc.red('\n❌ Execution failed:'), error);
    console.log(pc.dim('  Run "atzentis resume" to continue from checkpoint\n'));
    process.exit(1);
  } finally {
    sessionManager.close();
  }
}

/**
 * TaskExecutor handles the main execution loop
 */
class TaskExecutor {
  private readonly maxRetries = 2;
  private readonly hooksExecutor: HooksExecutor;
  private readonly project: string;

  constructor(
    private sessionManager: SessionManager,
    private worktreeManager: WorktreeManager,
    private promptBuilder: PromptBuilder,
    private engineRegistry: ReturnType<typeof getEngineRegistry>,
    private projectConfig: ProjectConfig | null,
    project: string,
    cwd: string
  ) {
    this.project = project;
    this.hooksExecutor = new HooksExecutor(projectConfig?.hooks, cwd);
  }

  async execute(
    sessionId: string,
    tasks: Task[],
    options: {
      parallel: boolean;
      maxParallel: number;
      fast: boolean;
      phase: string;
    }
  ): Promise<void> {
    const scheduler = new TaskScheduler();
    const waves = scheduler.buildExecutionWaves(tasks);

    // Run beforePhase hook
    await this.hooksExecutor.beforePhase(this.project, options.phase);

    console.log(pc.cyan(`Executing ${tasks.length} tasks in ${waves.length} waves\n`));

    let hasErrors = false;

    for (let i = 0; i < waves.length; i++) {
      const wave = waves[i];
      console.log(pc.bold(`\n📦 Wave ${i + 1}/${waves.length}`));

      if (options.parallel && wave.length > 1) {
        // Parallel execution
        const chunks = this.chunkArray(wave, options.maxParallel);
        for (const chunk of chunks) {
          const results = await Promise.allSettled(
            chunk.map((task) => this.executeTaskWithRetry(sessionId, task, options.fast))
          );
          // Check for any failures
          for (const result of results) {
            if (result.status === 'rejected') {
              hasErrors = true;
            }
          }
        }
      } else {
        // Sequential execution
        for (const task of wave) {
          try {
            await this.executeTaskWithRetry(sessionId, task, options.fast);
          } catch (error) {
            hasErrors = true;
            // Run onError hook
            const errorMsg = error instanceof Error ? error.message : String(error);
            await this.hooksExecutor.onError(this.project, errorMsg, task);
            throw error;
          }
        }
      }
    }

    // Run onSuccess hook if no errors
    if (!hasErrors) {
      await this.hooksExecutor.onSuccess(this.project, options.phase);
    }
  }

  private async executeTaskWithRetry(
    sessionId: string,
    task: Task,
    fast: boolean
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        await this.executeTask(sessionId, task, fast);

        // Success - resolve any previous errors
        this.sessionManager.resolveError(sessionId, task.id);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.maxRetries) {
          console.log(
            pc.yellow(`  Retry ${attempt + 1}/${this.maxRetries} for ${task.id}...`)
          );

          // Clean up worktree before retry
          try {
            await this.worktreeManager.removeWorktree(task.id);
          } catch {
            // Ignore cleanup errors
          }
        }
      }
    }

    // All retries exhausted
    throw lastError;
  }

  private async executeTask(sessionId: string, task: Task, fast: boolean): Promise<void> {
    const spinner = createSpinner(`${task.id}: ${task.name}`).start();

    // Run beforeTask hook
    await this.hooksExecutor.beforeTask(this.project, task);

    let success = false;
    try {
      // Mark task as started
      this.sessionManager.startTask(sessionId, task.id);

      // Create worktree
      const { worktreePath, branchName } = await this.worktreeManager.createWorktree(task.id, {
        taskSlug: task.name.toLowerCase().replace(/\s+/g, '-').slice(0, 30),
      });
      this.sessionManager.registerWorktree(sessionId, task.id, worktreePath);
      this.sessionManager.registerBranch(sessionId, task.id, branchName);

      spinner.update({ text: `${task.id}: Building prompt...` });

      // Build prompt
      const prompt = await this.promptBuilder.build(task);

      spinner.update({ text: `${task.id}: Executing with Claude Code...` });

      // Execute with engine
      const engine = this.engineRegistry.getDefault();
      const result = await engine.execute(prompt, {
        workingDirectory: worktreePath,
        dangerouslySkipPermissions: true,
      });

      if (!result.success || !result.completed) {
        throw new Error(result.error || 'Execution failed');
      }

      // Run validation unless --fast
      if (!fast && this.projectConfig?.commands) {
        spinner.update({ text: `${task.id}: Running validation...` });
        await this.runValidation(worktreePath);
      }

      // Commit changes
      spinner.update({ text: `${task.id}: Committing changes...` });
      const hasChanges = await this.worktreeManager.hasUncommittedChanges(task.id);
      if (hasChanges) {
        await this.worktreeManager.commitChanges(
          task.id,
          `${task.id}: ${task.name}\n\nCo-Authored-By: Claude Code <noreply@anthropic.com>`
        );

        // Push and create PR
        spinner.update({ text: `${task.id}: Pushing and creating PR...` });
        await this.worktreeManager.pushBranch(task.id, { setUpstream: true });

        const prUrl = await this.createPullRequest(task, worktreePath);
        if (prUrl) {
          this.sessionManager.registerPR(sessionId, task.id, prUrl);
        }
      }

      // Save checkpoint
      this.sessionManager.saveCheckpoint(sessionId, task.id, 'completed', {
        duration: result.duration,
      });

      success = true;
      spinner.success({ text: pc.green(`${task.id}: ${task.name} ✓`) });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.sessionManager.recordError(sessionId, task.id, errorMsg);
      this.sessionManager.saveCheckpoint(sessionId, task.id, 'failed', {
        error: errorMsg,
      });

      spinner.error({ text: pc.red(`${task.id}: ${task.name} ✗`) });
      throw error;
    } finally {
      // Run afterTask hook
      await this.hooksExecutor.afterTask(this.project, task, success);
    }
  }

  private async runValidation(worktreePath: string): Promise<void> {
    const commands = this.projectConfig?.commands;
    if (!commands) return;

    // Run lint if configured
    if (commands.lint) {
      await this.runShellCommand(commands.lint, worktreePath, 'lint');
    }

    // Run tests if configured
    if (commands.test) {
      await this.runShellCommand(commands.test, worktreePath, 'test');
    }
  }

  private async runShellCommand(command: string, cwd: string, name: string): Promise<void> {
    const { spawn } = await import('node:child_process');

    return new Promise((resolve, reject) => {
      const proc = spawn(command, [], {
        cwd,
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, CI: 'true' },
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          const error = new Error(`${name} failed with exit code ${code}`);
          (error as Error & { stdout: string; stderr: string }).stdout = stdout;
          (error as Error & { stdout: string; stderr: string }).stderr = stderr;
          reject(error);
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to run ${name}: ${err.message}`));
      });
    });
  }

  private async createPullRequest(task: Task, worktreePath: string): Promise<string | null> {
    const { spawn } = await import('node:child_process');

    // Build PR body
    const body = `## Summary

- ${task.name}
${task.description ? `\n${task.description}\n` : ''}
## Acceptance Criteria

${task.acceptanceCriteria.map((c) => `- [ ] ${c}`).join('\n') || '_No specific criteria_'}

## Files Changed

${task.files.map((f) => `- \`${f}\``).join('\n') || '_See diff_'}

---

🤖 Generated with [Atzentis CLI](https://github.com/atzentis/atzentis-cli)
`;

    return new Promise((resolve) => {
      const proc = spawn(
        'gh',
        [
          'pr',
          'create',
          '--title',
          `${task.id}: ${task.name}`,
          '--body',
          body,
          '--draft',
        ],
        {
          cwd: worktreePath,
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      );

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          // gh pr create outputs the PR URL on success
          const prUrl = stdout.trim();
          resolve(prUrl || null);
        } else {
          // Log warning but don't fail the task
          console.log(pc.yellow(`  Warning: Could not create PR: ${stderr.trim()}`));
          resolve(null);
        }
      });

      proc.on('error', () => {
        // gh CLI might not be installed
        console.log(pc.yellow('  Warning: gh CLI not available, skipping PR creation'));
        resolve(null);
      });
    });
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
 * Detect project from current directory
 */
function detectProject(cwd: string): string | null {
  // Check for .atzentis directory
  if (isAtzentisConfigured(cwd)) {
    // Return the project name from config or detect from package.json
    const configPath = getConfigPath(cwd);
    try {
      const content = readFileSync(configPath, 'utf-8');
      const config = YAML.parse(content);
      if (config?.project) {
        return config.project;
      }
    } catch {
      // Fall through to package.json detection
    }
  }

  // Fall back to detecting project name from package.json
  return detectProjectName(cwd);
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
      // Ignore parse errors
    }
  }

  return null;
}

/**
 * Display execution plan
 */
function displayExecutionPlan(plan: ExecutionPlan): void {
  console.log(pc.bold(pc.cyan('\n⚙️  DRY RUN MODE (no changes will be made)\n')));

  console.log(`${pc.bold('Total Tasks:')} ${plan.totalTasks}`);
  console.log(`${pc.bold('Total Waves:')} ${plan.totalWaves}`);
  console.log(`${pc.bold('Estimated Duration:')} ${plan.estimatedDuration}\n`);

  for (const wave of plan.waves) {
    const parallelLabel = wave.parallel ? pc.green(' (parallel)') : '';
    console.log(pc.bold(`Wave ${wave.number}${parallelLabel}:`));

    for (const task of wave.tasks) {
      const deps =
        task.dependencies.length > 0 ? pc.dim(` [deps: ${task.dependencies.join(', ')}]`) : '';
      const est = task.estimate ? pc.dim(` (${task.estimate})`) : '';
      console.log(`  • ${task.id}: ${task.name}${est}${deps}`);
    }
    console.log();
  }

  console.log(pc.dim('To execute: remove --dry-run flag\n'));
}

export { createRunCommand as runCommand };
