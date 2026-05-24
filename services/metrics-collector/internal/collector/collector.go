package collector

import (
	"fmt"
	"net/http"
	"runtime"
	"sync"
	"time"

	"github.com/prometheus/client_golang/prometheus"
)

// serviceEndpoints maps service names to their health-check URLs.
// These are resolved via Docker DNS on the autoops-network.
var serviceEndpoints = map[string]string{
	"api-gateway":       "http://api-gateway:3000/health",
	"user-service":      "http://user-service:8000/health",
	"metrics-collector": "http://metrics-collector:9091/health",
}

type Collector struct {
	registry        *prometheus.Registry
	requests        *prometheus.CounterVec
	duration        *prometheus.HistogramVec
	activeUsers     prometheus.Gauge
	serviceHealth   *prometheus.GaugeVec
	errors          *prometheus.CounterVec
	// Phase 4 additions
	collectionDuration *prometheus.HistogramVec
	externalScrapes    *prometheus.CounterVec
	buildInfo          *prometheus.GaugeVec
	mu                 sync.RWMutex
	totalRequests      int
	totalErrors        int
	activeUserCount    float64
	health             map[string]bool
}

func New() *Collector {
	c := &Collector{
		registry: prometheus.NewRegistry(),
		requests: prometheus.NewCounterVec(
			prometheus.CounterOpts{Name: "autoops_http_requests_total", Help: "Total HTTP requests."},
			[]string{"service", "method", "status_code"},
		),
		duration: prometheus.NewHistogramVec(
			prometheus.HistogramOpts{Name: "autoops_http_request_duration_seconds", Help: "HTTP request duration."},
			[]string{"service", "endpoint"},
		),
		activeUsers: prometheus.NewGauge(
			prometheus.GaugeOpts{Name: "autoops_active_users_total", Help: "Current users in user-service."},
		),
		serviceHealth: prometheus.NewGaugeVec(
			prometheus.GaugeOpts{Name: "autoops_service_health_status", Help: "Service health status, 1 up and 0 down."},
			[]string{"service"},
		),
		errors: prometheus.NewCounterVec(
			prometheus.CounterOpts{Name: "autoops_errors_total", Help: "Total service errors."},
			[]string{"service", "error_type"},
		),
		// ── Phase 4 metrics ──────────────────────────────────────
		collectionDuration: prometheus.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "collection_duration_seconds",
				Help:    "Time taken to collect metrics from downstream services.",
				Buckets: []float64{0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5},
			},
			[]string{"target"},
		),
		externalScrapes: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: "external_scrapes_total",
				Help: "Total external health-check scrapes performed.",
			},
			[]string{"target", "status"},
		),
		buildInfo: prometheus.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "metrics_collector_build_info",
				Help: "Build information for the metrics-collector service.",
			},
			[]string{"version", "go_version"},
		),
		health: map[string]bool{
			"api-gateway":       true,
			"user-service":      true,
			"metrics-collector": true,
		},
	}

	c.registry.MustRegister(
		c.requests,
		c.duration,
		c.activeUsers,
		c.serviceHealth,
		c.errors,
		c.collectionDuration,
		c.externalScrapes,
		c.buildInfo,
	)

	// Seed initial health values
	for service, healthy := range c.health {
		c.SetServiceHealth(service, healthy)
	}

	// Publish build info (static gauge — value is always 1)
	c.buildInfo.WithLabelValues("1.0.0", runtime.Version()).Set(1)

	return c
}

// StartHealthPoller launches a background goroutine that pings all services
// every 30 seconds, updates autoops_service_health_status, and records
// collection_duration_seconds.
func (c *Collector) StartHealthPoller(intervalSeconds int) {
	if intervalSeconds <= 0 {
		intervalSeconds = 30
	}
	go func() {
		ticker := time.NewTicker(time.Duration(intervalSeconds) * time.Second)
		defer ticker.Stop()
		// Run once immediately on startup
		c.pollAllServices()
		for range ticker.C {
			c.pollAllServices()
		}
	}()
}

func (c *Collector) pollAllServices() {
	client := &http.Client{Timeout: 5 * time.Second}
	for service, url := range serviceEndpoints {
		start := time.Now()
		resp, err := client.Get(url) //nolint:noctx
		elapsed := time.Since(start).Seconds()
		c.collectionDuration.WithLabelValues(service).Observe(elapsed)

		if err != nil || resp.StatusCode >= 400 {
			status := "error"
			if err == nil {
				status = fmt.Sprintf("%d", resp.StatusCode)
			}
			c.externalScrapes.WithLabelValues(service, status).Inc()
			c.SetServiceHealth(service, false)
		} else {
			c.externalScrapes.WithLabelValues(service, "200").Inc()
			c.SetServiceHealth(service, true)
		}
		if resp != nil {
			_ = resp.Body.Close()
		}
	}
}

func (c *Collector) Registry() *prometheus.Registry {
	return c.registry
}

func (c *Collector) MetricsRegistered() int {
	return 8 // updated count
}

func (c *Collector) RecordRequest(service, method, statusCode string, duration float64) {
	c.requests.WithLabelValues(service, method, statusCode).Inc()
	c.duration.WithLabelValues(service, method).Observe(duration)
	c.mu.Lock()
	c.totalRequests++
	c.mu.Unlock()
}

func (c *Collector) SetActiveUsers(count float64) {
	c.activeUsers.Set(count)
	c.mu.Lock()
	c.activeUserCount = count
	c.mu.Unlock()
}

func (c *Collector) SetServiceHealth(service string, healthy bool) {
	value := 0.0
	if healthy {
		value = 1
	}
	c.serviceHealth.WithLabelValues(service).Set(value)
	c.mu.Lock()
	c.health[service] = healthy
	c.mu.Unlock()
}

func (c *Collector) RecordError(service, errorType string) {
	c.errors.WithLabelValues(service, errorType).Inc()
	c.mu.Lock()
	c.totalErrors++
	c.mu.Unlock()
}

func (c *Collector) GetSummary() map[string]interface{} {
	c.mu.RLock()
	defer c.mu.RUnlock()

	healthCopy := make(map[string]bool, len(c.health))
	for service, healthy := range c.health {
		healthCopy[service] = healthy
	}

	return map[string]interface{}{
		"total_requests": c.totalRequests,
		"total_errors":   c.totalErrors,
		"active_users":   c.activeUserCount,
		"service_health": healthCopy,
	}
}
