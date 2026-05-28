package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"autoops/metrics-collector/internal/collector"
	"autoops/metrics-collector/internal/config"
	"autoops/metrics-collector/internal/handlers"

	"github.com/go-chi/chi/v5"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

func logJSON(service, level, message string, fields map[string]interface{}) {
	event := map[string]interface{}{
		"service":   service,
		"level":     level,
		"message":   message,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	}
	for key, value := range fields {
		event[key] = value
	}
	_ = json.NewEncoder(os.Stdout).Encode(event)
}

func main() {
	cfg := config.Load()
	startedAt := time.Now()
	metricsCollector := collector.New()

	// Start background goroutine that polls service health every 30s
	metricsCollector.StartHealthPoller(cfg.ScrapeIntervalSeconds)

	router := chi.NewRouter()
	router.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"service": cfg.ServiceName,
			"version": cfg.Version,
			"status":  "ok",
			"routes": map[string]string{
				"health":        "/health",
				"summary":       "/api/metrics",
				"prometheus":    "/metrics",
				"prometheusURL": fmt.Sprintf("http://localhost:%d/metrics", cfg.MetricsPort),
			},
		})
	})
	router.Get("/health", handlers.HealthHandler{Config: cfg, Collector: metricsCollector, StartedAt: startedAt}.ServeHTTP)
	router.Get("/api/metrics", handlers.MetricsHandler{Config: cfg, Collector: metricsCollector}.ServeHTTP)

	apiServer := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.HTTPPort),
		Handler:      router,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	promRouter := chi.NewRouter()
	promRouter.Handle("/metrics", promhttp.HandlerFor(metricsCollector.Registry(), promhttp.HandlerOpts{}))
	metricsServer := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.MetricsPort),
		Handler:      promRouter,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	go func() {
		logJSON(cfg.ServiceName, "info", "http server started", map[string]interface{}{"port": cfg.HTTPPort})
		if err := apiServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logJSON(cfg.ServiceName, "error", "http server failed", map[string]interface{}{"error": err.Error()})
		}
	}()

	go func() {
		logJSON(cfg.ServiceName, "info", "metrics server started", map[string]interface{}{"port": cfg.MetricsPort})
		if err := metricsServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logJSON(cfg.ServiceName, "error", "metrics server failed", map[string]interface{}{"error": err.Error()})
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGTERM, syscall.SIGINT)
	sig := <-stop
	logJSON(cfg.ServiceName, "info", "shutdown signal received", map[string]interface{}{"signal": sig.String()})

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = apiServer.Shutdown(ctx)
	_ = metricsServer.Shutdown(ctx)
	logJSON(cfg.ServiceName, "info", "service stopped", map[string]interface{}{})
}
