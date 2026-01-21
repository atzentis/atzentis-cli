import { spawn, type ChildProcess } from 'node:child_process';
import type { ExecuteOptions, ExecutionResult } from '../config/schemas.ts';

const DEFAULT_COMPLETION_PATTERN = '<promise>COMPLETE</promise>';
const DEFAULT_TIMEOUT = 600000; // 10 minutes
const DEFAULT_MAX_RETRIES = 2;

/**
 * ClaudeCodeEngine wraps the Claude Code CLI for autonomous task execution.
 */
export class ClaudeCodeEngine {
  readonly name = 'claude-code';

  private completionPattern: string;

  constructor(options?: { completionPattern?: string }) {
    this.completionPattern = options?.completionPattern || DEFAULT_COMPLETION_PATTERN;
  }

  /**
   * Execute a prompt using Claude Code CLI
   */
  async execute(prompt: string, options?: Partial<ExecuteOptions>): Promise<ExecutionResult> {
    const opts: ExecuteOptions = {
      timeout: options?.timeout ?? DEFAULT_TIMEOUT,
      maxRetries: options?.maxRetries ?? DEFAULT_MAX_RETRIES,
      dangerouslySkipPermissions: options?.dangerouslySkipPermissions ?? false,
      workingDirectory: options?.workingDirectory,
      model: options?.model,
    };

    let lastError: string | undefined;
    let attempt = 0;

    while (attempt <= opts.maxRetries) {
      attempt++;

      try {
        const result = await this.executeOnce(prompt, opts);

        // Check for completion token
        result.completed = this.checkCompletion(result.output);

        if (result.success || result.completed) {
          return result;
        }

        // If failed but retries remaining, continue
        lastError = result.error || 'Execution failed without error message';
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }

      // Wait before retry (exponential backoff)
      if (attempt <= opts.maxRetries) {
        const delay = Math.min(1000 * 2 ** attempt, 30000);
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      output: '',
      exitCode: 1,
      duration: 0,
      completed: false,
      error: lastError || 'Max retries exceeded',
    };
  }

  /**
   * Execute a single attempt
   */
  private async executeOnce(prompt: string, options: ExecuteOptions): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let output = '';
      let child: ChildProcess | null = null;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (child && !child.killed) {
          child.kill('SIGTERM');
        }
      };

      try {
        // Build command arguments
        const args = this.buildArgs(prompt, options);

        // Spawn claude CLI
        child = spawn('claude', args, {
          cwd: options.workingDirectory,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: {
            ...process.env,
            // Ensure non-interactive mode
            CI: 'true',
          },
        });

        // Set timeout
        timeoutId = setTimeout(() => {
          cleanup();
          resolve({
            success: false,
            output,
            exitCode: 124, // Timeout exit code
            duration: Date.now() - startTime,
            completed: false,
            error: `Execution timed out after ${options.timeout}ms`,
          });
        }, options.timeout);

        // Collect stdout
        child.stdout?.on('data', (data: Buffer) => {
          const chunk = data.toString();
          output += chunk;
          // Stream output to console for visibility
          process.stdout.write(chunk);
        });

        // Collect stderr
        child.stderr?.on('data', (data: Buffer) => {
          const chunk = data.toString();
          output += chunk;
          process.stderr.write(chunk);
        });

        // Handle completion
        child.on('close', (code) => {
          cleanup();
          resolve({
            success: code === 0,
            output,
            exitCode: code ?? 1,
            duration: Date.now() - startTime,
            completed: this.checkCompletion(output),
            error: code !== 0 ? `Process exited with code ${code}` : undefined,
          });
        });

        // Handle errors
        child.on('error', (error) => {
          cleanup();
          resolve({
            success: false,
            output,
            exitCode: 1,
            duration: Date.now() - startTime,
            completed: false,
            error: error.message,
          });
        });

        // Send prompt via stdin
        if (child.stdin) {
          child.stdin.write(prompt);
          child.stdin.end();
        }
      } catch (error) {
        cleanup();
        resolve({
          success: false,
          output,
          exitCode: 1,
          duration: Date.now() - startTime,
          completed: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }

  /**
   * Build CLI arguments
   */
  private buildArgs(prompt: string, options: ExecuteOptions): string[] {
    const args: string[] = [];

    // Use print mode for non-interactive execution
    args.push('--print');

    // Add model if specified
    if (options.model) {
      args.push('--model', options.model);
    }

    // Skip permissions if requested (dangerous!)
    if (options.dangerouslySkipPermissions) {
      args.push('--dangerously-skip-permissions');
    }

    // Add the prompt
    args.push(prompt);

    return args;
  }

  /**
   * Check if output contains the completion pattern
   */
  checkCompletion(output: string): boolean {
    return output.includes(this.completionPattern);
  }

  /**
   * Extract completion metadata from output
   */
  extractCompletionMetadata(output: string): CompletionMetadata | null {
    if (!this.checkCompletion(output)) {
      return null;
    }

    // Try to extract structured completion data
    // Format: <promise>COMPLETE</promise> or <promise>COMPLETE: {...}</promise>
    const match = output.match(/<promise>COMPLETE(?::\s*(\{.*?\}))?<\/promise>/s);

    if (!match) {
      return { completed: true };
    }

    if (match[1]) {
      try {
        const data = JSON.parse(match[1]);
        return { completed: true, ...data };
      } catch {
        return { completed: true };
      }
    }

    return { completed: true };
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if Claude Code CLI is available
   */
  static async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn('claude', ['--version'], {
        stdio: 'pipe',
      });

      child.on('close', (code) => {
        resolve(code === 0);
      });

      child.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Get Claude Code version
   */
  static async getVersion(): Promise<string | null> {
    return new Promise((resolve) => {
      let output = '';

      const child = spawn('claude', ['--version'], {
        stdio: 'pipe',
      });

      child.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          resolve(null);
        }
      });

      child.on('error', () => {
        resolve(null);
      });
    });
  }
}

// =============================================================================
// Types
// =============================================================================

export interface CompletionMetadata {
  completed: boolean;
  summary?: string;
  filesChanged?: string[];
  testsRun?: boolean;
  testsPassed?: boolean;
}

// =============================================================================
// Engine interface for registry
// =============================================================================

export interface Engine {
  readonly name: string;
  execute(prompt: string, options?: Partial<ExecuteOptions>): Promise<ExecutionResult>;
  checkCompletion(output: string): boolean;
}
