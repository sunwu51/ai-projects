describe('Loader utilities', () => {
  describe('Tool name generation', () => {
    function sanitizeServerName(name) {
      return name.replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    function makeToolName(serverName, toolName) {
      return `${sanitizeServerName(serverName)}_${toolName}`;
    }

    it('should generate tool names with server prefix', () => {
      expect(makeToolName('exa', 'search')).toBe('exa_search');
    });

    it('should sanitize server names with special characters', () => {
      expect(sanitizeServerName('test-server@123')).toBe('test-server_123');
    });

    it('should keep valid server names unchanged', () => {
      expect(sanitizeServerName('my_server-123')).toBe('my_server-123');
    });

    it('should produce correct prefixed name for sanitized server', () => {
      expect(makeToolName('test-server@123', 'search')).toBe('test-server_123_search');
    });
  });

  describe('Transport type detection', () => {
    function getTransportType(config) {
      return config.url ? 'http' : 'stdio';
    }

    it('should return http when url is provided', () => {
      expect(getTransportType({ name: 'test', url: 'https://example.com/mcp' })).toBe('http');
    });

    it('should return stdio when no url', () => {
      expect(getTransportType({ name: 'test', command: 'npx' })).toBe('stdio');
    });

    it('should prefer url over command', () => {
      expect(getTransportType({ name: 'test', url: 'https://example.com/mcp', command: 'npx' })).toBe('http');
    });
  });

  describe('Tool filtering', () => {
    function filterTools(allTools, enabledTools) {
      if (!enabledTools || enabledTools.length === 0) return allTools;
      return allTools.filter(tool => enabledTools.includes(tool));
    }

    it('should filter tools based on enabledTools', () => {
      const allTools = ['search', 'crawl', 'deep_search'];
      expect(filterTools(allTools, ['search'])).toEqual(['search']);
    });

    it('should include all tools when enabledTools is empty', () => {
      const allTools = ['search', 'crawl'];
      expect(filterTools(allTools, [])).toEqual(['search', 'crawl']);
    });

    it('should include all tools when enabledTools is undefined', () => {
      const allTools = ['search', 'crawl'];
      expect(filterTools(allTools, undefined)).toEqual(['search', 'crawl']);
    });

    it('should return only listed tools', () => {
      const allTools = ['a', 'b', 'c', 'd'];
      expect(filterTools(allTools, ['b', 'd'])).toEqual(['b', 'd']);
    });
  });
});
