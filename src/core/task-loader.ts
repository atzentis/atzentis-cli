import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import { type Task, TaskSchema, PhaseMetaSchema, type PhaseMeta, type PhaseTaskEntry } from '../config/schemas.ts';
import { getSpecsDir } from '../config/auto-detector.ts';

/**
 * Options for loading tasks
 */
export interface LoadTasksOptions {
  phase?: string;
  taskIds?: string[];
}

/**
 * Load tasks for execution
 */
export async function loadTasks(
  cwd: string,
  _project: string,
  options: LoadTasksOptions
): Promise<Task[]> {
  const tasks: Task[] = [];

  // If specific tasks requested, load only those
  if (options.taskIds && options.taskIds.length > 0) {
    for (const taskId of options.taskIds) {
      const task = await loadTask(cwd, taskId);
      if (task) {
        tasks.push(task);
      }
    }
    return tasks;
  }

  // Load all tasks for the phase
  const phase = options.phase || 'p00';
  const phasePrefix = phase.toUpperCase(); // e.g., "P00"
  const specsBaseDir = getSpecsDir(cwd);

  if (!existsSync(specsBaseDir)) {
    return tasks;
  }

  // Find phase folder matching P{XX}-* pattern (e.g., P00-foundation-setup)
  const specEntries = readdirSync(specsBaseDir);
  const phaseFolder = specEntries.find((entry) => {
    const match = entry.match(/^(P\d{2})-/i);
    return match && match[1].toUpperCase() === phasePrefix;
  });

  if (!phaseFolder) {
    return tasks;
  }

  const specsDir = join(specsBaseDir, phaseFolder);
  if (!statSync(specsDir).isDirectory()) {
    return tasks;
  }

  // Load meta.json for phase-level task metadata (dependencies, estimates, priorities)
  const metaPath = join(specsDir, 'meta.json');
  let phaseMeta: PhaseMeta | null = null;
  if (existsSync(metaPath)) {
    try {
      const content = readFileSync(metaPath, 'utf-8');
      phaseMeta = PhaseMetaSchema.parse(JSON.parse(content));
    } catch {
      // Ignore parse errors - will load tasks without meta enhancement
    }
  }

  // Build task metadata lookup from meta.json
  const metaTaskMap = new Map<string, PhaseTaskEntry>();
  if (phaseMeta?.tasks) {
    for (const taskEntry of phaseMeta.tasks) {
      metaTaskMap.set(taskEntry.id, taskEntry);
    }
  }

  // Find task directories (T00-001-*, T00-002-*, etc.)
  const entries = readdirSync(specsDir);

  for (const entry of entries) {
    const taskMatch = entry.match(/^(T\d{2}-\d{3})/);
    if (taskMatch) {
      const taskDir = join(specsDir, entry);
      if (statSync(taskDir).isDirectory()) {
        const task = await loadTaskFromDir(taskDir, taskMatch[1]);
        if (task) {
          // Merge meta.json data (dependencies, estimates, priorities)
          const metaTask = metaTaskMap.get(task.id);
          if (metaTask) {
            // Use meta.json dependencies (authoritative source)
            task.dependencies = metaTask.dependencies;
            // Convert numeric estimate to string format
            task.estimate = `${metaTask.estimate}h`;
            // Use meta.json priority
            task.priority = metaTask.priority;
            // Map meta status to task status
            if (metaTask.status !== 'not_started') {
              const statusMap: Record<string, Task['status']> = {
                in_progress: 'in_progress',
                completed: 'completed',
                failed: 'failed',
                blocked: 'blocked',
              };
              task.status = statusMap[metaTask.status] || task.status;
            }
          }
          tasks.push(task);
        }
      }
    }
  }

  // Sort by ID
  tasks.sort((a, b) => a.id.localeCompare(b.id));

  return tasks;
}

/**
 * Load a specific task by ID
 */
export async function loadTask(
  cwd: string,
  taskId: string
): Promise<Task | null> {
  // Parse phase from task ID (T00-001 -> P00)
  const phaseMatch = taskId.match(/^T(\d{2})/);
  if (!phaseMatch) return null;

  const phasePrefix = `P${phaseMatch[1]}`;
  const specsBaseDir = getSpecsDir(cwd);

  if (!existsSync(specsBaseDir)) return null;

  // Find phase folder matching P{XX}-* pattern
  const specEntries = readdirSync(specsBaseDir);
  const phaseFolder = specEntries.find((entry) => {
    const match = entry.match(/^(P\d{2})-/i);
    return match && match[1].toUpperCase() === phasePrefix;
  });

  if (!phaseFolder) return null;

  const specsDir = join(specsBaseDir, phaseFolder);
  if (!statSync(specsDir).isDirectory()) return null;

  // Find the task directory
  const entries = readdirSync(specsDir);

  for (const entry of entries) {
    if (entry.startsWith(taskId)) {
      const taskDir = join(specsDir, entry);
      if (statSync(taskDir).isDirectory()) {
        return loadTaskFromDir(taskDir, taskId);
      }
    }
  }

  return null;
}

