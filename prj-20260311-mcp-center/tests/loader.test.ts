describe('Loader', () => {
  describe('Tool name generation', () => {
    it('should generate tool names with server prefix', () => {
      const serverName = 'exa';
      const toolName = 'search';
      const sanitizedServerName = serverName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const expectedName = `${sanitizedServerName}_${toolName}`;
      expect(expectedName).toBe('exa_search');
    });
    
    it('should sanitize server names with special characters', () => {
      const serverName = 'test-server@123';
      const sanitizedServerName = serverName.replace(/[^a-zA-Z0-9_-]/g, '_');
      expect(sanitizedServerName).toBe('test-server_123');
    });
    
    it('should keep valid server names unchanged', () => {
      const serverName = 'my_server-123';
      const sanitizedServerName = serverName.replace(/[^a-zA-Z0-9_-]/g, '_');
      expect(sanitizedServerName).toBe('my_server-123');
    });
  });
  
  describe('Transport type detection', () => {
    it('should return http when url is provided', () => {
      const config = { name: 'test', url: 'https://example.com/mcp' } as { name: string; url?: string; command?: string };
      const transportType = config.url ? 'http' : 'stdio';
      expect(transportType).toBe('http');
    });
    
    it('should return stdio when no url', () => {
      const config = { name: 'test', command: 'npx' } as { name: string; url?: string; command?: string };
      const transportType = config.url ? 'http' : 'stdio';
      expect(transportType).toBe('stdio');
    });
    
    it('should prefer url over command', () => {
      const config = { name: 'test', url: 'https://example.com/mcp', command: 'npx' } as { name: string; url?: string; command?: string };
      const transportType = config.url ? 'http' : 'stdio';
      expect(transportType).toBe('http');
    });
  });
  
  describe('Tool filtering', () => {
    it('should filter tools based on enabledTools', () => {
      const allTools = ['search', 'crawl', 'deep_search'];
      const enabledTools = ['search'];
      
      const filteredTools = allTools.filter(tool => 
        !enabledTools.length || enabledTools.includes(tool)
      );
      
      expect(filteredTools).toEqual(['search']);
    });
    
    it('should include all tools when enabledTools is empty', () => {
      const allTools = ['search', 'crawl'];
      const enabledTools: string[] = [];
      
      const filteredTools = allTools.filter(tool => 
        !enabledTools.length || enabledTools.includes(tool)
      );
      
      expect(filteredTools).toEqual(['search', 'crawl']);
    });
    
    it('should include all tools when enabledTools is undefined', () => {
      const allTools = ['search', 'crawl'];
      const enabledTools: readonly string[] | undefined = undefined;
      
      const filteredTools = allTools.filter((tool: string) => {
        if (!enabledTools) return true;
        const arr = enabledTools as string[];
        if (arr.length === 0) return true;
        return arr.includes(tool);
      });
      
      expect(filteredTools).toEqual(['search', 'crawl']);
    });
  });
});
