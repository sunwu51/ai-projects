import { readFileSync, existsSync, watchFile, unwatchFile, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { homedir } from 'os';

let currentConfig = null;
let configPath = '';
let reloadCallback = null;
let ignoredWatchEvents = 0;

/**
 * Validates server config object
 * @param {object} server
 * @returns {boolean}
 */
function validateServerConfig(server) {
  if (!server || typeof server !== 'object') return false;
  if (!server.name || typeof server.name !== 'string') return false;
  if (server.url !== undefined && typeof server.url !== 'string') return false;
  if (server.command !== undefined && typeof server.command !== 'string') return false;
  if (server.args !== undefined && !Array.isArray(server.args)) return false;
  if (server.env !== undefined && typeof server.env !== 'object') return false;
  if (server.enabledTools !== undefined && !Array.isArray(server.enabledTools)) return false;
  return true;
}

/**
 * Validates full config object
 * @param {object} config
 * @returns {boolean}
 */
function validateConfig(config) {
  if (!config || typeof config !== 'object') return false;
  if (!Array.isArray(config.servers)) return false;
  for (const server of config.servers) {
    if (!validateServerConfig(server)) return false;
  }
  return true;
}

/**
 * Load config from JSON file
 * @param {string} path
 * @returns {object}
 */
export function loadConfig(path) {
  const resolvedPath = resolve(path);

  if (!existsSync(resolvedPath)) {
    throw new Error(`Config file not found: ${resolvedPath}`);
  }

  const content = readFileSync(resolvedPath, 'utf-8');
  const parsed = JSON.parse(content);

  if (!validateConfig(parsed)) {
    throw new Error(`Invalid config file: ${resolvedPath}`);
  }

  currentConfig = parsed;
  configPath = resolvedPath;

  return parsed;
}

/**
 * Get currently loaded config
 * @returns {object|null}
 */
export function getConfig() {
  return currentConfig;
}

/**
 * Watch config file for changes
 * @param {Function} callback
 */
export function watchConfig(callback) {
  if (!configPath) {
    throw new Error('No config loaded yet');
  }

  reloadCallback = callback;

  watchFile(configPath, { interval: 1000 }, () => {
    if (ignoredWatchEvents > 0) {
      ignoredWatchEvents -= 1;
      return;
    }
    console.error('[mcp-center] Config file changed, reloading...');
    try {
      const newConfig = loadConfig(configPath);
      console.error(`[mcp-center] Loaded ${newConfig.servers.length} server(s)`);
      if (reloadCallback) {
        reloadCallback();
      }
    } catch (error) {
      console.error('[mcp-center] Error reloading config:', error);
    }
  });
}

/**
 * Stop watching config file
 */
export function unwatchConfig() {
  if (configPath) {
    unwatchFile(configPath);
    reloadCallback = null;
  }
}

/**
 * Get the default config path (~/.mcp-center/mcp.json)
 * @returns {string}
 */
export function getDefaultConfigPath() {
  return resolve(homedir(), '.mcp-center', 'mcp.json');
}

/**
 * Ensure default config file exists
 * @returns {string} Path to config file
 */
export function ensureDefaultConfig() {
  const defaultPath = getDefaultConfigPath();
  const dir = dirname(defaultPath);
  
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  
  if (!existsSync(defaultPath)) {
    writeFileSync(defaultPath, JSON.stringify({ servers: [] }, null, 2), 'utf-8');
  }
  
  return defaultPath;
}

/**
 * Save config to file
 * @param {object} config
 * @param {string} path
 */
export function saveConfig(config, path) {
  const resolvedPath = path || configPath;
  if (!resolvedPath) {
    throw new Error('No config path specified');
  }
  
  if (!validateConfig(config)) {
    throw new Error('Invalid config object');
  }

  const dir = dirname(resolvedPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(resolvedPath, JSON.stringify(config, null, 2), 'utf-8');
  ignoredWatchEvents += 1;
  currentConfig = config;
}
