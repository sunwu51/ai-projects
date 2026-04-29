import { WebSocketServer } from 'ws';

const TOOL_CALL_TIMEOUT_MS = 60000;
const PING_INTERVAL_MS = 30000;

const connections = new Map();   // name -> { ws, tools, rpcId, pingTimer }
const pending = new Map();       // name -> Map<rpcId, {resolve, reject, timer}>

let wss = null;

/**
 * Create WebSocket server attached to the existing HTTP server.
 * Listens on /ws/:serverName path for wsBridge client connections.
 * Any client that connects is automatically registered.
 * @param {import('http').Server} httpServer
 */
export function createWsServer(httpServer) {
  wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    try {
      const host = req.headers.host || 'localhost';
      const url = new URL(req.url, `http://${host}`);
      const match = url.pathname.match(/^\/ws\/(.+)$/);
      if (!match) return;

      const serverName = decodeURIComponent(match[1]);
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
 * Get connected wsBridge servers with their tool counts.
 * @returns {Array<{name: string, connected: boolean, tools: number}>}
 */
export function getWsBridgeServers() {
  const result = [];
  for (const [name, conn] of connections) {
    result.push({
      name,
      connected: true,
      tools: conn.tools?.length || 0
    });
  }
  return result;
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
  for (const [name, conn] of connections) {
    status[name] = {
      name,
      connected: true,
      tools: conn.tools?.length || 0
    };
  }
  return status;
}

/**
 * Call a tool on a wsBridge server.
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
    try { clearInterval(conn.pingTimer); } catch (_) {}
    try { conn.ws.close(); } catch (_) {}
    cleanupConnection(name);
  }
  connections.clear();
  if (wss) {
    wss.close();
    wss = null;
  }
}

function handleConnection(serverName, ws) {
  // Close previous connection if exists
  const existing = connections.get(serverName);
  if (existing) {
    try { clearInterval(existing.pingTimer); } catch (_) {}
    try { existing.ws.close(); } catch (_) {}
    cleanupConnection(serverName);
  }

  const conn = { ws, tools: [], rpcId: 0, pingTimer: null };
  connections.set(serverName, conn);

  // Start keepalive pings
  conn.pingTimer = setInterval(() => {
    try { ws.ping(); } catch (_) {}
  }, PING_INTERVAL_MS);

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
      try { clearInterval(current.pingTimer); } catch (_) {}
      cleanupConnection(serverName);
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
    await sendRpc(serverName, conn, 'initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'mcp-center', version: '1.0.0' }
    });

    const toolsResult = await sendRpc(serverName, conn, 'tools/list');
    conn.tools = toolsResult.tools || [];

    if (typeof onWsBridgeConnected === 'function') {
      onWsBridgeConnected(serverName, conn.tools);
    }

    console.error(`[mcp-center] wsBridge "${serverName}" connected with ${conn.tools.length} tool(s)`);
  } catch (e) {
    console.error(`[mcp-center] wsBridge "${serverName}" handshake failed:`, e.message);
    try { clearInterval(conn.pingTimer); } catch (_) {}
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

export function setWsBridgeCallbacks(onConnect, onDisconnect) {
  onWsBridgeConnected = onConnect;
  onWsBridgeDisconnected = onDisconnect;
}
