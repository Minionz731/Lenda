// jest.setup.js - Global test setup
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_12345';
process.env.DATABASE_URL = 'postgresql://localhost:5432/lenda_test';

// Mock logger if needed
global.console.log = jest.fn();
