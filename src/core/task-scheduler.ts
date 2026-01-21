import type { Task } from '../config/schemas.ts';

/**
 * TaskScheduler handles wave-based parallel task execution.
 * Tasks are grouped by parallelGroup and dependencies.
 */
export class TaskScheduler {
  /**
   * Build execution waves from a list of tasks.
   * Tasks in the same wave can be executed in parallel.
   * Waves are ordered by parallelGroup and respect dependencies.
   */
  buildExecutionWaves(tasks: Task[]): Task[][] {
    if (tasks.length === 0) return [];

    // First, validate dependencies exist
    const taskIds = new Set(tasks.map((t) => t.id));
    for (const task of tasks) {
      for (const dep of task.dependencies) {
        if (!taskIds.has(dep)) {
          throw new Error(`Task ${task.id} depends on unknown task ${dep}`);
        }
      }
    }

    // Check for circular dependencies
    this.detectCircularDependencies(tasks);

    // Group tasks by parallelGroup
    const groups = new Map<number, Task[]>();
    for (const task of tasks) {
      const group = groups.get(task.parallelGroup) || [];
      group.push(task);
      groups.set(task.parallelGroup, group);
    }

    // Sort groups by number
    const sortedGroupNums = [...groups.keys()].sort((a, b) => a - b);

    // Build waves respecting dependencies
    const allWaves: Task[][] = [];
    const completed = new Set<string>();

    for (const groupNum of sortedGroupNums) {
      const groupTasks = groups.get(groupNum) || [];

      // Within a group, build multiple waves respecting dependencies
      const groupWaves = this.buildWavesWithDependencies(groupTasks, completed);
      for (const wave of groupWaves) {
        if (wave.length > 0) {
          allWaves.push(wave);
          for (const task of wave) {
            completed.add(task.id);
          }
        }
      }
    }

    return allWaves;
  }

  /**
   * Build multiple waves of tasks that can be executed in parallel,
   * respecting dependencies within the group.
   * Returns an array of waves (each wave is an array of tasks that can run in parallel).
   */
  private buildWavesWithDependencies(tasks: Task[], completed: Set<string>): Task[][] {
    const waves: Task[][] = [];
    const remaining = [...tasks];
    const allCompleted = new Set(completed);

    // Keep building waves until all tasks are scheduled
    while (remaining.length > 0) {
      const currentWave: Task[] = [];

      // Find all tasks whose dependencies are satisfied by previously completed tasks
      // (not by tasks in the current wave - they must wait for the next wave)
      for (let i = remaining.length - 1; i >= 0; i--) {
        const task = remaining[i];
        const depsCompleted = task.dependencies.every((dep) => allCompleted.has(dep));

        if (depsCompleted) {
          currentWave.push(task);
          remaining.splice(i, 1);
        }
      }

      if (currentWave.length === 0 && remaining.length > 0) {
        throw new Error(
          `Could not schedule tasks: ${remaining.map((t) => t.id).join(', ')}. ` +
            'Check for circular dependencies or missing dependency tasks.'
        );
      }

      if (currentWave.length > 0) {
        waves.push(currentWave);
        // Mark all tasks in this wave as completed for the next wave
        for (const task of currentWave) {
          allCompleted.add(task.id);
        }
      }
    }

    return waves;
  }

  /**
   * Detect circular dependencies using DFS
   */
  private detectCircularDependencies(tasks: Task[]): void {
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (taskId: string, path: string[]): void => {
      if (recursionStack.has(taskId)) {
        const cycle = [...path, taskId].join(' -> ');
        throw new Error(`Circular dependency detected: ${cycle}`);
      }

      if (visited.has(taskId)) return;

      visited.add(taskId);
      recursionStack.add(taskId);

      const task = taskMap.get(taskId);
      if (task) {
        for (const dep of task.dependencies) {
          dfs(dep, [...path, taskId]);
        }
      }

      recursionStack.delete(taskId);
    };

    for (const task of tasks) {
      if (!visited.has(task.id)) {
        dfs(task.id, []);
      }
    }
  }

  /**
   * Get tasks that can be executed immediately (no pending dependencies)
   */
  getReadyTasks(tasks: Task[], completed: Set<string>): Task[] {
    return tasks.filter(
      (task) =>
        task.status === 'pending' && task.dependencies.every((dep) => completed.has(dep))
    );
  }

