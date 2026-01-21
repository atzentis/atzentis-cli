import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { getSpecsDir } from '../config/auto-detector.ts';
import { PhaseMetaSchema, type PhaseMeta } from '../config/schemas.ts';

/**
 * Information about a phase including metadata and file availability
 */
export interface PhaseInfo {
  id: string; // P00, P01, etc.
  name: string; // Phase name from folder (e.g., "foundation-setup")
  phaseName: string; // Human-readable name (e.g., "Foundation & Setup")
  path: string; // Full path to phase folder
  meta: PhaseMeta | null; // Parsed meta.json if exists
  hasRequirements: boolean; // requirements.md exists
  hasTaskBreakdown: boolean; // task-breakdown.md exists
  hasExplanation: boolean; // explanation.md exists
  hasTestPlan: boolean; // test-plan.md exists
  taskCount: number; // Number of task folders (from meta or filesystem)
  taskIds: string[]; // List of task IDs found
  stats: PhaseMeta['stats'] | null; // Phase statistics from meta.json
}

/**
 * Load phase info for a specific phase ID
 */
export async function loadPhaseInfo(cwd: string, phaseId: string): Promise<PhaseInfo | null> {
  const specsDir = getSpecsDir(cwd);
  if (!existsSync(specsDir)) return null;

  const phasePrefix = phaseId.toUpperCase();
  const entries = readdirSync(specsDir);

  // Find phase folder matching P{XX}-* pattern
  const phaseFolder = entries.find((entry) => {
    const match = entry.match(/^(P\d{2})-/i);
    return match && match[1].toUpperCase() === phasePrefix;
  });

  if (!phaseFolder) return null;

  const phasePath = join(specsDir, phaseFolder);
  if (!statSync(phasePath).isDirectory()) return null;

  return parsePhaseFolder(phasePath, phaseFolder);
}

/**
 * List all phases with their info
 */
export async function listPhasesWithInfo(cwd: string): Promise<PhaseInfo[]> {
  const specsDir = getSpecsDir(cwd);
  if (!existsSync(specsDir)) return [];

  const entries = readdirSync(specsDir);
  const phases: PhaseInfo[] = [];

  for (const entry of entries) {
    const match = entry.match(/^(P\d{2})-/i);
    if (match) {
      const phasePath = join(specsDir, entry);
      if (statSync(phasePath).isDirectory()) {
        const info = await parsePhaseFolder(phasePath, entry);
        if (info) {
          phases.push(info);
        }
      }
    }
  }

  // Sort by phase ID
  return phases.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Parse a phase folder to extract PhaseInfo
 */
async function parsePhaseFolder(phasePath: string, folderName: string): Promise<PhaseInfo | null> {
  const match = folderName.match(/^(P\d{2})-(.+)$/i);
  if (!match) return null;

  const phaseId = match[1].toUpperCase();
  const folderSuffix = match[2];

  // Check for phase files
  const hasRequirements = existsSync(join(phasePath, 'requirements.md'));
  const hasTaskBreakdown = existsSync(join(phasePath, 'task-breakdown.md'));
  const hasExplanation = existsSync(join(phasePath, 'explanation.md'));
  const hasTestPlan = existsSync(join(phasePath, 'test-plan.md'));

  // Load meta.json if exists
  let meta: PhaseMeta | null = null;
  const metaPath = join(phasePath, 'meta.json');
  if (existsSync(metaPath)) {
    try {
      const content = readFileSync(metaPath, 'utf-8');
      const parsed = JSON.parse(content);
      meta = PhaseMetaSchema.parse(parsed);
    } catch {
      // Ignore parse errors
    }
  }

  // Find task folders from filesystem
  const entries = readdirSync(phasePath);
  const taskIds: string[] = [];

  for (const entry of entries) {
    const taskMatch = entry.match(/^(T\d{2}-\d{3})/);
    if (taskMatch) {
      const taskPath = join(phasePath, entry);
      if (statSync(taskPath).isDirectory()) {
        taskIds.push(taskMatch[1]);
      }
    }
  }

  // Sort task IDs
  taskIds.sort();

  // Use meta.json task count if available, otherwise use filesystem count
  const taskCount = meta?.stats?.totalTasks ?? taskIds.length;

  // Get human-readable name from meta.json or derive from folder name
  const phaseName = meta?.phaseName ?? folderSuffix.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    id: phaseId,
    name: folderSuffix,
    phaseName,
    path: phasePath,
    meta,
    hasRequirements,
    hasTaskBreakdown,
    hasExplanation,
    hasTestPlan,
    taskCount,
    taskIds,
    stats: meta?.stats ?? null,
  };
}

/**
 * Load requirements.md content for a phase
 */
export async function loadPhaseRequirements(cwd: string, phaseId: string): Promise<string | null> {
  const phaseInfo = await loadPhaseInfo(cwd, phaseId);
  if (!phaseInfo || !phaseInfo.hasRequirements) return null;

  const requirementsPath = join(phaseInfo.path, 'requirements.md');
  try {
    return readFileSync(requirementsPath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Load task-breakdown.md content for a phase
 */
export async function loadPhaseTaskBreakdown(cwd: string, phaseId: string): Promise<string | null> {
  const phaseInfo = await loadPhaseInfo(cwd, phaseId);
  if (!phaseInfo || !phaseInfo.hasTaskBreakdown) return null;

  const taskBreakdownPath = join(phaseInfo.path, 'task-breakdown.md');
  try {
    return readFileSync(taskBreakdownPath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Load explanation.md content for a phase
 */
export async function loadPhaseExplanation(cwd: string, phaseId: string): Promise<string | null> {
  const phaseInfo = await loadPhaseInfo(cwd, phaseId);
  if (!phaseInfo || !phaseInfo.hasExplanation) return null;

  const explanationPath = join(phaseInfo.path, 'explanation.md');
  try {
    return readFileSync(explanationPath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Load test-plan.md content for a phase
 */
export async function loadPhaseTestPlan(cwd: string, phaseId: string): Promise<string | null> {
  const phaseInfo = await loadPhaseInfo(cwd, phaseId);
  if (!phaseInfo || !phaseInfo.hasTestPlan) return null;

  const testPlanPath = join(phaseInfo.path, 'test-plan.md');
  try {
    return readFileSync(testPlanPath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Get phase context - combines requirements and explanation for prompt injection
 */
export async function getPhaseContext(
  cwd: string,
  phaseId: string
): Promise<{ requirements: string | null; explanation: string | null }> {
  const [requirements, explanation] = await Promise.all([
    loadPhaseRequirements(cwd, phaseId),
    loadPhaseExplanation(cwd, phaseId),
  ]);

  return { requirements, explanation };
}
