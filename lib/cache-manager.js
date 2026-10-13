import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Cache rates per million tokens ($ USD) for major models
 */
export const MODEL_PRICING = {
  'claude-3-7-sonnet': { input: 3.00, cached_input: 0.30, output: 15.00 },
  'claude-3-5-sonnet': { input: 3.00, cached_input: 0.30, output: 15.00 },
  'claude-3-5-haiku': { input: 0.80, cached_input: 0.08, output: 4.00 },
  'gemini-2.5-pro': { input: 1.25, cached_input: 0.3125, output: 5.00 },
  'gemini-2.5-flash': { input: 0.075, cached_input: 0.01875, output: 0.30 },
  'gpt-4o': { input: 2.50, cached_input: 1.25, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, cached_input: 0.075, output: 0.60 },
  default: { input: 2.00, cached_input: 0.30, output: 10.00 }
};

/**
 * Stage Checksum and Artifact Caching Manager
 */
export class StageCacheManager {
  constructor(options = {}) {
    this.cacheDir = options.cacheDir || path.resolve('.cache');
    this.stageFingerprints = new Map();
  }

  async init() {
    await fs.mkdir(this.cacheDir, { recursive: true });
  }

  /**
   * Computes a SHA-256 fingerprint for a list of input file paths and configuration objects.
   */
  async computeFingerprint(inputPaths = [], extraConfig = {}) {
    const hash = crypto.createHash('sha256');

    // Add extra configuration / parameters
    hash.update(JSON.stringify(extraConfig));

    // Sort paths for deterministic ordering
    const sortedPaths = [...inputPaths].sort((a, b) => a.localeCompare(b));
    const pathReadPromises = sortedPaths.map(async (filePath) => {
      try {
        const stats = await fs.stat(filePath);
        if (stats.isFile()) {
          const content = await fs.readFile(filePath);
          return { filePath, content, exists: true };
        }
        return { filePath, content: null, exists: false };
      } catch (err) {
        // Optional file missing or unreadable; mark as missing in fingerprint
        return { filePath, content: null, exists: false };
      }
    });

    const fileResults = await Promise.all(pathReadPromises);
    for (const item of fileResults) {
      if (item.exists && item.content) {
        hash.update(item.filePath);
        hash.update(item.content);
      } else {
        hash.update(`${item.filePath}:missing`);
      }
    }

    return hash.digest('hex');
  }

  /**
   * Checks if a stage's cached result exists and matches the current input fingerprint.
   */
  async getStageCache(runDir, stageId, currentFingerprint) {
    const stageCacheFile = path.join(runDir, stageId, '.stage-cache.json');
    try {
      const raw = await fs.readFile(stageCacheFile, 'utf8');
      const cached = JSON.parse(raw);
      if (cached.fingerprint === currentFingerprint && cached.status === 'completed') {
        return { hit: true, data: cached.result, cachedAt: cached.timestamp };
      }
    } catch {
      // Cache miss
    }
    return { hit: false };
  }

  /**
   * Persists completed stage result with fingerprint to disk for subsequent retries/runs.
   */
  async saveStageCache(runDir, stageId, fingerprint, stageResult) {
    const stageDir = path.join(runDir, stageId);
    await fs.mkdir(stageDir, { recursive: true });
    const stageCacheFile = path.join(stageDir, '.stage-cache.json');
    const payload = {
      stageId,
      fingerprint,
      timestamp: new Date().toISOString(),
      status: stageResult.status || 'completed',
      result: stageResult
    };
    await fs.writeFile(stageCacheFile, JSON.stringify(payload, null, 2), 'utf8');
  }
}

/**
 * LLM Prompt Caching Builder
 * Formats multi-part prompts with deterministic static-to-dynamic ordering
 * and provider-specific cache control breakpoints (e.g. Anthropic, Gemini, OpenAI).
 */
export class PromptCacheBuilder {
  constructor(provider = 'anthropic') {
    this.provider = provider.toLowerCase();
    this.staticBlocks = [];
    this.sharedSpecs = [];
    this.dynamicContext = [];
  }

  /**
   * Adds static system rules (e.g., agent system prompt, orchestrator contract).
   * These stay cached across all runs and stages.
   */
  addStaticSystemRule(text, id = 'system-rules') {
    this.staticBlocks.push({ id, text });
    return this;
  }

  /**
   * Adds shared static specifications (e.g., Docs/openapi.yaml baseline).
   * Reused across all 6 stages within the run.
   */
  addSharedSpec(text, id = 'openapi-baseline') {
    this.sharedSpecs.push({ id, text });
    return this;
  }

  /**
   * Adds dynamic runtime context (e.g., run manifest, upstream stage outputs).
   */
  addDynamicContext(text, id = 'stage-input') {
    this.dynamicContext.push({ id, text });
    return this;
  }

  /**
   * Builds the formatted payload ready for the respective LLM API.
   */
  build() {
    if (this.provider === 'anthropic' || this.provider === 'claude') {
      return this.buildAnthropicPayload();
    }
    if (this.provider === 'gemini') {
      return this.buildGeminiPayload();
    }
    return this.buildStandardPayload();
  }

