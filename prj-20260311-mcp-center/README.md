# MCP Center

MCP Center is an MCP (Model Context Protocol) server management tool that aggregates multiple MCP servers into a single unified interface.

## Features

- **Unified Interface**: Aggregates tools from multiple MCP servers into one
- **Tool Naming**: Exposes tools with prefix format `servername_toolname`
- **Dual Transport**: Supports both stdio and HTTP (stateless streamable) transports
- **Hot Reload**: Automatically reloads tools when configuration changes (no restart needed)
- **Tool Filtering**: Enable specific tools per server via configuration

## Installation

```bash
npm install
npm run build
```

## Configuration

Create a config file with the following structure:

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

### Stdio Transport

```bash
npm run start:stdio -- --config /path/to/mcp.json
# or
node dist/index.js --config /path/to/mcp.json
```

### HTTP Transport

```bash
npm run start:http -- --config /path/to/mcp.json
# or with custom port
PORT=8080 npm run start:http -- --config /path/to/mcp.json
```

The server will be available at `http://localhost:3000/mcp`.

**Note**: The HTTP transport uses stateless mode (no session management), which is compatible with tools like ChatBox.

### Hot Reload

The server watches the config file for changes. When you modify the configuration:

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
│   ├── index.ts      # Entry point
│   ├── server.ts     # MCP server implementation
│   ├── loader.ts     # MCP server loader
│   ├── config.ts     # Configuration loading
│   └── types.ts      # TypeScript types
├── tests/
│   ├── config.test.ts
│   ├── types.test.ts
│   └── loader.test.ts
├── mcp.json          # Example configuration
└── package.json
```

## API Endpoints

When running in HTTP mode:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /mcp | Handle MCP JSON-RPC requests |
| GET | /mcp | SSE endpoint for server-to-client notifications |

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
npm run start:stdio -- --config mcp.json
```

3. The server will expose tools with prefix `exa_` (e.g., `exa_web_search_exa`).

## License

MIT
