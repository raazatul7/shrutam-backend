import OpenAI from 'openai';
import { AIGeneratedQuote } from '../types';
import { getSupabaseClient } from '../config/database';

// Initialize OpenAI client conditionally
function getOpenAIClient(): OpenAI {
  const apiKey = process.env['OPENAI_API_KEY'];
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }
  return new OpenAI({ apiKey });
}

// Available categories for quotes
const QUOTE_CATEGORIES = [
  'karma', 'peace', 'wisdom', 'devotion', 'yoga', 'truth', 'dharma', 'meditation'
];

// Get random category for quote generation
function getRandomCategory(): string {
  const randomIndex = Math.floor(Math.random() * QUOTE_CATEGORIES.length);
  return QUOTE_CATEGORIES[randomIndex]!;
}

// Get recently used quotes to avoid duplicates
async function getRecentlyUsedQuotes(limit: number = 30): Promise<string[]> {
  try {
    const supabase = getSupabaseClient();
    const { data: recentQuotes, error } = await supabase
      .from('daily_logs')
      .select(`
        quotes (shlok)
      `)
      .order('date', { ascending: false })
      .limit(limit);

    if (error || !recentQuotes) {
      return [];
    }

    return recentQuotes.map(log => (log as any).quotes?.shlok).filter(Boolean);
  } catch (error) {
    console.error('Error getting recently used quotes:', error);
    return [];
  }
}

// AI prompt for generating quotes with random category and uniqueness check
async function getQuoteGenerationPrompt(): Promise<string> {
  // Use least used category for better variety, with fallback to random
  const category = await getLeastUsedCategory();
  const recentQuotes = await getRecentlyUsedQuotes(10);
  
  let uniquenessNote = '';
  if (recentQuotes.length > 0) {
    uniquenessNote = `
IMPORTANT: Please ensure the generated shlok is completely different from these recently used shloks:
${recentQuotes.map(quote => `- ${quote}`).join('\n')}

The new shlok must be unique and not similar to any of the above.
`;
  }
  
  return `
Generate one unique Shlok from any Indian scripture (Bhagavad Gita, Ramayana, Mahabharata, Upanishads, etc.) 
that relates to the category: ${category}

${uniquenessNote}

Requirements:
1. The Shlok should be in Sanskrit (Devanagari script)
2. Provide meaning in Hindi (Devanagari script)
3. Provide meaning in English (simple, clear translation)
4. Include the source scripture name
5. The quote MUST relate to the category: ${category}
6. The shlok MUST be completely unique and different from any commonly known shloks
7. Choose from a wide variety of scriptures and verses

Example format:
Shlok: कर्मण्येवाधिकारस्ते मा फलेषु कदाचन
Meaning Hindi: तुम्हारा अधिकार केवल कर्म करने में है, फल में नहीं।
Meaning English: You have the right to perform your actions, but never to the fruits of those actions.
Source: Bhagavad Gita
Category: ${category}

Please generate a new, meaningful, and unique quote related to ${category} following this exact format.
`;
}
 
// Generate quote using AI
export async function generateQuoteWithAI(): Promise<AIGeneratedQuote> {
  try {
    const openai = getOpenAIClient();

    const completion = await openai.chat.completions.create({
      model: process.env['OPENAI_MODEL'] || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a knowledgeable expert in Indian scriptures and Sanskrit literature. Generate authentic, meaningful, and unique quotes from ancient texts. Always provide different shloks and avoid repetition.'
        },
        {
          role: 'user',
          content: await getQuoteGenerationPrompt()
        }
      ],
      max_tokens: 500,
      temperature: 0.9, // Increased temperature for more variety
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('No response from AI service');
    }

    // Parse the AI response
    const parsedQuote = parseAIResponse(response);
    
    // Check if this quote is unique
    const isUnique = await checkQuoteUniqueness(parsedQuote.shlok);
    if (!isUnique) {
      console.log('⚠️  Generated quote is not unique, retrying...');
      // Retry once more with different parameters
      return await generateQuoteWithAIRetry();
    }
    
    return parsedQuote;
  } catch (error: any) {
    console.error('Error generating quote with AI:', error);
    
    // Handle specific OpenAI errors
    if (error?.code === 'insufficient_quota') {
      console.log('⚠️  OpenAI quota exceeded, using fallback quote');
    } else if (error?.code === 'rate_limit_exceeded') {
      console.log('⚠️  OpenAI rate limit exceeded, using fallback quote');
    } else if (error?.message?.includes('timeout')) {
      console.log('⚠️  OpenAI request timed out, using fallback quote');
    }
    
    // Fallback to a default quote if AI fails
    return await getFallbackQuote();
  }
}

