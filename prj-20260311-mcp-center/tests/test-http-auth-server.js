/**
 * Test HTTP MCP server that requires Authorization header.
 * Usage: node tests/test-http-auth-server.js
 * Requires header: Authorization: Bearer test-secret-token
 */
import { createServer } from 'http';
import { randomUUID } from 'crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const REQUIRED_TOKEN = 'test-secret-token';
const PORT = process.env.AUTH_SERVER_PORT ? parseInt(process.env.AUTH_SERVER_PORT) : 3101;

function createMcpServer() {
  const srv = new Server(
    { name: 'test-http-auth-server', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  srv.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [{
      name: 'hello',
      description: 'Says hello',
      inputSchema: { type: 'object', properties: { name: { type: 'string' } } },
    }],
  }));

  srv.setRequestHandler(CallToolRequestSchema, async (req) => ({
    content: [{ type: 'text', text: `Hello, ${req.params.arguments?.name || 'world'}!` }],
  }));

  return srv;
}

const sessions = new Map();

const httpServer = createServer(async (req, res) => {
  // Check auth header
  const auth = req.headers['authorization'];
  if (!auth || auth !== `Bearer ${REQUIRED_TOKEN}`) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized: missing or invalid Authorization header' }));
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/mcp' && req.method === 'POST') {
    const sessionId = randomUUID();
    const mcpServer = createMcpServer();
    const transport = new StreamableHTTPServerTransport('/mcp', sessionId);
    sessions.set(sessionId, { server: mcpServer, transport });
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res);
    return;
  }

  if (url.pathname.startsWith('/mcp/') && req.method === 'POST') {
    const sessionId = url.pathname.split('/')[2];
    if (sessions.has(sessionId)) {
      const session = sessions.get(sessionId);
      await session.transport.handleRequest(req, res);
      sessions.delete(sessionId);
    } else {
      res.writeHead(404);
      res.end('Session not found');
    }
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

httpServer.listen(PORT, () => {
  console.error(`[test-http-auth-server] Listening on http://localhost:${PORT}/mcp`);
  console.error(`[test-http-auth-server] Required header: Authorization: Bearer ${REQUIRED_TOKEN}`);
});
