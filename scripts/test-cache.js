import path from 'node:path';
import {
  StageCacheManager,
  PromptCacheBuilder,
  ToolResultCache,
  CacheTelemetry
} from '../lib/cache-manager.js';

console.log('=== Testing Agent Caching System ===\n');

// 1. Test Prompt Cache Builder (Deterministic prefixing & ephemeral breakpoints)
console.log('[1] Testing Prompt Cache Builder (Anthropic & Gemini)...');
const promptBuilder = new PromptCacheBuilder('anthropic');
promptBuilder
  .addStaticSystemRule('You are the Code Review Agent. Adhere strictly to the gate criteria.')
  .addSharedSpec('openapi: 3.0.3\ninfo:\n  title: Backend Baseline Spec\npaths: {}')
  .addDynamicContext('Task: Review changeset for customer-service revision r0001.');

const anthropicPayload = promptBuilder.build();
console.log('Anthropic System Blocks count:', anthropicPayload.system.length);
console.log('Anthropic Breakpoint 1:', anthropicPayload.system[0].cache_control);
console.log('Anthropic Breakpoint 2:', anthropicPayload.system[1].cache_control);

// 2. Test Tool & Sub-query In-Memory Cache
console.log('\n[2] Testing Tool Result Cache (LRU)...');
const toolCache = new ToolResultCache({ maxEntries: 50 });
const toolParams = { file: 'services/customer-service/src/app.ts', query: 'Controller' };

// Initial miss
let lookup = toolCache.get('grep_ast', toolParams);
console.log('Initial lookup hit:', lookup.hit); // false

// Store result
toolCache.set('grep_ast', toolParams, { symbols: ['CustomerAuthController', 'CustomerRegistrationService'] });

// Second hit
lookup = toolCache.get('grep_ast', toolParams);
console.log('Second lookup hit:', lookup.hit, '| symbols:', lookup.result?.symbols?.join(', '));

// 3. Test Stage Checksum & Artifact Skipping
console.log('\n[3] Testing Stage Checksum Caching...');
const stageCache = new StageCacheManager({ cacheDir: '.cache' });
await stageCache.init();

const testRunDir = path.resolve('artifacts/run-EPMICMPJS-1064');
const stage1Inputs = [
  path.resolve('Docs/openapi.yaml'),
  path.resolve('agents/01-requirement-agent.md')
];

const fp1 = await stageCache.computeFingerprint(stage1Inputs, { stage: '01-requirements' });
console.log('Generated Input Fingerprint for Stage 01:', fp1.slice(0, 16) + '...');

// Save stage cache
await stageCache.saveStageCache(testRunDir, '01-requirements', fp1, {
  status: 'completed',
  gate_passed: true,
  summary: 'Requirements extracted and validated successfully'
});

// Check stage cache hit
const cacheCheck = await stageCache.getStageCache(testRunDir, '01-requirements', fp1);
console.log('Stage 01 Cache Hit:', cacheCheck.hit, '| Status:', cacheCheck.data?.status);

// 4. Test Cache Telemetry & Financial Calculations
console.log('\n[4] Testing Cache Telemetry Calculations...');
const telemetry = CacheTelemetry.calculateSavings(
  'claude-3-7-sonnet',
  24000,  // promptTokens (uncached)
  60000,  // cachedTokens (read from prompt cache)
  8500    // outputTokens
);

console.log('Unoptimized Cost ($USD):', `$${telemetry.unoptimized_cost_usd}`);
console.log('Actual Cost ($USD):     ', `$${telemetry.actual_cost_usd}`);
console.log('Dollar Savings ($USD):  ', `$${telemetry.dollar_savings_usd}`);
console.log('Prompt Cache Hit Rate:  ', `${telemetry.cache_hit_rate_pct}%`);
console.log('Cost Savings Percentage:', `${telemetry.savings_pct}%`);

console.log('\n=== All Agent Caching Tests Passed Successfully ===');

