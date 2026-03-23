package converter

import (
	"encoding/json"
	"fmt"
	"time"
)

type ChatCompletionRequest struct {
	Model       string                 `json:"model"`
	Messages    []ChatMessage          `json:"messages"`
	MaxTokens   int                    `json:"max_tokens,omitempty"`
	Temperature float64                `json:"temperature,omitempty"`
	Stream      bool                   `json:"stream,omitempty"`
	Extra       map[string]interface{} `json:"-"`
}

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatCompletionResponse struct {
	ID      string       `json:"id"`
	Object  string       `json:"object"`
	Created int64        `json:"created"`
	Model   string       `json:"model"`
	Choices []ChatChoice `json:"choices"`
	Usage   Usage        `json:"usage"`
}

type ChatChoice struct {
	Index        int         `json:"index"`
	Message      ChatMessage `json:"message"`
	FinishReason string      `json:"finish_reason"`
}

type MessagesRequest struct {
	Model       string                 `json:"model"`
	Messages    []MessageBlock         `json:"messages"`
	MaxTokens   int                    `json:"max_tokens"`
	Temperature float64                `json:"temperature,omitempty"`
	System      string                 `json:"system,omitempty"`
	Stream      bool                   `json:"stream,omitempty"`
	Extra       map[string]interface{} `json:"-"`
}

type MessageBlock struct {
	Role    string      `json:"role"`
	Content interface{} `json:"content"`
}

type MessagesResponse struct {
	ID         string         `json:"id"`
	Type       string         `json:"type"`
	Role       string         `json:"role"`
	Content    []ContentBlock `json:"content"`
	Model      string         `json:"model"`
	StopReason string         `json:"stop_reason"`
	Usage      MessagesUsage  `json:"usage"`
}

type ContentBlock struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type MessagesUsage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

type ResponsesRequest struct {
	Model       string                 `json:"model"`
	Prompt      string                 `json:"prompt"`
	MaxTokens   int                    `json:"max_tokens,omitempty"`
	Temperature float64                `json:"temperature,omitempty"`
	Stream      bool                   `json:"stream,omitempty"`
	Extra       map[string]interface{} `json:"-"`
}

type ResponsesResponse struct {
	ID      string           `json:"id"`
	Object  string           `json:"object"`
	Created int64            `json:"created"`
	Model   string           `json:"model"`
	Choices []ResponseChoice `json:"choices"`
	Usage   Usage            `json:"usage"`
}

type ResponseChoice struct {
	Text         string `json:"text"`
	Index        int    `json:"index"`
	FinishReason string `json:"finish_reason"`
}

type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

func ChatToMessages(req ChatCompletionRequest) (MessagesRequest, error) {
	msgs := make([]MessageBlock, len(req.Messages))
	for i, m := range req.Messages {
		msgs[i] = MessageBlock{Role: m.Role, Content: m.Content}
	}
	return MessagesRequest{
		Model:       req.Model,
		Messages:    msgs,
		MaxTokens:   req.MaxTokens,
		Temperature: req.Temperature,
		Stream:      req.Stream,
		Extra:       req.Extra,
	}, nil
}

func MessagesToChat(resp MessagesResponse) (ChatCompletionResponse, error) {
	text := ""
	if len(resp.Content) > 0 {
		text = resp.Content[0].Text
	}
	return ChatCompletionResponse{
		ID:      resp.ID,
		Object:  "chat.completion",
		Created: 0,
		Model:   resp.Model,
		Choices: []ChatChoice{{
			Index:        0,
			Message:      ChatMessage{Role: "assistant", Content: text},
			FinishReason: resp.StopReason,
		}},
		Usage: Usage{
			PromptTokens:     resp.Usage.InputTokens,
			CompletionTokens: resp.Usage.OutputTokens,
			TotalTokens:      resp.Usage.InputTokens + resp.Usage.OutputTokens,
		},
	}, nil
}

func ChatToResponses(req ChatCompletionRequest) (ResponsesRequest, error) {
	prompt := ""
	for _, m := range req.Messages {
		prompt += fmt.Sprintf("%s: %s\n", m.Role, m.Content)
	}
	return ResponsesRequest{
		Model:       req.Model,
		Prompt:      prompt,
		MaxTokens:   req.MaxTokens,
		Temperature: req.Temperature,
		Stream:      req.Stream,
		Extra:       req.Extra,
	}, nil
}

func ResponsesToChat(resp ResponsesResponse) (ChatCompletionResponse, error) {
	text := ""
	if len(resp.Choices) > 0 {
		text = resp.Choices[0].Text
	}
	return ChatCompletionResponse{
		ID:      resp.ID,
		Object:  resp.Object,
		Created: resp.Created,
		Model:   resp.Model,
		Choices: []ChatChoice{{
			Index:        0,
			Message:      ChatMessage{Role: "assistant", Content: text},
			FinishReason: resp.Choices[0].FinishReason,
		}},
		Usage: resp.Usage,
	}, nil
}

func MessagesToResponses(req MessagesRequest) (ResponsesRequest, error) {
	prompt := ""
	if req.System != "" {
		prompt += "System: " + req.System + "\n"
	}
	for _, m := range req.Messages {
		content := ""
		switch v := m.Content.(type) {
		case string:
			content = v
		case []interface{}:
			for _, block := range v {
				if bm, ok := block.(map[string]interface{}); ok {
					if text, ok := bm["text"].(string); ok {
						content += text
					}
				}
			}
		}
		prompt += fmt.Sprintf("%s: %s\n", m.Role, content)
	}
	return ResponsesRequest{
		Model:       req.Model,
		Prompt:      prompt,
		MaxTokens:   req.MaxTokens,
		Temperature: req.Temperature,
		Stream:      req.Stream,
		Extra:       req.Extra,
	}, nil
}

