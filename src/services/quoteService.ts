import { getSupabaseClient } from '../config/database';
import { generateQuoteWithAI } from './aiService';
import { Quote, AIGeneratedQuote } from '../types';

// Get today's quote from database
export async function getQuoteByDate(date: string): Promise<Quote | null> {
  try {
    const supabase = getSupabaseClient();
    
    // Check if the requested date is in the future (using string comparison)
    const todayString = new Date().toISOString().split('T')[0];
    
    if (date > todayString!) {
      return null; // No access to future quotes
    }
    
    const { data: dailyLogs, error } = await supabase
      .from('daily_logs')
      .select(`
        quote_id,
        quotes (
          id,
          shlok,
          meaning_hindi,
          meaning_english,
          source,
          category,
          created_at
        )
      `)
      .eq('date', date)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !dailyLogs || dailyLogs.length === 0) {
      return null;
    }

    const dailyLog = dailyLogs[0];
    return dailyLog!.quotes as unknown as Quote;
  } catch (error) {
    console.error('Error getting quote by date:', error);
    throw error;
  }
}

// Get today's quote (current day only)
export async function getTodayQuote(): Promise<Quote | null> {
  try {
    const today = new Date().toISOString().split('T')[0];
    return await getQuoteByDate(today!);
  } catch (error) {
    console.error('Error getting today\'s quote:', error);
    throw error;
  }
}

// Get quote for a specific date (past dates and today)
export async function getQuoteForDate(date: string): Promise<Quote | null> {
  try {
    // Use string comparison like getQuoteByDate for consistency
    const todayString = new Date().toISOString().split('T')[0];
    
    // Allow access to past dates and today
    if (date > todayString!) {
      return null; // Block future dates only
    }
    
    return await getQuoteByDate(date);
  } catch (error) {
    console.error('Error getting quote for date:', error);
    throw error;
  }
}

// Get available dates (past dates with quotes)
export async function getAvailableDates(limit: number = 30): Promise<string[]> {
  try {
    const supabase = getSupabaseClient();
    // Use string comparison for consistency with other functions
    const todayString = new Date().toISOString().split('T')[0];
    
    const { data: dailyLogs, error } = await supabase
      .from('daily_logs')
      .select('date')
      .lt('date', todayString)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (dailyLogs || []).map(log => log.date);
  } catch (error) {
    console.error('Error getting available dates:', error);
    throw error;
  }
}

// Get recent quotes (past quotes only)
export async function getRecentQuotes(limit: number = 10): Promise<Quote[]> {
  try {
    const supabase = getSupabaseClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: dailyLogs, error } = await supabase
      .from('daily_logs')
      .select(`
        date,
        quotes (
          id,
          shlok,
          meaning_hindi,
          meaning_english,
          source,
          category,
          created_at
        )
      `)
      .lt('date', today.toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (dailyLogs || [])
      .map(log => ({ ...log.quotes, date: log.date })) as unknown as Quote[];
  } catch (error) {
    console.error('Error getting recent quotes:', error);
    throw error;
  }
}

