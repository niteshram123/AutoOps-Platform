const request = require('supertest');
const { describe, expect, test, beforeEach, afterEach } = require('@jest/globals');
const { app } = require('../src/index');

describe('GET /health', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns 200 status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
  });

  test('returns required health fields', async () => {
    const response = await request(app).get('/health');

    expect(response.body).toEqual(expect.objectContaining({
      status: 'healthy',
      service: 'api-gateway',
      version: expect.any(String),
      timestamp: expect.any(String),
      uptime: expect.any(Number)
    }));
    expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(Date.parse(response.body.timestamp))).toBe(false);
    expect(response.body.dependencies).toEqual({
      'user-service': 'reachable',
      'metrics-collector': 'reachable'
    });
  });
});
