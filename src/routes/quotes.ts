import { Router } from 'express';
import quoteController from '../controllers/quoteController';
import { validateQuoteId } from '../middleware/validation';

const router = Router();

// Get today's quote (only if it exists)
router.get('/today', quoteController.getTodayQuote);

// Get quote for a specific date (past dates only)
router.get('/date/:date', quoteController.getQuoteForDate);

// Get available dates (past dates with quotes)
router.get('/dates', quoteController.getAvailableDates);

// Get recent quotes (past quotes only)
router.get('/recent', quoteController.getRecentQuotes);

// Get quote by ID (only if it's from a past date)
router.get('/:id', validateQuoteId, quoteController.getQuoteById as any);

// Get all quotes with pagination (past quotes only)
router.get('/', quoteController.getAllQuotes);

// Get quotes by category (past quotes only)
router.get('/category/:category', quoteController.getQuotesByCategory);

// Get quotes by source (past quotes only)
router.get('/source/:source', quoteController.getQuotesBySource);

// Get quote statistics (past quotes only)
router.get('/stats', quoteController.getQuoteStats);

export default router; 