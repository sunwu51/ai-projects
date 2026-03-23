# NanoLLM

A lightweight LLM provider gateway similar to LiteLLM, written in Go.

## Features

- **Multi-Protocol Support**: Supports three API protocols:
  - `/v1/chat/completions` (OpenAI Chat Completions)
  - `/v1/messages` (Anthropic Messages)
  - `/v1/responses` (Text Completions)

- **Protocol Conversion**: Automatically converts between protocols, allowing you to call any provider using any protocol

- **Flexible Configuration**: YAML-based configuration with support for:
  - Multiple providers
  - Custom headers
  - Body field overrides
  - Dynamic values (UUID generation, header extraction)

- **Logging**: Comprehensive logging with multiple levels (info, debug, trace)
  - Console and file logging
  - Request/response tracking
  - Upstream provider logging

- **Web UI**: Built-in web interface for configuration management

## Installation

```bash
go build -o nanollm
```

## Configuration

Create a config file at `~/.nanollm/config.yaml`:

```yaml
log_level: debug

providers:
  - name: openrouter-chat
    model: openai/gpt-3.5-turbo
    protocol: chat/completions
    base_url: https://openrouter.ai/api
    api_key: your-api-key
    headers:
      HTTP-Referer: https://github.com/nanollm
      X-Title: NanoLLM
    body_override:
      stream: false

  - name: openrouter-messages
    model: anthropic/claude-3-haiku
    protocol: messages
    base_url: https://openrouter.ai/api
    api_key: your-api-key
    headers:
      HTTP-Referer: https://github.com/nanollm
    body_override:
      custom_id: "{uuid}"
      user_agent: "{headers.User-Agent}"
```

### Configuration Options

- `log_level`: Logging level (info, debug, trace)
- `providers`: List of provider configurations
  - `name`: Model name exposed by the gateway
  - `model`: Actual model name to call on the provider
  - `protocol`: Provider's protocol (chat/completions, messages, or responses)
  - `base_url`: Provider's base URL
  - `api_key`: API key (optional, will use Authorization header if not set)
  - `headers`: Custom headers to send to provider
  - `body_override`: Override or add fields to request body
    - Use `{uuid}` to generate a unique ID
    - Use `{headers.HeaderName}` to extract from request headers

## Usage

Start the server:

```bash
./nanollm --config ~/.nanollm/config.yaml --port 8080
```

### API Examples

Call using chat completions format:

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openrouter-chat",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 100
  }'
```

Call using messages format:

```bash
curl -X POST http://localhost:8080/v1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openrouter-messages",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 100
  }'
```

Call using responses format:

```bash
curl -X POST http://localhost:8080/v1/responses \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openrouter-responses",
    "prompt": "Hello",
    "max_tokens": 100
  }'
```

### Web UI

Access the configuration web UI at `http://localhost:8080/`

## Logging

Logs are written to:
- Console (stdout)
- `~/.nanollm/YYYY-MM-DD.log`

Log levels:
- `info`: Basic request information (model, path, status)
- `debug`: Includes upstream provider requests/responses
- `trace`: Includes full request/response headers and bodies

## Protocol Conversion

The gateway automatically converts between protocols:

| Client → Server | Provider Protocol | Conversion |
|----------------|-------------------|------------|
| chat/completions | chat/completions | Direct pass-through |
| chat/completions | messages | Convert chat → messages |
| chat/completions | responses | Convert chat → responses |
| messages | messages | Direct pass-through |
| messages | chat/completions | Convert messages → chat |
| messages | responses | Convert messages → responses |
| responses | responses | Direct pass-through |
| responses | chat/completions | Convert responses → chat |
| responses | messages | Convert responses → messages |

## Testing

Run tests:

```bash
go test ./...
```

## License

MIT
