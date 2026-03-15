/**
 * HTTP integration tests for resources and prompts in mcp-center.
 *
 * These tests verify that resources and prompts work correctly over HTTP transport.
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
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Mock data
const MOCK_TOOLS = [
  {
    name: 'mock_echo',
    description: 'Echoes the input back',
    inputSchema: {
      type: 'object',
      properties: { message: { type: 'string' } },
      required: ['message'],
    },
  },
];

const MOCK_RESOURCES = [
  {
    uri: 'mock_test://greeting',
    name: 'Greeting',
    description: 'A greeting message',
    mimeType: 'text/plain',
  },
];

const MOCK_PROMPTS = [
  {
    name: 'mock_greeting',
    description: 'Generate a greeting',
    arguments: [{ name: 'name', description: 'Name to greet', required: true }],
  },
];

function createTestMcpServer() {
  const srv = new Server(
    { name: 'mcp-center-test', version: '1.0.0' },
    { capabilities: { tools: {}, resources: {}, prompts: {} } }
  );

  srv.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: MOCK_TOOLS,
  }));

  srv.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    if (name === 'mock_echo') {
      return {
        content: [{ type: 'text', text: `echo: ${args.message}` }],
      };
    }
    return {
      content: [{ type: 'text', text: `Tool not found: ${name}` }],
      isError: true,
    };
  });

  srv.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: MOCK_RESOURCES,
  }));

  srv.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    if (uri === 'mock_test://greeting') {
      return {
        contents: [
          {
            uri: 'mock_test://greeting',
            mimeType: 'text/plain',
            text: 'Hello from HTTP test!',
          },
        ],
      };
    }
    return {
      contents: [
        {
          uri,
          mimeType: 'text/plain',
          text: `Resource not found: ${uri}`,
        },
      ],
    };
  });

  srv.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: MOCK_PROMPTS,
  }));

  srv.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    if (name === 'mock_greeting') {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please greet ${args?.name || 'World'}`,
            },
          },
        ],
      };
    }
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Prompt not found: ${name}`,
          },
        },
      ],
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

      // New session
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

// Tests
describe('HTTP server integration — resources and prompts', () => {
  const PORT = 13580;
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

  describe('Resources', () => {
    it('should list resources via HTTP', async () => {
      const { client } = await makeClient();
      try {
        const result = await client.listResources();
        expect(result.resources).toHaveLength(1);
        expect(result.resources[0].uri).toBe('mock_test://greeting');
        expect(result.resources[0].name).toBe('Greeting');
      } finally {
        await client.close();
      }
    });

    it('should read resource successfully — attempt 1', async () => {
      const { client } = await makeClient();
      try {
        const result = await client.readResource({ uri: 'mock_test://greeting' });
        expect(result.contents).toBeDefined();
        expect(result.contents[0].text).toBe('Hello from HTTP test!');
      } finally {
        await client.close();
      }
    });

    it('should read resource successfully — attempt 2', async () => {
      const { client } = await makeClient();
      try {
        const result = await client.readResource({ uri: 'mock_test://greeting' });
        expect(result.contents).toBeDefined();
        expect(result.contents[0].text).toBe('Hello from HTTP test!');
      } finally {
        await client.close();
      }
    });

    it('should read resource successfully — attempt 3', async () => {
      const { client } = await makeClient();
      try {
        const result = await client.readResource({ uri: 'mock_test://greeting' });
        expect(result.contents).toBeDefined();
        expect(result.contents[0].text).toBe('Hello from HTTP test!');
      } finally {
        await client.close();
      }
    });
  });

  describe('Prompts', () => {
    it('should list prompts via HTTP', async () => {
      const { client } = await makeClient();
      try {
        const result = await client.listPrompts();
        expect(result.prompts).toHaveLength(1);
        expect(result.prompts[0].name).toBe('mock_greeting');
        expect(result.prompts[0].description).toBe('Generate a greeting');
      } finally {
        await client.close();
      }
    });

    it('should get prompt successfully — attempt 1', async () => {
      const { client } = await makeClient();
      try {
        const result = await client.getPrompt({ name: 'mock_greeting', arguments: { name: 'Alice' } });
        expect(result.messages).toBeDefined();
        expect(result.messages[0].content.text).toContain('Alice');
      } finally {
        await client.close();
      }
    });

    it('should get prompt successfully — attempt 2', async () => {
      const { client } = await makeClient();
      try {
        const result = await client.getPrompt({ name: 'mock_greeting', arguments: { name: 'Bob' } });
        expect(result.messages).toBeDefined();
        expect(result.messages[0].content.text).toContain('Bob');
      } finally {
        await client.close();
      }
    });

    it('should get prompt successfully — attempt 3', async () => {
      const { client } = await makeClient();
      try {
        const result = await client.getPrompt({ name: 'mock_greeting', arguments: { name: 'Charlie' } });
        expect(result.messages).toBeDefined();
        expect(result.messages[0].content.text).toContain('Charlie');
      } finally {
        await client.close();
      }
    });
  });
});
