import { runServer } from './server.js';

function parseArgs(): { transport: 'stdio' | 'http'; configPath?: string } {
  const args = process.argv.slice(2);
  
  let transport: 'stdio' | 'http' = 'stdio';
  let configPath: string | undefined;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--transport') {
      const nextArg = args[i + 1];
      if (nextArg === 'http' || nextArg === 'httpstreamable') {
        transport = 'http';
      } else if (nextArg === 'stdio') {
        transport = 'stdio';
      }
      i++;
    } else if (arg === '--config' || arg === '-c') {
      configPath = args[i + 1];
      i++;
    } else if (!arg.startsWith('-')) {
      configPath = arg;
    }
  }
  
  return { transport, configPath };
}

async function main() {
  const { transport, configPath } = parseArgs();
  
  try {
    await runServer(transport, configPath || '');
  } catch (error) {
    console.error('[mcp-center] Fatal error:', error);
    process.exit(1);
  }
}

main();
