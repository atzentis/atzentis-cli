import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';
import type { Task, ProjectConfig } from '../config/schemas.ts';
import { getCliDir } from '../config/auto-detector.ts';
import { getPhaseContext } from '../core/phase-loader.ts';

// Get the directory of the current module for loading bundled templates
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Minimal fallback template if no template file is found
const FALLBACK_TEMPLATE = `# Task: {{task.id}} - {{task.name}}

{{#if task.description}}
## Description
{{task.description}}
{{/if}}

## Files to Modify
{{#each task.files}}
- \`{{this}}\`
{{/each}}

## Acceptance Criteria
{{#each task.acceptanceCriteria}}
- [ ] {{this}}
{{/each}}

{{#if rules}}
## Project Rules
{{#each rules}}
- {{this}}
{{/each}}
{{/if}}

{{#if context}}
## Context
{{context}}
{{/if}}

---

When complete, output: <promise>COMPLETE</promise>
`;

/**
 * PromptBuilder generates prompts for AI execution using Handlebars templates.
 * Injects task details, project rules, and context.
 */
export class PromptBuilder {
  private template: Handlebars.TemplateDelegate;
  private projectConfig: ProjectConfig | null;
  private projectRoot: string;

  constructor(projectRoot: string, projectConfig?: ProjectConfig) {
    this.projectRoot = projectRoot;
    this.projectConfig = projectConfig || null;
    this.template = this.loadTemplate();
    this.registerHelpers();
  }

  /**
   * Load the Handlebars template
   */
  private loadTemplate(): Handlebars.TemplateDelegate {
    // Try to load project-specific template from config
    if (this.projectConfig?.promptTemplate) {
      const templatePath = join(this.projectRoot, this.projectConfig.promptTemplate);
      if (existsSync(templatePath)) {
        const templateContent = readFileSync(templatePath, 'utf-8');
        return Handlebars.compile(templateContent);
      }
    }

    // Try to load from .atzentis/cli/templates/default.hbs
    const cliDir = getCliDir(this.projectRoot);
    const projectTemplatePath = join(cliDir, 'templates', 'default.hbs');
    if (existsSync(projectTemplatePath)) {
      const templateContent = readFileSync(projectTemplatePath, 'utf-8');
      return Handlebars.compile(templateContent);
    }

    // Try to load from .atzentis/cli/prompt-template.hbs (alternative location)
    const altPath = join(cliDir, 'prompt-template.hbs');
    if (existsSync(altPath)) {
      const templateContent = readFileSync(altPath, 'utf-8');
      return Handlebars.compile(templateContent);
    }

    // Load bundled default template from src/prompt/templates/default.hbs
    const bundledTemplatePath = join(__dirname, 'templates', 'default.hbs');
    if (existsSync(bundledTemplatePath)) {
      const templateContent = readFileSync(bundledTemplatePath, 'utf-8');
      return Handlebars.compile(templateContent);
    }

    // Fallback inline template if bundled template not found
    return Handlebars.compile(FALLBACK_TEMPLATE);
  }

  /**
   * Register custom Handlebars helpers
   */
  private registerHelpers(): void {
    // Format file path with link
    Handlebars.registerHelper('filePath', (path: string) => {
      return new Handlebars.SafeString(`\`${path}\``);
    });

    // Conditional block if array has items
    Handlebars.registerHelper('hasItems', function (this: unknown, array: unknown[], options) {
      if (array && array.length > 0) {
        return (options as Handlebars.HelperOptions).fn(this);
      }
      return (options as Handlebars.HelperOptions).inverse(this);
    });

    // Join array with separator
    Handlebars.registerHelper('join', (array: string[], separator: string) => {
      if (!Array.isArray(array)) return '';
      return array.join(typeof separator === 'string' ? separator : ', ');
    });

    // Format estimate
    Handlebars.registerHelper('formatEstimate', (estimate?: string) => {
      return estimate || 'Not specified';
    });
  }

