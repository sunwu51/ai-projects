#!/bin/bash

# Manual Test Script for MCP Center
# This script tests the new features: API endpoints, UI, parallel loading, etc.

set -e

echo "=== MCP Center Manual Test Script ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PORT=3456
TEST_CONFIG="/tmp/mcp-center-test-config.json"

# Create initial test config
echo "Creating test configuration..."
cat > "$TEST_CONFIG" << 'EOF'
{
  "servers": [
    {
      "name": "test",
      "command": "node",
      "args": ["tests/test-mcp-server.js"],
      "env": {
        "TEST_ENV": "initial_value"
      }
    }
  ]
}
EOF

echo -e "${GREEN}✓${NC} Test config created at $TEST_CONFIG"
echo ""

# Start the server
echo "Starting MCP Center server on port $PORT..."
PORT=$PORT node src/index.js --config "$TEST_CONFIG" > /tmp/mcp-center.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 3

# Check if server is running
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo -e "${RED}✗${NC} Server failed to start"
    cat /tmp/mcp-center.log
    exit 1
fi

echo -e "${GREEN}✓${NC} Server started (PID: $SERVER_PID)"
echo ""

# Function to cleanup
cleanup() {
    echo ""
    echo "Cleaning up..."
    kill $SERVER_PID 2>/dev/null || true
    rm -f "$TEST_CONFIG"
    rm -f /tmp/mcp-center.log
    echo "Done"
}

trap cleanup EXIT

