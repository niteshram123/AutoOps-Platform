package collector

import (
	"sync"

	"github.com/prometheus/client_golang/prometheus"
)

type Collector struct {
	registry        *prometheus.Registry
	requests        *prometheus.CounterVec
	duration        *prometheus.HistogramVec
	activeUsers     prometheus.Gauge
	serviceHealth   *prometheus.GaugeVec
	errors          *prometheus.CounterVec
	mu              sync.RWMutex
	totalRequests   int
	totalErrors     int
	activeUserCount float64
	health          map[string]bool
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
		health: map[string]bool{
			"api-gateway":        true,
			"user-service":       true,
			"metrics-collector":  true,
		},
	}

	c.registry.MustRegister(c.requests, c.duration, c.activeUsers, c.serviceHealth, c.errors)
	for service, healthy := range c.health {
		c.SetServiceHealth(service, healthy)
	}
	return c
}

func (c *Collector) Registry() *prometheus.Registry {
	return c.registry
}

func (c *Collector) MetricsRegistered() int {
	return 5
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