  /**
   * Build a prompt for a task
   */
  async build(task: Task, options?: BuildOptions): Promise<string> {
    const context = await this.gatherContext(task, options);

    const templateData: TemplateData = {
      task: {
        id: task.id,
        name: task.name,
        description: task.description,
        files: task.files,
        acceptanceCriteria: task.acceptanceCriteria,
        dependencies: task.dependencies,
        estimate: task.estimate,
        priority: task.priority,
        // New fields aligned with task-structure.md
        phase: task.phase,
        requirements: task.requirements,
        businessRules: task.businessRules,
        testingRequirements: task.testingRequirements,
        skills: task.skills,
      },
      rules: this.projectConfig?.rules || [],
      context,
      project: this.projectConfig
        ? {
            name: this.projectConfig.name,
            language: this.projectConfig.language,
            commands: this.projectConfig.commands,
          }
        : undefined,
      completionPattern:
        this.projectConfig?.completionPattern || '<promise>COMPLETE</promise>',
    };

    return this.template(templateData);
  }

  /**
   * Gather context from context providers
   */
  private async gatherContext(task: Task, options?: BuildOptions): Promise<string> {
    const contextParts: string[] = [];

    // Add custom context if provided
    if (options?.additionalContext) {
      contextParts.push(options.additionalContext);
    }

    // Load phase context (requirements.md and explanation.md) if task has a phase
    if (task.phase) {
      try {
        const phaseContext = await getPhaseContext(this.projectRoot, task.phase);

        if (phaseContext.requirements) {
          contextParts.push(`### Phase Requirements\n\n${phaseContext.requirements}`);
        }

        if (phaseContext.explanation) {
          contextParts.push(`### Phase Technical Context\n\n${phaseContext.explanation}`);
        }
      } catch {
        // Skip if phase context can't be loaded
      }
    }

    // Load context from providers
    if (this.projectConfig?.contextProviders) {
      for (const provider of this.projectConfig.contextProviders) {
        try {
          const filePath = join(this.projectRoot, provider.file);
          if (existsSync(filePath)) {
            const content = readFileSync(filePath, 'utf-8');
            const header = provider.inject
              ? `### ${provider.name} (${provider.inject})`
              : `### ${provider.name}`;
            contextParts.push(`${header}\n\n${content}`);
          }
        } catch {
          // Skip files that can't be read
        }
      }
    }

    // Add file contents if requested
    if (options?.includeFileContents && task.files.length > 0) {
      contextParts.push('### Relevant Files\n');
      for (const file of task.files.slice(0, 5)) {
        // Limit to 5 files
        try {
          const filePath = join(this.projectRoot, file);
          if (existsSync(filePath)) {
            const content = readFileSync(filePath, 'utf-8');
            contextParts.push(`#### ${file}\n\`\`\`\n${content}\n\`\`\``);
          }
        } catch {
          // Skip files that can't be read
        }
      }
    }

    return contextParts.join('\n\n');
  }

  /**
   * Build a dry-run preview prompt
   */
  buildDryRunPreview(task: Task): string {
    return `
# DRY RUN PREVIEW
## Task: ${task.id} - ${task.name}

Would execute with:
- Files: ${task.files.join(', ') || 'None specified'}
- Dependencies: ${task.dependencies.join(', ') || 'None'}
- Estimate: ${task.estimate || 'Not specified'}
- Rules: ${this.projectConfig?.rules?.length || 0} rules would be applied

Completion pattern: ${this.projectConfig?.completionPattern || '<promise>COMPLETE</promise>'}
    `.trim();
  }

  /**
   * Update the template (for runtime changes)
   */
  setTemplate(templateContent: string): void {
    this.template = Handlebars.compile(templateContent);
  }

  /**
   * Get the completion pattern for this project
   */
  getCompletionPattern(): string {
    return this.projectConfig?.completionPattern || '<promise>COMPLETE</promise>';
  }
}

// =============================================================================
// Types
// =============================================================================

export interface BuildOptions {
  additionalContext?: string;
  includeFileContents?: boolean;
}

interface TemplateData {
  task: {
    id: string;
    name: string;
    description?: string;
    files: string[];
    acceptanceCriteria: string[];
    dependencies: string[];
    estimate?: string;
    priority?: string;
    // New fields aligned with task-structure.md
    phase?: string;
    requirements: string[];
    businessRules: string[];
    testingRequirements: string[];
    skills: string[];
  };
  rules: string[];
  context: string;
  project?: {
    name: string;
    language?: string;
    commands?: {
      test?: string;
      lint?: string;
      build?: string;
    };
  };
  completionPattern: string;
}