// Retry AI generation with different parameters
async function generateQuoteWithAIRetry(): Promise<AIGeneratedQuote> {
  try {
    const openai = getOpenAIClient();
    const category = await getLeastUsedCategory();

    const completion = await openai.chat.completions.create({
      model: process.env['OPENAI_MODEL'] || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a Sanskrit scholar. Generate a completely different and unique shlok from Indian scriptures. Focus on lesser-known verses and ensure uniqueness.'
        },
        {
          role: 'user',
          content: `Generate a unique shlok about ${category} from any Indian scripture. Make sure it's different from common verses.`
        }
      ],
      max_tokens: 500,
      temperature: 1.0, // Maximum randomness
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('No response from AI service');
    }

    const parsedQuote = parseAIResponse(response);
    
    // If still not unique, use fallback
    const isUnique = await checkQuoteUniqueness(parsedQuote.shlok);
    if (!isUnique) {
      console.log('⚠️  Retry also generated non-unique quote, using fallback');
      return await getFallbackQuote();
    }
    
    return parsedQuote;
  } catch (error) {
    console.error('Error in AI retry:', error);
    return await getFallbackQuote();
  }
}

// Check if a quote is unique (not used recently)
async function checkQuoteUniqueness(shlok: string): Promise<boolean> {
  try {
    const recentQuotes = await getRecentlyUsedQuotes(50);
    return !recentQuotes.some(quote => 
      quote.toLowerCase().includes(shlok.toLowerCase()) || 
      shlok.toLowerCase().includes(quote.toLowerCase())
    );
  } catch (error) {
    console.error('Error checking quote uniqueness:', error);
    return true; // Default to unique if check fails
  }
}

// Get quote usage statistics to ensure variety
async function getQuoteUsageStats(): Promise<{
  totalQuotes: number;
  categoryDistribution: Record<string, number>;
  sourceDistribution: Record<string, number>;
}> {
  try {
    const supabase = getSupabaseClient();
    const { data: dailyLogs, error } = await supabase
      .from('daily_logs')
      .select(`
        quotes (category, source)
      `)
      .order('date', { ascending: false })
      .limit(100);

    if (error || !dailyLogs) {
      return { totalQuotes: 0, categoryDistribution: {}, sourceDistribution: {} };
    }

    const categoryCount: Record<string, number> = {};
    const sourceCount: Record<string, number> = {};

    dailyLogs.forEach(log => {
      const quote = (log as any).quotes;
      if (quote?.category) {
        categoryCount[quote.category] = (categoryCount[quote.category] || 0) + 1;
      }
      if (quote?.source) {
        sourceCount[quote.source] = (sourceCount[quote.source] || 0) + 1;
      }
    });

    return {
      totalQuotes: dailyLogs.length,
      categoryDistribution: categoryCount,
      sourceDistribution: sourceCount
    };
  } catch (error) {
    console.error('Error getting quote usage stats:', error);
    return { totalQuotes: 0, categoryDistribution: {}, sourceDistribution: {} };
  }
}

