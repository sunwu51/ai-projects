#!/usr/bin/env node

/**
 * A simple test MCP server with tools, resources, and prompts
 * This server is used for testing the mcp-center proxy functionality
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Create the test server
const server = new Server(
  { name: 'test-server', version: '1.0.0' },
  { capabilities: { tools: {}, resources: {}, prompts: {} } }
);

// Define tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'echo',
      description: 'Echoes back the input message',
      inputSchema: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'The message to echo' },
        },
        required: ['message'],
      },
    },
    {
      name: 'add',
      description: 'Adds two numbers',
      inputSchema: {
        type: 'object',
        properties: {
          a: { type: 'number', description: 'First number' },
          b: { type: 'number', description: 'Second number' },
        },
        required: ['a', 'b'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'echo') {
    return {
      content: [{ type: 'text', text: `Echo: ${args.message}` }],
    };
  }

  if (name === 'add') {
    const result = args.a + args.b;
    return {
      content: [{ type: 'text', text: `Result: ${result}` }],
    };
  }

  return {
    content: [{ type: 'text', text: `Unknown tool: ${name}` }],
    isError: true,
  };
});

// Define resources
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: 'test://greeting',
      name: 'Greeting Resource',
      description: 'A simple greeting message',
      mimeType: 'text/plain',
    },
    {
      uri: 'test://data',
      name: 'Data Resource',
      description: 'Some JSON data',
      mimeType: 'application/json',
    },
  ],
}));

server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
  resourceTemplates: [
    {
      uriTemplate: 'test://user/{userId}/profile',
      name: 'User Profile',
      description: 'Returns the profile data for a specific user',
      mimeType: 'application/json',
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === 'test://greeting') {
    return {
      contents: [
        {
          uri: 'test://greeting',
          mimeType: 'text/plain',
          text: 'Hello from test server!',
        },
      ],
    };
  }

  if (uri === 'test://data') {
    return {
      contents: [
        {
          uri: 'test://data',
          mimeType: 'application/json',
          text: JSON.stringify({ status: 'ok', timestamp: Date.now() }),
        },
      ],
    };
  }

  // Handle resource template: test://user/{userId}/profile
  const userProfileMatch = uri.match(/^test:\/\/user\/([^/]+)\/profile$/);
  if (userProfileMatch) {
    const userId = userProfileMatch[1];
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            userId,
            name: `User ${userId}`,
            email: `user${userId}@test.com`,
          }),
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

// Define prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [
    {
      name: 'greeting',
      description: 'Generate a greeting message',
      arguments: [
        {
          name: 'name',
          description: 'The name to greet',
          required: true,
        },
      ],
    },
    {
      name: 'summary',
      description: 'Generate a summary prompt',
      arguments: [
        {
          name: 'topic',
          description: 'The topic to summarize',
          required: true,
        },
        {
          name: 'length',
          description: 'Desired length (short/medium/long)',
          required: false,
        },
      ],
    },
  ],
}));

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'greeting') {
    const userName = args?.name || 'World';
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please greet ${userName} in a friendly way.`,
          },
        },
      ],
    };
  }

  if (name === 'summary') {
    const topic = args?.topic || 'unknown topic';
    const length = args?.length || 'medium';
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please provide a ${length} summary of: ${topic}`,
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
          text: `Unknown prompt: ${name}`,
        },
      },
    ],
  };
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[test-server] Test MCP server running on stdio');
}

main().catch((error) => {
  console.error('[test-server] Fatal error:', error);
  process.exit(1);
});
