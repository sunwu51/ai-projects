package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"nanollm/internal/config"
	"nanollm/internal/converter"
	"nanollm/internal/logger"
)

type Handler struct {
	config *config.Config
}

func New(cfg *config.Config) *Handler {
	return &Handler{config: cfg}
}

func (h *Handler) HandleChatCompletions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	body, _ := io.ReadAll(r.Body)
	r.Body = io.NopCloser(bytes.NewBuffer(body))

	var req converter.ChatCompletionRequest
	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	provider := h.findProvider(req.Model)
	if provider == nil {
		http.Error(w, "Provider not found", http.StatusNotFound)
		return
	}

	logger.Trace("Received request: headers=%v body=%s", r.Header, string(body))

	var respData []byte
	var err error

	switch provider.Protocol {
	case "chat/completions":
		respData, err = h.proxyChatToChat(req, provider, r.Header)
	case "messages":
		respData, err = h.proxyChatToMessages(req, provider, r.Header)
	case "responses":
		respData, err = h.proxyChatToResponses(req, provider, r.Header)
	default:
		http.Error(w, "Unknown protocol", http.StatusInternalServerError)
		return
	}

	if err != nil {
		logger.Info("Request failed: model=%s path=%s status=%d error=%v", req.Model, r.URL.Path, http.StatusInternalServerError, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	logger.Info("Request: model=%s path=%s status=%d", req.Model, r.URL.Path, http.StatusOK)
	logger.Trace("Response body: %s", string(respData))

	w.Header().Set("Content-Type", "application/json")
	w.Write(respData)
}

func (h *Handler) HandleMessages(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	body, _ := io.ReadAll(r.Body)
	r.Body = io.NopCloser(bytes.NewBuffer(body))

	var req converter.MessagesRequest
	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	provider := h.findProvider(req.Model)
	if provider == nil {
		http.Error(w, "Provider not found", http.StatusNotFound)
		return
	}

	logger.Trace("Received request: headers=%v body=%s", r.Header, string(body))

	var respData []byte
	var err error

	switch provider.Protocol {
	case "messages":
		respData, err = h.proxyMessagesToMessages(req, provider, r.Header)
	case "chat/completions":
		respData, err = h.proxyMessagesToChat(req, provider, r.Header)
	case "responses":
		respData, err = h.proxyMessagesToResponses(req, provider, r.Header)
	default:
		http.Error(w, "Unknown protocol", http.StatusInternalServerError)
		return
	}

	if err != nil {
		logger.Info("Request failed: model=%s path=%s status=%d error=%v", req.Model, r.URL.Path, http.StatusInternalServerError, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	logger.Info("Request: model=%s path=%s status=%d", req.Model, r.URL.Path, http.StatusOK)
	logger.Trace("Response body: %s", string(respData))

	w.Header().Set("Content-Type", "application/json")
	w.Write(respData)
}

func (h *Handler) HandleResponses(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	body, _ := io.ReadAll(r.Body)
	r.Body = io.NopCloser(bytes.NewBuffer(body))

	var req converter.ResponsesRequest
	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	provider := h.findProvider(req.Model)
	if provider == nil {
		http.Error(w, "Provider not found", http.StatusNotFound)
		return
	}

	logger.Trace("Received request: headers=%v body=%s", r.Header, string(body))

	var respData []byte
	var err error

	switch provider.Protocol {
	case "responses":
		respData, err = h.proxyResponsesToResponses(req, provider, r.Header)
	case "chat/completions":
		respData, err = h.proxyResponsesToChat(req, provider, r.Header)
	case "messages":
		respData, err = h.proxyResponsesToMessages(req, provider, r.Header)
	default:
		http.Error(w, "Unknown protocol", http.StatusInternalServerError)
		return
	}

	if err != nil {
		logger.Info("Request failed: model=%s path=%s status=%d error=%v", req.Model, r.URL.Path, http.StatusInternalServerError, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	logger.Info("Request: model=%s path=%s status=%d", req.Model, r.URL.Path, http.StatusOK)
	logger.Trace("Response body: %s", string(respData))

	w.Header().Set("Content-Type", "application/json")
	w.Write(respData)
}

func (h *Handler) findProvider(model string) *config.Provider {
	for i := range h.config.Providers {
		if h.config.Providers[i].Name == model {
			return &h.config.Providers[i]
		}
	}
	return nil
}

func (h *Handler) proxyChatToChat(req converter.ChatCompletionRequest, provider *config.Provider, headers http.Header) ([]byte, error) {
	reqBody := make(map[string]interface{})
	data, _ := json.Marshal(req)
	json.Unmarshal(data, &reqBody)
	reqBody["model"] = provider.Model

	return h.sendRequest(provider, "/v1/chat/completions", reqBody, headers)
}

func (h *Handler) proxyChatToMessages(req converter.ChatCompletionRequest, provider *config.Provider, headers http.Header) ([]byte, error) {
	converted, _ := converter.ChatToMessages(req)
	reqBody := make(map[string]interface{})
	data, _ := json.Marshal(converted)
	json.Unmarshal(data, &reqBody)
	reqBody["model"] = provider.Model

	respData, err := h.sendRequest(provider, "/v1/messages", reqBody, headers)
	if err != nil {
		return nil, err
	}

	var msgResp converter.MessagesResponse
	json.Unmarshal(respData, &msgResp)
	chatResp, _ := converter.MessagesToChat(msgResp)
	return json.Marshal(chatResp)
}

func (h *Handler) proxyChatToResponses(req converter.ChatCompletionRequest, provider *config.Provider, headers http.Header) ([]byte, error) {
	converted, _ := converter.ChatToResponses(req)
	reqBody := make(map[string]interface{})
	data, _ := json.Marshal(converted)
	json.Unmarshal(data, &reqBody)
	reqBody["model"] = provider.Model

	respData, err := h.sendRequest(provider, "/v1/responses", reqBody, headers)
	if err != nil {
		return nil, err
	}

	var respResp converter.ResponsesResponse
	json.Unmarshal(respData, &respResp)
	chatResp, _ := converter.ResponsesToChat(respResp)
	return json.Marshal(chatResp)
}

func (h *Handler) proxyMessagesToMessages(req converter.MessagesRequest, provider *config.Provider, headers http.Header) ([]byte, error) {
	reqBody := make(map[string]interface{})
	data, _ := json.Marshal(req)
	json.Unmarshal(data, &reqBody)
	reqBody["model"] = provider.Model

	return h.sendRequest(provider, "/v1/messages", reqBody, headers)
}

func (h *Handler) proxyMessagesToChat(req converter.MessagesRequest, provider *config.Provider, headers http.Header) ([]byte, error) {
	converted, _ := converter.MessagesToChatReq(req)
	reqBody := make(map[string]interface{})
	data, _ := json.Marshal(converted)
	json.Unmarshal(data, &reqBody)
	reqBody["model"] = provider.Model

	respData, err := h.sendRequest(provider, "/v1/chat/completions", reqBody, headers)
	if err != nil {
		return nil, err
	}

	var chatResp converter.ChatCompletionResponse
	json.Unmarshal(respData, &chatResp)
	msgResp, _ := converter.ChatToMessagesResp(chatResp)
	return json.Marshal(msgResp)
}

func (h *Handler) proxyMessagesToResponses(req converter.MessagesRequest, provider *config.Provider, headers http.Header) ([]byte, error) {
	converted, _ := converter.MessagesToResponses(req)
	reqBody := make(map[string]interface{})
	data, _ := json.Marshal(converted)
	json.Unmarshal(data, &reqBody)
	reqBody["model"] = provider.Model

	respData, err := h.sendRequest(provider, "/v1/responses", reqBody, headers)
	if err != nil {
		return nil, err
	}

	var respResp converter.ResponsesResponse
	json.Unmarshal(respData, &respResp)
	msgResp, _ := converter.ResponsesToMessages(respResp)
	return json.Marshal(msgResp)
}

func (h *Handler) proxyResponsesToResponses(req converter.ResponsesRequest, provider *config.Provider, headers http.Header) ([]byte, error) {
	reqBody := make(map[string]interface{})
	data, _ := json.Marshal(req)
	json.Unmarshal(data, &reqBody)
	reqBody["model"] = provider.Model

	return h.sendRequest(provider, "/v1/responses", reqBody, headers)
}

func (h *Handler) proxyResponsesToChat(req converter.ResponsesRequest, provider *config.Provider, headers http.Header) ([]byte, error) {
	converted, _ := converter.ResponsesToChatReq(req)
	reqBody := make(map[string]interface{})
	data, _ := json.Marshal(converted)
	json.Unmarshal(data, &reqBody)
	reqBody["model"] = provider.Model

	respData, err := h.sendRequest(provider, "/v1/chat/completions", reqBody, headers)
	if err != nil {
		return nil, err
	}

	var chatResp converter.ChatCompletionResponse
	json.Unmarshal(respData, &chatResp)
	respResp, _ := converter.ChatToResponsesResp(chatResp)
	return json.Marshal(respResp)
}

func (h *Handler) proxyResponsesToMessages(req converter.ResponsesRequest, provider *config.Provider, headers http.Header) ([]byte, error) {
	converted, _ := converter.ResponsesToChatReq(req)
	convMsg, _ := converter.ChatToMessages(converted)
	reqBody := make(map[string]interface{})
	data, _ := json.Marshal(convMsg)
	json.Unmarshal(data, &reqBody)
	reqBody["model"] = provider.Model

	respData, err := h.sendRequest(provider, "/v1/messages", reqBody, headers)
	if err != nil {
		return nil, err
	}

	var msgResp converter.MessagesResponse
	json.Unmarshal(respData, &msgResp)
	respResp, _ := converter.MessagesToResponsesResp(msgResp)
	return json.Marshal(respResp)
}

func (h *Handler) sendRequest(provider *config.Provider, path string, body map[string]interface{}, headers http.Header) ([]byte, error) {
	headerMap := make(map[string]string)
	for k, v := range headers {
		if len(v) > 0 {
			headerMap[k] = v[0]
		}
	}

	if err := converter.ApplyBodyOverride(body, provider.BodyOverride, headerMap); err != nil {
		return nil, err
	}

	reqData, _ := json.Marshal(body)
	url := strings.TrimSuffix(provider.BaseURL, "/") + path

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(reqData))
	if err != nil {
		return nil, err
	}

	for k, v := range headers {
		if k != "Authorization" {
			req.Header[k] = v
		}
	}

	for k, v := range provider.Headers {
		req.Header.Set(k, v)
	}

	if provider.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+provider.APIKey)
	} else if auth := headers.Get("Authorization"); auth != "" {
		req.Header.Set("Authorization", auth)
	}

	req.Header.Set("Content-Type", "application/json")

	logger.Debug("Upstream request: url=%s headers=%v body=%s", url, req.Header, string(reqData))

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respData, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	logger.Debug("Upstream response: status=%d headers=%v body=%s", resp.StatusCode, resp.Header, string(respData))

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("upstream error: %d %s", resp.StatusCode, string(respData))
	}

	return respData, nil
}

func (h *Handler) HandleWebUI(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}

	html := `<!DOCTYPE html>
<html>
<head>
    <title>NanoLLM Config</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        textarea { width: 100%; height: 400px; font-family: monospace; }
        button { padding: 10px 20px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>NanoLLM Configuration</h1>
    <p>Edit your config.yaml below:</p>
    <textarea id="config"></textarea>
    <br>
    <button onclick="saveConfig()">Save Config</button>
    <div id="message"></div>
    <script>
        async function loadConfig() {
            const resp = await fetch('/api/config');
            const data = await resp.text();
            document.getElementById('config').value = data;
        }
        async function saveConfig() {
            const config = document.getElementById('config').value;
            const resp = await fetch('/api/config', {
                method: 'POST',
                body: config
            });
            document.getElementById('message').innerText = resp.ok ? 'Saved!' : 'Error saving';
        }
        loadConfig();
    </script>
</body>
</html>`
	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(html))
}
