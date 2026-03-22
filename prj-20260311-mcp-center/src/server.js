import { createServer as createHttpServer } from 'http';
import { randomUUID } from 'crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  loadAllServers,
  reloadServer,
  getAllTools,
  getAllResources,
  getAllResourceTemplates,
  getAllPrompts,
  callTool,
  readResource,
  getPrompt,
  closeAllServers,
  getLoadedServers,
} from './loader.js';
import { loadConfig, watchConfig, getConfig, ensureDefaultConfig, unwatchConfig, saveConfig } from './config.js';

/**
 * Create an MCP Server instance with tool handlers
 * @returns {Server}
 */
export function createMcpServer() {
  const srv = new Server(
    { name: 'mcp-center', version: '1.0.0' },
    { capabilities: { tools: {}, resources: {}, prompts: {} } }
  );

  srv.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = getAllTools();
    return {
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  srv.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const result = await callTool(name, args);
      return result;
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message || String(error)}` }],
        isError: true,
      };
    }
  });

  srv.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources = getAllResources();
    return {
      resources: resources.map(resource => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
      })),
    };
  });

  srv.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
    const resourceTemplates = getAllResourceTemplates();
    return {
      resourceTemplates: resourceTemplates.map(rt => ({
        uriTemplate: rt.uriTemplate,
        name: rt.name,
        description: rt.description,
        mimeType: rt.mimeType,
      })),
    };
  });

  srv.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    try {
      const result = await readResource(uri);
      return result;
    } catch (error) {
      return {
        contents: [{ uri, mimeType: 'text/plain', text: `Error: ${error.message || String(error)}` }],
      };
    }
  });

  srv.setRequestHandler(ListPromptsRequestSchema, async () => {
    const prompts = getAllPrompts();
    return {
      prompts: prompts.map(prompt => ({
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments,
      })),
    };
  });

  srv.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const result = await getPrompt(name, args);
      return result;
    } catch (error) {
      return {
        messages: [{ role: 'user', content: { type: 'text', text: `Error: ${error.message || String(error)}` } }],
      };
    }
  });

  return srv;
}

/**
 * Reload all servers based on current config
 * @returns {Promise<void>}
 */
async function reloadAllServers() {
  const config = getConfig();
  if (!config) return;

  console.error('[mcp-center] Reloading servers...');

  const loadedServers = getLoadedServers();
  const currentServers = new Map(Array.from(loadedServers.entries()).map(([name, server]) => [name, server]));
  const newServerConfigs = new Map(config.servers.map(s => [s.name, s]));

  // Close servers not in new config
  for (const [name, loaded] of currentServers) {
    if (!newServerConfigs.has(name)) {
      try {
        await loaded.client.close();
        loadedServers.delete(name);
        console.error(`[mcp-center] Removed server "${name}"`);
      } catch (error) {
        console.warn(`[mcp-center] Error closing server "${name}":`, error);
      }
    }
  }

  // Reload all servers in parallel
  const reloadPromises = config.servers.map(async (serverConfig) => {
    try {
      await reloadServer(serverConfig);
    } catch (error) {
      console.error(`[mcp-center] Failed to reload server "${serverConfig.name}":`, error);
    }
  });

  await Promise.all(reloadPromises);

  console.error('[mcp-center] Reload complete');
}

const UI_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP Center - Server Management</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 30px; }
    h1 { color: #333; margin-bottom: 30px; font-size: 28px; }
    .btn { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; transition: all 0.2s; }
    .btn-primary { background: #007bff; color: white; }
    .btn-primary:hover { background: #0056b3; }
    .btn-danger { background: #dc3545; color: white; }
    .btn-danger:hover { background: #c82333; }
    .btn-success { background: #28a745; color: white; }
    .btn-success:hover { background: #218838; }
    .server-list { margin-top: 20px; }
    .server-item { border: 1px solid #ddd; border-radius: 4px; padding: 15px; margin-bottom: 10px; background: #fafafa; }
    .server-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .server-name { font-weight: bold; font-size: 18px; color: #333; }
    .server-type { display: inline-block; padding: 4px 8px; border-radius: 3px; font-size: 12px; margin-left: 10px; }
    .type-http { background: #d1ecf1; color: #0c5460; }
    .type-stdio { background: #d4edda; color: #155724; }
    .server-details { font-size: 14px; color: #666; margin-top: 5px; }
    .form-group { margin-bottom: 15px; }
    label { display: block; margin-bottom: 5px; font-weight: 500; color: #333; }
    input, select, textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
    textarea { min-height: 80px; font-family: monospace; }
    .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; }
    .modal-content { background: white; margin: 50px auto; padding: 30px; border-radius: 8px; max-width: 600px; max-height: 80vh; overflow-y: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .close { font-size: 28px; cursor: pointer; color: #999; }
    .close:hover { color: #333; }
    .type-fields { display: none; }
    .type-fields.active { display: block; }
    .btn-group { display: flex; gap: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>MCP Center - Server Management</h1>
    <button class="btn btn-primary" onclick="openAddModal()">+ Add Server</button>
    <div class="server-list" id="serverList"></div>
  </div>

  <div id="modal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h2 id="modalTitle">Add Server</h2>
        <span class="close" onclick="closeModal()">&times;</span>
      </div>
      <form id="serverForm" onsubmit="saveServer(event)">
        <div class="form-group">
          <label>Server Name *</label>
          <input type="text" id="serverName" required>
        </div>
        <div class="form-group">
          <label>Server Type *</label>
          <select id="serverType" onchange="toggleTypeFields()" required>
            <option value="http">HTTP</option>
            <option value="stdio">STDIO</option>
          </select>
        </div>
        <div id="httpFields" class="type-fields active">
          <div class="form-group">
            <label>URL *</label>
            <input type="url" id="serverUrl">
          </div>
          <div class="form-group">
            <label>HTTP Headers (JSON)</label>
            <textarea id="serverHeaders" placeholder='{"Authorization": "Bearer token"}'></textarea>
          </div>
        </div>
        <div id="stdioFields" class="type-fields">
          <div class="form-group">
            <label>Command *</label>
            <input type="text" id="serverCommand">
          </div>
          <div class="form-group">
            <label>Arguments (JSON array)</label>
            <textarea id="serverArgs" placeholder='["arg1", "arg2"]'></textarea>
          </div>
          <div class="form-group">
            <label>Environment Variables (JSON)</label>
            <textarea id="serverEnv" placeholder='{"KEY": "value"}'></textarea>
          </div>
        </div>
        <div class="form-group">
          <label>Enabled Tools (comma-separated, leave empty for all)</label>
          <input type="text" id="enabledTools">
        </div>
        <div class="btn-group">
          <button type="submit" class="btn btn-success">Save</button>
          <button type="button" class="btn" onclick="closeModal()">Cancel</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    let editingIndex = -1;

    async function loadServers() {
      const res = await fetch('/api/servers');
      const servers = await res.json();
      const list = document.getElementById('serverList');
      list.innerHTML = servers.map((s, i) => {
        const type = s.url ? 'http' : 'stdio';
        const details = type === 'http' 
          ? \`URL: \${s.url}\${s.httpHeaders ? ' | Headers: ' + JSON.stringify(s.httpHeaders) : ''}\`
          : \`Command: \${s.command} \${(s.args || []).join(' ')}\${s.env ? ' | Env: ' + JSON.stringify(s.env) : ''}\`;
        return \`
          <div class="server-item">
            <div class="server-header">
              <div>
                <span class="server-name">\${s.name}</span>
                <span class="server-type type-\${type}">\${type.toUpperCase()}</span>
              </div>
              <div class="btn-group">
                <button class="btn btn-primary" onclick="editServer(\${i})">Edit</button>
                <button class="btn btn-danger" onclick="deleteServer(\${i})">Delete</button>
              </div>
            </div>
            <div class="server-details">\${details}</div>
            \${s.enabledTools ? \`<div class="server-details">Enabled Tools: \${s.enabledTools.join(', ')}</div>\` : ''}
          </div>
        \`;
      }).join('');
    }

    function openAddModal() {
      editingIndex = -1;
      document.getElementById('modalTitle').textContent = 'Add Server';
      document.getElementById('serverForm').reset();
      document.getElementById('modal').style.display = 'block';
      toggleTypeFields();
    }

    async function editServer(index) {
      const res = await fetch('/api/servers');
      const servers = await res.json();
      const server = servers[index];
      editingIndex = index;
      
      document.getElementById('modalTitle').textContent = 'Edit Server';
      document.getElementById('serverName').value = server.name;
      document.getElementById('serverType').value = server.url ? 'http' : 'stdio';
      
      if (server.url) {
        document.getElementById('serverUrl').value = server.url;
        document.getElementById('serverHeaders').value = server.httpHeaders ? JSON.stringify(server.httpHeaders, null, 2) : '';
      } else {
        document.getElementById('serverCommand').value = server.command || '';
        document.getElementById('serverArgs').value = server.args ? JSON.stringify(server.args) : '';
        document.getElementById('serverEnv').value = server.env ? JSON.stringify(server.env, null, 2) : '';
      }
      
      document.getElementById('enabledTools').value = server.enabledTools ? server.enabledTools.join(', ') : '';
      document.getElementById('modal').style.display = 'block';
      toggleTypeFields();
    }

    async function deleteServer(index) {
      if (!confirm('Are you sure you want to delete this server?')) return;
      await fetch(\`/api/servers/\${index}\`, { method: 'DELETE' });
      loadServers();
    }

    async function saveServer(e) {
      e.preventDefault();
      const name = document.getElementById('serverName').value;
      const type = document.getElementById('serverType').value;
      const enabledTools = document.getElementById('enabledTools').value
        .split(',').map(t => t.trim()).filter(t => t);
      
      const server = { name };
      if (enabledTools.length > 0) server.enabledTools = enabledTools;
      
      if (type === 'http') {
        server.url = document.getElementById('serverUrl').value;
        const headers = document.getElementById('serverHeaders').value.trim();
        if (headers) {
          try {
            server.httpHeaders = JSON.parse(headers);
          } catch (e) {
            alert('Invalid JSON for HTTP headers');
            return;
          }
        }
      } else {
        server.command = document.getElementById('serverCommand').value;
        const args = document.getElementById('serverArgs').value.trim();
        if (args) {
          try {
            server.args = JSON.parse(args);
          } catch (e) {
            alert('Invalid JSON for arguments');
            return;
          }
        }
        const env = document.getElementById('serverEnv').value.trim();
        if (env) {
          try {
            server.env = JSON.parse(env);
          } catch (e) {
            alert('Invalid JSON for environment variables');
            return;
          }
        }
      }
      
      const method = editingIndex >= 0 ? 'PUT' : 'POST';
      const url = editingIndex >= 0 ? \`/api/servers/\${editingIndex}\` : '/api/servers';
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(server)
      });
      
      closeModal();
      loadServers();
    }

    function closeModal() {
      document.getElementById('modal').style.display = 'none';
    }

    function toggleTypeFields() {
      const type = document.getElementById('serverType').value;
      document.getElementById('httpFields').classList.toggle('active', type === 'http');
      document.getElementById('stdioFields').classList.toggle('active', type === 'stdio');
    }

    loadServers();
  </script>
</body>
</html>`;

/**
 * Run in HTTP mode with API and UI
 * @param {number} port
 * @returns {Promise<void>}
 */
async function runHttp(port) {
  const sessions = new Map();

  const httpServer = createHttpServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // Serve UI
    if (url.pathname === '/' || url.pathname === '/ui') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(UI_HTML);
      return;
    }

    // API: Get all servers
    if (url.pathname === '/api/servers' && req.method === 'GET') {
      const config = getConfig();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(config.servers));
      return;
    }

    // API: Add server
    if (url.pathname === '/api/servers' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const server = JSON.parse(body);
          const config = getConfig();
          config.servers.push(server);
          saveConfig(config);
          await reloadAllServers();
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
      return;
    }

    // API: Update server
    if (url.pathname.startsWith('/api/servers/') && req.method === 'PUT') {
      const index = parseInt(url.pathname.split('/')[3]);
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const server = JSON.parse(body);
          const config = getConfig();
          if (index < 0 || index >= config.servers.length) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Server not found' }));
            return;
          }
          config.servers[index] = server;
          saveConfig(config);
          await reloadAllServers();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
      return;
    }

    // API: Delete server
    if (url.pathname.startsWith('/api/servers/') && req.method === 'DELETE') {
      const index = parseInt(url.pathname.split('/')[3]);
      const config = getConfig();
      if (index < 0 || index >= config.servers.length) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Server not found' }));
        return;
      }
      config.servers.splice(index, 1);
      saveConfig(config);
      await reloadAllServers();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // MCP endpoint
    if (url.pathname === '/mcp' && req.method === 'POST') {
      const sessionId = randomUUID();
      const mcpServer = createMcpServer();
      const transport = new StreamableHTTPServerTransport('/mcp', sessionId);
      sessions.set(sessionId, { server: mcpServer, transport });

      await mcpServer.connect(transport);
      await transport.handleRequest(req, res);
      return;
    }

    if (url.pathname.startsWith('/mcp/') && req.method === 'POST') {
      const sessionId = url.pathname.split('/')[2];
      if (sessions.has(sessionId)) {
        const session = sessions.get(sessionId);
        await session.transport.handleRequest(req, res);
        sessions.delete(sessionId);
      } else {
        res.writeHead(404);
        res.end('Session not found');
      }
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  });

  await new Promise((resolve, reject) => {
    httpServer.listen(port, () => {
      console.error(`[mcp-center] HTTP server running on http://localhost:${port}`);
      console.error(`[mcp-center] UI available at http://localhost:${port}/ui`);
      console.error(`[mcp-center] MCP endpoint at http://localhost:${port}/mcp`);
      resolve();
    });
    httpServer.on('error', reject);
  });

  const shutdown = async () => {
    console.error('[mcp-center] Shutting down...');
    unwatchConfig();
    await closeAllServers();
    httpServer.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return httpServer;
}

/**
 * Main entry point to run the mcp-center server
 * @param {string|undefined} configPath
 * @returns {Promise<void>}
 */
export async function runServer(configPath) {
  const path = configPath || ensureDefaultConfig();
  console.error(`[mcp-center] Loading config from: ${path}`);

  const config = loadConfig(path);
  console.error(`[mcp-center] Loaded ${config.servers.length} server(s) from config`);

  await loadAllServers(config.servers);

  watchConfig(reloadAllServers);

  console.error('[mcp-center] Starting MCP Center server (HTTP transport)...');

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  await runHttp(port);
}
