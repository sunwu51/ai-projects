/**
 * Test stdio MCP server that requires SECRET_KEY env variable.
 * Usage: SECRET_KEY=my-secret node tests/test-stdio-env-server.js
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const SECRET_KEY = process.env.SECRET_KEY;

if (!SECRET_KEY) {
  console.error('[test-stdio-env-server] ERROR: SECRET_KEY env variable is required');
  process.exit(1);
}

const srv = new Server(
  { name: 'test-stdio-env-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

srv.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: 'secret_echo',
    description: 'Echoes the secret key back (proves env was passed)',
    inputSchema: { type: 'object', properties: {} },
  }],
}));

srv.setRequestHandler(CallToolRequestSchema, async () => ({
  content: [{ type: 'text', text: `Secret key received: ${SECRET_KEY}` }],
}));

const transport = new StdioServerTransport();
await srv.connect(transport);
console.error(`[test-stdio-env-server] Running with SECRET_KEY=${SECRET_KEY}`);
