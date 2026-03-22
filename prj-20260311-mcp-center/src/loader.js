import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

/** @type {Map<string, {name: string, client: Client, tools: Array, resources: Array, resourceTemplates: Array, prompts: Array}>} */
const loadedServers = new Map();

/** @type {Map<string, {status: 'connected'|'failed', error?: string}>} */
const serverStatus = new Map();

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
 * Create a resource URI with server prefix
 * @param {string} serverName
 * @param {string} uri
 * @returns {string}
 */
function makeResourceUri(serverName, uri) {
  return `${sanitizeServerName(serverName)}_${uri}`;
}

/**
 * Create a resource template URI with server prefix
 * @param {string} serverName
 * @param {string} uriTemplate
 * @returns {string}
 */
function makeResourceTemplateUri(serverName, uriTemplate) {
  return `${sanitizeServerName(serverName)}_${uriTemplate}`;
}

/**
 * Create a prompt name with server prefix
 * @param {string} serverName
 * @param {string} promptName
 * @returns {string}
 */
function makePromptName(serverName, promptName) {
  return `${sanitizeServerName(serverName)}_${promptName}`;
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
 * Filter resources by enabledResources list
 * @param {Array} resources
 * @param {string[]|undefined} enabledResources
 * @returns {Array}
 */
function filterResources(resources, enabledResources) {
  if (!enabledResources || enabledResources.length === 0) {
    return resources;
  }
  return resources.filter(resource => enabledResources.includes(resource.uri));
}

/**
 * Filter resource templates by enabledResourceTemplates list
 * @param {Array} resourceTemplates
 * @param {string[]|undefined} enabledResourceTemplates
 * @returns {Array}
 */
function filterResourceTemplates(resourceTemplates, enabledResourceTemplates) {
  if (!enabledResourceTemplates || enabledResourceTemplates.length === 0) {
    return resourceTemplates;
  }
  return resourceTemplates.filter(rt => enabledResourceTemplates.includes(rt.uriTemplate));
}

/**
 * Filter prompts by enabledPrompts list
 * @param {Array} prompts
 * @param {string[]|undefined} enabledPrompts
 * @returns {Array}
 */
function filterPrompts(prompts, enabledPrompts) {
  if (!enabledPrompts || enabledPrompts.length === 0) {
    return prompts;
  }
  return prompts.filter(prompt => enabledPrompts.includes(prompt.name));
}

/**
 * Load all servers from config in parallel
 * @param {Array} servers
 * @returns {Promise<void>}
 */
export async function loadAllServers(servers) {
  const loadPromises = servers.map(async (serverConfig) => {
    try {
      await loadServer(serverConfig);
    } catch (error) {
      console.error(`[mcp-center] Failed to load server "${serverConfig.name}":`, error);
    }
  });
  
  await Promise.all(loadPromises);
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

  const opts = {};
  if (config.httpHeaders && Object.keys(config.httpHeaders).length > 0) {
    opts.requestInit = { headers: config.httpHeaders };
  }
  const transport = new StreamableHTTPClientTransport(new URL(config.url), opts);

  const client = new Client(
    { name: `mcp-center-${config.name}`, version: '1.0.0' },
    {}
  );

  await client.connect(transport);

  // Load tools
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

  // Load resources
  let resources = [];
  try {
    const resourcesResponse = await client.listResources();
    const rawResources = resourcesResponse.resources || [];
    const filteredResources = filterResources(rawResources, config.enabledResources);

    resources = filteredResources.map(resource => ({
      uri: makeResourceUri(config.name, resource.uri),
      originalUri: resource.uri,
      serverName: config.name,
      name: resource.name || '',
      description: resource.description || '',
      mimeType: resource.mimeType,
    }));
  } catch (error) {
    console.warn(`[mcp-center] Server ${config.name} does not support resources:`, error.message);
  }

  // Load resource templates
  let resourceTemplates = [];
  try {
    const resourceTemplatesResponse = await client.listResourceTemplates();
    const rawResourceTemplates = resourceTemplatesResponse.resourceTemplates || [];
    const filteredResourceTemplates = filterResourceTemplates(rawResourceTemplates, config.enabledResourceTemplates);

    resourceTemplates = filteredResourceTemplates.map(rt => ({
      uriTemplate: makeResourceTemplateUri(config.name, rt.uriTemplate),
      originalUriTemplate: rt.uriTemplate,
      serverName: config.name,
      name: rt.name || '',
      description: rt.description || '',
      mimeType: rt.mimeType,
    }));
  } catch (error) {
    console.warn(`[mcp-center] Server ${config.name} does not support resource templates:`, error.message);
  }

  // Load prompts
  let prompts = [];
  try {
    const promptsResponse = await client.listPrompts();
    const rawPrompts = promptsResponse.prompts || [];
    const filteredPrompts = filterPrompts(rawPrompts, config.enabledPrompts);

    prompts = filteredPrompts.map(prompt => ({
      name: makePromptName(config.name, prompt.name),
      originalName: prompt.name,
      serverName: config.name,
      description: prompt.description || '',
      arguments: prompt.arguments || [],
    }));
  } catch (error) {
    console.warn(`[mcp-center] Server ${config.name} does not support prompts:`, error.message);
  }

  return { name: config.name, client, tools, resources, resourceTemplates, prompts };
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
    env: config.env ? { ...process.env, ...config.env } : undefined,
  });

  const client = new Client(
    { name: `mcp-center-${config.name}`, version: '1.0.0' },
    {}
  );

  await client.connect(transport);

  // Load tools
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

  // Load resources
  let resources = [];
  try {
    const resourcesResponse = await client.listResources();
    const rawResources = resourcesResponse.resources || [];
    const filteredResources = filterResources(rawResources, config.enabledResources);

    resources = filteredResources.map(resource => ({
      uri: makeResourceUri(config.name, resource.uri),
      originalUri: resource.uri,
      serverName: config.name,
      name: resource.name || '',
      description: resource.description || '',
      mimeType: resource.mimeType,
    }));
  } catch (error) {
    console.warn(`[mcp-center] Server ${config.name} does not support resources:`, error.message);
  }

  // Load resource templates
  let resourceTemplates = [];
  try {
    const resourceTemplatesResponse = await client.listResourceTemplates();
    const rawResourceTemplates = resourceTemplatesResponse.resourceTemplates || [];
    const filteredResourceTemplates = filterResourceTemplates(rawResourceTemplates, config.enabledResourceTemplates);

    resourceTemplates = filteredResourceTemplates.map(rt => ({
      uriTemplate: makeResourceTemplateUri(config.name, rt.uriTemplate),
      originalUriTemplate: rt.uriTemplate,
      serverName: config.name,
      name: rt.name || '',
      description: rt.description || '',
      mimeType: rt.mimeType,
    }));
  } catch (error) {
    console.warn(`[mcp-center] Server ${config.name} does not support resource templates:`, error.message);
  }

  // Load prompts
  let prompts = [];
  try {
    const promptsResponse = await client.listPrompts();
    const rawPrompts = promptsResponse.prompts || [];
    const filteredPrompts = filterPrompts(rawPrompts, config.enabledPrompts);

    prompts = filteredPrompts.map(prompt => ({
      name: makePromptName(config.name, prompt.name),
      originalName: prompt.name,
      serverName: config.name,
      description: prompt.description || '',
      arguments: prompt.arguments || [],
    }));
  } catch (error) {
    console.warn(`[mcp-center] Server ${config.name} does not support prompts:`, error.message);
  }

  return { name: config.name, client, tools, resources, resourceTemplates, prompts };
}

