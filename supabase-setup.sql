-- Shrutam Database Setup for Supabase
-- Run this in your Supabase SQL Editor

-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shlok TEXT NOT NULL,
  meaning_hindi TEXT NOT NULL,
  meaning_english TEXT NOT NULL,
  source TEXT NOT NULL,
  category TEXT CHECK (category IN ('karma', 'peace', 'wisdom', 'devotion', 'yoga', 'truth', 'dharma', 'meditation')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create daily_logs table
CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date)  -- Only one quote per date allowed
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_category ON quotes(category);
CREATE INDEX IF NOT EXISTS idx_quotes_source ON quotes(source);
CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(date);
CREATE INDEX IF NOT EXISTS idx_daily_logs_quote_id ON daily_logs(quote_id);

-- Enable Row Level Security (RLS)
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access to quotes" ON quotes
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to daily_logs" ON daily_logs
  FOR SELECT USING (true);

-- Create policy for inserting quotes (for the application)
CREATE POLICY "Allow insert quotes" ON quotes
  FOR INSERT WITH CHECK (true);

-- Create policy for upserting daily logs (for the application)
CREATE POLICY "Allow upsert daily_logs" ON daily_logs
  FOR ALL USING (true) WITH CHECK (true);

-- Insert some sample quotes
INSERT INTO quotes (shlok, meaning_hindi, meaning_english, source, category) VALUES
  ('कर्मण्येवाधिकारस्ते मा फलेषु कदाचन', 'तुम्हारा अधिकार केवल कर्म करने में है, फल में नहीं।', 'You have the right to perform your actions, but never to the fruits of those actions.', 'Bhagavad Gita', 'karma')
ON CONFLICT DO NOTHING;

-- Create daily log for today with first quote
INSERT INTO daily_logs (quote_id, date)
SELECT id, CURRENT_DATE
FROM quotes
WHERE shlok = 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन'
LIMIT 1
ON CONFLICT DO NOTHING; 