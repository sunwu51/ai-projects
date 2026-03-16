# MCP Center

MCP Center is an MCP (Model Context Protocol) server management tool that aggregates multiple MCP servers into a single server. It proxies tools, resources, resource templates, and prompts from multiple child MCP servers, exposing them through a unified interface with server-name prefixing to avoid conflicts.

## Quick Start

### 1. Create a config file

Create an `mcp.json` file anywhere on your machine:

```json
{
  "servers": [
    {
      "name": "exa",
      "url": "https://mcp.exa.ai/mcp"
    },
    {
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/directory"]
    }
  ]
}
```

### 2. Configure in your AI agent

**Claude Code:**

```bash
claude mcp add mcp-center -- npx -y @sunwu51/mcp-center -c /path/to/mcp.json
```

**Cursor / Windsurf / other MCP clients** - add to your MCP config file:

```json
{
  "mcpServers": {
    "mcp-center": {
      "command": "npx",
      "args": ["-y", "@sunwu51/mcp-center", "-c", "/path/to/mcp.json"]
    }
  }
}
```

That's it. Your AI agent now has access to all tools, resources, and prompts from the configured MCP servers.

## Features

- **Unified Interface**: Aggregates tools, resources, resource templates, and prompts from multiple MCP servers
- **Namespacing**: Exposes entities with prefix format `serverName_originalName` to avoid conflicts
- **Dual Transport**: Supports both stdio and HTTP (streamable) transports
- **Hot Reload**: Automatically reloads when configuration changes (no restart needed)
- **Selective Filtering**: Enable specific tools/resources/prompts per server via configuration

---

## Configuration

Create an `mcp.json` file in your project directory with the following structure:

```json
{
  "servers": [
    {
      "name": "exa",
      "url": "https://mcp.exa.ai/mcp",
      "enabledTools": ["web_search_exa"]
    },
    {
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/directory"],
      "enabledTools": ["read_file", "write_file"]
    }
  ]
}
```

### Configuration Options

- `name` (required): Unique name for the MCP server
- `url` (optional): HTTP URL for streamable HTTP MCP servers
- `command` (optional): Command to run for stdio MCP servers
- `args` (optional): Command line arguments
- `env` (optional): Environment variables
- `enabledTools` (optional): Array of tool names to enable (enables all if not specified)

## Usage

### Stdio Transport (Default)

```bash
npm start
# or explicitly
npm run start:stdio
```

### HTTP Transport

```bash
npm run start:http
# or with custom port
PORT=8080 npm run start:http
```

The server will be available at `http://localhost:3000/mcp`.

### Hot Reload

The server watches the `mcp.json` file for changes. When you modify the configuration:

- New servers are automatically loaded
- Removed servers are disconnected
- Tool list is updated automatically

No restart required!

## Testing

```bash
npm test
```

## Project Structure

```
mcp-center/
├── src/
│   ├── index.js      # Entry point
│   ├── server.js     # MCP server implementation
│   ├── loader.js     # MCP server loader
│   └── config.js     # Configuration loading
├── tests/
│   ├── config.test.js
│   ├── loader.test.js
│   ├── server.test.js
│   └── http-integration.test.js
├── mcp.json          # Example configuration
└── package.json
```

## Example: Using with Exa MCP Server

1. Create `mcp.json`:

```json
{
  "servers": [
    {
      "name": "exa",
      "url": "https://mcp.exa.ai/mcp",
      "enabledTools": ["web_search_exa"]
    }
  ]
}
```

2. Start the server:

```bash
npm run start:stdio
```

3. The server will expose tools with prefix `exa_` (e.g., `exa_web_search_exa`).

## License

MIT
