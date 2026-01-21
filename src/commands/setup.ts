import { Command } from 'commander';
import pc from 'picocolors';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import {
  detectProjectSettings,
  detectProjectName,
  getAtzentisDir,
  getCliDir,
  getConfigPath,
  getProjectDir,
  getSpecsDir,
  getDocsDir,
  ATZENTIS_CLI_DIR,
  PROJECT_DIR,
  type DetectedSettings,
} from '../config/auto-detector.ts';

/**
 * Create the 'setup' command
 */
export function createSetupCommand(): Command {
  const cmd = new Command('setup')
    .description('Initialize project for atzentis-cli')
    .option('--project <name>', 'Project name (auto-detected if not specified)')
    .option('--force', 'Overwrite existing configuration')
    .action(async (options) => {
      await setupCommand(options);
    });

  return cmd;
}

/**
 * Main setup command implementation
 */
async function setupCommand(options: { project?: string; force?: boolean }): Promise<void> {
  const cwd = process.cwd();

  console.log(pc.cyan('\n⚙️  Atzentis CLI Setup\n'));

  // Detect or use provided project name
  const project = options.project || detectProjectName(cwd);
  if (!project) {
    console.error(pc.red('Error: Could not detect project name. Use --project option.'));
    process.exit(1);
  }

  console.log(pc.dim(`Project: ${project}`));
  console.log(pc.dim(`Directory: ${cwd}\n`));

  // Check for existing config
  const configDir = getCliDir(cwd);
  const configPath = getConfigPath(cwd);

  if (existsSync(configPath) && !options.force) {
    console.log(pc.yellow(`Configuration already exists at ${configPath}`));
    console.log(pc.dim('Use --force to overwrite.\n'));
    return;
  }

  // Auto-detect project settings
  const settings = await detectProjectSettings(cwd);
  console.log(pc.bold('Detected Settings:'));
  console.log(`  Language: ${settings.language || 'unknown'}`);
  console.log(`  Package Manager: ${settings.packageManager || 'unknown'}`);
  console.log(`  Runtime: ${settings.runtime || 'unknown'}`);
  if (settings.framework) {
    console.log(`  Framework: ${settings.framework}`);
  }
  if (settings.monorepo) {
    console.log(`  Monorepo: yes`);
  }
  console.log();

  // Create directory structure
  // CLI directories (always .atzentis/)
  const cliDirectories = [
    getAtzentisDir(cwd),
    getCliDir(cwd),
  ];

  // Project directories (always .project/)
  const projectDirectories = [
    getProjectDir(cwd),
    getSpecsDir(cwd),
    getDocsDir(cwd),
  ];

  const directories = [...cliDirectories, ...projectDirectories];

  for (const dir of directories) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      console.log(pc.green(`Created: ${dir}`));
    }
  }

  // Generate config.yaml
  const config = generateConfig(project, settings);
  writeFileSync(configPath, YAML.stringify(config));
  console.log(pc.green(`Created: ${configPath}`));

  // Generate default prompt template
  const templateDir = join(configDir, 'templates');
  if (!existsSync(templateDir)) {
    mkdirSync(templateDir, { recursive: true });
  }

  const templatePath = join(templateDir, 'default.hbs');
  if (!existsSync(templatePath) || options.force) {
    writeFileSync(templatePath, DEFAULT_PROMPT_TEMPLATE);
    console.log(pc.green(`Created: ${templatePath}`));
  }

  // Generate example phase structure
  const examplePhaseDir = join(getSpecsDir(cwd), 'P00-example');
  if (!existsSync(examplePhaseDir)) {
    mkdirSync(examplePhaseDir, { recursive: true });

    // Create example requirements.md
    const requirementsPath = join(examplePhaseDir, 'requirements.md');
    writeFileSync(requirementsPath, EXAMPLE_REQUIREMENTS);
    console.log(pc.green(`Created: ${requirementsPath}`));

    // Create example task directory
    const taskDir = join(examplePhaseDir, 'T00-001-example-task');
    mkdirSync(taskDir, { recursive: true });

    const taskPath = join(taskDir, 'tasks.md');
    writeFileSync(taskPath, EXAMPLE_TASK);
    console.log(pc.green(`Created: ${taskPath}`));
  }

  console.log(pc.green('\n✅ Setup complete!\n'));

  console.log(pc.bold('Next steps:'));
  console.log(`  1. Edit ${pc.cyan(configPath)} to customize settings`);
  console.log(`  2. Create task specs in ${pc.cyan(`${PROJECT_DIR}/specs/`)}`);
  console.log(`  3. Run ${pc.cyan('atzentis run --phase p00 --dry-run')} to preview`);
  console.log(`  4. Run ${pc.cyan('atzentis run --phase p00')} to execute\n`);

  console.log(pc.dim('Directory structure:'));
  console.log(pc.dim(`  ${ATZENTIS_CLI_DIR}/cli/     - CLI config, templates, skills`));
  console.log(pc.dim(`  ${PROJECT_DIR}/specs/  - Task specifications`));
  console.log(pc.dim(`  ${PROJECT_DIR}/docs/   - Project documentation\n`));
}

