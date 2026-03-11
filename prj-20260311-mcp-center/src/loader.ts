import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { MCPServerConfig, ToolInfo, LoadedServer } from './types.js';
import { StdioServerParameters } from '@modelcontextprotocol/sdk/client/stdio.js';

const loadedServers: Map<string, LoadedServer> = new Map();

function sanitizeServerName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function makeToolName(serverName: string, toolName: string): string {
  return `${sanitizeServerName(serverName)}_${toolName}`;
}

async function loadStdioServer(config: MCPServerConfig): Promise<LoadedServer> {
  if (!config.command) {
    throw new Error(`Server ${config.name}: command is required for stdio transport`);
  }
  
  const serverParams: StdioServerParameters = {
    command: config.command,
    args: config.args || [],
    env: config.env,
  };
  
  const transport = new StdioClientTransport(serverParams);
  
  const client = new Client(
    {
      name: `mcp-center-${config.name}`,
      version: '1.0.0',
    },
    {}
  );
  
  await client.connect(transport);
  
  const toolsResponse = await client.listTools();
  const tools: ToolInfo[] = [];
  
  for (const tool of toolsResponse.tools || []) {
    if (config.enabledTools && config.enabledTools.length > 0) {
      if (!config.enabledTools.includes(tool.name)) {
        continue;
      }
    }
    
    tools.push({
      name: makeToolName(config.name, tool.name),
      originalName: tool.name,
      serverName: config.name,
      description: tool.description || '',
      inputSchema: tool.inputSchema || {},
    });
  }
  
  return {
    name: config.name,
    client,
    tools,
  };
}

async function loadHttpServer(config: MCPServerConfig): Promise<LoadedServer> {
  if (!config.url) {
    throw new Error(`Server ${config.name}: url is required for HTTP transport`);
  }
  
  const transport = new StreamableHTTPClientTransport(new URL(config.url));
  
  const client = new Client(
    {
      name: `mcp-center-${config.name}`,
      version: '1.0.0',
    },
    {}
  );
  
  await client.connect(transport);
  
  const toolsResponse = await client.listTools();
  const tools: ToolInfo[] = [];
  
  for (const tool of toolsResponse.tools || []) {
    if (config.enabledTools && config.enabledTools.length > 0) {
      if (!config.enabledTools.includes(tool.name)) {
        continue;
      }
    }
    
    tools.push({
      name: makeToolName(config.name, tool.name),
      originalName: tool.name,
      serverName: config.name,
      description: tool.description || '',
      inputSchema: tool.inputSchema || {},
    });
  }
  
  return {
    name: config.name,
    client,
    tools,
  };
}

function determineTransportType(config: MCPServerConfig): 'stdio' | 'http' {
  if (config.url) {
    return 'http';
  }
  return 'stdio';
}

export async function loadServer(config: MCPServerConfig): Promise<LoadedServer> {
  const transportType = determineTransportType(config);
  
  console.log(`[mcp-center] Loading server "${config.name}" (${transportType} transport)`);
  
  let loadedServer: LoadedServer;
  
  if (transportType === 'http') {
    loadedServer = await loadHttpServer(config);
  } else {
    loadedServer = await loadStdioServer(config);
  }
  
  console.log(`[mcp-center] Loaded ${loadedServer.tools.length} tool(s) from "${config.name}"`);
  
  loadedServers.set(config.name, loadedServer);
  
  return loadedServer;
}

export async function reloadServer(config: MCPServerConfig): Promise<LoadedServer> {
  const existing = loadedServers.get(config.name);
  if (existing) {
    try {
      await existing.client.close();
    } catch (error) {
      console.warn(`[mcp-center] Error closing server ${config.name}:`, error);
    }
  }
  
  return loadServer(config);
}

export async function loadAllServers(configs: MCPServerConfig[]): Promise<LoadedServer[]> {
  const results: LoadedServer[] = [];
  
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

export function getAllTools(): ToolInfo[] {
  const allTools: ToolInfo[] = [];
  
  for (const server of loadedServers.values()) {
    allTools.push(...server.tools);
  }
  
  return allTools;
}

export async function callTool(toolName: string, args: any): Promise<any> {
  for (const server of loadedServers.values()) {
    const tool = server.tools.find(t => t.name === toolName);
    
    if (tool) {
      const result = await server.client.callTool(
        {
          name: tool.originalName,
          arguments: args,
        }
      );
      
      return result;
    }
  }
  
  throw new Error(`Tool not found: ${toolName}`);
}

export async function closeAllServers(): Promise<void> {
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

export function getLoadedServers(): Map<string, LoadedServer> {
  return loadedServers;
}
