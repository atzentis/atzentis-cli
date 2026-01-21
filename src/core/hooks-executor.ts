import { spawn } from 'node:child_process';
import type { HooksConfig, Task } from '../config/schemas.ts';

/**
 * Context provided to hooks
 */
export interface HookContext {
  project: string;
  phase?: string;
  taskId?: string;
  taskName?: string;
  status?: 'success' | 'error';
  error?: string;
  cwd: string;
}

/**
 * HooksExecutor runs lifecycle hooks defined in project config
 */
export class HooksExecutor {
  constructor(
    private hooks: HooksConfig | undefined,
    private cwd: string
  ) {}

  /**
   * Run a hook by name with context
   */
  async run(
    hookName: keyof HooksConfig,
    context: HookContext
  ): Promise<{ success: boolean; output: string }> {
    const command = this.hooks?.[hookName];

    if (!command) {
      return { success: true, output: '' };
    }

    return this.executeCommand(command, context);
  }

  /**
   * Run beforePhase hook
   */
  async beforePhase(project: string, phase: string): Promise<void> {
    const result = await this.run('beforePhase', {
      project,
      phase,
      cwd: this.cwd,
    });

    if (!result.success) {
      throw new Error(`beforePhase hook failed: ${result.output}`);
    }
  }

  /**
   * Run beforeTask hook
   */
  async beforeTask(project: string, task: Task): Promise<void> {
    const result = await this.run('beforeTask', {
      project,
      phase: task.phase,
      taskId: task.id,
      taskName: task.name,
      cwd: this.cwd,
    });

    if (!result.success) {
      throw new Error(`beforeTask hook failed: ${result.output}`);
    }
  }

  /**
   * Run afterTask hook
   */
  async afterTask(project: string, task: Task, success: boolean): Promise<void> {
    const result = await this.run('afterTask', {
      project,
      phase: task.phase,
      taskId: task.id,
      taskName: task.name,
      status: success ? 'success' : 'error',
      cwd: this.cwd,
    });

    if (!result.success) {
      // Don't throw for afterTask - just log warning
      console.warn(`Warning: afterTask hook failed: ${result.output}`);
    }
  }

  /**
   * Run onSuccess hook
   */
  async onSuccess(project: string, phase?: string): Promise<void> {
    const result = await this.run('onSuccess', {
      project,
      phase,
      status: 'success',
      cwd: this.cwd,
    });

    if (!result.success) {
      console.warn(`Warning: onSuccess hook failed: ${result.output}`);
    }
  }

  /**
   * Run onError hook
   */
  async onError(project: string, error: string, task?: Task): Promise<void> {
    const result = await this.run('onError', {
      project,
      phase: task?.phase,
      taskId: task?.id,
      taskName: task?.name,
      status: 'error',
      error,
      cwd: this.cwd,
    });

    if (!result.success) {
      console.warn(`Warning: onError hook failed: ${result.output}`);
    }
  }

  /**
   * Execute a shell command with environment variables from context
   */
  private executeCommand(
    command: string,
    context: HookContext
  ): Promise<{ success: boolean; output: string }> {
    return new Promise((resolve) => {
      // Build environment variables from context
      const env = {
        ...process.env,
        ATZENTIS_PROJECT: context.project,
        ATZENTIS_PHASE: context.phase || '',
        ATZENTIS_TASK_ID: context.taskId || '',
        ATZENTIS_TASK_NAME: context.taskName || '',
        ATZENTIS_STATUS: context.status || '',
        ATZENTIS_ERROR: context.error || '',
      };

      const proc = spawn(command, [], {
        cwd: context.cwd,
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env,
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
        const output = stdout + stderr;
        resolve({
          success: code === 0,
          output: output.trim(),
        });
      });

      proc.on('error', (err) => {
        resolve({
          success: false,
          output: err.message,
        });
      });
    });
  }
}
