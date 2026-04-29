import { WebSocketServer } from 'ws';

const TOOL_CALL_TIMEOUT_MS = 60000;

const configs = new Map();       // name -> config
const connections = new Map();   // name -> { ws, tools, rpcId }
const pending = new Map();       // name -> Map<rpcId, {resolve, reject, timer}>

let wss = null;

/**
 * Create WebSocket server attached to the existing HTTP server.
 * Listens on /ws/:serverName path for wsBridge client connections.
 * @param {import('http').Server} httpServer
 */
export function createWsServer(httpServer) {
  wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    try {
      // req.url is typically "/ws/tabmanager" for WebSocket upgrade requests
      const host = req.headers.host || 'localhost';
      const url = new URL(req.url, `http://${host}`);
      const match = url.pathname.match(/^\/ws\/(.+)$/);
      if (!match) {
        // Not a wsBridge path — ignore, let other handlers deal with it
        return;
      }

      const serverName = decodeURIComponent(match[1]);
      const config = configs.get(serverName);
      if (!config) {
        console.error(`[mcp-center] wsBridge: unknown server "${serverName}" — add it to mcp.json first`);
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        handleConnection(serverName, ws);
      });
    } catch (e) {
      console.error(`[mcp-center] wsBridge upgrade error:`, e.message);
      socket.destroy();
    }
  });
}

/**
 * Register a wsBridge server config (called by loader).
 * Tools will be populated when the client connects.
 * @param {object} config
 */
export function registerWsBridgeConfig(config) {
  configs.set(config.name, config);
  console.error(`[mcp-center] wsBridge: registered config for "${config.name}"`);
}

/**
 * Unregister a wsBridge config and close its connection.
 * @param {string} serverName
 */
export function unregisterWsBridgeConfig(serverName) {
  configs.delete(serverName);
  const conn = connections.get(serverName);
  if (conn) {
    conn.ws.close();
    cleanupConnection(serverName);
  }
}

/**
 * Get tools for a connected wsBridge server.
 * @param {string} serverName
 * @returns {Array}
 */
export function getWsBridgeTools(serverName) {
  const conn = connections.get(serverName);
  return conn ? conn.tools : [];
}

/**
 * Get connection status for all wsBridge servers.
 * @returns {object}
 */
export function getWsBridgeStatus() {
  const status = {};
  for (const [name, config] of configs) {
    status[name] = {
      name,
      configured: true,
      connected: connections.has(name),
      tools: connections.get(name)?.tools?.length || 0
    };
  }
  return status;
}

/**
 * Check if a server name belongs to a wsBridge config.
 * @param {string} serverName
 * @returns {boolean}
 */
export function isWsBridgeServer(serverName) {
  return configs.has(serverName);
}

/**
 * Call a tool on a wsBridge server. Returns a promise that resolves with the MCP result.
 * @param {string} serverName
 * @param {string} toolName - original tool name (without prefix)
 * @param {object} args
 * @returns {Promise<object>}
 */
export function callWsBridgeTool(serverName, toolName, args) {
  const conn = connections.get(serverName);
  if (!conn) {
    return Promise.reject(new Error(`WebSocket bridge "${serverName}" is not connected`));
  }

  const id = ++conn.rpcId;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (!pending.has(serverName)) return;
      pending.get(serverName).delete(id);
      reject(new Error(`Tool call timed out after ${TOOL_CALL_TIMEOUT_MS / 1000}s`));
    }, TOOL_CALL_TIMEOUT_MS);

    if (!pending.has(serverName)) {
      pending.set(serverName, new Map());
    }
    pending.get(serverName).set(id, { resolve, reject, timer });

    try {
      conn.ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id,
        method: 'tools/call',
        params: { name: toolName, arguments: args }
      }));
    } catch (e) {
      clearTimeout(timer);
      pending.get(serverName).delete(id);
      reject(e);
    }
  });
}

/**
 * Close all wsBridge connections and shut down.
 */
export function closeWsBridgeServers() {
  for (const [name, conn] of connections) {
    try { conn.ws.close(); } catch (_) {}
    cleanupConnection(name);
  }
  connections.clear();
  configs.clear();
  if (wss) {
    wss.close();
    wss = null;
  }
}

