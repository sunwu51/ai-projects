package converter

import (
	"testing"
)

func TestChatToMessages(t *testing.T) {
	req := ChatCompletionRequest{
		Model: "test-model",
		Messages: []ChatMessage{
			{Role: "user", Content: "Hello"},
		},
		MaxTokens: 100,
	}

	result, err := ChatToMessages(req)
	if err != nil {
		t.Fatalf("ChatToMessages failed: %v", err)
	}

	if result.Model != "test-model" {
		t.Errorf("Expected model test-model, got %s", result.Model)
	}

	if len(result.Messages) != 1 {
		t.Errorf("Expected 1 message, got %d", len(result.Messages))
	}
}

func TestMessagesToChat(t *testing.T) {
	resp := MessagesResponse{
		ID:    "test-id",
		Model: "test-model",
		Content: []ContentBlock{
			{Type: "text", Text: "Hello response"},
		},
		StopReason: "end_turn",
		Usage: MessagesUsage{
			InputTokens:  10,
			OutputTokens: 20,
		},
	}

	result, err := MessagesToChat(resp)
	if err != nil {
		t.Fatalf("MessagesToChat failed: %v", err)
	}

	if result.ID != "test-id" {
		t.Errorf("Expected ID test-id, got %s", result.ID)
	}

	if len(result.Choices) != 1 {
		t.Errorf("Expected 1 choice, got %d", len(result.Choices))
	}

	if result.Choices[0].Message.Content != "Hello response" {
		t.Errorf("Expected content 'Hello response', got %s", result.Choices[0].Message.Content)
	}
}

func TestChatToResponses(t *testing.T) {
	req := ChatCompletionRequest{
		Model: "test-model",
		Messages: []ChatMessage{
			{Role: "user", Content: "Hello"},
			{Role: "assistant", Content: "Hi there"},
		},
		MaxTokens: 100,
	}

	result, err := ChatToResponses(req)
	if err != nil {
		t.Fatalf("ChatToResponses failed: %v", err)
	}

	if result.Model != "test-model" {
		t.Errorf("Expected model test-model, got %s", result.Model)
	}

	if result.Prompt == "" {
		t.Error("Expected non-empty prompt")
	}
}

func TestResponsesToChat(t *testing.T) {
	resp := ResponsesResponse{
		ID:      "test-id",
		Model:   "test-model",
		Created: 123456,
		Choices: []ResponseChoice{
			{Text: "Response text", Index: 0, FinishReason: "stop"},
		},
		Usage: Usage{
			PromptTokens:     10,
			CompletionTokens: 20,
			TotalTokens:      30,
		},
	}

	result, err := ResponsesToChat(resp)
	if err != nil {
		t.Fatalf("ResponsesToChat failed: %v", err)
	}

	if result.ID != "test-id" {
		t.Errorf("Expected ID test-id, got %s", result.ID)
	}

	if len(result.Choices) != 1 {
		t.Errorf("Expected 1 choice, got %d", len(result.Choices))
	}

	if result.Choices[0].Message.Content != "Response text" {
		t.Errorf("Expected content 'Response text', got %s", result.Choices[0].Message.Content)
	}
}

func TestApplyBodyOverride(t *testing.T) {
	body := make(map[string]interface{})
	override := map[string]any{
		"test_field": "test_value",
		"uuid_field": "{uuid}",
	}
	headers := map[string]string{
		"X-Custom": "custom-value",
	}

	err := ApplyBodyOverride(body, override, headers)
	if err != nil {
		t.Fatalf("ApplyBodyOverride failed: %v", err)
	}

	if body["test_field"] != "test_value" {
		t.Errorf("Expected test_field to be test_value, got %v", body["test_field"])
	}

	if body["uuid_field"] == nil || body["uuid_field"] == "{uuid}" {
		t.Error("Expected uuid_field to be generated")
	}
}

func TestApplyBodyOverrideWithHeaders(t *testing.T) {
	body := make(map[string]interface{})
	override := map[string]any{
		"header_field": "{headers.X-Custom}",
	}
	headers := map[string]string{
		"X-Custom": "custom-value",
	}

	err := ApplyBodyOverride(body, override, headers)
	if err != nil {
		t.Fatalf("ApplyBodyOverride failed: %v", err)
	}

	if body["header_field"] != "custom-value" {
		t.Errorf("Expected header_field to be custom-value, got %v", body["header_field"])
	}
}
