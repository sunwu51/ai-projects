import { createServer as createHttpServer } from 'http';
import { randomUUID } from 'crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
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
import { loadConfig, watchConfig, getConfig, getDefaultConfigPath, unwatchConfig } from './config.js';

/**
 * Create an MCP Server instance with tool handlers
 * @returns {Server}
 */
export function createMcpServer() {
  const srv = new Server(
    { name: 'mcp-center', version: '1.0.0' },
    { capabilities: { tools: {} } }
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
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message || String(error)}` }],
        isError: true,
      };
    }
  });

  return srv;
}

/**
 * Reload all servers based on current config
 * @returns {Promise<void>}
 */
async function reloadAllServers() {
  const config = getConfig();
  if (!config) return;

  console.log('[mcp-center] Reloading servers...');

  const loadedServers = getLoadedServers();
  const existingNames = new Set(config.servers.map(s => s.name));

  // Close servers not in new config
  for (const [name, loaded] of loadedServers) {
    if (!existingNames.has(name)) {
      try {
        await loaded.client.close();
        loadedServers.delete(name);
        console.log(`[mcp-center] Removed server "${name}"`);
      } catch (error) {
        console.warn(`[mcp-center] Error closing server "${name}":`, error);
      }
    }
  }

  // Reload all servers
  for (const serverConfig of config.servers) {
    try {
      await reloadServer(serverConfig);
    } catch (error) {
      console.error(`[mcp-center] Failed to reload server "${serverConfig.name}":`, error);
    }
  }

  console.log('[mcp-center] Reload complete');
}

/**
 * Run in stdio mode
 * @param {Server} mcpServer
 * @returns {Promise<void>}
 */
async function runStdio(mcpServer) {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error('[mcp-center] Server running on stdio');

  const shutdown = async () => {
    console.error('[mcp-center] Shutting down...');
    unwatchConfig();
    await closeAllServers();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

/**
 * Run in HTTP Streamable mode
 * @param {number} port
 * @returns {Promise<void>}
 */
async function runHttp(port) {
  // Store sessions: sessionId -> {transport, server}
  const sessions = new Map();

  const httpServer = createHttpServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);

    if (url.pathname !== '/mcp') {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    if (req.method === 'GET') {
      // SSE for notifications
      const sessionId = url.searchParams.get('sessionId');
      if (!sessionId) {
        res.writeHead(400);
        res.end('Missing sessionId');
        return;
      }
      const session = sessions.get(sessionId);
      if (!session) {
        res.writeHead(404);
        res.end('Session not found');
        return;
      }
      await session.transport.handleRequest(req, res);
      return;
    }

    if (req.method === 'POST') {
      // Read request body
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const bodyStr = Buffer.concat(chunks).toString('utf-8');

      let body;
      try {
        body = JSON.parse(bodyStr);
      } catch {
        res.writeHead(400);
        res.end('Invalid JSON');
        return;
      }

      // Check if this is an existing session
      const sessionId = req.headers['mcp-session-id'];
      if (sessionId && sessions.has(sessionId)) {
        const session = sessions.get(sessionId);
        await session.transport.handleRequest(req, res, body);
        return;
      }

      // New session - create a fresh Server instance per connection
      const sessionServer = createMcpServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });

      await sessionServer.connect(transport);

      transport.onclose = () => {
        if (transport.sessionId) {
          sessions.delete(transport.sessionId);
          console.log(`[mcp-center] Session ${transport.sessionId} closed`);
        }
      };

      await transport.handleRequest(req, res, body);

      if (transport.sessionId) {
        sessions.set(transport.sessionId, { transport, server: sessionServer });
        console.log(`[mcp-center] New session: ${transport.sessionId}`);
      }
      return;
    }

    if (req.method === 'DELETE') {
      const sessionId = req.headers['mcp-session-id'];
      if (sessionId && sessions.has(sessionId)) {
        const session = sessions.get(sessionId);
        await session.transport.handleRequest(req, res);
        sessions.delete(sessionId);
      } else {
        res.writeHead(404);
        res.end('Session not found');
      }
      return;
    }

    res.writeHead(405);
    res.end('Method Not Allowed');
  });

  await new Promise((resolve, reject) => {
    httpServer.listen(port, () => {
      console.log(`[mcp-center] HTTP server running on http://localhost:${port}/mcp`);
      resolve();
    });
    httpServer.on('error', reject);
  });

  const shutdown = async () => {
    console.log('[mcp-center] Shutting down...');
    unwatchConfig();
    await closeAllServers();
    httpServer.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return httpServer;
}

/**
 * Main entry point to run the mcp-center server
 * @param {'stdio'|'http'} transport
 * @param {string|undefined} configPath
 * @returns {Promise<void>}
 */
export async function runServer(transport, configPath) {
  const path = configPath || getDefaultConfigPath();
  console.log(`[mcp-center] Loading config from: ${path}`);

  const config = loadConfig(path);
  console.log(`[mcp-center] Loaded ${config.servers.length} server(s) from config`);

  await loadAllServers(config.servers);

  const mcpServer = createMcpServer();

  watchConfig(reloadAllServers);

  console.log(`[mcp-center] Starting MCP Center server (${transport} transport)...`);

  if (transport === 'stdio') {
    await runStdio(mcpServer);
  } else {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    await runHttp(port);
  }
}