// Get least used category to ensure variety
async function getLeastUsedCategory(): Promise<string> {
  try {
    const stats = await getQuoteUsageStats();
    const categoryCounts = stats.categoryDistribution;
    
    // Find the category with the least usage
    let leastUsedCategory = QUOTE_CATEGORIES[0]!;
    let minCount = categoryCounts[leastUsedCategory] || 0;
    
    QUOTE_CATEGORIES.forEach(category => {
      const count = categoryCounts[category] || 0;
      if (count < minCount) {
        minCount = count;
        leastUsedCategory = category;
      }
    });
    
    return leastUsedCategory;
  } catch (error) {
    console.error('Error getting least used category:', error);
    return getRandomCategory(); // Fallback to random
  }
}

// Parse AI response to extract quote components
function parseAIResponse(response: string): AIGeneratedQuote {
  try {
    // Extract Shlok (Sanskrit verse)
    const shlokMatch = response.match(/Shlok:\s*([^\n]+)/);
    const shlok = shlokMatch ? shlokMatch[1]?.trim() || '' : '';

    // Extract Hindi meaning
    const meaningHindiMatch = response.match(/Meaning Hindi:\s*([^\n]+)/);
    const meaning_hindi = meaningHindiMatch ? meaningHindiMatch[1]?.trim() || '' : '';

    // Extract English meaning
    const meaningEnglishMatch = response.match(/Meaning English:\s*([^\n]+)/);
    const meaning_english = meaningEnglishMatch ? meaningEnglishMatch[1]?.trim() || '' : '';

    // Extract source
    const sourceMatch = response.match(/Source:\s*([^\n]+)/);
    const source = sourceMatch ? sourceMatch[1]?.trim() || 'Unknown Scripture' : 'Unknown Scripture';

    // Extract category (optional)
    const categoryMatch = response.match(/Category:\s*([^\n]+)/);
    const category = categoryMatch ? categoryMatch[1]?.trim() : undefined;

    // Validate required fields
    if (!shlok || !meaning_hindi || !meaning_english || !source) {
      throw new Error('Invalid AI response format');
    }

    return {
      shlok,
      meaning_hindi,
      meaning_english,
      source,
      category
    };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    throw new Error('Failed to parse AI response');
  }
}