function handleConnection(serverName, ws) {
  // Close previous connection if exists
  const existing = connections.get(serverName);
  if (existing) {
    try { existing.ws.close(); } catch (_) {}
    cleanupConnection(serverName);
  }

  const conn = { ws, tools: [], rpcId: 0 };
  connections.set(serverName, conn);

  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data.toString()); } catch { return; }
    if (!msg || msg.jsonrpc !== '2.0') return;

    if (msg.id != null && msg.result !== undefined) {
      resolvePending(serverName, msg.id, msg.result);
    } else if (msg.id != null && msg.error) {
      rejectPending(serverName, msg.id, msg.error);
    }
  });

  ws.on('close', () => {
    const current = connections.get(serverName);
    if (current && current.ws === ws) {
      cleanupConnection(serverName);
      // Notify loader that tools should be removed
      if (typeof onWsBridgeDisconnected === 'function') {
        onWsBridgeDisconnected(serverName);
      }
    }
  });

  ws.on('error', () => {
    ws.close();
  });

  // Start MCP handshake
  sendHandshake(serverName, conn);
}

async function sendHandshake(serverName, conn) {
  try {
    // initialize
    const initResult = await sendRpc(serverName, conn, 'initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'mcp-center', version: '1.0.0' }
    });

    // tools/list
    const toolsResult = await sendRpc(serverName, conn, 'tools/list');

    const config = configs.get(serverName) || {};
    const rawTools = toolsResult.tools || [];
    const filteredTools = config.enabledTools && config.enabledTools.length > 0
      ? rawTools.filter(t => config.enabledTools.includes(t.name))
      : rawTools;

    conn.tools = filteredTools;

    // Notify loader that tools are ready
    if (typeof onWsBridgeConnected === 'function') {
      onWsBridgeConnected(serverName, filteredTools);
    }

    console.error(`[mcp-center] wsBridge "${serverName}" connected with ${filteredTools.length} tool(s)`);
  } catch (e) {
    console.error(`[mcp-center] wsBridge "${serverName}" handshake failed:`, e.message);
    conn.ws.close();
  }
}

function sendRpc(serverName, conn, method, params) {
  const id = ++conn.rpcId;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (!pending.has(serverName)) return;
      pending.get(serverName).delete(id);
      reject(new Error(`RPC ${method} timed out`));
    }, 15000);

    if (!pending.has(serverName)) {
      pending.set(serverName, new Map());
    }
    pending.get(serverName).set(id, { resolve, reject, timer });

    try {
      conn.ws.send(JSON.stringify(
        params !== undefined
          ? { jsonrpc: '2.0', id, method, params }
          : { jsonrpc: '2.0', id, method }
      ));
    } catch (e) {
      clearTimeout(timer);
      pending.get(serverName).delete(id);
      reject(e);
    }
  });
}

function resolvePending(serverName, id, result) {
  const map = pending.get(serverName);
  if (!map) return;
  const entry = map.get(id);
  if (!entry) return;
  clearTimeout(entry.timer);
  map.delete(id);
  entry.resolve(result);
}

function rejectPending(serverName, id, error) {
  const map = pending.get(serverName);
  if (!map) return;
  const entry = map.get(id);
  if (!entry) return;
  clearTimeout(entry.timer);
  map.delete(id);
  entry.reject(new Error(error.message || String(error)));
}

function cleanupConnection(serverName) {
  const map = pending.get(serverName);
  if (map) {
    for (const [id, entry] of map) {
      clearTimeout(entry.timer);
      entry.reject(new Error('WebSocket connection closed'));
    }
    map.clear();
  }
  pending.delete(serverName);
  connections.delete(serverName);
}

// Callbacks for loader integration
let onWsBridgeConnected = null;
let onWsBridgeDisconnected = null;

/**
 * Set callbacks for loader to be notified when wsBridge clients connect/disconnect.
 * @param {Function} onConnect - (serverName, tools) => void
 * @param {Function} onDisconnect - (serverName) => void
 */
export function setWsBridgeCallbacks(onConnect, onDisconnect) {
  onWsBridgeConnected = onConnect;
  onWsBridgeDisconnected = onDisconnect;
}