/**
 * Load task from a directory containing tasks.md or task.yaml
 */
export async function loadTaskFromDir(
  taskDir: string,
  taskId: string
): Promise<Task | null> {
  // Try YAML first
  const yamlPath = join(taskDir, 'task.yaml');
  if (existsSync(yamlPath)) {
    try {
      const content = readFileSync(yamlPath, 'utf-8');
      const data = YAML.parse(content);
      return TaskSchema.parse({ ...data, id: taskId });
    } catch {
      // Fall through to markdown
    }
  }

  // Try tasks.md with YAML frontmatter
  const mdPath = join(taskDir, 'tasks.md');
  if (existsSync(mdPath)) {
    try {
      const content = readFileSync(mdPath, 'utf-8');
      const task = parseTaskMarkdown(content, taskId);
      if (task) {
        return TaskSchema.parse(task);
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Create minimal task from directory name
  const dirName = taskDir.split('/').pop() || '';
  const nameMatch = dirName.match(/^T\d{2}-\d{3}-(.+)$/);
  const name = nameMatch ? nameMatch[1].replace(/-/g, ' ') : `Task ${taskId}`;

  return {
    id: taskId,
    name,
    status: 'pending',
    parallelGroup: 1,
    dependencies: [],
    files: [],
    acceptanceCriteria: [],
    requirements: [],
    businessRules: [],
    testingRequirements: [],
    skills: [],
  };
}

/**
 * Parse task from markdown with YAML frontmatter
 */
export function parseTaskMarkdown(
  content: string,
  taskId: string
): Partial<Task> | null {
  // Check for YAML frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (frontmatterMatch) {
    try {
      const frontmatter = YAML.parse(frontmatterMatch[1]);
      return {
        id: taskId,
        name: frontmatter.name || frontmatter.title,
        description: frontmatter.description,
        status: frontmatter.status || 'pending',
        parallelGroup: frontmatter.parallel_group || frontmatter.parallelGroup || 1,
        dependencies: frontmatter.dependencies || frontmatter.deps || [],
        files: frontmatter.files || [],
        acceptanceCriteria:
          frontmatter.acceptance_criteria || frontmatter.acceptanceCriteria || [],
        estimate: frontmatter.estimate,
        priority: frontmatter.priority,
        // New fields
        phase: frontmatter.phase,
        requirements: frontmatter.requirements || [],
        businessRules: frontmatter.business_rules || frontmatter.businessRules || [],
        testingRequirements:
          frontmatter.testing_requirements || frontmatter.testingRequirements || [],
        skills: frontmatter.skills || [],
      };
    } catch {
      // Ignore parse errors
    }
  }

  // Try to extract from markdown structure
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const name = titleMatch ? titleMatch[1] : `Task ${taskId}`;

  return {
    id: taskId,
    name,
    status: 'pending',
    parallelGroup: 1,
    dependencies: [],
    files: [],
    acceptanceCriteria: [],
  };
}

/**
 * Find phase folder for a given phase ID
 */
export function findPhaseFolder(specsDir: string, phase: string): string | null {
  if (!existsSync(specsDir)) return null;

  const phasePrefix = phase.toUpperCase();
  const entries = readdirSync(specsDir);

  const phaseFolder = entries.find((entry) => {
    const match = entry.match(/^(P\d{2})-/i);
    return match && match[1].toUpperCase() === phasePrefix;
  });

  return phaseFolder ? join(specsDir, phaseFolder) : null;
}

/**
 * List all phases in a project
 */
export function listPhases(cwd: string): string[] {
  const specsDir = getSpecsDir(cwd);

  if (!existsSync(specsDir)) return [];

  const entries = readdirSync(specsDir);
  const phases: string[] = [];

  for (const entry of entries) {
    const match = entry.match(/^(P\d{2})-/i);
    if (match && statSync(join(specsDir, entry)).isDirectory()) {
      phases.push(match[1].toUpperCase());
    }
  }

  return phases.sort();
}
