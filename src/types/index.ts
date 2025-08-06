// Database Models
export interface Quote {
  id: string;
  shlok: string;
  meaning_hindi: string;
  meaning_english: string;
  source: string;
  category?: string;
  created_at: string;
}

export interface DailyLog {
  id: string;
  quote_id: string;
  date: string;
  created_at: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
}

export interface PaginatedResponse<T> {
  quotes: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    limit: number;
  };
}

export interface QuoteResponse {
  id: string;
  shlok: string;
  meaning_hindi: string;
  meaning_english: string;
  source: string;
  category?: string;
  created_at: string;
}

// Error Types
export interface AppError extends Error {
  statusCode: number;
  isOperational: boolean;
}

// Request Types
export interface QuoteQueryParams {
  page?: string;
  limit?: string;
}

export interface QuoteParams {
  id: string;
}

// AI Service Types
export interface AIGeneratedQuote {
  shlok: string;
  meaning_hindi: string;
  meaning_english: string;
  source: string;
  category?: string | undefined;
}

// Supabase Types
export interface SupabaseQuote {
  id: string;
  shlok: string;
  meaning_hindi: string;
  meaning_english: string;
  source: string;
  category?: string;
  created_at: string;
}

export interface SupabaseDailyLog {
  id: string;
  quote_id: string;
  date: string;
  created_at: string;
}

// Environment Variables
export interface EnvironmentVariables {
  PORT: string;
  NODE_ENV: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  OPENAI_API_KEY: string;
  OPENAI_MODEL: string;
  RATE_LIMIT_WINDOW_MS?: string;
  RATE_LIMIT_MAX_REQUESTS?: string;
  LOG_LEVEL?: string;
}

// Scheduler Types
export interface SchedulerJob {
  name: string;
  schedule: string;
  task: () => Promise<void>;
}

// Validation Types
export interface ValidationError {
  field: string;
  message: string;
}

// Health Check Types
export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
}

// Quote Category Types
export type QuoteCategory = 'karma' | 'peace' | 'wisdom' | 'devotion' | 'yoga' | 'truth' | 'dharma' | 'meditation';

// Quote Source Types
export type QuoteSource = 'Bhagavad Gita' | 'Ramayana' | 'Mahabharata' | 'Upanishads' | 'Vedas' | 'Puranas' | 'Other'; 