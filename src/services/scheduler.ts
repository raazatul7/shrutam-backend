import cron from 'node-cron';
import { generateAndStoreQuote, shouldGenerateQuoteForToday } from './quoteService';

// Daily quote generation scheduler
export function startScheduler(): void {
  console.log('🕐 Starting quote scheduler...');

  // Schedule daily quote generation at 6:00 AM IST
  cron.schedule('0 6 * * *', async () => {
    console.log('⏰ Running daily quote generation at 6:00 AM IST...');
    await generateDailyQuote();
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata' // Indian timezone
  });

  // Also run immediately if no quote exists for today
  checkAndGenerateTodayQuote();
}

// Generate quote for today if it doesn't exist
async function generateDailyQuote(): Promise<void> {
  try {
    const shouldGenerate = await shouldGenerateQuoteForToday();
    
    if (shouldGenerate) {
      console.log('📝 Generating new quote for today at 6:00 AM IST...');
      const newQuote = await generateAndStoreQuote();
      console.log(`✅ Generated quote: "${newQuote.shlok.substring(0, 50)}..."`);
    } else {
      console.log('✅ Quote for today already exists');
    }
  } catch (error) {
    console.error('❌ Error generating daily quote:', error);
  }
}

// Check and generate quote for today on startup
async function checkAndGenerateTodayQuote(): Promise<void> {
  try {
    const shouldGenerate = await shouldGenerateQuoteForToday();
    
    if (shouldGenerate) {
      console.log('📝 No quote for today found, generating one...');
      const newQuote = await generateAndStoreQuote();
      console.log(`✅ Generated initial quote: "${newQuote.shlok.substring(0, 50)}..."`);
    } else {
      console.log('✅ Quote for today already exists');
    }
  } catch (error) {
    console.error('❌ Error checking/generating today\'s quote:', error);
  }
}

// Manual quote generation function (for admin use)
export async function generateQuoteManually(): Promise<void> {
  try {
    console.log('📝 Manually generating new quote...');
    const newQuote = await generateAndStoreQuote();
    console.log(`✅ Manually generated quote: "${newQuote.shlok.substring(0, 50)}..."`);
    // Return void as per function signature
  } catch (error) {
    console.error('❌ Error manually generating quote:', error);
    throw error;
  }
}

// Get scheduler status
export function getSchedulerStatus(): {
  isRunning: boolean;
  nextRun: string;
  timezone: string;
  description: string;
} {
  return {
    isRunning: true,
    nextRun: '06:00 AM (IST)',
    timezone: 'Asia/Kolkata',
    description: 'Daily quote generation at 6:00 AM IST'
  };
}

// Get current IST time
export function getCurrentISTTime(): string {
  const now = new Date();
  return now.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
} 