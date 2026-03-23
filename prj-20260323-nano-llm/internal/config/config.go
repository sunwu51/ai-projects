package config

import (
	"os"

	"gopkg.in/yaml.v3"
)

type Config struct {
	LogLevel  string     `yaml:"log_level"`
	Providers []Provider `yaml:"providers"`
}

type Provider struct {
	Name         string            `yaml:"name"`
	Model        string            `yaml:"model"`
	Protocol     string            `yaml:"protocol"`
	BaseURL      string            `yaml:"base_url"`
	APIKey       string            `yaml:"api_key"`
	Headers      map[string]string `yaml:"headers"`
	BodyOverride map[string]any    `yaml:"body_override"`
}

func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}

	if cfg.LogLevel == "" {
		cfg.LogLevel = "info"
	}

	return &cfg, nil
}
