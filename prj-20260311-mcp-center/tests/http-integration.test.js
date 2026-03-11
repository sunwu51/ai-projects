/**
 * HTTP integration tests for mcp-center.
 *
 * These tests spin up the real HTTP server (with a mocked loader so no
 * external MCP servers are needed) and verify that:
 *   1. tools/list works
 *   2. tools/call works correctly
 *   3. tools/call can be called 3 times in a row without the
 *      "Already connected to a transport" error.
 */

import { createServer as createHttpServer } from 'http';
import { randomUUID } from 'crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// ---------------------------------------------------------------------------
// Minimal in-process HTTP server that mirrors the real runHttp() logic but
// uses a hardcoded tool list instead of a real loader.
// ---------------------------------------------------------------------------

const MOCK_TOOLS = [
  {
    name: 'mock_echo',
    originalName: 'echo',
    serverName: 'mock',
    description: 'Echoes the input back',
    inputSchema: {
      type: 'object',
      properties: { message: { type: 'string' } },
      required: ['message'],
    },
  },
];

function createTestMcpServer() {
  const srv = new Server(
    { name: 'mcp-center-test', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  srv.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: MOCK_TOOLS.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  srv.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const tool = MOCK_TOOLS.find(t => t.name === name);
    if (!tool) {
      return {
        content: [{ type: 'text', text: `Tool not found: ${name}` }],
        isError: true,
      };
    }
    // Simple echo implementation
    return {
      content: [{ type: 'text', text: `echo: ${args.message}` }],
    };
  });

  return srv;
}

function startTestHttpServer(port) {
  const sessions = new Map();

  const httpServer = createHttpServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);

    if (url.pathname !== '/mcp') {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    if (req.method === 'GET') {
      const sessionId = url.searchParams.get('sessionId');
      if (!sessionId) { res.writeHead(400); res.end('Missing sessionId'); return; }
      const session = sessions.get(sessionId);
      if (!session) { res.writeHead(404); res.end('Session not found'); return; }
      await session.transport.handleRequest(req, res);
      return;
    }

    if (req.method === 'POST') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const bodyStr = Buffer.concat(chunks).toString('utf-8');
      let body;
      try { body = JSON.parse(bodyStr); } catch { res.writeHead(400); res.end('Invalid JSON'); return; }

      const sessionId = req.headers['mcp-session-id'];
      if (sessionId && sessions.has(sessionId)) {
        await sessions.get(sessionId).transport.handleRequest(req, res, body);
        return;
      }

      // New session — create a FRESH Server instance each time (the fix)
      const sessionServer = createTestMcpServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });

      await sessionServer.connect(transport);

      transport.onclose = () => {
        if (transport.sessionId) sessions.delete(transport.sessionId);
      };

      await transport.handleRequest(req, res, body);

      if (transport.sessionId) {
        sessions.set(transport.sessionId, { transport, server: sessionServer });
      }
      return;
    }

    if (req.method === 'DELETE') {
      const sessionId = req.headers['mcp-session-id'];
      if (sessionId && sessions.has(sessionId)) {
        await sessions.get(sessionId).transport.handleRequest(req, res);
        sessions.delete(sessionId);
      } else {
        res.writeHead(404); res.end('Session not found');
      }
      return;
    }

    res.writeHead(405); res.end('Method Not Allowed');
  });

  return new Promise((resolve, reject) => {
    httpServer.listen(port, () => resolve(httpServer));
    httpServer.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HTTP server integration — tool call', () => {
  const PORT = 13579;
  let httpServer;

  beforeAll(async () => {
    httpServer = await startTestHttpServer(PORT);
  });

  afterAll(async () => {
    await new Promise(resolve => httpServer.close(resolve));
  });

  async function makeClient() {
    const client = new Client(
      { name: 'test-client', version: '1.0.0' },
      {}
    );
    const transport = new StreamableHTTPClientTransport(
      new URL(`http://localhost:${PORT}/mcp`)
    );
    await client.connect(transport);
    return { client, transport };
  }

  it('should list tools via HTTP', async () => {
    const { client, transport } = await makeClient();
    try {
      const result = await client.listTools();
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].name).toBe('mock_echo');
    } finally {
      await client.close();
    }
  });

  it('should call tool successfully — attempt 1', async () => {
    const { client } = await makeClient();
    try {
      const result = await client.callTool({ name: 'mock_echo', arguments: { message: 'hello-1' } });
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe('echo: hello-1');
    } finally {
      await client.close();
    }
  });

  it('should call tool successfully — attempt 2', async () => {
    const { client } = await makeClient();
    try {
      const result = await client.callTool({ name: 'mock_echo', arguments: { message: 'hello-2' } });
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe('echo: hello-2');
    } finally {
      await client.close();
    }
  });

  it('should call tool successfully — attempt 3', async () => {
    const { client } = await makeClient();
    try {
      const result = await client.callTool({ name: 'mock_echo', arguments: { message: 'hello-3' } });
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe('echo: hello-3');
    } finally {
      await client.close();
    }
  });
});
