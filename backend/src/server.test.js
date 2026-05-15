const request = require('supertest');
const app = require('./server');

describe('Server', () => {
  describe('GET /api/health', () => {
    it('should return server status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'OK',
        message: 'Server is running',
      });
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });
});
