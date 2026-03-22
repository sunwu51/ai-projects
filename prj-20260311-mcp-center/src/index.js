#!/usr/bin/env node

import { runServer } from './server.js';

/**
 * Parse CLI arguments
 * @returns {{configPath: string|undefined}}
 */
function parseArgs() {
  const args = process.argv.slice(2);

  let configPath;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--config' || arg === '-c') {
      configPath = args[i + 1];
      i++;
    } else if (!arg.startsWith('-')) {
      configPath = arg;
    }
  }

  return { configPath };
}

async function main() {
  const { configPath } = parseArgs();

  try {
    await runServer(configPath);
  } catch (error) {
    console.error('[mcp-center] Fatal error:', error);
    process.exit(1);
  }
}

main();