/**
 * Load a single MCP server based on config
 * @param {object} config
 * @returns {Promise<object>}
 */
export async function loadServer(config) {
  const transportType = config.url ? 'http' : 'stdio';
  console.error(`[mcp-center] Loading server "${config.name}" (${transportType} transport)`);

  let loadedServer;
  try {
    if (transportType === 'http') {
      loadedServer = await loadHttpServer(config);
    } else {
      loadedServer = await loadStdioServer(config);
    }
  } catch (error) {
    const errMsg = error.message || String(error);
    console.error(`[mcp-center] Failed to load server "${config.name}": ${errMsg}`);
    serverStatus.set(config.name, { status: 'failed', error: errMsg });
    throw error;
  }

  console.error(`[mcp-center] Loaded ${loadedServer.tools.length} tool(s), ${loadedServer.resources.length} resource(s), ${loadedServer.resourceTemplates.length} resource template(s), ${loadedServer.prompts.length} prompt(s) from "${config.name}"`);
  loadedServers.set(config.name, loadedServer);
  serverStatus.set(config.name, { status: 'connected' });

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
  serverStatus.delete(config.name);

  return loadServer(config);
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
 * Get all resources from loaded servers
 * @returns {Array}
 */
export function getAllResources() {
  const allResources = [];
  for (const server of loadedServers.values()) {
    allResources.push(...server.resources);
  }
  return allResources;
}

/**
 * Get all resource templates from loaded servers
 * @returns {Array}
 */
export function getAllResourceTemplates() {
  const allResourceTemplates = [];
  for (const server of loadedServers.values()) {
    allResourceTemplates.push(...server.resourceTemplates);
  }
  return allResourceTemplates;
}

/**
 * Get all prompts from loaded servers
 * @returns {Array}
 */
export function getAllPrompts() {
  const allPrompts = [];
  for (const server of loadedServers.values()) {
    allPrompts.push(...server.prompts);
  }
  return allPrompts;
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
 * Read a resource by its aggregated URI
 * @param {string} uri
 * @returns {Promise<any>}
 */
export async function readResource(uri) {
  // First, try to match against static resources
  for (const server of loadedServers.values()) {
    const resource = server.resources.find(r => r.uri === uri);
    if (resource) {
      const result = await server.client.readResource({
        uri: resource.originalUri,
      });
      return result;
    }
  }

  // If no static resource matched, try to match against resource templates.
  // The aggregated URI has the format: `${serverName}_${originalUri}`.
  // We find the server whose prefix matches, strip the prefix, and forward
  // the original URI to the child server for resolution.
  for (const server of loadedServers.values()) {
    const prefix = `${sanitizeServerName(server.name)}_`;
    if (uri.startsWith(prefix) && server.resourceTemplates.length > 0) {
      const originalUri = uri.slice(prefix.length);
      try {
        const result = await server.client.readResource({ uri: originalUri });
        return result;
      } catch {
        // This server couldn't handle it, try next
      }
    }
  }

  throw new Error(`Resource not found: ${uri}`);
}

/**
 * Get a prompt by its aggregated name
 * @param {string} promptName
 * @param {object} args
 * @returns {Promise<any>}
 */
export async function getPrompt(promptName, args) {
  for (const server of loadedServers.values()) {
    const prompt = server.prompts.find(p => p.name === promptName);
    if (prompt) {
      const result = await server.client.getPrompt({
        name: prompt.originalName,
        arguments: args,
      });
      return result;
    }
  }
  throw new Error(`Prompt not found: ${promptName}`);
}

/**
 * Close all loaded servers
 * @returns {Promise<void>}
 */
export async function closeAllServers() {
  for (const [name, server] of loadedServers) {
    try {
      await server.client.close();
      console.error(`[mcp-center] Closed server "${name}"`);
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

/**
 * Get the server status map
 * @returns {Map}
 */
export function getServerStatus() {
  return serverStatus;
}

/**
 * Temporarily connect to a server config, fetch its capabilities, then disconnect.
 * Used by the UI "probe" feature before the server is saved.
 * @param {object} config
 * @returns {Promise<{tools: Array, resources: Array, resourceTemplates: Array, prompts: Array}>}
 */
export async function probeServer(config) {
  let client;
  try {
    if (config.url) {
      const opts = {};
      if (config.httpHeaders && Object.keys(config.httpHeaders).length > 0) {
        opts.requestInit = { headers: config.httpHeaders };
      }
      const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
      const transport = new StreamableHTTPClientTransport(new URL(config.url), opts);
      client = new Client({ name: 'mcp-center-probe', version: '1.0.0' }, {});
      await client.connect(transport);
    } else {
      if (!config.command) throw new Error('command is required for stdio transport');
      const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args || [],
        env: config.env ? { ...process.env, ...config.env } : undefined,
      });
      client = new Client({ name: 'mcp-center-probe', version: '1.0.0' }, {});
      await client.connect(transport);
    }

    const [toolsRes, resourcesRes, templatesRes, promptsRes] = await Promise.allSettled([
      client.listTools(),
      client.listResources(),
      client.listResourceTemplates(),
      client.listPrompts(),
    ]);

    return {
      tools: toolsRes.status === 'fulfilled' ? (toolsRes.value.tools || []).map(t => ({ name: t.name, description: t.description || '' })) : [],
      resources: resourcesRes.status === 'fulfilled' ? (resourcesRes.value.resources || []).map(r => ({ uri: r.uri, name: r.name || '', description: r.description || '' })) : [],
      resourceTemplates: templatesRes.status === 'fulfilled' ? (templatesRes.value.resourceTemplates || []).map(r => ({ uriTemplate: r.uriTemplate, name: r.name || '', description: r.description || '' })) : [],
      prompts: promptsRes.status === 'fulfilled' ? (promptsRes.value.prompts || []).map(p => ({ name: p.name, description: p.description || '' })) : [],
    };
  } finally {
    if (client) {
      try { await client.close(); } catch (_) {}
    }
  }
}
