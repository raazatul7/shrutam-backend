import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Supabase client configuration
let supabase: SupabaseClient;

// Initialize Supabase client
function initializeSupabase(): void {
  const supabaseUrl = process.env['SUPABASE_URL'];
  const supabaseAnonKey = process.env['SUPABASE_ANON_KEY'];

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key are required');
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('✅ Supabase client initialized');
}

// Test database connection
async function testConnection(): Promise<boolean> {
  try {
    if (!supabase) {
      initializeSupabase();
    }

    // Test connection by trying to fetch a single record
    const { error } = await supabase
      .from('quotes')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }

    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', (error as Error).message);
    return false;
  }
}

// Initialize database
async function initializeDatabase(): Promise<boolean> {
  try {
    // Initialize Supabase client
    initializeSupabase();
    
    // Test connection
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    console.log('✅ Database initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Get Supabase client
function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    initializeSupabase();
  }
  return supabase;
}

// Seed database with sample data
async function seedDatabase(): Promise<void> {
  try {
    if (!supabase) {
      initializeSupabase();
    }

    // Check if quotes already exist
    const { count } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true });

    if (count && count > 0) {
      console.log('✅ Database already has data, skipping seed');
      return;
    }

    // Sample quotes to seed
    const sampleQuotes = [
      {
        shlok: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन',
        meaning_hindi: 'तुम्हारा अधिकार केवल कर्म करने में है, फल में नहीं।',
        meaning_english: 'You have the right to perform your actions, but never to the fruits of those actions.',
        source: 'Bhagavad Gita',
        category: 'karma'
      },
      {
        shlok: 'योग: कर्मसु कौशलम्',
        meaning_hindi: 'योग कर्मों में कुशलता है।',
        meaning_english: 'Yoga is skill in action and excellence in work.',
        source: 'Bhagavad Gita',
        category: 'yoga'
      },
      {
        shlok: 'सत्यमेव जयते',
        meaning_hindi: 'सत्य की ही जीत होती है।',
        meaning_english: 'Truth alone triumphs and prevails.',
        source: 'Mundaka Upanishad',
        category: 'truth'
      },
      {
        shlok: 'वसुधैव कुटुम्बकम्',
        meaning_hindi: 'पूरी पृथ्वी ही एक परिवार है।',
        meaning_english: 'The whole world is one family.',
        source: 'Mahopanishad',
        category: 'peace'
      },
      {
        shlok: 'अहिंसा परमो धर्मः',
        meaning_hindi: 'अहिंसा सबसे बड़ा धर्म है।',
        meaning_english: 'Non-violence is the highest virtue and dharma.',
        source: 'Mahabharata',
        category: 'dharma'
      }
    ];

    // Insert sample quotes
    const { data: insertedQuotes, error: insertError } = await supabase
      .from('quotes')
      .insert(sampleQuotes)
      .select();

    if (insertError) {
      throw new Error(`Failed to insert quotes: ${insertError.message}`);
    }

    console.log(`✅ Seeded ${insertedQuotes?.length || 0} quotes`);

    // Create daily log for today with first quote
    if (insertedQuotes && insertedQuotes.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { error: logError } = await supabase
        .from('daily_logs')
        .upsert({
          quote_id: insertedQuotes[0].id,
          date: today.toISOString().split('T')[0]
        });

      if (logError) {
        console.error('Warning: Failed to create daily log:', logError.message);
      }
    }

    console.log('✅ Database seeded successfully');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
}

// Handle command line arguments for seeding
if (require.main === module) {
  // Load environment variables when running as CLI
  dotenv.config();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'seed':
      initializeDatabase()
        .then(() => seedDatabase())
        .then(() => {
          console.log('✅ Seeding completed');
          process.exit(0);
        })
        .catch((error) => {
          console.error('❌ Seeding failed:', error);
          process.exit(1);
        });
      break;
    default:
      console.log('Available commands: seed');
      process.exit(1);
  }
}

export {
  initializeSupabase,
  testConnection,
  initializeDatabase,
  getSupabaseClient,
  seedDatabase
}; 