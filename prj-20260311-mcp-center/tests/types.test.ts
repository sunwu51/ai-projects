import { MCPServerConfigSchema, MCPConfigSchema } from '../src/types.js';

describe('Types', () => {
  describe('Tool name sanitization', () => {
    it('should sanitize server names with special characters', () => {
      const testServerConfig = {
        name: 'test-server@123',
        url: 'https://example.com/mcp',
      };
      const result = MCPServerConfigSchema.safeParse(testServerConfig);
      expect(result.success).toBe(true);
    });
    
    it('should allow valid server names', () => {
      const testServerConfig = {
        name: 'my_server-123',
        url: 'https://example.com/mcp',
      };
      const result = MCPServerConfigSchema.safeParse(testServerConfig);
      expect(result.success).toBe(true);
    });
  });
  
  describe('Config validation', () => {
    it('should handle empty enabledTools array', () => {
      const testServerConfig = {
        name: 'test',
        url: 'https://example.com/mcp',
        enabledTools: [],
      };
      const result = MCPServerConfigSchema.safeParse(testServerConfig);
      expect(result.success).toBe(true);
    });
    
    it('should handle undefined enabledTools', () => {
      const testServerConfig = {
        name: 'test',
        url: 'https://example.com/mcp',
      };
      const result = MCPServerConfigSchema.safeParse(testServerConfig);
      expect(result.success).toBe(true);
    });
    
    it('should handle env variables', () => {
      const testServerConfig = {
        name: 'test',
        command: 'npx',
        args: ['-y', 'server'],
        env: {
          API_KEY: 'test-key',
          OTHER_VAR: 'value',
        },
      };
      const result = MCPServerConfigSchema.safeParse(testServerConfig);
      expect(result.success).toBe(true);
    });
  });
});
