package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"autoops/metrics-collector/internal/collector"
	"autoops/metrics-collector/internal/config"
)

type HealthHandler struct {
	Config    config.Config
	Collector *collector.Collector
	StartedAt time.Time
}

func (h HealthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":             "healthy",
		"service":            h.Config.ServiceName,
		"version":            h.Config.Version,
		"timestamp":          time.Now().UTC().Format(time.RFC3339),
		"metrics_registered": h.Collector.MetricsRegistered(),
		"uptime_seconds":     time.Since(h.StartedAt).Seconds(),
	})
}