/**
 * Generate project configuration
 */
function generateConfig(project: string, settings: DetectedSettings): ProjectConfigYaml {
  return {
    project,
    name: project.charAt(0).toUpperCase() + project.slice(1),
    language: settings.language,
    packageManager: settings.packageManager,
    runtime: settings.runtime,
    taskSource: {
      type: 'file-based',
      pattern: '**/{tasks,task}.{md,yaml}',
    },
    agent: {
      type: 'claude-code',
    },
    commands: {
      test: settings.testCommand,
      lint: settings.lintCommand,
      build: settings.buildCommand,
    },
    rules: [
      'Follow existing code patterns and conventions',
      'Write clean, maintainable code',
      'Add appropriate error handling',
      'Include necessary tests',
    ],
    contextProviders: [],
    completionPattern: '<promise>COMPLETE</promise>',
    parallelStrategy: {
      maxConcurrent: 3,
      taskGroups: true,
      worktreeDir: '/tmp/atzentis-cli-worktrees',
    },
  };
}

// =============================================================================
// Types
// =============================================================================

interface ProjectConfigYaml {
  project: string;
  name: string;
  language?: string;
  packageManager?: string;
  runtime?: string;
  taskSource: {
    type: string;
    pattern: string;
  };
  agent: {
    type: string;
  };
  commands: {
    test?: string;
    lint?: string;
    build?: string;
  };
  rules: string[];
  contextProviders: unknown[];
  completionPattern: string;
  parallelStrategy: {
    maxConcurrent: number;
    taskGroups: boolean;
    worktreeDir: string;
  };
}

// =============================================================================
// Templates
// =============================================================================

const DEFAULT_PROMPT_TEMPLATE = `# Task: {{task.id}} - {{task.name}}

{{#if task.phase}}
**Phase:** {{task.phase}}
{{/if}}
{{#if task.priority}}
**Priority:** {{task.priority}}
{{/if}}
{{#if task.estimate}}
**Estimate:** {{task.estimate}}
{{/if}}
{{#if task.requirements}}
**Requirements:** {{join task.requirements ", "}}
{{/if}}
{{#if task.dependencies}}
**Dependencies:** {{join task.dependencies ", "}}
{{/if}}

---

## Overview

{{#if task.description}}
{{task.description}}
{{else}}
Implement the task as specified in the acceptance criteria below.
{{/if}}

---

## Files to Create/Modify

{{#if task.files}}
{{#each task.files}}
- \`{{this}}\`
{{/each}}
{{else}}
_Determine appropriate files based on task requirements._
{{/if}}

---

## Acceptance Criteria

{{#if task.acceptanceCriteria}}
{{#each task.acceptanceCriteria}}
- [ ] {{this}}
{{/each}}
{{else}}
_No specific acceptance criteria provided._
{{/if}}

---

{{#if task.businessRules}}
## Business Rules

{{#each task.businessRules}}
- {{this}}
{{/each}}

---

{{/if}}
{{#if task.testingRequirements}}
## Testing Requirements

Write these tests during implementation:

{{#each task.testingRequirements}}
- [ ] {{this}}
{{/each}}

---

{{/if}}
{{#if task.skills}}
## Skills Reference

Read these skill files before implementing:

{{#each task.skills}}
- \`.claude/skills/*/{{this}}/SKILL.md\`
{{/each}}

---

{{/if}}
{{#if rules}}
## Project Rules (MUST FOLLOW)

{{#each rules}}
- {{this}}
{{/each}}

---

{{/if}}
{{#if context}}
## Context

{{context}}

---

{{/if}}
## Instructions

1. **Read** and understand the task requirements and acceptance criteria
2. **Plan** your implementation approach before coding
3. **Implement** according to acceptance criteria and business rules
4. **Follow** all project rules and existing code conventions
5. **Test** your changes - write tests as specified in testing requirements
6. **Verify** all acceptance criteria are met before completing

### Important Guidelines

- Follow existing code patterns in the codebase
- Write clean, maintainable, well-documented code
- Add appropriate error handling
- Do not modify files outside the scope of this task
- Do not introduce breaking changes unless explicitly required

### Completion

When you have successfully completed ALL acceptance criteria, output:

\`\`\`
<promise>COMPLETE</promise>
\`\`\`

If you encounter blockers or need clarification, describe the issue clearly and what information you need to proceed.
`;

