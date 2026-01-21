import { z } from 'zod';

// =============================================================================
// Task Schemas
// =============================================================================

export const TaskStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'failed', 'blocked']);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

// =============================================================================
// Phase Schemas
// =============================================================================

export const PhaseStatusSchema = z.enum(['planning', 'synced', 'in_progress', 'completed', 'blocked']);
export type PhaseStatus = z.infer<typeof PhaseStatusSchema>;

// Task entry in meta.json
export const PhaseTaskEntrySchema = z.object({
  id: z.string().regex(/^T\d{2}-\d{3}$/, 'Task ID must be in format T00-001'),
  name: z.string().min(1),
  title: z.string().min(1),
  estimate: z.number().min(0),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']),
  status: z.enum(['not_started', 'in_progress', 'completed', 'failed', 'blocked']),
  dependencies: z.array(z.string()).default([]),
  subtasks: z.object({
    total: z.number().int().min(0),
    completed: z.number().int().min(0),
  }).optional(),
});
export type PhaseTaskEntry = z.infer<typeof PhaseTaskEntrySchema>;

// Phase statistics
export const PhaseStatsSchema = z.object({
  totalTasks: z.number().int().min(0),
  completedTasks: z.number().int().min(0),
  inProgressTasks: z.number().int().min(0).default(0),
  totalSubtasks: z.number().int().min(0).default(0),
  completedSubtasks: z.number().int().min(0).default(0),
  totalEstimate: z.number().min(0),
  completedEstimate: z.number().min(0).default(0),
  progressPercent: z.number().min(0).max(100).default(0),
});
export type PhaseStats = z.infer<typeof PhaseStatsSchema>;

// Coverage tracking
export const PhaseCoverageSchema = z.object({
  frToTask: z.number().nullable().default(null),
  taskToTest: z.number().nullable().default(null),
  overall: z.number().nullable().default(null),
  lastAudited: z.string().nullable().default(null),
});
export type PhaseCoverage = z.infer<typeof PhaseCoverageSchema>;

// Artifact file references
export const PhaseArtifactsSchema = z.object({
  requirements: z.string().optional(),
  taskBreakdown: z.string().optional(),
  explanation: z.string().optional(),
  testPlan: z.string().optional(),
});
export type PhaseArtifacts = z.infer<typeof PhaseArtifactsSchema>;

// Generation timestamps
export const PhaseGeneratedSchema = z.object({
  requirements: z.string().optional(),
  taskBreakdown: z.string().optional(),
  explanation: z.string().optional(),
  testPlan: z.string().optional(),
});
export type PhaseGenerated = z.infer<typeof PhaseGeneratedSchema>;

// Full phase metadata (meta.json)
export const PhaseMetaSchema = z.object({
  phase: z.string(), // e.g., "P00-foundation-setup"
  phaseName: z.string().min(1), // e.g., "Foundation & Setup"
  phaseNumber: z.number().int().min(0),
  description: z.string().optional(),
  artifacts: PhaseArtifactsSchema.optional(),
  tasks: z.array(PhaseTaskEntrySchema).default([]),
  stats: PhaseStatsSchema.optional(),
  coverage: PhaseCoverageSchema.optional(),
  generated: PhaseGeneratedSchema.optional(),
  lastSynced: z.string().optional(),
  status: PhaseStatusSchema.default('planning'),
  version: z.string().default('1.0'),
});
export type PhaseMeta = z.infer<typeof PhaseMetaSchema>;

export const TaskSchema = z.object({
  id: z.string().regex(/^T\d{2}-\d{3}$/, 'Task ID must be in format T00-001'),
  name: z.string().min(1, 'Task name is required'),
  description: z.string().optional(),
  status: TaskStatusSchema.default('pending'),
  parallelGroup: z.number().int().min(1).default(1),
  dependencies: z.array(z.string()).default([]),
  files: z.array(z.string()).default([]),
  acceptanceCriteria: z.array(z.string()).default([]),
  estimate: z.string().optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  // New fields aligned with task-structure.md
  phase: z.string().optional(), // Phase ID (P00, P01, etc.)
  requirements: z.array(z.string()).default([]), // FR-XXX-NNN references
  businessRules: z.array(z.string()).default([]), // Business rules to follow
  testingRequirements: z.array(z.string()).default([]), // Tests to write
  skills: z.array(z.string()).default([]), // Skills to reference (clean-architecture, etc.)
});
export type Task = z.infer<typeof TaskSchema>;

// =============================================================================
// Session Schemas
// =============================================================================

export const CheckpointSchema = z.object({
  timestamp: z.string().datetime(),
  taskId: z.string(),
  status: TaskStatusSchema,
  prLink: z.string().url().optional(),
  duration: z.number().optional(),
  error: z.string().optional(),
});
export type Checkpoint = z.infer<typeof CheckpointSchema>;

export const TaskErrorSchema = z.object({
  iterations: z.number().int().min(1),
  lastError: z.string(),
  retried: z.boolean(),
  resolved: z.boolean(),
});
export type TaskError = z.infer<typeof TaskErrorSchema>;

