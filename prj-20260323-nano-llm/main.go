package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"nanollm/internal/config"
	"nanollm/internal/handler"
	"nanollm/internal/logger"
)

func main() {
	configPath := flag.String("config", "", "Path to config file (default: ~/.nanollm/config.yaml)")
	port := flag.Int("port", 8080, "Server port")
	flag.Parse()

	if *configPath == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			log.Fatal(err)
		}
		*configPath = filepath.Join(home, ".nanollm", "config.yaml")
	}

	cfg, err := config.Load(*configPath)
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	if err := logger.Init(cfg.LogLevel); err != nil {
		log.Fatalf("Failed to init logger: %v", err)
	}

	h := handler.New(cfg)

	http.HandleFunc("/v1/chat/completions", h.HandleChatCompletions)
	http.HandleFunc("/v1/messages", h.HandleMessages)
	http.HandleFunc("/v1/responses", h.HandleResponses)
	http.HandleFunc("/", h.HandleWebUI)

	addr := fmt.Sprintf(":%d", *port)
	logger.Info("Server starting on %s", addr)
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatal(err)
	}
}
