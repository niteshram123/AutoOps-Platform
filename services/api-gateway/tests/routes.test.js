const request = require('supertest');
const { describe, expect, test, beforeEach, afterEach } = require('@jest/globals');
const { app } = require('../src/index');

describe('gateway routes', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('GET /health returns 200', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
  });

  test('GET / returns service index', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body.service).toBe('api-gateway');
    expect(response.body.routes.health).toBe('/health');
  });

  test('GET /nonexistent returns 404', async () => {
    const response = await request(app).get('/nonexistent');

    expect(response.status).toBe(404);
  });

  test('rate limiting headers are present', async () => {
    const response = await request(app).get('/health');

    expect(response.headers['ratelimit-limit']).toBeDefined();
    expect(response.headers['ratelimit-remaining']).toBeDefined();
  });

  test('security headers are present', async () => {
    const response = await request(app).get('/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBeDefined();
  });
});
