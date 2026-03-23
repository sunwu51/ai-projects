# MCP Center

MCP Center is a local MCP gateway with a built-in Web UI. It manages multiple child MCP servers, keeps their configuration in one place, and exposes a single Streamable HTTP MCP endpoint for your client to connect to.

It can aggregate:

- tools
- resources
- resource templates
- prompts

To avoid collisions, every exposed capability is prefixed with the child server name:

- tool: `exa_web_search_exa`
- resource: `filesystem_file:///tmp/a.txt`
- prompt: `docs_summarize`

## Usage Model

Run MCP Center directly with `npx`, then connect your MCP client to the HTTP endpoint it starts:

1. Start `mcp-center` with `npx @sunwu51/mcp-center`
2. Open the Web UI to add or edit child MCP servers
3. Point your MCP client at `http://localhost:3000/mcp`

## Quick Start

### 1. Start MCP Center

```bash
npx @sunwu51/mcp-center
```

This command executes the package's CLI entry directly. No global install is required.

By default it uses `~/.mcp-center/mcp.json`. If the file does not exist, it will be created automatically as:

```json
{
  "servers": []
}
```

You can also pass a custom config path:

```bash
npx @sunwu51/mcp-center --config /path/to/mcp.json
```

Or:

```bash
npx @sunwu51/mcp-center /path/to/mcp.json
```

### 2. Open the Web UI

Open:

```text
http://localhost:3000/ui
```

From the UI you can:

- add HTTP or stdio child MCP servers
- edit server config
- enable or disable a server
- delete a server
- probe a server before saving to inspect tools/resources/templates/prompts
- selectively enable only part of a server's capabilities
- view connection status and loaded capabilities

### 3. Connect your MCP client to MCP Center

Use this endpoint:

```text
http://localhost:3000/mcp
```

Your MCP client must support Streamable HTTP transport.

## How It Works

MCP Center acts as a proxy in front of multiple child servers:

- child servers can be HTTP MCP servers or local stdio MCP servers
- MCP Center connects to them as a client
- it lists their capabilities and republishes them through one HTTP endpoint
- calls and reads are forwarded to the original child server

Capability filtering is applied per child server:

- `enabledTools`
- `enabledResources`
- `enabledResourceTemplates`
- `enabledPrompts`

If a filtering field is omitted or empty, MCP Center exposes all items of that type from that child server.

## Configuration File

The config file format is:

```json
{
  "servers": [
    {
      "name": "exa",
      "url": "https://mcp.exa.ai/mcp",
      "httpHeaders": {
        "Authorization": "Bearer YOUR_TOKEN"
      },
      "enabledTools": ["web_search_exa"]
    },
    {
      "name": "filesystem",
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/path/to/workspace"
      ],
      "env": {
        "NODE_ENV": "production"
      },
      "enabledTools": ["read_file", "write_file"],
      "enabledResources": ["file:///path/to/workspace/README.md"],
      "enabledPrompts": ["summarize_file"]
    }
  ]
}
```

### Server Fields

Common fields:

- `name`: required, must be unique
- `enabled`: optional, set `false` to keep the server in config but not connect to it
- `enabledTools`: optional string array
- `enabledResources`: optional string array
- `enabledResourceTemplates`: optional string array
- `enabledPrompts`: optional string array

HTTP child server fields:

- `url`: required for HTTP transport
- `httpHeaders`: optional request headers

STDIO child server fields:

- `command`: required for stdio transport
- `args`: optional argument array
- `env`: optional environment variables

## Client Configuration

The exact client config depends on the client, but the target should be the MCP Center HTTP endpoint:

```json
{
  "mcpServers": {
    "mcp-center": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

If your client expects a transport field, use its Streamable HTTP mode and point it to the same URL.

If you want to launch MCP Center from another tool or script, use the same `npx` entry:

```json
{
  "command": "npx",
  "args": [
    "-y",
    "@sunwu51/mcp-center"
  ]
}
```

## HTTP API

The Web UI uses these routes:

- `GET /api/servers`: list configured servers
- `POST /api/servers`: add a server
- `PUT /api/servers/:index`: update a server
- `DELETE /api/servers/:index`: delete a server
- `PATCH /api/servers/:index/toggle`: enable or disable a server
- `GET /api/servers/status`: get current connection status
- `GET /api/servers/:name/capabilities`: get loaded capabilities for a connected server
- `POST /api/probe`: temporarily connect to a server config and inspect capabilities before saving

## Runtime Behavior

- Default port is `3000`
- Set `PORT` to change it
- The config file is watched for changes
- When the config changes, MCP Center reloads child servers automatically
- Child servers are loaded in parallel
- Failed child servers do not stop the main HTTP service from starting

Example:

```bash
PORT=8080 npx @sunwu51/mcp-center
```

PowerShell:

```powershell
$env:PORT=8080
npx @sunwu51/mcp-center
```

## Development

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm start
```

Run tests:

```bash
npm test
```

## License

MIT