// Fallback quote when AI fails
async function getFallbackQuote(): Promise<AIGeneratedQuote> {
  const category = await getLeastUsedCategory();
  
  const fallbackQuotes: AIGeneratedQuote[] = [
    // Karma category
    {
      shlok: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन',
      meaning_hindi: 'तुम्हारा अधिकार केवल कर्म करने में है, फल में नहीं।',
      meaning_english: 'You have the right to perform your actions, but never to the fruits of those actions.',
      source: 'Bhagavad Gita',
      category: 'karma'
    },
    {
      shlok: 'कर्म ज्यायो ह्यकर्मणः',
      meaning_hindi: 'कर्म न करने से कर्म करना बेहतर है।',
      meaning_english: 'Action is superior to inaction.',
      source: 'Bhagavad Gita',
      category: 'karma'
    },
    {
      shlok: 'यत्कर्म कृत्वा पुनर्न तत्करोति सः',
      meaning_hindi: 'जो कर्म करके फिर नहीं करता वही सच्चा कर्मी है।',
      meaning_english: 'He who performs action without attachment to results is the true doer.',
      source: 'Bhagavad Gita',
      category: 'karma'
    },
    
    // Yoga category
    {
      shlok: 'योग: कर्मसु कौशलम्',
      meaning_hindi: 'योग कर्मों में कुशलता है।',
      meaning_english: 'Yoga is skill in action and excellence in work.',
      source: 'Bhagavad Gita',
      category: 'yoga'
    },
    {
      shlok: 'योग: चित्तवृत्तिनिरोधः',
      meaning_hindi: 'योग चित्त की वृत्तियों का निरोध है।',
      meaning_english: 'Yoga is the restraint of the modifications of the mind.',
      source: 'Yoga Sutras',
      category: 'yoga'
    },
    {
      shlok: 'समत्वं योग उच्यते',
      meaning_hindi: 'समता को योग कहते हैं।',
      meaning_english: 'Equanimity is called yoga.',
      source: 'Bhagavad Gita',
      category: 'yoga'
    },
    
    // Truth category
    {
      shlok: 'सत्यमेव जयते',
      meaning_hindi: 'सत्य की ही जीत होती है।',
      meaning_english: 'Truth alone triumphs and prevails.',
      source: 'Mundaka Upanishad',
      category: 'truth'
    },
    {
      shlok: 'सत्यं वद धर्मं चर',
      meaning_hindi: 'सत्य बोलो और धर्म का पालन करो।',
      meaning_english: 'Speak the truth and follow dharma.',
      source: 'Taittiriya Upanishad',
      category: 'truth'
    },
    {
      shlok: 'सत्यं ज्ञानमनन्तं ब्रह्म',
      meaning_hindi: 'सत्य, ज्ञान और अनंत ही ब्रह्म है।',
      meaning_english: 'Truth, knowledge, and infinity is Brahman.',
      source: 'Taittiriya Upanishad',
      category: 'truth'
    },
    
    // Peace category
    {
      shlok: 'वसुधैव कुटुम्बकम्',
      meaning_hindi: 'पूरी पृथ्वी ही एक परिवार है।',
      meaning_english: 'The whole world is one family.',
      source: 'Mahopanishad',
      category: 'peace'
    },
    {
      shlok: 'शान्ति: शान्ति: शान्ति:',
      meaning_hindi: 'शांति, शांति, शांति।',
      meaning_english: 'Peace, peace, peace.',
      source: 'Upanishads',
      category: 'peace'
    },
    {
      shlok: 'सर्वे भवन्तु सुखिनः',
      meaning_hindi: 'सभी सुखी हों।',
      meaning_english: 'May all be happy.',
      source: 'Ancient Prayer',
      category: 'peace'
    },
    
    // Dharma category
    {
      shlok: 'अहिंसा परमो धर्मः',
      meaning_hindi: 'अहिंसा सबसे बड़ा धर्म है।',
      meaning_english: 'Non-violence is the highest virtue and dharma.',
      source: 'Mahabharata',
      category: 'dharma'
    },
    {
      shlok: 'धर्मो रक्षति रक्षितः',
      meaning_hindi: 'धर्म की रक्षा करने वाले की रक्षा धर्म करता है।',
      meaning_english: 'Dharma protects those who protect dharma.',
      source: 'Mahabharata',
      category: 'dharma'
    },
    {
      shlok: 'धर्म एव हतो हन्ति धर्मो रक्षति रक्षितः',
      meaning_hindi: 'धर्म का नाश करने वाले का नाश धर्म करता है, धर्म की रक्षा करने वाले की रक्षा धर्म करता है।',
      meaning_english: 'Dharma destroys those who destroy dharma, dharma protects those who protect dharma.',
      source: 'Mahabharata',
      category: 'dharma'
    },
    
    // Wisdom category
    {
      shlok: 'ज्ञानं वैराग्यं च सा विद्या',
      meaning_hindi: 'ज्ञान और वैराग्य ही वास्तविक विद्या है।',
      meaning_english: 'Knowledge and detachment together constitute true wisdom.',
      source: 'Bhagavad Gita',
      category: 'wisdom'
    },
    {
      shlok: 'विद्या ददाति विनयं',
      meaning_hindi: 'विद्या विनय देती है।',
      meaning_english: 'Knowledge gives humility.',
      source: 'Ancient Wisdom',
      category: 'wisdom'
    },
    {
      shlok: 'ज्ञानेन तु तदज्ञानं येषां नाशितमात्मनः',
      meaning_hindi: 'जिनके अज्ञान का नाश आत्मा के द्वारा ज्ञान से हो गया है।',
      meaning_english: 'Those whose ignorance has been destroyed by knowledge of the self.',
      source: 'Bhagavad Gita',
      category: 'wisdom'
    },
    
    // Devotion category
    {
      shlok: 'भक्ति योगेन तोषयामि',
      meaning_hindi: 'भक्ति योग से मैं प्रसन्न होता हूं।',
      meaning_english: 'I am pleased by the yoga of devotion.',
      source: 'Bhagavad Gita',
      category: 'devotion'
    },
    {
      shlok: 'मामेव ये प्रपद्यन्ते मायामेतां तरन्ति ते',
      meaning_hindi: 'जो मुझे ही शरण लेते हैं, वे इस माया को पार कर जाते हैं।',
      meaning_english: 'Those who take refuge in me alone cross over this illusion.',
      source: 'Bhagavad Gita',
      category: 'devotion'
    },
    {
      shlok: 'सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज',
      meaning_hindi: 'सभी धर्मों को त्याग कर मुझे ही एक शरण में आ जाओ।',
      meaning_english: 'Abandoning all dharmas, take refuge in me alone.',
      source: 'Bhagavad Gita',
      category: 'devotion'
    },
    
    // Meditation category
    {
      shlok: 'ध्यानात् कर्म फल त्यागः',
      meaning_hindi: 'ध्यान से कर्म फल का त्याग होता है।',
      meaning_english: 'Through meditation, one renounces the fruits of action.',
      source: 'Yoga Sutras',
      category: 'meditation'
    },
    {
      shlok: 'ध्यायतो विषयान्पुंसः सङ्गस्तेषूपजायते',
      meaning_hindi: 'विषयों का ध्यान करने से उनमें आसक्ति हो जाती है।',
      meaning_english: 'By meditating on sense objects, attachment to them arises.',
      source: 'Bhagavad Gita',
      category: 'meditation'
    },
    {
      shlok: 'ध्यानेनात्मनि पश्यन्ति केचिदात्मानमात्मना',
      meaning_hindi: 'कुछ लोग ध्यान से आत्मा को आत्मा से देखते हैं।',
      meaning_english: 'Some see the self by the self through meditation.',
      source: 'Bhagavad Gita',
      category: 'meditation'
    }
  ];

  // Get recently used quotes to avoid duplicates
  const recentQuotes = await getRecentlyUsedQuotes(20);
  
  // Filter out recently used quotes
  const availableQuotes = fallbackQuotes.filter(quote => 
    !recentQuotes.some(recent => 
      recent.toLowerCase().includes(quote.shlok.toLowerCase()) ||
      quote.shlok.toLowerCase().includes(recent.toLowerCase())
    )
  );
  
  // Filter quotes by the category, or use any available quote if none match
  const categoryQuotes = availableQuotes.filter(quote => quote.category === category);
  const quotesToUse = categoryQuotes.length > 0 ? categoryQuotes : availableQuotes;
  
  // If no quotes are available, use all fallback quotes
  const finalQuotes = quotesToUse.length > 0 ? quotesToUse : fallbackQuotes;
  
  const randomIndex = Math.floor(Math.random() * finalQuotes.length);
  const selectedQuote = finalQuotes[randomIndex]!;
  
  // Ensure the selected quote has the category
  return {
    ...selectedQuote,
    category: category
  };
}

// Test AI connection
export async function testAIConnection(): Promise<boolean> {
  try {
    const openai = getOpenAIClient();

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5,
    });

    return !!completion.choices[0]?.message?.content;
  } catch (error) {
    console.error('AI connection test failed:', error);
    return false;
  }
}

// Get AI service status
export async function getAIStatus(): Promise<{
  isConnected: boolean;
  model: string;
  hasApiKey: boolean;
}> {
  const hasApiKey = !!process.env['OPENAI_API_KEY'];
  const isConnected = hasApiKey ? await testAIConnection() : false;
  
  return {
    isConnected,
    model: process.env['OPENAI_MODEL'] || 'gpt-3.5-turbo',
    hasApiKey
  };
} 