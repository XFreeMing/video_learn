/**
 * Global test setup - runs before all test files.
 */

// Ensure test environment variables are set
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'
process.env.REDIS_URL = 'redis://localhost:6379'
process.env.WS_PORT = '0' // disable WS in tests
