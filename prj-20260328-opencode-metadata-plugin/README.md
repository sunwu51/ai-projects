# opencode-metadata-plugin

OpenCode plugin that adds metadata fields to Anthropic API requests.

## Installation

```bash
npm install
npm run build
```

## Usage

This plugin automatically intercepts Anthropic API requests and adds metadata fields (user_id, project_id, session_id) if they don't already exist.

## Testing

```bash
npm test
```

## License

MIT