func ResponsesToMessages(resp ResponsesResponse) (MessagesResponse, error) {
	text := ""
	if len(resp.Choices) > 0 {
		text = resp.Choices[0].Text
	}
	return MessagesResponse{
		ID:         resp.ID,
		Type:       "message",
		Role:       "assistant",
		Content:    []ContentBlock{{Type: "text", Text: text}},
		Model:      resp.Model,
		StopReason: resp.Choices[0].FinishReason,
		Usage: MessagesUsage{
			InputTokens:  resp.Usage.PromptTokens,
			OutputTokens: resp.Usage.CompletionTokens,
		},
	}, nil
}

func ResponsesToChatReq(req ResponsesRequest) (ChatCompletionRequest, error) {
	return ChatCompletionRequest{
		Model:       req.Model,
		Messages:    []ChatMessage{{Role: "user", Content: req.Prompt}},
		MaxTokens:   req.MaxTokens,
		Temperature: req.Temperature,
		Stream:      req.Stream,
		Extra:       req.Extra,
	}, nil
}

func ChatToMessagesResp(resp ChatCompletionResponse) (MessagesResponse, error) {
	text := ""
	if len(resp.Choices) > 0 {
		text = resp.Choices[0].Message.Content
	}
	return MessagesResponse{
		ID:         resp.ID,
		Type:       "message",
		Role:       "assistant",
		Content:    []ContentBlock{{Type: "text", Text: text}},
		Model:      resp.Model,
		StopReason: resp.Choices[0].FinishReason,
		Usage: MessagesUsage{
			InputTokens:  resp.Usage.PromptTokens,
			OutputTokens: resp.Usage.CompletionTokens,
		},
	}, nil
}

func MessagesToChatReq(req MessagesRequest) (ChatCompletionRequest, error) {
	msgs := make([]ChatMessage, len(req.Messages))
	for i, m := range req.Messages {
		content := ""
		switch v := m.Content.(type) {
		case string:
			content = v
		case []interface{}:
			for _, block := range v {
				if bm, ok := block.(map[string]interface{}); ok {
					if text, ok := bm["text"].(string); ok {
						content += text
					}
				}
			}
		}
		msgs[i] = ChatMessage{Role: m.Role, Content: content}
	}
	return ChatCompletionRequest{
		Model:       req.Model,
		Messages:    msgs,
		MaxTokens:   req.MaxTokens,
		Temperature: req.Temperature,
		Stream:      req.Stream,
		Extra:       req.Extra,
	}, nil
}

func ResponsesToChatResp(resp ResponsesResponse) (ChatCompletionResponse, error) {
	return ResponsesToChat(resp)
}

func ChatToResponsesResp(resp ChatCompletionResponse) (ResponsesResponse, error) {
	text := ""
	if len(resp.Choices) > 0 {
		text = resp.Choices[0].Message.Content
	}
	return ResponsesResponse{
		ID:      resp.ID,
		Object:  "text_completion",
		Created: resp.Created,
		Model:   resp.Model,
		Choices: []ResponseChoice{{
			Text:         text,
			Index:        0,
			FinishReason: resp.Choices[0].FinishReason,
		}},
		Usage: resp.Usage,
	}, nil
}

func MessagesToResponsesResp(resp MessagesResponse) (ResponsesResponse, error) {
	text := ""
	if len(resp.Content) > 0 {
		text = resp.Content[0].Text
	}
	return ResponsesResponse{
		ID:      resp.ID,
		Object:  "text_completion",
		Created: 0,
		Model:   resp.Model,
		Choices: []ResponseChoice{{
			Text:         text,
			Index:        0,
			FinishReason: resp.StopReason,
		}},
		Usage: Usage{
			PromptTokens:     resp.Usage.InputTokens,
			CompletionTokens: resp.Usage.OutputTokens,
			TotalTokens:      resp.Usage.InputTokens + resp.Usage.OutputTokens,
		},
	}, nil
}

func MergeExtra(target map[string]interface{}, source map[string]interface{}) {
	for k, v := range source {
		target[k] = v
	}
}

func ApplyBodyOverride(body map[string]interface{}, override map[string]any, headers map[string]string) error {
	for k, v := range override {
		switch val := v.(type) {
		case string:
			if val == "{uuid}" {
				body[k] = generateUUID()
			} else if len(val) > 10 && val[:9] == "{headers." && val[len(val)-1] == '}' {
				headerKey := val[9 : len(val)-1]
				if headerVal, ok := headers[headerKey]; ok {
					body[k] = headerVal
				}
			} else {
				body[k] = val
			}
		case map[string]interface{}:
			if _, ok := body[k]; !ok {
				body[k] = make(map[string]interface{})
			}
			if nested, ok := body[k].(map[string]interface{}); ok {
				if err := ApplyBodyOverride(nested, val, headers); err != nil {
					return err
				}
			}
		default:
			body[k] = val
		}
	}
	return nil
}

func generateUUID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

func ToJSON(v interface{}) ([]byte, error) {
	return json.Marshal(v)
}

func FromJSON(data []byte, v interface{}) error {
	return json.Unmarshal(data, v)
}
