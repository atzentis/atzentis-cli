import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import simpleGit, { type SimpleGit } from 'simple-git';

const DEFAULT_WORKTREE_DIR = '/tmp/atzentis-cli-worktrees';

/**
 * WorktreeManager handles Git worktree operations for isolated task execution.
 * Each task runs in its own worktree with a dedicated feature branch.
 */
export class WorktreeManager {
  private git: SimpleGit;
  private worktreeBaseDir: string;
  private project: string;

  constructor(
    projectRoot: string,
    project: string,
    worktreeBaseDir: string = DEFAULT_WORKTREE_DIR
  ) {
    this.project = project;
    this.worktreeBaseDir = worktreeBaseDir;
    this.git = simpleGit(projectRoot);
  }

  /**
   * Get the worktree path for a task
   */
  getWorktreePath(taskId: string): string {
    // Convert T00-001 to 00-001 for directory name
    const dirName = taskId.replace('T', '').toLowerCase();
    return join(this.worktreeBaseDir, this.project, dirName);
  }

  /**
   * Get the branch name for a task
   */
  getBranchName(taskId: string, taskSlug?: string): string {
    const slug = taskSlug ? `-${taskSlug}` : '';
    return `${this.project}/${taskId.toLowerCase()}${slug}`;
  }

  /**
   * Create a worktree for a task
   */
  async createWorktree(
    taskId: string,
    options?: {
      baseBranch?: string;
      taskSlug?: string;
    }
  ): Promise<{ worktreePath: string; branchName: string }> {
    const worktreePath = this.getWorktreePath(taskId);
    const branchName = this.getBranchName(taskId, options?.taskSlug);
    const baseBranch = options?.baseBranch || 'develop';

    // Check if worktree already exists
    if (existsSync(worktreePath)) {
      // Worktree exists, just return the paths
      return { worktreePath, branchName };
    }

    // Fetch latest to ensure we have the base branch
    try {
      await this.git.fetch('origin', baseBranch);
    } catch {
      // Ignore fetch errors - base branch might be local only
    }

    // Check if branch already exists
    const branches = await this.git.branch();
    const branchExists =
      branches.all.includes(branchName) || branches.all.includes(`remotes/origin/${branchName}`);

    if (branchExists) {
      // Branch exists, create worktree using existing branch
      await this.git.raw(['worktree', 'add', worktreePath, branchName]);
    } else {
      // Create new branch and worktree from base
      await this.git.raw(['worktree', 'add', '-b', branchName, worktreePath, baseBranch]);
    }

    return { worktreePath, branchName };
  }

  /**
   * Remove a worktree
   */
  async removeWorktree(taskId: string, options?: { force?: boolean }): Promise<void> {
    const worktreePath = this.getWorktreePath(taskId);

    if (!existsSync(worktreePath)) {
      return; // Already removed
    }

    try {
      if (options?.force) {
        await this.git.raw(['worktree', 'remove', '--force', worktreePath]);
      } else {
        await this.git.raw(['worktree', 'remove', worktreePath]);
      }
    } catch (error) {
      // If worktree remove fails, try manual cleanup
      rmSync(worktreePath, { recursive: true, force: true });
      await this.git.raw(['worktree', 'prune']);
    }
  }

  /**
   * List all active worktrees
   */
  async listWorktrees(): Promise<WorktreeInfo[]> {
    const output = await this.git.raw(['worktree', 'list', '--porcelain']);
    const worktrees: WorktreeInfo[] = [];

    let current: Partial<WorktreeInfo> = {};
    for (const line of output.split('\n')) {
      if (line.startsWith('worktree ')) {
        if (current.path) {
          worktrees.push(current as WorktreeInfo);
        }
        current = { path: line.replace('worktree ', '') };
      } else if (line.startsWith('HEAD ')) {
        current.head = line.replace('HEAD ', '');
      } else if (line.startsWith('branch ')) {
        current.branch = line.replace('branch ', '').replace('refs/heads/', '');
      } else if (line === 'bare') {
        current.bare = true;
      } else if (line === 'detached') {
        current.detached = true;
      }
    }

    if (current.path) {
      worktrees.push(current as WorktreeInfo);
    }

    return worktrees;
  }

  /**
   * Get a SimpleGit instance for a specific worktree
   */
  getWorktreeGit(taskId: string): SimpleGit {
    const worktreePath = this.getWorktreePath(taskId);
    return simpleGit(worktreePath);
  }

  /**
   * Commit changes in a worktree
   */
  async commitChanges(
    taskId: string,
    message: string,
    options?: { addAll?: boolean }
  ): Promise<string> {
    const worktreeGit = this.getWorktreeGit(taskId);

    if (options?.addAll !== false) {
      await worktreeGit.add('.');
    }

    const result = await worktreeGit.commit(message);
    return result.commit;
  }

  /**
   * Push a branch to remote
   */
  async pushBranch(
    taskId: string,
    options?: {
      setUpstream?: boolean;
      remote?: string;
    }
  ): Promise<void> {
    const worktreeGit = this.getWorktreeGit(taskId);
    const branchName = this.getBranchName(taskId);
    const remote = options?.remote || 'origin';

    if (options?.setUpstream !== false) {
      await worktreeGit.push(['-u', remote, branchName]);
    } else {
      await worktreeGit.push(remote, branchName);
    }
  }

  /**
   * Get changed files in a worktree
   */
  async getChangedFiles(taskId: string): Promise<string[]> {
    const worktreeGit = this.getWorktreeGit(taskId);
    const status = await worktreeGit.status();

    return [
      ...status.created,
      ...status.modified,
      ...status.renamed.map((r) => r.to),
      ...status.deleted,
    ];
  }

  /**
   * Check if worktree has uncommitted changes
   */
  async hasUncommittedChanges(taskId: string): Promise<boolean> {
    const worktreeGit = this.getWorktreeGit(taskId);
    const status = await worktreeGit.status();
    return !status.isClean();
  }

  /**
   * Get the diff for a worktree
   */
  async getDiff(taskId: string, options?: { staged?: boolean }): Promise<string> {
    const worktreeGit = this.getWorktreeGit(taskId);

    if (options?.staged) {
      return worktreeGit.diff(['--cached']);
    }
    return worktreeGit.diff();
  }

  /**
   * Cleanup all worktrees for this project
   */
  async cleanupAllWorktrees(): Promise<void> {
    const worktrees = await this.listWorktrees();

    for (const wt of worktrees) {
      if (wt.path.startsWith(this.worktreeBaseDir) && wt.path.includes(this.project)) {
        try {
          await this.git.raw(['worktree', 'remove', '--force', wt.path]);
        } catch {
          // Ignore errors, try to remove as many as possible
        }
      }
    }

    // Prune any stale worktree entries
    await this.git.raw(['worktree', 'prune']);
  }

  /**
   * Check if the main repository is a git repository
   */
  async isGitRepository(): Promise<boolean> {
    try {
      await this.git.status();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the current branch of the main repository
   */
  async getCurrentBranch(): Promise<string> {
    const result = await this.git.branch();
    return result.current;
  }

  /**
   * Get remote URL
   */
  async getRemoteUrl(remote: string = 'origin'): Promise<string | null> {
    try {
      const remotes = await this.git.getRemotes(true);
      const targetRemote = remotes.find((r) => r.name === remote);
      return targetRemote?.refs.push || targetRemote?.refs.fetch || null;
    } catch {
      return null;
    }
  }
}

// =============================================================================
// Types
// =============================================================================

export interface WorktreeInfo {
  path: string;
  head?: string;
  branch?: string;
  bare?: boolean;
  detached?: boolean;
}
