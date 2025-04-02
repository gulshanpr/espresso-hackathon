package config

import (
	"encoding/json"
	"fmt"
	"os"
	"time"
)

type Config struct {
	CaffNodeURL     string        `json:"caff_node_url"`
	PollingInterval time.Duration `json:"polling_interval"`
	Value           int           `json:"value"`
	From            string        `json:"from"`
}

func LoadConfig() (Config, error) {
	data, err := os.ReadFile("config/config.json")
	if err != nil {
		return Config{}, fmt.Errorf("error reading config file: %w", err)
	}

	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return Config{}, fmt.Errorf("error parsing config file: %w", err)
	}
	return cfg, nil
}
