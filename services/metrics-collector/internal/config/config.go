package config

import (
	"os"
	"strconv"
)

type Config struct {
	ServiceName           string
	Version               string
	HTTPPort              int
	MetricsPort           int
	LogLevel              string
	ScrapeIntervalSeconds int
}

func Load() Config {
	return Config{
		ServiceName:           getEnv("SERVICE_NAME", "metrics-collector"),
		Version:               getEnv("VERSION", "1.0.0"),
		HTTPPort:              getEnvInt("HTTP_PORT", 9091),
		MetricsPort:           getEnvInt("METRICS_PORT", 9090),
		LogLevel:              getEnv("LOG_LEVEL", "info"),
		ScrapeIntervalSeconds: getEnvInt("SCRAPE_INTERVAL_SECONDS", 15),
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	value, err := strconv.Atoi(os.Getenv(key))
	if err != nil {
		return fallback
	}
	return value
}
