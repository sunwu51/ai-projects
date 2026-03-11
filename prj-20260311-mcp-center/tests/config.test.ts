import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadConfig, getConfig, getDefaultConfigPath } from '../src/config.js';
import { MCPConfigSchema, MCPServerConfigSchema } from '../src/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Config', () => {
  const testConfigPath = resolve(__dirname, 'test-mcp.json');
  
  afterEach(() => {
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }
  });
  
  describe('MCPConfigSchema', () => {
    it('should validate a valid config', () => {
      const validConfig = {
        servers: [
          {
            name: 'test-server',
            url: 'https://example.com/mcp',
          },
        ],
      };
      const result = MCPConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });
    
    it('should validate stdio server config', () => {
      const validConfig = {
        servers: [
          {
            name: 'test-stdio',
            command: 'npx',
            args: ['-y', 'some-server'],
            enabledTools: ['tool1', 'tool2'],
          },
        ],
      };
      const result = MCPConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });
    
    it('should reject config without servers', () => {
      const invalidConfig = {};
      const result = MCPConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });
  
  describe('MCPServerConfigSchema', () => {
    it('should validate http server config', () => {
      const validConfig = {
        name: 'http-server',
        url: 'https://example.com/mcp',
        enabledTools: ['search'],
      };
      const result = MCPServerConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });
    
    it('should validate stdio server config', () => {
      const validConfig = {
        name: 'stdio-server',
        command: 'npx',
        args: ['-y', 'some-server'],
        env: { API_KEY: 'test' },
      };
      const result = MCPServerConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });
    
    it('should require name', () => {
      const invalidConfig = {
        url: 'https://example.com/mcp',
      };
      const result = MCPServerConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });
  
  describe('loadConfig', () => {
    it('should load config from file', () => {
      const testConfig = {
        servers: [
          {
            name: 'test-server',
            url: 'https://example.com/mcp',
          },
        ],
      };
      writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));
      
      const result = loadConfig(testConfigPath);
      expect(result.servers).toHaveLength(1);
      expect(result.servers[0].name).toBe('test-server');
    });
    
    it('should throw error for non-existent file', () => {
      expect(() => loadConfig('/non/existent/path.json')).toThrow();
    });
    
    it('should throw error for invalid JSON', () => {
      writeFileSync(testConfigPath, 'invalid json');
      expect(() => loadConfig(testConfigPath)).toThrow();
    });
  });
  
  describe('getDefaultConfigPath', () => {
    it('should return path to mcp.json in current directory', () => {
      const defaultPath = getDefaultConfigPath();
      expect(defaultPath).toContain('mcp.json');
    });
  });
});
