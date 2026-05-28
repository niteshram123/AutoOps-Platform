package collector_test

import (
	"testing"

	"autoops/metrics-collector/internal/collector"
	"github.com/stretchr/testify/assert"
)

func TestNewCollector(t *testing.T) {
	c := collector.New()

	assert.NotNil(t, c)
	assert.NotNil(t, c.Registry())
	assert.Equal(t, 8, c.MetricsRegistered())
}

func TestRecordRequest(t *testing.T) {
	c := collector.New()

	assert.NotPanics(t, func() {
		c.RecordRequest("api-gateway", "GET", "200", 0.13)
	})
	assert.Equal(t, 1, c.GetSummary()["total_requests"])
}

func TestSetActiveUsers(t *testing.T) {
	c := collector.New()

	c.SetActiveUsers(42)

	assert.Equal(t, float64(42), c.GetSummary()["active_users"])
}

func TestSetServiceHealth(t *testing.T) {
	c := collector.New()

	c.SetServiceHealth("user-service", false)

	health := c.GetSummary()["service_health"].(map[string]bool)
	assert.False(t, health["user-service"])
}

func TestGetSummary(t *testing.T) {
	c := collector.New()

	summary := c.GetSummary()

	assert.Contains(t, summary, "total_requests")
	assert.Contains(t, summary, "total_errors")
	assert.Contains(t, summary, "active_users")
	assert.Contains(t, summary, "service_health")
}

func TestRecordError(t *testing.T) {
	c := collector.New()

	c.RecordError("user-service", "validation")

	assert.Equal(t, 1, c.GetSummary()["total_errors"])
}
