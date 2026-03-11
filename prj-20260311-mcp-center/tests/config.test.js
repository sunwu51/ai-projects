import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadConfig, getConfig, getDefaultConfigPath } from '../src/config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Config', () => {
  const testConfigPath = resolve(__dirname, 'test-mcp.json');

  afterEach(() => {
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }
  });

  describe('Config validation', () => {
    it('should accept a valid http server config', () => {
      const validConfig = {
        servers: [
          { name: 'test-server', url: 'https://example.com/mcp' },
        ],
      };
      writeFileSync(testConfigPath, JSON.stringify(validConfig));
      const result = loadConfig(testConfigPath);
      expect(result.servers[0].name).toBe('test-server');
    });

    it('should accept a valid stdio server config', () => {
      const validConfig = {
        servers: [
          { name: 'test-stdio', command: 'npx', args: ['-y', 'some-server'], enabledTools: ['tool1'] },
        ],
      };
      writeFileSync(testConfigPath, JSON.stringify(validConfig));
      const result = loadConfig(testConfigPath);
      expect(result.servers[0].name).toBe('test-stdio');
    });

    it('should reject config without servers array', () => {
      const invalidConfig = { notServers: [] };
      writeFileSync(testConfigPath, JSON.stringify(invalidConfig));
      expect(() => loadConfig(testConfigPath)).toThrow();
    });

    it('should reject server config without name', () => {
      const invalidConfig = {
        servers: [{ url: 'https://example.com/mcp' }],
      };
      writeFileSync(testConfigPath, JSON.stringify(invalidConfig));
      expect(() => loadConfig(testConfigPath)).toThrow();
    });
  });

  describe('loadConfig', () => {
    it('should load config from file', () => {
      const testConfig = {
        servers: [{ name: 'test-server', url: 'https://example.com/mcp' }],
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
      writeFileSync(testConfigPath, 'not json {{{');
      expect(() => loadConfig(testConfigPath)).toThrow();
    });

    it('should update currentConfig after load', () => {
      const testConfig = {
        servers: [{ name: 'test-server', url: 'https://example.com/mcp' }],
      };
      writeFileSync(testConfigPath, JSON.stringify(testConfig));
      loadConfig(testConfigPath);
      const current = getConfig();
      expect(current).not.toBeNull();
      expect(current.servers[0].name).toBe('test-server');
    });
  });

  describe('getDefaultConfigPath', () => {
    it('should return path ending with mcp.json', () => {
      const defaultPath = getDefaultConfigPath();
      expect(defaultPath).toContain('mcp.json');
    });
  });
});
