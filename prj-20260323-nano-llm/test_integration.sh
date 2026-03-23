#!/bin/bash

# Integration test script for NanoLLM

set -e

echo "Building NanoLLM..."
go build -o nanollm

echo "Creating test config..."
mkdir -p ~/.nanollm
cat > ~/.nanollm/config.yaml << 'EOF'
log_level: debug

providers:
  - name: openrouter-chat
    model: openai/gpt-3.5-turbo
    protocol: chat/completions
    base_url: https://openrouter.ai/api
    api_key: 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
    headers:
      HTTP-Referer: https://github.com/nanollm
      X-Title: NanoLLM
    body_override:
      stream: false

  - name: openrouter-messages
    model: anthropic/claude-3-haiku
    protocol: messages
    base_url: https://openrouter.ai/api
    api_key: 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
    headers:
      HTTP-Referer: https://github.com/nanollm
      X-Title: NanoLLM
    body_override:
      stream: false

  - name: openrouter-responses
    model: openai/gpt-3.5-turbo
    protocol: responses
    base_url: https://openrouter.ai/api
    api_key: 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
    headers:
      HTTP-Referer: https://github.com/nanollm
      X-Title: NanoLLM
    body_override:
      stream: false
EOF

echo "Starting NanoLLM server..."
./nanollm --port 8080 &
SERVER_PID=$!

sleep 3

echo "Testing chat/completions endpoint..."
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openrouter-chat",
    "messages": [{"role": "user", "content": "Say hello"}],
    "max_tokens": 50
  }' || echo "Chat completions test failed"

echo ""
echo "Testing messages endpoint..."
curl -X POST http://localhost:8080/v1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openrouter-messages",
    "messages": [{"role": "user", "content": "Say hello"}],
    "max_tokens": 50
  }' || echo "Messages test failed"

echo ""
echo "Testing responses endpoint..."
curl -X POST http://localhost:8080/v1/responses \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openrouter-responses",
    "prompt": "Say hello",
    "max_tokens": 50
  }' || echo "Responses test failed"

echo ""
echo "Stopping server..."
kill $SERVER_PID

echo "Integration tests completed!"
