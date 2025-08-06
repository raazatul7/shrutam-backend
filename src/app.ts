import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { initializeDatabase } from './config/database';
import { startScheduler } from './services/scheduler';
import quoteRoutes from './routes/quotes';
import errorHandler from './middleware/errorHandler';
import { HealthCheckResponse } from './types';

dotenv.config();

const app = express();
const PORT = process.env['PORT'] || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000'), // 15 minutes
  max: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100'), // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  const healthResponse: HealthCheckResponse = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env['NODE_ENV'] || 'development'
  };
  res.json(healthResponse);
});

// API routes
app.use('/api/quote', quoteRoutes);

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: '🌅 Shrutam API - Daily Quotes from Indian Scriptures',
    version: '1.0.0',
    description: 'Strict daily quote system - one quote per day at 6:00 AM IST',
    endpoints: {
      health: '/health',
      todayQuote: '/api/quote/today',
      quoteForDate: '/api/quote/date/:date',
      availableDates: '/api/quote/dates',
      recentQuotes: '/api/quote/recent',
      quoteById: '/api/quote/:id',
      allQuotes: '/api/quotes',
      quotesByCategory: '/api/quote/category/:category',
      quotesBySource: '/api/quote/source/:source',
      quoteStats: '/api/quote/stats'
    },
    rules: {
      dailyGeneration: 'New quote generated at 6:00 AM IST daily',
      accessControl: 'Only past quotes are accessible',
      todayAccess: 'Today\'s quote only available after generation'
    }
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Error handling middleware
app.use(errorHandler);

// Initialize database and start server
async function startServer(): Promise<void> {
  try {
    // Initialize database
    await initializeDatabase();
    console.log('✅ Database initialized successfully');

    // Start the scheduler for daily quote generation
    startScheduler();
    console.log('✅ Quote scheduler started');

    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Shrutam server running on port ${PORT}`);
      console.log(`📖 Environment: ${process.env['NODE_ENV'] || 'development'}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
      console.log(`⏰ Daily quote generation: 6:00 AM IST`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
startServer();

export default app; 