// Get quote by ID (only if it's from a past date)
export async function getQuoteById(id: string): Promise<Quote | null> {
  try {
    const supabase = getSupabaseClient();
    
    // Get the quote with its daily log to check the date
    const { data: dailyLog, error } = await supabase
      .from('daily_logs')
      .select(`
        date,
        quotes (
          id,
          shlok,
          meaning_hindi,
          meaning_english,
          source,
          category,
          created_at
        )
      `)
      .eq('quote_id', id)
      .single();

    if (error || !dailyLog) {
      return null;
    }

    // Check if the quote is from a past date
    const quoteDate = new Date(dailyLog.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (quoteDate >= today) {
      return null; // No access to today's or future quotes by ID
    }

    return dailyLog.quotes as unknown as Quote;
  } catch (error) {
    console.error('Error getting quote by ID:', error);
    throw error;
  }
}

// Get all quotes with pagination (past quotes only)
export async function getAllQuotes(limit: number, offset: number): Promise<{ quotes: Quote[], totalCount: number }> {
  try {
    const supabase = getSupabaseClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get quotes from past dates only
    const { data: dailyLogs, error } = await supabase
      .from('daily_logs')
      .select(`
        date,
        quotes (
          id,
          shlok,
          meaning_hindi,
          meaning_english,
          source,
          category,
          created_at
        )
      `)
      .lt('date', today.toISOString().split('T')[0])
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // Get total count of past quotes
    const { count } = await supabase
      .from('daily_logs')
      .select('*', { count: 'exact', head: true })
      .lt('date', today.toISOString().split('T')[0]);

    return {
      quotes: (dailyLogs || [])
        .map(log => ({ ...log.quotes, date: log.date })) as unknown as Quote[],
      totalCount: count || 0
    };
  } catch (error) {
    console.error('Error getting all quotes:', error);
    throw error;
  }
}

// Generate and store a new quote for today
export async function generateAndStoreQuote(): Promise<Quote> {
  try {
    const supabase = getSupabaseClient();
    const today = new Date().toISOString().split('T')[0];
    
    // Double-check if we already have a quote for today (race condition protection)
    const todayQuote = await getTodayQuote();
    if (todayQuote) {
      console.log('✅ Quote for today already exists, returning existing quote');
      return todayQuote;
    }

    // Generate quote using AI
    const aiQuote: AIGeneratedQuote = await generateQuoteWithAI();
    
    // Insert the new quote
    const { data: newQuote, error: insertError } = await supabase
      .from('quotes')
      .insert({
        shlok: aiQuote.shlok,
        meaning_hindi: aiQuote.meaning_hindi,
        meaning_english: aiQuote.meaning_english,
        source: aiQuote.source,
        category: aiQuote.category
      })
      .select()
      .single();

    if (insertError || !newQuote) {
      throw new Error(`Failed to insert quote: ${insertError?.message}`);
    }

    // Try to log the quote for today with conflict handling
    try {
      await logQuoteForToday(newQuote.id);
      console.log(`✅ Successfully generated and logged new quote for ${today}`);
    } catch (logError: any) {
      // If there's a conflict (duplicate date), fetch the existing quote instead
      if (logError.message?.includes('duplicate') || logError.code === '23505') {
        console.log('⚠️  Quote for today was created by another process, fetching existing...');
        const existingQuote = await getTodayQuote();
        if (existingQuote) {
          // Clean up the unused quote we just created
          await supabase.from('quotes').delete().eq('id', newQuote.id);
          return existingQuote;
        }
      }
      throw logError;
    }

    return newQuote as Quote;
  } catch (error) {
    console.error('Error generating and storing quote:', error);
    throw error;
  }
}

// Log a quote for today's date
async function logQuoteForToday(quoteId: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    
    const today = new Date().toISOString().split('T')[0];
    
    const { error } = await supabase
      .from('daily_logs')
      .upsert({
        quote_id: quoteId,
        date: today
      });

    if (error) {
      console.error('Error logging quote for today:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error logging quote for today:', error);
    throw error;
  }
}

// Check if we need to generate a quote for today
export async function shouldGenerateQuoteForToday(): Promise<boolean> {
  try {
    const todayQuote = await getTodayQuote();
    return !todayQuote;
  } catch (error) {
    console.error('Error checking if should generate quote:', error);
    return true; // Default to generating if there's an error
  }
}

// Get quote statistics (past quotes only)
export async function getQuoteStats(): Promise<{
  totalQuotes: number;
  totalSources: number;
  latestQuote: Quote | null;
}> {
  try {
    const supabase = getSupabaseClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get total past quotes count
    const { count: totalQuotes } = await supabase
      .from('daily_logs')
      .select('*', { count: 'exact', head: true })
      .lt('date', today.toISOString().split('T')[0]);

    // Get distinct sources from past quotes
    const { data: sources, error: _sourcesError } = await supabase
      .from('daily_logs')
      .select(`
        quotes (source)
      `)
      .lt('date', today.toISOString().split('T')[0]);

    const uniqueSources = new Set(
      sources?.map(log => (log as any).quotes?.source).filter(Boolean) || []
    ).size;

    // Get latest past quote
    const { data: latestLog, error: _latestError } = await supabase
      .from('daily_logs')
      .select(`
        date,
        quotes (
          id,
          shlok,
          meaning_hindi,
          meaning_english,
          source,
          category,
          created_at
        )
      `)
      .lt('date', today.toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(1)
      .single();

    return {
      totalQuotes: totalQuotes || 0,
      totalSources: uniqueSources,
      latestQuote: latestLog?.quotes as unknown as Quote || null
    };
  } catch (error) {
    console.error('Error getting quote stats:', error);
    throw error;
  }
}

// Get quotes by category (past quotes only)
export async function getQuotesByCategory(category: string, limit: number = 10): Promise<Quote[]> {
  try {
    const supabase = getSupabaseClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: dailyLogs, error } = await supabase
      .from('daily_logs')
      .select(`
        date,
        quotes (
          id,
          shlok,
          meaning_hindi,
          meaning_english,
          source,
          category,
          created_at
        )
      `)
      .lt('date', today.toISOString().split('T')[0])
      .eq('quotes.category', category)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (dailyLogs || [])
      .map(log => ({ ...log.quotes, date: log.date })) as unknown as Quote[];
  } catch (error) {
    console.error('Error getting quotes by category:', error);
    throw error;
  }
}

// Get quotes by source (past quotes only)
export async function getQuotesBySource(source: string, limit: number = 10): Promise<Quote[]> {
  try {
    const supabase = getSupabaseClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: dailyLogs, error } = await supabase
      .from('daily_logs')
      .select(`
        date,
        quotes (
          id,
          shlok,
          meaning_hindi,
          meaning_english,
          source,
          category,
          created_at
        )
      `)
      .lt('date', today.toISOString().split('T')[0])
      .eq('quotes.source', source)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (dailyLogs || [])
      .map(log => ({ ...log.quotes, date: log.date })) as unknown as Quote[];
  } catch (error) {
    console.error('Error getting quotes by source:', error);
    throw error;
  }
} 