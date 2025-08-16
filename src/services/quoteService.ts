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
      .lte('date', todayString) // Changed from .lt to .lte to include today
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

// Get recent quotes (past quotes and today's quote)
export async function getRecentQuotes(limit: number = 10): Promise<Quote[]> {
  try {
    const supabase = getSupabaseClient();
    const todayString = new Date().toISOString().split('T')[0];
    
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
      .lte('date', todayString) // Changed from .lt to .lte to include today
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
    
    if (!today) {
      throw new Error('Failed to get today\'s date');
    }
    
    console.log(`🕐 Attempting to generate quote for date: ${today}`);
    
    // Double-check if we already have a quote for today (race condition protection)
    const todayQuote = await getTodayQuote();
    if (todayQuote) {
      console.log('✅ Quote for today already exists, returning existing quote');
      return todayQuote;
    }

    // Generate quote using AI
    console.log('🤖 Generating quote using AI...');
    const aiQuote: AIGeneratedQuote = await generateQuoteWithAI();
    
    // Create timestamp for 6:00 AM IST on today's date
    const sixAMIST = get6AMISTTimestamp(today);
    
    // Insert the new quote with 6:00 AM IST timestamp
    const { data: newQuote, error: insertError } = await supabase
      .from('quotes')
      .insert({
        shlok: aiQuote.shlok,
        meaning_hindi: aiQuote.meaning_hindi,
        meaning_english: aiQuote.meaning_english,
        source: aiQuote.source,
        category: aiQuote.category,
        created_at: sixAMIST // 6:00 AM IST timestamp
      })
      .select()
      .single();

    if (insertError) {
      // Handle unique constraint violation (duplicate shlok)
      if (insertError.code === '23505' && insertError.message?.includes('unique_shlok')) {
        console.log('⚠️  Shlok already exists in database (unique constraint), regenerating...');
        // Try regenerating once more
        const newAiQuote = await generateQuoteWithAI();
        
        // Attempt insertion again with new quote
        const { data: retryQuote, error: retryError } = await supabase
          .from('quotes')
          .insert({
            shlok: newAiQuote.shlok,
            meaning_hindi: newAiQuote.meaning_hindi,
            meaning_english: newAiQuote.meaning_english,
            source: newAiQuote.source,
            category: newAiQuote.category,
            created_at: sixAMIST
          })
          .select()
          .single();
          
        if (retryError) {
          throw new Error(`Failed to insert quote after retry: ${retryError.message}`);
        }
        
        console.log(`✅ Successfully inserted unique quote after retry: ${retryQuote.id}`);
        
        // Try to log the retry quote for today
        try {
          await logQuoteForToday(retryQuote.id, sixAMIST);
          return retryQuote as Quote;
        } catch (logError: any) {
          if (logError.message?.includes('duplicate') || logError.code === '23505') {
            const existingQuote = await getTodayQuote();
            if (existingQuote) {
              await supabase.from('quotes').delete().eq('id', retryQuote.id);
              return existingQuote;
            }
          }
          throw logError;
        }
      }
      
      throw new Error(`Failed to insert quote: ${insertError.message}`);
    }

    if (!newQuote) {
      throw new Error('Failed to insert quote: No data returned');
    }

    console.log(`✅ Quote inserted with ID: ${newQuote.id} at ${sixAMIST} (6:00 AM IST)`);

    // Try to log the quote for today with conflict handling
    try {
      await logQuoteForToday(newQuote.id, sixAMIST);
      console.log(`✅ Successfully generated and logged new quote for ${today}`);
    } catch (logError: any) {
      // If there's a conflict (duplicate date), fetch the existing quote instead
      if (logError.message?.includes('duplicate') || logError.code === '23505') {
        console.log('⚠️  Quote for today was created by another process, fetching existing...');
        const existingQuote = await getTodayQuote();
        if (existingQuote) {
          // Clean up the unused quote we just created
          console.log(`🗑️  Cleaning up duplicate quote with ID: ${newQuote.id}`);
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

// Get 6:00 AM IST timestamp for a given date
function get6AMISTTimestamp(dateString: string): string {
  // Parse the date string (YYYY-MM-DD)
  const parts = dateString.split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  
  if (!year || !month || !day) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }
  
  // Create date object for 6:00 AM IST
  // IST is UTC+5:30, so 6:00 AM IST = 12:30 AM UTC (previous day)
  const istDate = new Date(year, month - 1, day, 6, 0, 0, 0);
  
  // Convert IST to UTC (subtract 5 hours 30 minutes)
  const utcDate = new Date(istDate.getTime() - (5.5 * 60 * 60 * 1000));
  
  return utcDate.toISOString();
}

// Log a quote for today's date
async function logQuoteForToday(quoteId: string, timestamp?: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    
    const today = new Date().toISOString().split('T')[0];
    if (!today) {
      throw new Error('Failed to get today\'s date');
    }
    const logTimestamp = timestamp || get6AMISTTimestamp(today);
    
    console.log(`📝 Logging quote ${quoteId} for date: ${today} at ${logTimestamp}`);
    
    // Use upsert with conflict resolution to prevent duplicates
    const { error } = await supabase
      .from('daily_logs')
      .upsert({
        quote_id: quoteId,
        date: today,
        created_at: logTimestamp
      }, {
        onConflict: 'date', // If date conflicts, update the quote_id
        ignoreDuplicates: false
      });

    if (error) {
      console.error('Error logging quote for today:', error);
      throw error;
    }
    
    console.log(`✅ Successfully logged quote ${quoteId} for ${today}`);
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