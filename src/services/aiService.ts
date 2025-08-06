import OpenAI from 'openai';
import { AIGeneratedQuote } from '../types';

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

// AI prompt for generating quotes with random category
function getQuoteGenerationPrompt(): string {
  const randomCategory = getRandomCategory();
  
  return `
Generate one Shlok from any Indian scripture (Bhagavad Gita, Ramayana, Mahabharata, Upanishads, etc.) 
that relates to the category: ${randomCategory}

Requirements:
1. The Shlok should be in Sanskrit (Devanagari script)
2. Provide meaning in Hindi (Devanagari script)
3. Provide meaning in English (simple, clear translation)
4. Include the source scripture name
5. The quote MUST relate to the category: ${randomCategory}

Example format:
Shlok: कर्मण्येवाधिकारस्ते मा फलेषु कदाचन
Meaning Hindi: तुम्हारा अधिकार केवल कर्म करने में है, फल में नहीं।
Meaning English: You have the right to perform your actions, but never to the fruits of those actions.
Source: Bhagavad Gita
Category: ${randomCategory}

Please generate a new, meaningful quote related to ${randomCategory} following this exact format.
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
          content: 'You are a knowledgeable expert in Indian scriptures and Sanskrit literature. Generate authentic and meaningful quotes from ancient texts.'
        },
        {
          role: 'user',
          content: getQuoteGenerationPrompt()
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('No response from AI service');
    }

    // Parse the AI response
    const parsedQuote = parseAIResponse(response);
    
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
    return getFallbackQuote();
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
    return getFallbackQuote();
  }
}

// Fallback quote when AI fails
function getFallbackQuote(): AIGeneratedQuote {
  const randomCategory = getRandomCategory();
  
  const fallbackQuotes: AIGeneratedQuote[] = [
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
    },
    {
      shlok: 'ज्ञानं वैराग्यं च सा विद्या',
      meaning_hindi: 'ज्ञान और वैराग्य ही वास्तविक विद्या है।',
      meaning_english: 'Knowledge and detachment together constitute true wisdom.',
      source: 'Bhagavad Gita',
      category: 'wisdom'
    },
    {
      shlok: 'भक्ति योगेन तोषयामि',
      meaning_hindi: 'भक्ति योग से मैं प्रसन्न होता हूं।',
      meaning_english: 'I am pleased by the yoga of devotion.',
      source: 'Bhagavad Gita',
      category: 'devotion'
    },
    {
      shlok: 'ध्यानात् कर्म फल त्यागः',
      meaning_hindi: 'ध्यान से कर्म फल का त्याग होता है।',
      meaning_english: 'Through meditation, one renounces the fruits of action.',
      source: 'Yoga Sutras',
      category: 'meditation'
    }
  ];

  // Filter quotes by the random category, or use any quote if none match
  const categoryQuotes = fallbackQuotes.filter(quote => quote.category === randomCategory);
  const quotesToUse = categoryQuotes.length > 0 ? categoryQuotes : fallbackQuotes;
  
  const randomIndex = Math.floor(Math.random() * quotesToUse.length);
  const selectedQuote = quotesToUse[randomIndex]!;
  
  // Ensure the selected quote has the random category
  return {
    ...selectedQuote,
    category: randomCategory
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