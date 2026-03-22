# MCP Center

MCP Center is an MCP (Model Context Protocol) server management tool that aggregates multiple MCP servers into a single server. It proxies tools, resources, resource templates, and prompts from multiple child MCP servers, exposing them through a unified interface with server-name prefixing to avoid conflicts.

## Features

- **Unified Interface**: Aggregates tools, resources, resource templates, and prompts from multiple MCP servers
- **Namespacing**: Exposes entities with prefix format `serverName_originalName` to avoid conflicts
- **HTTP Transport**: HTTP streamable transport with web UI for management
- **Web UI**: Manage MCP servers through a browser interface
- **REST API**: Add, update, and delete servers via HTTP API
- **Hot Reload**: Automatically reloads when configuration changes (no restart needed)
- **Parallel Loading**: Servers are loaded in parallel for faster startup
- **Selective Filtering**: Enable specific tools/resources/prompts per server via configuration

## Quick Start

### 1. Start the server

```bash
npx @sunwu51/mcp-center
```

By default, it creates and uses `~/.mcp-center/mcp.json` as the configuration file.

Or specify a custom config file:

```bash
npx @sunwu51/mcp-center --config /path/to/mcp.json
```

### 2. Access the Web UI

Open your browser and navigate to:

```
http://localhost:3000/ui
```

Use the web interface to add, edit, and delete MCP servers.

### 3. Configure in your AI agent

**Claude Code:**

```bash
claude mcp add mcp-center -- npx -y @sunwu51/mcp-center
```

**Cursor / Windsurf / other MCP clients** - add to your MCP config file:

```json
{
  "mcpServers": {
    "mcp-center": {
      "command": "npx",
      "args": ["-y", "@sunwu51/mcp-center"]
    }
  }
}
```

## Configuration

The configuration file (`mcp.json`) has the following structure:

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
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/directory"],
      "env": {
        "NODE_ENV": "production"
      },
      "enabledTools": ["read_file", "write_file"]
    }
  ]
}
```

### Configuration Options

#### For HTTP Servers:
- `name` (required): Unique name for the MCP server
- `url` (required): HTTP URL for streamable HTTP MCP servers
- `httpHeaders` (optional): HTTP headers to send with requests
- `enabledTools` (optional): Array of tool names to enable (enables all if not specified)
- `enabledResources` (optional): Array of resource URIs to enable
- `enabledResourceTemplates` (optional): Array of resource template URIs to enable
- `enabledPrompts` (optional): Array of prompt names to enable

#### For STDIO Servers:
- `name` (required): Unique name for the MCP server
- `command` (required): Command to run for stdio MCP servers
- `args` (optional): Command line arguments
- `env` (optional): Environment variables
- `enabledTools` (optional): Array of tool names to enable (enables all if not specified)
- `enabledResources` (optional): Array of resource URIs to enable
- `enabledResourceTemplates` (optional): Array of resource template URIs to enable
- `enabledPrompts` (optional): Array of prompt names to enable

## Web UI

The web UI is available at `http://localhost:3000/ui` and provides:

- **Add Server**: Create new HTTP or STDIO MCP servers
- **Edit Server**: Modify existing server configurations
- **Delete Server**: Remove servers from the configuration
- **Real-time Updates**: Changes are immediately reflected in the running server

## REST API

### Get all servers
```bash
GET /api/servers
```

### Add a server
```bash
POST /api/servers
Content-Type: application/json

{
  "name": "my-server",
  "url": "https://example.com/mcp"
}
```

### Update a server
```bash
PUT /api/servers/:index
Content-Type: application/json

{
  "name": "my-server",
  "url": "https://example.com/mcp"
}
```

### Delete a server
```bash
DELETE /api/servers/:index
```

## MCP Endpoint

The MCP protocol endpoint is available at:

```
http://localhost:3000/mcp
```

## Usage

### Start with default config

```bash
npm start
```

This creates `~/.mcp-center/mcp.json` if it doesn't exist.

### Start with custom config

```bash
npm start -- --config /path/to/mcp.json
```

### Custom port

```bash
PORT=8080 npm start
```

## Hot Reload

The server watches the `mcp.json` file for changes. When you modify the configuration:

- New servers are automatically loaded in parallel
- Removed servers are disconnected
- Modified servers are reloaded
- Tool/resource/prompt lists are updated automatically

No restart required!

## Testing

```bash
npm test
```

## Example: Using with Exa MCP Server

1. Start MCP Center:

```bash
npx @sunwu51/mcp-center
```

2. Open the web UI at `http://localhost:3000/ui`

3. Click "Add Server" and configure:
   - Name: `exa`
   - Type: `HTTP`
   - URL: `https://mcp.exa.ai/mcp`
   - Enabled Tools: `web_search_exa`

4. The server will expose tools with prefix `exa_` (e.g., `exa_web_search_exa`).

## License

MIT
