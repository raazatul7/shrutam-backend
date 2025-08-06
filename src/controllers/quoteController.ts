import { Request, Response, NextFunction } from 'express';
// import { v4 as uuidv4 } from 'uuid'; // Currently unused
import * as quoteService from '../services/quoteService';
import { createError } from '../middleware/errorHandler';
import { QuoteQueryParams, QuoteParams } from '../types';

// Get today's quote (only if it exists)
async function getTodayQuote(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const todayQuote = await quoteService.getTodayQuote();
    
    if (!todayQuote) {
      return next(createError(404, 'No quote available for today yet. Check back after 6:00 AM IST.'));
    }

    res.json({
      success: true,
      data: todayQuote,
      message: 'Today\'s quote retrieved successfully'
    });
  } catch (error) {
    next(createError(500, 'Failed to get today\'s quote', error));
  }
}

// Get quote for a specific date (past dates only)
async function getQuoteForDate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date } = req.params;
    
    // Validate date format
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return next(createError(400, 'Invalid date format. Use YYYY-MM-DD'));
    }

    const quote = await quoteService.getQuoteForDate(date);
    
    if (!quote) {
      return next(createError(404, 'No quote found for this date or date is in the future'));
    }

    res.json({
      success: true,
      data: quote,
      message: `Quote for ${date} retrieved successfully`
    });
  } catch (error) {
    next(createError(500, 'Failed to get quote for date', error));
  }
}

// Get available dates (past dates with quotes)
async function getAvailableDates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = parseInt(req.query['limit'] as string) || 30;
    
    if (limit < 1 || limit > 100) {
      return next(createError(400, 'Limit must be between 1 and 100'));
    }

    const dates = await quoteService.getAvailableDates(limit);

    res.json({
      success: true,
      data: {
        dates,
        count: dates.length
      },
      message: 'Available dates retrieved successfully'
    });
  } catch (error) {
    next(createError(500, 'Failed to get available dates', error));
  }
}

// Get recent quotes (past quotes only)
async function getRecentQuotes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = parseInt(req.query['limit'] as string) || 10;
    
    if (limit < 1 || limit > 50) {
      return next(createError(400, 'Limit must be between 1 and 50'));
    }

    const quotes = await quoteService.getRecentQuotes(limit);

    res.json({
      success: true,
      data: {
        quotes,
        count: quotes.length
      },
      message: 'Recent quotes retrieved successfully'
    });
  } catch (error) {
    next(createError(500, 'Failed to get recent quotes', error));
  }
}

// Get quote by ID (only if it's from a past date)
async function getQuoteById(req: Request<QuoteParams>, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const quote = await quoteService.getQuoteById(id);
    
    if (!quote) {
      return next(createError(404, 'Quote not found or not accessible'));
    }

    res.json({
      success: true,
      data: quote,
      message: 'Quote retrieved successfully'
    });
  } catch (error) {
    next(createError(500, 'Failed to get quote', error));
  }
}

// Get all quotes with pagination (past quotes only)
async function getAllQuotes(req: Request<{}, {}, {}, QuoteQueryParams>, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '10');
    const offset = (page - 1) * limit;

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return next(createError(400, 'Invalid pagination parameters'));
    }

    const { quotes, totalCount } = await quoteService.getAllQuotes(limit, offset);
    
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      success: true,
      data: {
        quotes,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage,
          hasPrevPage,
          limit
        }
      },
      message: 'Quotes retrieved successfully'
    });
  } catch (error) {
    next(createError(500, 'Failed to get quotes', error));
  }
}

// Get quotes by category (past quotes only)
async function getQuotesByCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { category } = req.params;
    const limit = parseInt(req.query['limit'] as string) || 10;
    
    if (limit < 1 || limit > 50) {
      return next(createError(400, 'Limit must be between 1 and 50'));
    }

    const quotes = await quoteService.getQuotesByCategory(category!, limit);

    res.json({
      success: true,
      data: {
        quotes,
        category,
        count: quotes.length
      },
      message: `Quotes for category '${category}' retrieved successfully`
    });
  } catch (error) {
    next(createError(500, 'Failed to get quotes by category', error));
  }
}

// Get quotes by source (past quotes only)
async function getQuotesBySource(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { source } = req.params;
    const limit = parseInt(req.query['limit'] as string) || 10;
    
    if (limit < 1 || limit > 50) {
      return next(createError(400, 'Limit must be between 1 and 50'));
    }

    const quotes = await quoteService.getQuotesBySource(source!, limit);

    res.json({
      success: true,
      data: {
        quotes,
        source,
        count: quotes.length
      },
      message: `Quotes from '${source}' retrieved successfully`
    });
  } catch (error) {
    next(createError(500, 'Failed to get quotes by source', error));
  }
}

// Get quote statistics (past quotes only)
async function getQuoteStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await quoteService.getQuoteStats();

    res.json({
      success: true,
      data: stats,
      message: 'Quote statistics retrieved successfully'
    });
  } catch (error) {
    next(createError(500, 'Failed to get quote statistics', error));
  }
}

export default {
  getTodayQuote,
  getQuoteForDate,
  getAvailableDates,
  getRecentQuotes,
  getQuoteById,
  getAllQuotes,
  getQuotesByCategory,
  getQuotesBySource,
  getQuoteStats
}; 