export const SessionSchema = z.object({
  id: z.string().uuid(),
  project: z.string().min(1),
  phase: z.string().regex(/^p\d{2}$/i, 'Phase must be in format p00'),
  startedAt: z.string().datetime(),
  lastCheckpointAt: z.string().datetime().optional(),
  currentTask: z.string().nullable().default(null),
  completedTasks: z.array(z.string()).default([]),
  failedTasks: z.array(z.string()).default([]),
  pendingTasks: z.array(z.string()).default([]),
  worktrees: z.record(z.string(), z.string()).default({}),
  branches: z.record(z.string(), z.string()).default({}),
  prs: z.record(z.string(), z.string()).default({}),
  checkpoints: z.array(CheckpointSchema).default([]),
  errors: z.record(z.string(), TaskErrorSchema).default({}),
});
export type Session = z.infer<typeof SessionSchema>;

// =============================================================================
// Engine Schemas
// =============================================================================

export const EngineTypeSchema = z.enum(['claude-code', 'opencode', 'cursor']);
export type EngineType = z.infer<typeof EngineTypeSchema>;

export const ExecuteOptionsSchema = z.object({
  model: z.string().optional(),
  timeout: z.number().int().positive().default(600000), // 10 minutes
  maxRetries: z.number().int().min(0).default(2),
  dangerouslySkipPermissions: z.boolean().default(false),
  workingDirectory: z.string().optional(),
});
export type ExecuteOptions = z.infer<typeof ExecuteOptionsSchema>;

export const ExecutionResultSchema = z.object({
  success: z.boolean(),
  output: z.string(),
  exitCode: z.number().int(),
  duration: z.number(),
  completed: z.boolean(),
  error: z.string().optional(),
});
export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;

// =============================================================================
// Project Configuration Schemas
// =============================================================================

export const TaskSourceConfigSchema = z.object({
  type: z.enum(['file-based', 'yaml', 'github-issues']),
  pattern: z.string(),
  parser: z.string().optional(),
});
export type TaskSourceConfig = z.infer<typeof TaskSourceConfigSchema>;

export const AgentConfigSchema = z.object({
  type: EngineTypeSchema,
  model: z.string().optional(),
  permissions: z.string().optional(),
});
export type AgentConfig = z.infer<typeof AgentConfigSchema>;

export const ContextProviderSchema = z.object({
  name: z.string(),
  file: z.string(),
  inject: z.string().optional(),
});
export type ContextProvider = z.infer<typeof ContextProviderSchema>;

export const CommandsConfigSchema = z.object({
  test: z.string().optional(),
  lint: z.string().optional(),
  build: z.string().optional(),
});
export type CommandsConfig = z.infer<typeof CommandsConfigSchema>;

export const ParallelStrategySchema = z.object({
  maxConcurrent: z.number().int().min(1).default(3),
  taskGroups: z.boolean().default(true),
  worktreeDir: z.string().default('/tmp/atzentis-cli-worktrees'),
});
export type ParallelStrategy = z.infer<typeof ParallelStrategySchema>;

export const HooksConfigSchema = z.object({
  beforePhase: z.string().optional(),
  beforeTask: z.string().optional(),
  afterTask: z.string().optional(),
  onSuccess: z.string().optional(),
  onError: z.string().optional(),
});
export type HooksConfig = z.infer<typeof HooksConfigSchema>;

export const ProjectConfigSchema = z.object({
  project: z.string().min(1),
  name: z.string().min(1),
  root: z.string().optional(),

  // Auto-detected settings
  language: z.string().optional(),
  packageManager: z.enum(['npm', 'pnpm', 'yarn', 'bun']).optional(),
  runtime: z.string().optional(),

  // Task configuration
  taskSource: TaskSourceConfigSchema.optional(),

  // Agent configuration
  agent: AgentConfigSchema.optional(),

  // Commands
  commands: CommandsConfigSchema.optional(),

  // Rules injected into prompts
  rules: z.array(z.string()).default([]),

  // Context providers
  contextProviders: z.array(ContextProviderSchema).default([]),

  // Prompt template path
  promptTemplate: z.string().optional(),

  // Completion detection pattern
  completionPattern: z.string().default('<promise>COMPLETE</promise>'),

  // Lifecycle hooks
  hooks: HooksConfigSchema.optional(),

  // Parallel execution
  parallelStrategy: ParallelStrategySchema.optional(),

  // Boundary protection
  boundaries: z
    .object({
      neverTouch: z.array(z.string()).default([]),
    })
    .optional(),
});
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

// =============================================================================
// CLI Options Schemas
// =============================================================================

export const RunOptionsSchema = z.object({
  phase: z.string().optional(),
  tasks: z.array(z.string()).optional(),
  parallel: z.boolean().default(false),
  maxParallel: z.number().int().min(1).default(3),
  dryRun: z.boolean().default(false),
  fast: z.boolean().default(false), // Skip tests/lint
  project: z.string().optional(),
});
export type RunOptions = z.infer<typeof RunOptionsSchema>;

export const ResumeOptionsSchema = z.object({
  project: z.string().optional(),
  sessionId: z.string().uuid().optional(),
});
export type ResumeOptions = z.infer<typeof ResumeOptionsSchema>;

export const StatusOptionsSchema = z.object({
  project: z.string().optional(),
  json: z.boolean().default(false),
});
export type StatusOptions = z.infer<typeof StatusOptionsSchema>;

export const SetupOptionsSchema = z.object({
  project: z.string().optional(),
  force: z.boolean().default(false),
});
export type SetupOptions = z.infer<typeof SetupOptionsSchema>;
