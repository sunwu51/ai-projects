import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  loadAllServers,
  reloadServer,
  getAllTools,
  callTool,
  closeAllServers,
  getLoadedServers,
} from './loader.js';
import { loadConfig, watchConfig, getConfig, unwatchConfig } from './config.js';

let currentTransport: 'stdio' | 'http' = 'stdio';

export function createServer(): Server {
  const srv = new Server(
    {
      name: 'mcp-center',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );
  
  srv.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = getAllTools();
    
    return {
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });
  
  srv.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    try {
      const result = await callTool(name, args);
      return result;
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message || String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });
  
  return srv;
}

async function reloadAllServers(): Promise<void> {
  const config = getConfig();
  if (!config) {
    return;
  }
  
  console.log('[mcp-center] Reloading servers...');
  
  const loadedServers = getLoadedServers();
  const existingNames = new Set(config.servers.map(s => s.name));
  
  for (const [name, loaded] of loadedServers) {
    if (!existingNames.has(name)) {
      try {
        await loaded.client.close();
        console.log(`[mcp-center] Removed server "${name}"`);
      } catch (error) {
        console.warn(`[mcp-center] Error closing server "${name}":`, error);
      }
    }
  }
  
  for (const serverConfig of config.servers) {
    try {
      await reloadServer(serverConfig);
    } catch (error) {
      console.error(`[mcp-center] Failed to reload server "${serverConfig.name}":`, error);
    }
  }
  
  console.log('[mcp-center] Reload complete');
}

export async function runServer(transport: 'stdio' | 'http', configPath: string): Promise<void> {
  currentTransport = transport;
  
  if (!configPath) {
    throw new Error('Config path is required. Use --config <path> or -c <path>');
  }
  
  console.log(`[mcp-center] Loading config from: ${configPath}`);
  
  const config = loadConfig(configPath);
  console.log(`[mcp-center] Loaded ${config.servers.length} server(s) from config`);
  
  await loadAllServers(config.servers);
  
  const server = createServer();
  
  watchConfig(reloadAllServers);
  
  console.log(`[mcp-center] Starting MCP Center server (${transport} transport)...`);
  
  if (transport === 'stdio') {
    const transportImpl = new StdioServerTransport();
    await server.connect(transportImpl);
    console.log('[mcp-center] Server running on stdio');
    
    process.on('SIGINT', async () => {
      console.log('[mcp-center] Shutting down...');
      unwatchConfig();
      await closeAllServers();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('[mcp-center] Shutting down...');
      unwatchConfig();
      await closeAllServers();
      process.exit(0);
    });
  } else {
    const app = createMcpExpressApp();
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    
    const handleMcpRequest = async (req: Request, res: Response) => {
      const srv = createServer();
      
      try {
        const transportImpl = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
        });
        
        await srv.connect(transportImpl);
        await transportImpl.handleRequest(req, res, req.body);
        
        res.on('close', () => {
          transportImpl.close();
          srv.close();
        });
      } catch (error) {
        console.error('[mcp-center] Error handling MCP request:', error);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal server error'
            },
            id: null
          });
        }
        srv.close();
      }
    };
    
    app.post('/mcp', handleMcpRequest);
    app.get('/mcp', handleMcpRequest);
    
    app.listen(port, () => {
      console.log(`[mcp-center] Server running on http://localhost:${port}/mcp`);
    });
    
    process.on('SIGINT', async () => {
      console.log('[mcp-center] Shutting down...');
      unwatchConfig();
      await closeAllServers();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('[mcp-center] Shutting down...');
      unwatchConfig();
      await closeAllServers();
      process.exit(0);
    });
  }
}