  /**
   * Calculate total estimated duration for tasks
   */
  calculateEstimatedDuration(tasks: Task[]): { total: string; breakdown: WaveEstimate[] } {
    const waves = this.buildExecutionWaves(tasks);
    const breakdown: WaveEstimate[] = [];
    let totalHours = 0;

    for (let i = 0; i < waves.length; i++) {
      const wave = waves[i];
      let waveHours = 0;

      for (const task of wave) {
        const hours = this.parseEstimate(task.estimate);
        waveHours = Math.max(waveHours, hours); // Parallel execution
      }

      breakdown.push({
        wave: i + 1,
        tasks: wave.map((t) => t.id),
        estimatedHours: waveHours,
        parallel: wave.length > 1,
      });

      totalHours += waveHours;
    }

    return {
      total: this.formatHours(totalHours),
      breakdown,
    };
  }

  /**
   * Parse estimate string like "8h" or "2d" to hours
   */
  private parseEstimate(estimate?: string): number {
    if (!estimate) return 0;

    const match = estimate.match(/^(\d+(?:\.\d+)?)\s*(h|d|hr|hrs|hour|hours|day|days)?$/i);
    if (!match) return 0;

    const value = Number.parseFloat(match[1]);
    const unit = (match[2] || 'h').toLowerCase();

    if (unit.startsWith('d')) {
      return value * 8; // Assume 8-hour workday
    }
    return value;
  }

  /**
   * Format hours to human-readable string
   */
  private formatHours(hours: number): string {
    if (hours >= 8) {
      const days = Math.floor(hours / 8);
      const remainingHours = hours % 8;
      if (remainingHours > 0) {
        return `${days}d ${remainingHours}h`;
      }
      return `${days}d`;
    }
    return `${hours}h`;
  }

  /**
   * Generate execution plan summary
   */
  generateExecutionPlan(tasks: Task[]): ExecutionPlan {
    const waves = this.buildExecutionWaves(tasks);
    const estimate = this.calculateEstimatedDuration(tasks);

    const plan: ExecutionPlan = {
      totalTasks: tasks.length,
      totalWaves: waves.length,
      estimatedDuration: estimate.total,
      waves: waves.map((wave, i) => ({
        number: i + 1,
        tasks: wave.map((t) => ({
          id: t.id,
          name: t.name,
          estimate: t.estimate,
          dependencies: t.dependencies,
          priority: t.priority,
        })),
        parallel: wave.length > 1,
        estimatedHours: estimate.breakdown[i].estimatedHours,
      })),
    };

    return plan;
  }

  /**
   * Topological sort of tasks for sequential execution
   */
  topologicalSort(tasks: Task[]): Task[] {
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const inDegree = new Map<string, number>();
    const result: Task[] = [];

    // Initialize in-degree
    for (const task of tasks) {
      if (!inDegree.has(task.id)) {
        inDegree.set(task.id, 0);
      }
      for (const _dep of task.dependencies) {
        inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
      }
    }

    // Queue tasks with no dependencies
    const queue: string[] = [];
    for (const task of tasks) {
      if ((inDegree.get(task.id) || 0) === 0) {
        queue.push(task.id);
      }
    }

    // Process queue
    while (queue.length > 0) {
      // Sort by parallelGroup, then by priority
      queue.sort((a, b) => {
        const taskA = taskMap.get(a)!;
        const taskB = taskMap.get(b)!;

        if (taskA.parallelGroup !== taskB.parallelGroup) {
          return taskA.parallelGroup - taskB.parallelGroup;
        }

        const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
        const prioA = priorityOrder[taskA.priority || 'P3'];
        const prioB = priorityOrder[taskB.priority || 'P3'];
        return prioA - prioB;
      });

      const taskId = queue.shift()!;
      const task = taskMap.get(taskId)!;
      result.push(task);

      // Decrease in-degree of dependent tasks
      for (const otherTask of tasks) {
        if (otherTask.dependencies.includes(taskId)) {
          const newDegree = (inDegree.get(otherTask.id) || 1) - 1;
          inDegree.set(otherTask.id, newDegree);
          if (newDegree === 0) {
            queue.push(otherTask.id);
          }
        }
      }
    }

    if (result.length !== tasks.length) {
      throw new Error('Could not complete topological sort - circular dependency detected');
    }

    return result;
  }
}

// =============================================================================
// Types
// =============================================================================

export interface WaveEstimate {
  wave: number;
  tasks: string[];
  estimatedHours: number;
  parallel: boolean;
}

export interface ExecutionPlan {
  totalTasks: number;
  totalWaves: number;
  estimatedDuration: string;
  waves: {
    number: number;
    tasks: {
      id: string;
      name: string;
      estimate?: string;
      dependencies: string[];
      priority?: string;
    }[];
    parallel: boolean;
    estimatedHours: number;
  }[];
}
