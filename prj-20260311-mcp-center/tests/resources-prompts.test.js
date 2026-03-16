/**
 * Integration tests for resources and prompts functionality
 * Tests that mcp-center correctly proxies resources and prompts from child servers
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { loadConfig } from '../src/config.js';
import { loadAllServers, getAllTools, getAllResources, getAllPrompts, callTool, readResource, getPrompt, closeAllServers } from '../src/loader.js';

describe('Resources and Prompts Integration', () => {
  beforeAll(async () => {
    // Load the test server configuration
    const config = loadConfig('./mcp.json');
    
    // Only load the test server (not exa which requires network)
    const testServerConfig = config.servers.find(s => s.name === 'test');
    if (testServerConfig) {
      await loadAllServers([testServerConfig]);
    }
  });

  afterAll(async () => {
    await closeAllServers();
  });

  describe('Tools', () => {
    it('should list tools with server prefix', async () => {
      const tools = getAllTools();
      
      // Should have test_echo and test_add
      expect(tools.length).toBeGreaterThanOrEqual(2);
      
      const echoTool = tools.find(t => t.name === 'test_echo');
      expect(echoTool).toBeDefined();
      expect(echoTool.originalName).toBe('echo');
      expect(echoTool.serverName).toBe('test');
      
      const addTool = tools.find(t => t.name === 'test_add');
      expect(addTool).toBeDefined();
      expect(addTool.originalName).toBe('add');
    });

    it('should call echo tool successfully', async () => {
      const result = await callTool('test_echo', { message: 'Hello World' });
      
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBe('Echo: Hello World');
    });

    it('should call add tool successfully', async () => {
      const result = await callTool('test_add', { a: 5, b: 3 });
      
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBe('Result: 8');
    });
  });

  describe('Resources', () => {
    it('should list resources with server prefix', async () => {
      const resources = getAllResources();
      
      // Should have test_test://greeting and test_test://data
      expect(resources.length).toBeGreaterThanOrEqual(2);
      
      const greetingResource = resources.find(r => r.uri === 'test_test://greeting');
      expect(greetingResource).toBeDefined();
      expect(greetingResource.originalUri).toBe('test://greeting');
      expect(greetingResource.serverName).toBe('test');
      expect(greetingResource.name).toBe('Greeting Resource');
      expect(greetingResource.mimeType).toBe('text/plain');
      
      const dataResource = resources.find(r => r.uri === 'test_test://data');
      expect(dataResource).toBeDefined();
      expect(dataResource.originalUri).toBe('test://data');
      expect(dataResource.mimeType).toBe('application/json');
    });

    it('should read greeting resource successfully', async () => {
      const result = await readResource('test_test://greeting');
      
      expect(result.contents).toBeDefined();
      expect(result.contents.length).toBeGreaterThan(0);
      expect(result.contents[0].text).toBe('Hello from test server!');
      expect(result.contents[0].mimeType).toBe('text/plain');
    });

    it('should read data resource successfully', async () => {
      const result = await readResource('test_test://data');
      
      expect(result.contents).toBeDefined();
      expect(result.contents.length).toBeGreaterThan(0);
      
      const data = JSON.parse(result.contents[0].text);
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeDefined();
      expect(result.contents[0].mimeType).toBe('application/json');
    });
  });

  describe('Prompts', () => {
    it('should list prompts with server prefix', async () => {
      const prompts = getAllPrompts();
      
      // Should have test_greeting and test_summary
      expect(prompts.length).toBeGreaterThanOrEqual(2);
      
      const greetingPrompt = prompts.find(p => p.name === 'test_greeting');
      expect(greetingPrompt).toBeDefined();
      expect(greetingPrompt.originalName).toBe('greeting');
      expect(greetingPrompt.serverName).toBe('test');
      expect(greetingPrompt.description).toBe('Generate a greeting message');
      expect(greetingPrompt.arguments).toBeDefined();
      expect(greetingPrompt.arguments.length).toBeGreaterThan(0);
      
      const summaryPrompt = prompts.find(p => p.name === 'test_summary');
      expect(summaryPrompt).toBeDefined();
      expect(summaryPrompt.originalName).toBe('summary');
    });

    it('should get greeting prompt successfully', async () => {
      const result = await getPrompt('test_greeting', { name: 'Alice' });
      
      expect(result.messages).toBeDefined();
      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[0].content.text).toContain('Alice');
      expect(result.messages[0].content.text).toContain('greet');
    });

    it('should get summary prompt successfully', async () => {
      const result = await getPrompt('test_summary', { topic: 'AI Technology', length: 'short' });
      
      expect(result.messages).toBeDefined();
      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[0].content.text).toContain('AI Technology');
      expect(result.messages[0].content.text).toContain('short');
    });

    it('should get summary prompt with default length', async () => {
      const result = await getPrompt('test_summary', { topic: 'Machine Learning' });
      
      expect(result.messages).toBeDefined();
      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.messages[0].content.text).toContain('Machine Learning');
      expect(result.messages[0].content.text).toContain('medium');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for non-existent tool', async () => {
      await expect(callTool('test_nonexistent', {})).rejects.toThrow('Tool not found');
    });

    it('should throw error for non-existent resource', async () => {
      // URI with unknown server prefix should throw since no server matches
      await expect(readResource('unknown_test://nonexistent')).rejects.toThrow('Resource not found');
    });

    it('should throw error for non-existent prompt', async () => {
      await expect(getPrompt('test_nonexistent', {})).rejects.toThrow('Prompt not found');
    });
  });
});
