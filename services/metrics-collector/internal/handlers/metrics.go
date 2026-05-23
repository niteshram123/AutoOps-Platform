package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"autoops/metrics-collector/internal/collector"
	"autoops/metrics-collector/internal/config"
)

type MetricsHandler struct {
	Config    config.Config
	Collector *collector.Collector
}

func (h MetricsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"service":      h.Config.ServiceName,
		"collected_at": time.Now().UTC().Format(time.RFC3339),
		"summary":      h.Collector.GetSummary(),
	})
}
