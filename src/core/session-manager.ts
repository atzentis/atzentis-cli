import { Database } from 'bun:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  type Checkpoint,
  CheckpointSchema,
  type Session,
  SessionSchema,
  type TaskStatus,
} from '../config/schemas.ts';

const SESSION_DB_DIR = '.atzentis';
const SESSION_DB_FILE = 'session.db';

/**
 * SessionManager handles persistent storage of CLI sessions using SQLite.
 * This enables crash recovery and resume functionality.
 */
export class SessionManager {
  private db: Database;
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    const dbPath = this.getDbPath();

    // Ensure directory exists
    const dbDir = dirname(dbPath);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.initializeSchema();
  }

  private getDbPath(): string {
    return join(this.projectRoot, SESSION_DB_DIR, SESSION_DB_FILE);
  }

  private initializeSchema(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        project TEXT NOT NULL,
        phase TEXT NOT NULL,
        started_at TEXT NOT NULL,
        last_checkpoint_at TEXT,
        current_task TEXT,
        completed_tasks TEXT DEFAULT '[]',
        failed_tasks TEXT DEFAULT '[]',
        pending_tasks TEXT DEFAULT '[]',
        worktrees TEXT DEFAULT '{}',
        branches TEXT DEFAULT '{}',
        prs TEXT DEFAULT '{}',
        errors TEXT DEFAULT '{}'
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS checkpoints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        task_id TEXT NOT NULL,
        status TEXT NOT NULL,
        pr_link TEXT,
        duration INTEGER,
        error TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )
    `);

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_checkpoints_session ON checkpoints(session_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project)`);
  }

  /**
   * Create a new session
   */
  createSession(project: string, phase: string, tasks: string[]): Session {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO sessions (
        id, project, phase, started_at, pending_tasks
      ) VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, project, phase, now, JSON.stringify(tasks));

    return {
      id,
      project,
      phase,
      startedAt: now,
      lastCheckpointAt: undefined,
      currentTask: null,
      completedTasks: [],
      failedTasks: [],
      pendingTasks: tasks,
      worktrees: {},
      branches: {},
      prs: {},
      checkpoints: [],
      errors: {},
    };
  }

  /**
   * Get the current active session for a project
   */
  getActiveSession(project: string): Session | null {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions
      WHERE project = ?
      ORDER BY started_at DESC
      LIMIT 1
    `);

    const row = stmt.get(project) as SessionRow | undefined;
    if (!row) return null;

    // Check if session has pending tasks (still active)
    const pendingTasks = JSON.parse(row.pending_tasks);
    if (pendingTasks.length === 0 && !row.current_task) {
      return null; // Session completed
    }

    return this.rowToSession(row);
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): Session | null {
    const stmt = this.db.prepare('SELECT * FROM sessions WHERE id = ?');
    const row = stmt.get(sessionId) as SessionRow | undefined;
    if (!row) return null;

    return this.rowToSession(row);
  }

  /**
   * Convert database row to Session object
   */
  private rowToSession(row: SessionRow): Session {
    // Get checkpoints for this session
    const checkpointsStmt = this.db.prepare(`
      SELECT * FROM checkpoints WHERE session_id = ? ORDER BY timestamp ASC
    `);
    const checkpointRows = checkpointsStmt.all(row.id) as CheckpointRow[];

    const checkpoints: Checkpoint[] = checkpointRows.map((cp) =>
      CheckpointSchema.parse({
        timestamp: cp.timestamp,
        taskId: cp.task_id,
        status: cp.status,
        prLink: cp.pr_link || undefined,
        duration: cp.duration || undefined,
        error: cp.error || undefined,
      })
    );

    return SessionSchema.parse({
      id: row.id,
      project: row.project,
      phase: row.phase,
      startedAt: row.started_at,
      lastCheckpointAt: row.last_checkpoint_at || undefined,
      currentTask: row.current_task,
      completedTasks: JSON.parse(row.completed_tasks),
      failedTasks: JSON.parse(row.failed_tasks),
      pendingTasks: JSON.parse(row.pending_tasks),
      worktrees: JSON.parse(row.worktrees),
      branches: JSON.parse(row.branches),
      prs: JSON.parse(row.prs),
      checkpoints,
      errors: JSON.parse(row.errors),
    });
  }

  /**
   * Update session state
   */
  updateSession(session: Session): void {
    const stmt = this.db.prepare(`
      UPDATE sessions SET
        last_checkpoint_at = ?,
        current_task = ?,
        completed_tasks = ?,
        failed_tasks = ?,
        pending_tasks = ?,
        worktrees = ?,
        branches = ?,
        prs = ?,
        errors = ?
      WHERE id = ?
    `);

    stmt.run(
      session.lastCheckpointAt || null,
      session.currentTask,
      JSON.stringify(session.completedTasks),
      JSON.stringify(session.failedTasks),
      JSON.stringify(session.pendingTasks),
      JSON.stringify(session.worktrees),
      JSON.stringify(session.branches),
      JSON.stringify(session.prs),
      JSON.stringify(session.errors),
      session.id
    );
  }

  /**
   * Start a task - move from pending to current
   */
  startTask(sessionId: string, taskId: string): void {
    const session = this.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    session.currentTask = taskId;
    session.pendingTasks = session.pendingTasks.filter((t) => t !== taskId);

    this.updateSession(session);
  }

  /**
   * Save a checkpoint after task completion/failure
   */
  saveCheckpoint(
    sessionId: string,
    taskId: string,
    status: TaskStatus,
    options?: {
      prLink?: string;
      duration?: number;
      error?: string;
    }
  ): void {
    const session = this.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const now = new Date().toISOString();

    // Insert checkpoint
    const stmt = this.db.prepare(`
      INSERT INTO checkpoints (session_id, timestamp, task_id, status, pr_link, duration, error)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      sessionId,
      now,
      taskId,
      status,
      options?.prLink || null,
      options?.duration || null,
      options?.error || null
    );

    // Update session state
    session.lastCheckpointAt = now;
    session.currentTask = null;

    if (status === 'completed') {
      session.completedTasks.push(taskId);
    } else if (status === 'failed') {
      session.failedTasks.push(taskId);
    }

    this.updateSession(session);
  }

  /**
   * Record task error for retry tracking
   */
  recordError(sessionId: string, taskId: string, error: string): void {
    const session = this.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const existingError = session.errors[taskId];
    if (existingError) {
      session.errors[taskId] = {
        iterations: existingError.iterations + 1,
        lastError: error,
        retried: true,
        resolved: false,
      };
    } else {
      session.errors[taskId] = {
        iterations: 1,
        lastError: error,
        retried: false,
        resolved: false,
      };
    }

    this.updateSession(session);
  }

  /**
   * Mark an error as resolved
   */
  resolveError(sessionId: string, taskId: string): void {
    const session = this.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    if (session.errors[taskId]) {
      session.errors[taskId].resolved = true;
      this.updateSession(session);
    }
  }

  /**
   * Register a worktree for a task
   */
  registerWorktree(sessionId: string, taskId: string, worktreePath: string): void {
    const session = this.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    session.worktrees[taskId] = worktreePath;
    this.updateSession(session);
  }

  /**
   * Register a branch for a task
   */
  registerBranch(sessionId: string, taskId: string, branchName: string): void {
    const session = this.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    session.branches[taskId] = branchName;
    this.updateSession(session);
  }

  /**
   * Register a PR for a task
   */
  registerPR(sessionId: string, taskId: string, prUrl: string): void {
    const session = this.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    session.prs[taskId] = prUrl;
    this.updateSession(session);
  }

  /**
   * Get all sessions for a project
   */
  getAllSessions(project: string): Session[] {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions WHERE project = ? ORDER BY started_at DESC
    `);
    const rows = stmt.all(project) as SessionRow[];

    return rows.map((row) => this.rowToSession(row));
  }

  /**
   * Delete a session and its checkpoints
   */
  deleteSession(sessionId: string): void {
    const deleteCheckpoints = this.db.prepare('DELETE FROM checkpoints WHERE session_id = ?');
    const deleteSession = this.db.prepare('DELETE FROM sessions WHERE id = ?');

    const transaction = this.db.transaction(() => {
      deleteCheckpoints.run(sessionId);
      deleteSession.run(sessionId);
    });

    transaction();
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}

// =============================================================================
// Type definitions for database rows
// =============================================================================

interface SessionRow {
  id: string;
  project: string;
  phase: string;
  started_at: string;
  last_checkpoint_at: string | null;
  current_task: string | null;
  completed_tasks: string;
  failed_tasks: string;
  pending_tasks: string;
  worktrees: string;
  branches: string;
  prs: string;
  errors: string;
}

interface CheckpointRow {
  id: number;
  session_id: string;
  timestamp: string;
  task_id: string;
  status: string;
  pr_link: string | null;
  duration: number | null;
  error: string | null;
}
