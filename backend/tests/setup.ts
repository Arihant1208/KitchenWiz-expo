/**
 * Jest Setup
 *
 * Runs before each test file.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.GEMINI_API_KEY = 'test-api-key';

export {};