# Test 1: UI endpoint
echo "Test 1: UI Endpoint"
echo "-------------------"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/ui)
if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓${NC} UI endpoint returns 200"
    UI_CONTENT=$(curl -s http://localhost:$PORT/ui)
    if echo "$UI_CONTENT" | grep -q "MCP Center"; then
        echo -e "${GREEN}✓${NC} UI contains 'MCP Center' title"
    else
        echo -e "${RED}✗${NC} UI missing expected content"
    fi
else
    echo -e "${RED}✗${NC} UI endpoint returned $RESPONSE"
fi
echo ""

# Test 2: GET /api/servers
echo "Test 2: GET /api/servers"
echo "------------------------"
SERVERS=$(curl -s http://localhost:$PORT/api/servers)
echo "Response: $SERVERS"
if echo "$SERVERS" | grep -q '"name":"test"'; then
    echo -e "${GREEN}✓${NC} Server list contains 'test' server"
    if echo "$SERVERS" | grep -q '"TEST_ENV":"initial_value"'; then
        echo -e "${GREEN}✓${NC} Environment variable is present"
    else
        echo -e "${RED}✗${NC} Environment variable missing"
    fi
else
    echo -e "${RED}✗${NC} Server list doesn't contain expected server"
fi
echo ""

# Test 3: POST /api/servers (add HTTP server)
echo "Test 3: POST /api/servers (HTTP server with headers)"
echo "-----------------------------------------------------"
ADD_RESPONSE=$(curl -s -X POST http://localhost:$PORT/api/servers \
    -H "Content-Type: application/json" \
    -d '{
        "name": "http-test",
        "url": "https://mcp.exa.ai/mcp",
        "httpHeaders": {
            "X-Custom-Header": "test-value"
        },
        "enabledTools": ["web_search_exa"]
    }')
echo "Response: $ADD_RESPONSE"
if echo "$ADD_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} HTTP server added successfully"
    
    # Verify it was added
    sleep 1
    SERVERS=$(curl -s http://localhost:$PORT/api/servers)
    if echo "$SERVERS" | grep -q '"name":"http-test"'; then
        echo -e "${GREEN}✓${NC} HTTP server appears in server list"
        if echo "$SERVERS" | grep -q '"X-Custom-Header":"test-value"'; then
            echo -e "${GREEN}✓${NC} HTTP headers are preserved"
        else
            echo -e "${RED}✗${NC} HTTP headers missing"
        fi
    else
        echo -e "${RED}✗${NC} HTTP server not in list"
    fi
else
    echo -e "${RED}✗${NC} Failed to add HTTP server"
fi
echo ""

# Test 4: POST /api/servers (add STDIO server)
echo "Test 4: POST /api/servers (STDIO server with env)"
echo "---------------------------------------------------"
ADD_RESPONSE=$(curl -s -X POST http://localhost:$PORT/api/servers \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"test2\",
        \"command\": \"node\",
        \"args\": [\"$(pwd)/tests/test-mcp-server.js\"],
        \"env\": {
            \"CUSTOM_VAR\": \"custom_value\"
        }
    }")
echo "Response: $ADD_RESPONSE"
if echo "$ADD_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} STDIO server added successfully"
    
    # Verify it was added
    sleep 1
    SERVERS=$(curl -s http://localhost:$PORT/api/servers)
    if echo "$SERVERS" | grep -q '"name":"test2"'; then
        echo -e "${GREEN}✓${NC} STDIO server appears in server list"
        if echo "$SERVERS" | grep -q '"CUSTOM_VAR":"custom_value"'; then
            echo -e "${GREEN}✓${NC} Environment variables are preserved"
        else
            echo -e "${RED}✗${NC} Environment variables missing"
        fi
    else
        echo -e "${RED}✗${NC} STDIO server not in list"
    fi
else
    echo -e "${RED}✗${NC} Failed to add STDIO server"
fi
echo ""

# Test 5: PUT /api/servers/:index
echo "Test 5: PUT /api/servers/:index (update server)"
echo "------------------------------------------------"
UPDATE_RESPONSE=$(curl -s -X PUT http://localhost:$PORT/api/servers/0 \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"test-updated\",
        \"command\": \"node\",
        \"args\": [\"$(pwd)/tests/test-mcp-server.js\"],
        \"env\": {
            \"TEST_ENV\": \"updated_value\"
        }
    }")
echo "Response: $UPDATE_RESPONSE"
if echo "$UPDATE_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Server updated successfully"
    
    # Verify it was updated
    sleep 1
    SERVERS=$(curl -s http://localhost:$PORT/api/servers)
    if echo "$SERVERS" | grep -q '"name":"test-updated"'; then
        echo -e "${GREEN}✓${NC} Server name was updated"
        if echo "$SERVERS" | grep -q '"TEST_ENV":"updated_value"'; then
            echo -e "${GREEN}✓${NC} Environment variable was updated"
        else
            echo -e "${RED}✗${NC} Environment variable not updated"
        fi
    else
        echo -e "${RED}✗${NC} Server name not updated"
    fi
else
    echo -e "${RED}✗${NC} Failed to update server"
fi
echo ""

# Test 6: MCP endpoint still works
echo "Test 6: MCP endpoint functionality"
echo "-----------------------------------"
# This is a basic check - full MCP testing requires an MCP client
MCP_RESPONSE=$(curl -s -X POST http://localhost:$PORT/mcp \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}')
if echo "$MCP_RESPONSE" | grep -q '"result"'; then
    echo -e "${GREEN}✓${NC} MCP endpoint responds to initialize"
else
    echo -e "${YELLOW}⚠${NC} MCP endpoint response: $MCP_RESPONSE"
fi
echo ""

# Test 7: DELETE /api/servers/:index
echo "Test 7: DELETE /api/servers/:index"
echo "-----------------------------------"
DELETE_RESPONSE=$(curl -s -X DELETE http://localhost:$PORT/api/servers/1)
echo "Response: $DELETE_RESPONSE"
if echo "$DELETE_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Server deleted successfully"
    
    # Verify it was deleted
    sleep 1
    SERVERS=$(curl -s http://localhost:$PORT/api/servers)
    SERVER_COUNT=$(echo "$SERVERS" | grep -o '"name"' | wc -l)
    echo "Server count after deletion: $SERVER_COUNT"
    if [ "$SERVER_COUNT" -lt "3" ]; then
        echo -e "${GREEN}✓${NC} Server was removed from list"
    else
        echo -e "${RED}✗${NC} Server still in list"
    fi
else
    echo -e "${RED}✗${NC} Failed to delete server"
fi
echo ""

# Test 8: Config file persistence
echo "Test 8: Config file persistence"
echo "--------------------------------"
CONFIG_CONTENT=$(cat "$TEST_CONFIG")
echo "Config file content:"
echo "$CONFIG_CONTENT"
if echo "$CONFIG_CONTENT" | grep -q '"name":"test-updated"'; then
    echo -e "${GREEN}✓${NC} Config file was updated with changes"
else
    echo -e "${RED}✗${NC} Config file not updated"
fi
echo ""

# Summary
echo "==================================="
echo "Test Summary"
echo "==================================="
echo -e "${GREEN}✓${NC} All manual tests completed"
echo ""
echo "To test the UI manually:"
echo "  1. Open http://localhost:$PORT/ui in your browser"
echo "  2. Try adding, editing, and deleting servers"
echo "  3. Verify changes persist in the config file"
echo ""
echo "Press Ctrl+C to stop the server and cleanup"
echo ""

# Keep server running for manual testing
wait $SERVER_PID
