import { readFileSync, existsSync, watchFile, unwatchFile } from 'fs';
import { resolve } from 'path';
import { MCPConfig, MCPConfigSchema } from './types.js';

let currentConfig: MCPConfig | null = null;
let configPath: string = '';
let reloadCallback: (() => void) | null = null;

export function loadConfig(path: string): MCPConfig {
  const resolvedPath = resolve(path);
  
  if (!existsSync(resolvedPath)) {
    throw new Error(`Config file not found: ${resolvedPath}`);
  }
  
  const content = readFileSync(resolvedPath, 'utf-8');
  const parsed = JSON.parse(content);
  const config = MCPConfigSchema.parse(parsed);
  
  currentConfig = config;
  configPath = resolvedPath;
  
  return config;
}

export function getConfig(): MCPConfig | null {
  return currentConfig;
}

export function watchConfig(callback: () => void): void {
  if (!configPath) {
    throw new Error('No config loaded yet');
  }
  
  reloadCallback = callback;
  
  watchFile(configPath, { interval: 1000 }, () => {
    console.log('[mcp-center] Config file changed, reloading...');
    try {
      const newConfig = loadConfig(configPath);
      console.log(`[mcp-center] Loaded ${newConfig.servers.length} server(s)`);
      if (reloadCallback) {
        reloadCallback();
      }
    } catch (error) {
      console.error('[mcp-center] Error reloading config:', error);
    }
  });
}

export function unwatchConfig(): void {
  if (configPath) {
    unwatchFile(configPath);
    reloadCallback = null;
  }
}

export function getDefaultConfigPath(): string {
  return resolve(process.cwd(), 'mcp.json');
}
