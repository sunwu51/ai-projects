import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

/** @type {Map<string, {name: string, client: Client, tools: Array}>} */
const loadedServers = new Map();

/**
 * Sanitize server name for use in tool names
 * @param {string} name
 * @returns {string}
 */
function sanitizeServerName(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Create a tool name with server prefix
 * @param {string} serverName
 * @param {string} toolName
 * @returns {string}
 */
function makeToolName(serverName, toolName) {
  return `${sanitizeServerName(serverName)}_${toolName}`;
}

/**
 * Filter tools by enabledTools list
 * @param {Array} tools
 * @param {string[]|undefined} enabledTools
 * @returns {Array}
 */
function filterTools(tools, enabledTools) {
  if (!enabledTools || enabledTools.length === 0) {
    return tools;
  }
  return tools.filter(tool => enabledTools.includes(tool.name));
}

/**
 * Load an HTTP-based MCP server
 * @param {object} config
 * @returns {Promise<object>}
 */
async function loadHttpServer(config) {
  if (!config.url) {
    throw new Error(`Server ${config.name}: url is required for HTTP transport`);
  }

  const transport = new StreamableHTTPClientTransport(new URL(config.url));

  const client = new Client(
    { name: `mcp-center-${config.name}`, version: '1.0.0' },
    {}
  );

  await client.connect(transport);

  const toolsResponse = await client.listTools();
  const rawTools = toolsResponse.tools || [];
  const filteredRaw = filterTools(rawTools, config.enabledTools);

  const tools = filteredRaw.map(tool => ({
    name: makeToolName(config.name, tool.name),
    originalName: tool.name,
    serverName: config.name,
    description: tool.description || '',
    inputSchema: tool.inputSchema || {},
  }));

  return { name: config.name, client, tools };
}

/**
 * Load a stdio-based MCP server
 * @param {object} config
 * @returns {Promise<object>}
 */
async function loadStdioServer(config) {
  if (!config.command) {
    throw new Error(`Server ${config.name}: command is required for stdio transport`);
  }

  const transport = new StdioClientTransport({
    command: config.command,
    args: config.args || [],
    env: config.env,
  });

  const client = new Client(
    { name: `mcp-center-${config.name}`, version: '1.0.0' },
    {}
  );

  await client.connect(transport);

  const toolsResponse = await client.listTools();
  const rawTools = toolsResponse.tools || [];
  const filteredRaw = filterTools(rawTools, config.enabledTools);

  const tools = filteredRaw.map(tool => ({
    name: makeToolName(config.name, tool.name),
    originalName: tool.name,
    serverName: config.name,
    description: tool.description || '',
    inputSchema: tool.inputSchema || {},
  }));

  return { name: config.name, client, tools };
}

/**
 * Load a single MCP server based on config
 * @param {object} config
 * @returns {Promise<object>}
 */
export async function loadServer(config) {
  const transportType = config.url ? 'http' : 'stdio';
  console.log(`[mcp-center] Loading server "${config.name}" (${transportType} transport)`);

  let loadedServer;
  if (transportType === 'http') {
    loadedServer = await loadHttpServer(config);
  } else {
    loadedServer = await loadStdioServer(config);
  }

  console.log(`[mcp-center] Loaded ${loadedServer.tools.length} tool(s) from "${config.name}"`);
  loadedServers.set(config.name, loadedServer);

  return loadedServer;
}

/**
 * Reload a single server (close existing connection first)
 * @param {object} config
 * @returns {Promise<object>}
 */
export async function reloadServer(config) {
  const existing = loadedServers.get(config.name);
  if (existing) {
    try {
      await existing.client.close();
    } catch (error) {
      console.warn(`[mcp-center] Error closing server ${config.name}:`, error);
    }
    loadedServers.delete(config.name);
  }

  return loadServer(config);
}

/**
 * Load all servers from configs
 * @param {Array} configs
 * @returns {Promise<Array>}
 */
export async function loadAllServers(configs) {
  const results = [];

  for (const config of configs) {
    try {
      const loaded = await loadServer(config);
      results.push(loaded);
    } catch (error) {
      console.error(`[mcp-center] Failed to load server "${config.name}":`, error);
    }
  }

  return results;
}

/**
 * Get all tools from loaded servers
 * @returns {Array}
 */
export function getAllTools() {
  const allTools = [];
  for (const server of loadedServers.values()) {
    allTools.push(...server.tools);
  }
  return allTools;
}

/**
 * Call a tool by its aggregated name
 * @param {string} toolName
 * @param {object} args
 * @returns {Promise<any>}
 */
export async function callTool(toolName, args) {
  for (const server of loadedServers.values()) {
    const tool = server.tools.find(t => t.name === toolName);
    if (tool) {
      const result = await server.client.callTool({
        name: tool.originalName,
        arguments: args,
      });
      return result;
    }
  }
  throw new Error(`Tool not found: ${toolName}`);
}

/**
 * Close all loaded servers
 * @returns {Promise<void>}
 */
export async function closeAllServers() {
  for (const [name, server] of loadedServers) {
    try {
      await server.client.close();
      console.log(`[mcp-center] Closed server "${name}"`);
    } catch (error) {
      console.warn(`[mcp-center] Error closing server "${name}":`, error);
    }
  }
  loadedServers.clear();
}

/**
 * Get the loaded servers map
 * @returns {Map}
 */
export function getLoadedServers() {
  return loadedServers;
}
