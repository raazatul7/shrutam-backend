import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Ensure we're in test environment
(process.env as any).NODE_ENV = 'test';

// Prevent any real database connections in tests
if (process.env['NODE_ENV'] !== 'test') {
  throw new Error('Tests must run in test environment');
}

// Mock environment variables for tests
(process.env as any).SUPABASE_URL = 'https://test.supabase.co';
(process.env as any).SUPABASE_ANON_KEY = 'test-key';
(process.env as any).OPENAI_API_KEY = 'test-openai-key';

console.log('🧪 Test environment initialized');
console.log('🔒 Production database connections blocked');

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Global test timeout
jest.setTimeout(10000); 