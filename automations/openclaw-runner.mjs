#!/usr/bin/env node

/**
 * OpenClaw Task Runner for SUBUNDERGRUND ELECTRONIC
 * 
 * Safely executes tasks via local OpenClaw CLI, protecting against
 * context window overflow and ensuring cross-platform compatibility
 * (Linux, macOS, Windows).
 */

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Model limits configuration for OpenClaw configured model
const MODEL_CONFIG = {
  activeModel: 'microsoft-foundry/grok-4.6',
  fallbackModel: 'microsoft-foundry/gpt-5.3-codex',
  contextWindow: 128000,     // 128k tokens
  maxOutputTokens: 16384,    // 16k tokens
  safePromptLimit: 100000,   // Safe threshold to leave room for output & reasoning
  dangerThreshold: 118000,   // Warning/reject threshold
};

/**
 * Approximate token count for text (English, Code, Ukrainian/Cyrillic)
 */
function estimateTokens(text) {
  if (!text) return 0;
  // Non-ASCII characters (e.g. Cyrillic) generally take ~1.5 - 2.5 tokens per 4 bytes in typical BPE
  const nonAsciiCount = (text.match(/[^\x00-\x7F]/g) || []).length;
  const asciiCount = text.length - nonAsciiCount;
  
  const estimatedAsciiTokens = Math.ceil(asciiCount / 3.8);
  const estimatedNonAsciiTokens = Math.ceil(nonAsciiCount * 1.5);
  
  return estimatedAsciiTokens + estimatedNonAsciiTokens;
}

function printUsage() {
  console.log(`
OpenClaw Task Runner - SUBUNDERGRUND ELECTRONIC
Usage:
  node automations/openclaw-runner.mjs [options]

Options:
  --prompt <string>       Direct prompt string to run
  --file <path>           Path to prompt/task input file
  --output <path>         Path to save resulting response
  --agent <id>            Agent id (default: 'main')
  --model <id>            Model override (default: '${MODEL_CONFIG.activeModel}')
  --check-only            Estimate tokens and check context budget without running
  --local                 Run embedded agent locally (default: true)
  -h, --help              Show this help message

Model Profile:
  Active: ${MODEL_CONFIG.activeModel}
  Context Window: ${MODEL_CONFIG.contextWindow.toLocaleString()} tokens
  Max Output: ${MODEL_CONFIG.maxOutputTokens.toLocaleString()} tokens
  Recommended Max Prompt: ${MODEL_CONFIG.safePromptLimit.toLocaleString()} tokens
`);
}

async function main() {
  const args = process.argv.slice(2);
  let promptText = '';
  let outputFile = null;
  let agentId = 'main';
  let modelOverride = null;
  let checkOnly = false;
  let runLocal = true;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else if (arg === '--prompt' && i + 1 < args.length) {
      promptText = args[++i];
    } else if (arg === '--file' && i + 1 < args.length) {
      const filePath = resolve(process.cwd(), args[++i]);
      if (!existsSync(filePath)) {
        console.error(`Error: Input file not found at ${filePath}`);
        process.exit(1);
      }
      promptText = readFileSync(filePath, 'utf8');
    } else if (arg === '--output' && i + 1 < args.length) {
      outputFile = resolve(process.cwd(), args[++i]);
    } else if (arg === '--agent' && i + 1 < args.length) {
      agentId = args[++i];
    } else if (arg === '--model' && i + 1 < args.length) {
      modelOverride = args[++i];
    } else if (arg === '--check-only') {
      checkOnly = true;
    } else if (arg === '--local') {
      runLocal = true;
    }
  }

  if (!promptText.trim()) {
    console.error('Error: No prompt provided. Use --prompt "..." or --file <path>');
    printUsage();
    process.exit(1);
  }

  // Token budget inspection
  const estimated = estimateTokens(promptText);
  const remainingBudget = MODEL_CONFIG.contextWindow - estimated;
  const pctUsed = ((estimated / MODEL_CONFIG.contextWindow) * 100).toFixed(1);

  console.log('--- OpenClaw Context Window Audit ---');
  console.log(`Prompt Length:      ${promptText.length.toLocaleString()} characters`);
  console.log(`Estimated Tokens:   ~${estimated.toLocaleString()} tokens (${pctUsed}% of context)`);
  console.log(`Model Context Size: ${MODEL_CONFIG.contextWindow.toLocaleString()} tokens`);
  console.log(`Remaining Capacity: ~${remainingBudget.toLocaleString()} tokens`);
  console.log('-------------------------------------');

  if (estimated > MODEL_CONFIG.dangerThreshold) {
    console.error(`\n[CRITICAL WARNING] Estimated tokens (~${estimated.toLocaleString()}) exceed safe threshold (${MODEL_CONFIG.dangerThreshold.toLocaleString()})!`);
    console.error('This will likely cause context overflow or truncation in OpenClaw.');
    console.error('Please chunk or compress the prompt into smaller modules before proceeding.\n');
    process.exit(1);
  } else if (estimated > MODEL_CONFIG.safePromptLimit) {
    console.warn(`\n[WARNING] Estimated prompt size is high (~${estimated.toLocaleString()} tokens).`);
    console.warn(`Leaves only ~${remainingBudget.toLocaleString()} tokens for generation and reasoning.\n`);
  } else {
    console.log('[OK] Prompt fits comfortably inside the context window.\n');
  }

  if (checkOnly) {
    console.log('Check-only mode: exiting without calling OpenClaw.');
    process.exit(0);
  }

  // Create temporary task input file if executing
  const tempTaskFile = resolve(__dirname, '.current_openclaw_task.tmp');
  writeFileSync(tempTaskFile, promptText, 'utf8');

  const cliArgs = [
    'agent',
    '--agent', agentId,
    '--message-file', tempTaskFile,
  ];

  if (runLocal) {
    cliArgs.push('--local');
  }

  if (modelOverride) {
    cliArgs.push('--model', modelOverride);
  }

  console.log(`Executing: openclaw ${cliArgs.join(' ')}`);
  console.log('Waiting for OpenClaw response...\n');

  const child = spawn('openclaw', cliArgs, {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: false,
  });

  let stdoutBuffer = '';
  let stderrBuffer = '';

  child.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    stdoutBuffer += text;
    process.stdout.write(text);
  });

  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    stderrBuffer += text;
    process.stderr.write(text);
  });

  child.on('close', (code) => {
    if (outputFile) {
      writeFileSync(outputFile, stdoutBuffer, 'utf8');
      console.log(`\nResponse successfully saved to: ${outputFile}`);
    }
    process.exit(code);
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