const EXAMPLE_REQUIREMENTS = `# Phase 00: Example Phase

**Version:** 1.0
**Date:** 2025-01-01
**Phase Duration:** 1 week (8 hours)
**Target:** Demonstrate atzentis-cli structure
**Status:** ❌ Not Started

---

## Overview

This is an example phase to demonstrate the atzentis-cli structure and task specification format.

---

## Implementation Status

**Status:** ❌ Not Started (0% Complete)

**Phase 00 Scope:**

- Example directory structure
- Task specification format
- Dependency demonstration

---

## Goals

- **Goal 1:** Understand task specification structure
- **Goal 2:** Demonstrate phase/task relationships
- **Goal 3:** Show dependency management
- **Goal 4:** Provide template for future phases

---

## User Stories

### Story 1: Developer Understands Structure

**As a** Developer
**I want** to understand how tasks are structured
**So that** I can create my own task specifications

**Acceptance Criteria:**

- [ ] Example phase folder exists
- [ ] Example task folder exists
- [ ] Task file has correct frontmatter
- [ ] Task file has implementation details

**Business Rules:**

- Task IDs follow T{XX}-{NNN} format
- Phase IDs follow P{XX} format

---

## Functional Requirements

### FR-SETUP-001: Directory Structure

**Priority:** P0 (Critical)
**Phase:** 00
**Status:** ❌ Not Started

**Description:**

Create the standard .atzentis directory structure for project configuration.

**Acceptance Criteria:**

- [ ] .atzentis/cli/ directory exists
- [ ] .atzentis/specs/ directory exists
- [ ] .atzentis/docs/ directory exists
- [ ] config.yaml is generated

**Dependencies:**

- **Requires:** None
- **Enables:** FR-SETUP-002

---

## Task Breakdown

See task folders for detailed specifications:

- **T00-001:** Example Task (2h)

**Total Estimate:** 2 hours

---

## Success Metrics

**Phase 00 is successful when:**

- [ ] All example files created
- [ ] Structure is documented
- [ ] CLI can parse example tasks

---

## Definition of Done

**Phase 00 is complete when:**

- [ ] All functional requirements implemented
- [ ] Example task can be loaded by CLI
- [ ] Documentation is clear

---

**Created:** 2025-01-01
**Status:** Not Started
**Phase:** 00
`;

const EXAMPLE_TASK = `---
name: Example Task
description: This is an example task to demonstrate the task specification format
status: pending
phase: P00
parallelGroup: 1
dependencies: []
files:
  - src/example.ts
acceptanceCriteria:
  - Example file is created
  - Basic structure is in place
  - Task can be parsed by CLI
businessRules:
  - Task IDs follow T{XX}-{NNN} format
  - Files array lists files to create/modify
testingRequirements:
  - Unit test for task parsing
  - Integration test for task loading
skills:
  - clean-architecture
estimate: 2h
priority: P0
---

# Example Task

**Task ID:** T00-001
**Phase:** P00 - Example Phase
**Requirements:** FR-SETUP-001, FR-SETUP-002
**Total Estimate:** 2 hours
**Priority:** P0 (Critical)
**Dependencies:** None
**Blocks:** None
**Status:** Not Started

---

## Overview

This task demonstrates the expected format for task specifications in atzentis-cli. It shows how to structure a task file with YAML frontmatter and markdown body.

**Development Strategy:** Single work stream demonstrating basic task structure.

---

## Technical Specification

### Business Rules

- Task IDs must follow T{XX}-{NNN} format (e.g., T00-001)
- Phase IDs must follow P{XX} format (e.g., P00)
- Files array should list all files to create or modify
- Acceptance criteria should be specific and testable
- Dependencies array references other task IDs

---

## Work Stream 1: Example Implementation (2h)

### T00-001.1: Create Example File

**Estimate:** 1 hour
**Dependencies:** None
**Blocks:** T00-001.2
**Priority:** P0
**Skill:** clean-architecture

**Files to Create/Modify:**
- \`src/example.ts\` - Example implementation file

**Implementation Steps:**

- [ ] **Step 1:** Create the example file
  - Create src/example.ts
  - Add basic exports
  - Add type definitions

- [ ] **Step 2:** Add documentation
  - Add JSDoc comments
  - Add usage examples

**Acceptance Criteria:**

- [ ] File exists at src/example.ts
- [ ] File has proper exports
- [ ] TypeScript compiles without errors

**Testing:**

- [ ] Unit test: File can be imported
- [ ] Unit test: Exports are correct

---

### T00-001.2: Verify Structure

**Estimate:** 1 hour
**Dependencies:** T00-001.1
**Priority:** P0

**Implementation Steps:**

- [ ] **Step 1:** Verify task parsing
  - CLI can read task file
  - Frontmatter is parsed correctly

- [ ] **Step 2:** Verify execution
  - Task appears in --dry-run output
  - Dependencies are resolved

**Acceptance Criteria:**

- [ ] Task loads without errors
- [ ] All frontmatter fields are accessible
- [ ] CLI displays task in execution plan

---

## Definition of Done

**Task T00-001 is complete when:**

- [ ] All subtasks completed
- [ ] All acceptance criteria verified
- [ ] Example file created and working
- [ ] Task can be parsed by atzentis-cli

---

## Notes

**Important Reminders:**
- This is a template task
- Replace with actual implementation details
- Use this as a reference for creating new tasks

---

**Created:** 2025-01-01
**Last Updated:** 2025-01-01
**Status:** Not Started
`;

export { createSetupCommand as setupCommand };
