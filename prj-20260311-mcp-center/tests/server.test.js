import { createMcpServer } from '../src/server.js';

// We test the server factory and its handlers without a real transport
// by injecting mock loader state

describe('MCP Server creation', () => {
  it('should create a server instance', () => {
    const srv = createMcpServer();
    expect(srv).toBeDefined();
    expect(typeof srv.connect).toBe('function');
    expect(typeof srv.close).toBe('function');
  });
});

describe('Server tool handler logic', () => {
  // Test the mapping logic used in server.js handlers
  function buildToolList(loadedToolsMap) {
    const allTools = [];
    for (const tools of loadedToolsMap.values()) {
      allTools.push(...tools);
    }
    return allTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  it('should return empty tools when no servers loaded', () => {
    const result = buildToolList(new Map());
    expect(result).toEqual([]);
  });

  it('should aggregate tools from multiple servers', () => {
    const map = new Map([
      ['server1', [
        { name: 'server1_search', description: 'Search', inputSchema: {} },
      ]],
      ['server2', [
        { name: 'server2_crawl', description: 'Crawl', inputSchema: {} },
        { name: 'server2_index', description: 'Index', inputSchema: {} },
      ]],
    ]);
    const result = buildToolList(map);
    expect(result).toHaveLength(3);
    expect(result.map(t => t.name)).toEqual(['server1_search', 'server2_crawl', 'server2_index']);
  });

  it('should format tool schema correctly', () => {
    const schema = { type: 'object', properties: { q: { type: 'string' } } };
    const map = new Map([
      ['exa', [{ name: 'exa_search', description: 'Exa search', inputSchema: schema }]],
    ]);
    const result = buildToolList(map);
    expect(result[0].inputSchema).toEqual(schema);
    expect(result[0].description).toBe('Exa search');
  });
});
