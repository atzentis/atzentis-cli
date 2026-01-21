import type { EngineType, ExecuteOptions, ExecutionResult } from '../config/schemas.ts';
import { ClaudeCodeEngine, type Engine } from './claude-code.ts';

/**
 * EngineRegistry manages available AI execution engines.
 * Supports plugin-style registration of different engines.
 */
export class EngineRegistry {
  private engines: Map<string, Engine> = new Map();
  private defaultEngine: string = 'claude-code';

  constructor() {
    // Register built-in engines
    this.registerBuiltInEngines();
  }

  /**
   * Register built-in engines
   */
  private registerBuiltInEngines(): void {
    // Claude Code is the default and only built-in engine for now
    this.register(new ClaudeCodeEngine());
  }

  /**
   * Register a new engine
   */
  register(engine: Engine): void {
    this.engines.set(engine.name, engine);
  }

  /**
   * Get an engine by name
   */
  get(name: string): Engine | null {
    return this.engines.get(name) || null;
  }

  /**
   * Get the default engine
   */
  getDefault(): Engine {
    const engine = this.engines.get(this.defaultEngine);
    if (!engine) {
      throw new Error(`Default engine '${this.defaultEngine}' not found`);
    }
    return engine;
  }

  /**
   * Set the default engine
   */
  setDefault(name: string): void {
    if (!this.engines.has(name)) {
      throw new Error(`Engine '${name}' not registered`);
    }
    this.defaultEngine = name;
  }

  /**
   * Get engine by type (from schema enum)
   */
  getByType(type: EngineType): Engine {
    const engine = this.engines.get(type);
    if (!engine) {
      throw new Error(`Engine type '${type}' not available`);
    }
    return engine;
  }

  /**
   * List all registered engines
   */
  list(): string[] {
    return [...this.engines.keys()];
  }

  /**
   * Check if an engine is registered
   */
  has(name: string): boolean {
    return this.engines.has(name);
  }

  /**
   * Execute using the default engine
   */
  async execute(prompt: string, options?: Partial<ExecuteOptions>): Promise<ExecutionResult> {
    const engine = this.getDefault();
    return engine.execute(prompt, options);
  }

  /**
   * Execute using a specific engine
   */
  async executeWith(
    engineName: string,
    prompt: string,
    options?: Partial<ExecuteOptions>
  ): Promise<ExecutionResult> {
    const engine = this.get(engineName);
    if (!engine) {
      throw new Error(`Engine '${engineName}' not found`);
    }
    return engine.execute(prompt, options);
  }

  /**
   * Check availability of all engines
   */
  async checkAvailability(): Promise<Map<string, boolean>> {
    const availability = new Map<string, boolean>();

    for (const name of this.engines.keys()) {
      // For now, only Claude Code has availability check
      if (name === 'claude-code') {
        availability.set(name, await ClaudeCodeEngine.isAvailable());
      } else {
        // Assume other engines are available
        availability.set(name, true);
      }
    }

    return availability;
  }

  /**
   * Get engine info
   */
  async getEngineInfo(name: string): Promise<EngineInfo | null> {
    const engine = this.get(name);
    if (!engine) return null;

    const info: EngineInfo = {
      name: engine.name,
      available: true,
    };

    if (name === 'claude-code') {
      info.available = await ClaudeCodeEngine.isAvailable();
      info.version = (await ClaudeCodeEngine.getVersion()) || undefined;
    }

    return info;
  }
}

// =============================================================================
// Types
// =============================================================================

export interface EngineInfo {
  name: string;
  available: boolean;
  version?: string;
}

// =============================================================================
// Singleton instance
// =============================================================================

let registryInstance: EngineRegistry | null = null;

/**
 * Get the global engine registry instance
 */
export function getEngineRegistry(): EngineRegistry {
  if (!registryInstance) {
    registryInstance = new EngineRegistry();
  }
  return registryInstance;
}

/**
 * Reset the registry (mainly for testing)
 */
export function resetEngineRegistry(): void {
  registryInstance = null;
}
