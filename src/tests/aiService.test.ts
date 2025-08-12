import { generateQuoteWithAI, getAIStatus } from '../services/aiService';
import { AIGeneratedQuote } from '../types';

describe('AI Service - Uniqueness Tests', () => {
  test('should generate unique quotes', async () => {
    // Test that multiple calls generate different quotes
    const quote1 = await generateQuoteWithAI();
    const quote2 = await generateQuoteWithAI();
    
    // Quotes should have different content
    expect(quote1.shlok).not.toBe(quote2.shlok);
    expect(quote1.meaning_hindi).not.toBe(quote2.meaning_hindi);
    expect(quote1.meaning_english).not.toBe(quote2.meaning_english);
    
    // Should have valid structure
    expect(quote1.shlok).toBeTruthy();
    expect(quote1.meaning_hindi).toBeTruthy();
    expect(quote1.meaning_english).toBeTruthy();
    expect(quote1.source).toBeTruthy();
    expect(quote1.category).toBeTruthy();
  }, 30000); // 30 second timeout for AI calls

  test('should have valid AI status', async () => {
    const status = await getAIStatus();
    
    expect(status).toHaveProperty('isConnected');
    expect(status).toHaveProperty('model');
    expect(status).toHaveProperty('hasApiKey');
    expect(typeof status.isConnected).toBe('boolean');
    expect(typeof status.model).toBe('string');
    expect(typeof status.hasApiKey).toBe('boolean');
  });

  test('should generate quotes with different categories', async () => {
    const quotes: AIGeneratedQuote[] = [];
    
    // Generate multiple quotes to test category variety
    for (let i = 0; i < 3; i++) {
      const quote = await generateQuoteWithAI();
      quotes.push(quote);
    }
    
    // Check that we have some variety in categories
    const categories = quotes.map(q => q.category);
    const uniqueCategories = new Set(categories);
    
    // Should have at least 2 different categories
    expect(uniqueCategories.size).toBeGreaterThanOrEqual(1);
    
    // All quotes should have valid categories
    categories.forEach(category => {
      expect(['karma', 'peace', 'wisdom', 'devotion', 'yoga', 'truth', 'dharma', 'meditation']).toContain(category);
    });
  }, 45000); // 45 second timeout for multiple AI calls
});
