/**
 * Integration tests verifying:
 * 1. HTTP server with required auth header works correctly
 * 2. stdio server with required env var works correctly
 * 3. Server status is tracked and exposed via API
 */
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createServer } from 'http';
import { randomUUID } from 'crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { loadServer, reloadServer, getAllTools, getServerStatus, closeAllServers } from '../src/loader.js';

const AUTH_TOKEN = 'test-secret-token';
const AUTH_SERVER_PORT = 3201;

// --- Minimal auth-gated HTTP MCP server ---
function startAuthHttpServer() {
  const sessions = new Map();

  function makeMcp() {
    const srv = new Server(
      { name: 'auth-test', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    srv.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [{ name: 'ping', description: 'ping', inputSchema: { type: 'object', properties: {} } }],
    }));
    srv.setRequestHandler(CallToolRequestSchema, async () => ({
      content: [{ type: 'text', text: 'pong' }],
    }));
    return srv;
  }

  const httpServer = createServer(async (req, res) => {
    const auth = req.headers['authorization'];
    if (!auth || auth !== `Bearer ${AUTH_TOKEN}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
    const url = new URL(req.url, `http://localhost:${AUTH_SERVER_PORT}`);
    if (url.pathname === '/mcp' && req.method === 'POST') {
      const sessionId = randomUUID();
      const mcpServer = makeMcp();
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
        res.writeHead(404); res.end('Session not found');
      }
      return;
    }
    res.writeHead(404); res.end('Not Found');
  });

  return new Promise((resolve, reject) => {
    httpServer.listen(AUTH_SERVER_PORT, () => resolve(httpServer));
    httpServer.on('error', reject);
  });
}

let authHttpServer;

beforeAll(async () => {
  authHttpServer = await startAuthHttpServer();
}, 15000);

afterAll(async () => {
  await closeAllServers();
  await new Promise(resolve => authHttpServer.close(resolve));
});

// ---- Bug 1: HTTP headers ----
describe('Bug 1: HTTP server with required auth header', () => {
  test('fails to connect WITHOUT the required header', async () => {
    const config = {
      name: 'http-no-auth',
      url: `http://localhost:${AUTH_SERVER_PORT}/mcp`,
    };
    await expect(loadServer(config)).rejects.toThrow();
    const status = getServerStatus().get('http-no-auth');
    expect(status).toBeDefined();
    expect(status.status).toBe('failed');
    expect(status.error).toBeTruthy();
  });

  test('connects successfully WITH the required header', async () => {
    const config = {
      name: 'http-with-auth',
      url: `http://localhost:${AUTH_SERVER_PORT}/mcp`,
      httpHeaders: { Authorization: `Bearer ${AUTH_TOKEN}` },
    };
    const loaded = await loadServer(config);
    expect(loaded.tools.length).toBe(1);
    expect(loaded.tools[0].name).toBe('http-with-auth_ping');
    const status = getServerStatus().get('http-with-auth');
    expect(status.status).toBe('connected');
  });
});

// ---- Bug 2: stdio env ----
describe('Bug 2: stdio server with required env var', () => {
  test('fails to connect WITHOUT the required env var', async () => {
    const config = {
      name: 'stdio-no-env',
      command: 'node',
      args: ['tests/test-stdio-env-server.js'],
      // no env — SECRET_KEY not set
    };
    await expect(loadServer(config)).rejects.toThrow();
    const status = getServerStatus().get('stdio-no-env');
    expect(status).toBeDefined();
    expect(status.status).toBe('failed');
  });

  test('connects successfully WITH the required env var', async () => {
    const config = {
      name: 'stdio-with-env',
      command: 'node',
      args: ['tests/test-stdio-env-server.js'],
      env: { SECRET_KEY: 'my-secret' },
    };
    const loaded = await loadServer(config);
    expect(loaded.tools.length).toBe(1);
    expect(loaded.tools[0].name).toBe('stdio-with-env_secret_echo');
    const status = getServerStatus().get('stdio-with-env');
    expect(status.status).toBe('connected');
  });
});

// ---- Bug 3: status tracking ----
describe('Bug 3: server status tracking', () => {
  test('status map reflects connected and failed servers', () => {
    const statusMap = getServerStatus();
    expect(statusMap.get('http-no-auth').status).toBe('failed');
    expect(statusMap.get('http-with-auth').status).toBe('connected');
    expect(statusMap.get('stdio-no-env').status).toBe('failed');
    expect(statusMap.get('stdio-with-env').status).toBe('connected');
  });
});

describe('Bug 4: in-place config mutation should still trigger reload', () => {
  afterAll(async () => {
    await closeAllServers();
  });

  test('disabling an already loaded server removes its tools immediately', async () => {
    const config = {
      name: 'toggle-test',
      command: 'node',
      args: ['tests/test-mcp-server.js'],
    };

    await loadServer(config);
    expect(getAllTools().some(tool => tool.name === 'toggle-test_echo')).toBe(true);
    expect(getServerStatus().get('toggle-test').status).toBe('connected');

    config.enabled = false;
    await reloadServer(config);

    expect(getAllTools().some(tool => tool.name === 'toggle-test_echo')).toBe(false);
    expect(getServerStatus().get('toggle-test').status).toBe('disabled');
  });
});