  buildAnthropicPayload() {
    // Anthropic supports up to 4 cache_control breakpoints
    const system = [];

    // Block 1: Static Rules (Breakpoint 1)
    if (this.staticBlocks.length > 0) {
      const combinedRules = this.staticBlocks.map((b) => b.text).join('\n\n---\n\n');
      system.push({
        type: 'text',
        text: combinedRules,
        cache_control: { type: 'ephemeral' }
      });
    }

    // Block 2: Shared Specs / Baseline OpenAPI (Breakpoint 2 - Reused across all 6 agents)
    if (this.sharedSpecs.length > 0) {
      const combinedSpecs = this.sharedSpecs.map((b) => b.text).join('\n\n---\n\n');
      system.push({
        type: 'text',
        text: combinedSpecs,
        cache_control: { type: 'ephemeral' }
      });
    }

    // Messages: Dynamic Content (Uncached / dynamic input)
    const dynamicText = this.dynamicContext.map((b) => b.text).join('\n\n---\n\n');
    const messages = [
      {
        role: 'user',
        content: dynamicText || 'Execute stage instructions according to the protocol.'
      }
    ];

    return { system, messages };
  }

  buildGeminiPayload() {
    const combinedSystem = [...this.staticBlocks, ...this.sharedSpecs]
      .map((b) => b.text)
      .join('\n\n---\n\n');

    const dynamicText = this.dynamicContext.map((b) => b.text).join('\n\n---\n\n');

    return {
      systemInstruction: {
        parts: [{ text: combinedSystem }]
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: dynamicText }]
        }
      ]
    };
  }

  buildStandardPayload() {
    const systemText = [...this.staticBlocks, ...this.sharedSpecs]
      .map((b) => b.text)
      .join('\n\n---\n\n');

    const dynamicText = this.dynamicContext.map((b) => b.text).join('\n\n---\n\n');

    return {
      messages: [
        { role: 'system', content: systemText },
        { role: 'user', content: dynamicText }
      ]
    };
  }
}

/**
 * Tool & Sub-query Cache (In-Memory + Disk LRU)
 */
export class ToolResultCache {
  constructor(options = {}) {
    this.memoryCache = new Map();
    this.maxEntries = options.maxEntries || 200;
  }

  getCacheKey(toolName, params) {
    const serialized = typeof params === 'string' ? params : JSON.stringify(params);
    return `${toolName}:${crypto.createHash('sha256').update(serialized).digest('hex').slice(0, 16)}`;
  }

  get(toolName, params) {
    const key = this.getCacheKey(toolName, params);
    if (this.memoryCache.has(key)) {
      const entry = this.memoryCache.get(key);
      entry.lastAccessed = Date.now();
      return { hit: true, result: entry.result };
    }
    return { hit: false };
  }

  set(toolName, params, result) {
    const key = this.getCacheKey(toolName, params);
    if (this.memoryCache.size >= this.maxEntries) {
      // Evict least recently accessed entry
      let oldestKey = null;
      let oldestTime = Infinity;
      for (const [k, v] of this.memoryCache.entries()) {
        if (v.lastAccessed < oldestTime) {
          oldestTime = v.lastAccessed;
          oldestKey = k;
        }
      }
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }

    this.memoryCache.set(key, {
      result,
      lastAccessed: Date.now()
    });
  }
}

/**
 * Cache Telemetry & Financial Savings Calculator
 */
export class CacheTelemetry {
  static calculateSavings(modelName, promptTokens, cachedTokens, outputTokens) {
    const pricing = MODEL_PRICING[modelName] || MODEL_PRICING.default;

    const outputCost = (outputTokens / 1_000_000) * pricing.output;

    // Standard cost without cache
    const unoptimizedTotalCost = ((promptTokens + cachedTokens) / 1_000_000) * pricing.input + outputCost;

    // Actual cost with cache discounts
    const actualPromptCost = (promptTokens / 1_000_000) * pricing.input;
    const actualCachedCost = (cachedTokens / 1_000_000) * pricing.cached_input;
    const actualTotalCost = actualPromptCost + actualCachedCost + outputCost;

    const dollarSavings = Math.max(0, unoptimizedTotalCost - actualTotalCost);
    const totalInput = promptTokens + cachedTokens;
    const hitRatePct = totalInput > 0 ? (cachedTokens / totalInput) * 100 : 0;
    const savingsPct = unoptimizedTotalCost > 0 ? (dollarSavings / unoptimizedTotalCost) * 100 : 0;

    return {
      unoptimized_cost_usd: Number(unoptimizedTotalCost.toFixed(6)),
      actual_cost_usd: Number(actualTotalCost.toFixed(6)),
      dollar_savings_usd: Number(dollarSavings.toFixed(6)),
      cache_hit_rate_pct: Number(hitRatePct.toFixed(2)),
      savings_pct: Number(savingsPct.toFixed(2))
    };
  }
}
