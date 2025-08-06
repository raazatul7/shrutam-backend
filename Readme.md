# 🌅 Shrutam — Daily Quotes from Indian Scriptures (Powered by AI)

**Shrutam** is a strict daily quote system that serves one **AI-generated quote every day at 6:00 AM IST** from Indian scriptures like the *Bhagavad Gita*, *Ramayana*, *Upanishads*, and other spiritual texts.

It delivers a **Shlok (in Sanskrit)** along with its **meaning in both Hindi and English**, using a free AI model and stores everything in a Supabase database. Users can only access **today's quote** and **past quotes** - no future access allowed. No login required.

---

## ✨ What It Does

- 🕉️ Generates one quote daily at 6:00 AM IST using AI (with Shlok + Hindi + English meanings)
- 📚 Sources include Bhagavad Gita, Ramayana, Mahabharata, Upanishads
- 🗃️ Stores quotes in Supabase for secure access
- 🧠 Uses OpenAI API (free tier) or any compatible LLM
- 🔁 Scheduled job runs daily at 6:00 AM IST to create/store quote
- 🌍 Public API to fetch today's quote and past quotes — no login required
- 🔒 Strict access control: only today's and past quotes accessible
- 🚀 Hosted freely on platforms like Render, Railway, or Vercel

---

## 🧠 AI Prompt Sample (Used Internally)

> Generate one Shlok from any Indian scripture (Bhagavad Gita, Ramayana, etc.)  
> Return it in Sanskrit along with its Hindi meaning.  
> Example output format:  
> **Shlok**: कर्मण्येवाधिकारस्ते मा फलेषु कदाचन  
> **Meaning (Hindi)**: तुम्हारा अधिकार केवल कर्म करने में है, फल में नहीं।  
> **Meaning (English)**: You have the right to perform your actions, but never to the fruits of those actions.

---

## 🗃️ Database Schema (PostgreSQL)

### quotes

| Field          | Type       | Description                         |
|----------------|------------|-------------------------------------|
| id             | UUID       | Unique ID                           |
| shlok          | TEXT       | The Sanskrit verse                  |
| meaning_hindi  | TEXT       | Meaning in Hindi                    |
| meaning_english| TEXT       | Meaning in English                  |
| source        | TEXT       | Scripture name                      |
| category      | TEXT       | (Optional) e.g., karma, peace       |
| created_at    | TIMESTAMP  | Auto-generated timestamp            |

### daily_logs

| Field      | Type       | Description              |
|------------|------------|--------------------------|
| id         | UUID       | Unique log ID            |
| quote_id   | UUID       | Linked quote             |
| date       | DATE       | Quote delivery date      |

---

## 📦 Tech Stack

| Part            | Stack                     |
|-----------------|---------------------------|
| Backend         | Node.js + Express + TypeScript |
| Database        | Supabase (PostgreSQL)     |
| AI Integration  | OpenAI API (free tier)    |
| Scheduler       | node-cron                 |
| Testing         | Jest + Supertest          |
| Linting         | ESLint + Prettier         |
| Hosting         | Render / Railway / Vercel |

---

## 🚀 Local Setup

### 1. Clone the repo

```bash
git clone https://github.com/raazatul7/shrutam
cd shrutam
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Fill in your environment variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo

# Optional: Custom AI Provider (if not using OpenAI)
# AI_PROVIDER=anthropic
# ANTHROPIC_API_KEY=your_anthropic_key_here
```

### 4. Database Setup

#### Supabase Setup

1. Create a free account at [Supabase](https://supabase.com)
2. Create a new project
3. Go to SQL Editor and run the SQL from `supabase-setup.sql` file
4. Get your Supabase URL and API keys from Project Settings > API
5. Update your `.env` file with the Supabase credentials

### 5. Start the application

```bash
# Development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Production mode
npm start
```

The server will start on `http://localhost:3000`

---

## 📡 API Endpoints

### Get Today's Quote
```http
GET /api/quote/today
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "shlok": "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन",
    "meaning_hindi": "तुम्हारा अधिकार केवल कर्म करने में है, फल में नहीं।",
    "source": "Bhagavad Gita",
    "category": "karma",
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

**Note:** Only available after 6:00 AM IST daily generation.

### Get Quote for Specific Date (Past Only)
```http
GET /api/quote/date/2024-01-12
```

### Get Available Dates
```http
GET /api/quote/dates?limit=30
```

### Get Recent Quotes
```http
GET /api/quote/recent?limit=10
```

### Get Quote by ID (Past Only)
```http
GET /api/quote/:id
```

### Get All Quotes (Paginated, Past Only)
```http
GET /api/quotes?page=1&limit=10
```

### Get Quotes by Category
```http
GET /api/quote/category/karma?limit=10
```

### Get Quotes by Source
```http
GET /api/quote/source/Bhagavad%20Gita?limit=10
```

### Get Quote Statistics
```http
GET /api/quote/stats
```

---

## 🔧 Development

### Available Scripts

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Seed database with sample data
npm run db:seed

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Format code
npm run format
```

### Project Structure

```
shrutam/
├── src/
│   ├── controllers/     # Route controllers
│   ├── services/       # Business logic
│   ├── middleware/     # Custom middleware
│   ├── utils/          # Helper functions
│   ├── config/         # Configuration files
│   ├── routes/         # API routes
│   ├── types/          # TypeScript type definitions
│   └── tests/          # Test files
├── dist/              # Compiled JavaScript (production)
├── migrations/        # Database migrations
├── .env.example       # Environment variables template
├── package.json       # Dependencies and scripts
├── tsconfig.json      # TypeScript configuration
├── jest.config.js     # Jest configuration
└── README.md         # This file
```

---

## 🚀 Deployment

### Option 1: Render (Recommended)

1. Connect your GitHub repo to Render
2. Create a new Web Service
3. Set build command: `npm run build`
4. Set start command: `npm start`
5. Add environment variables in Render dashboard
6. Deploy!

### Option 2: Railway

1. Connect your GitHub repo to Railway
2. Add environment variables
3. Deploy automatically

### Option 3: Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow the prompts

### Environment Variables for Production

Make sure to set these in your hosting platform:

```env
NODE_ENV=production
PORT=3000
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_api_key
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Inspired by the wisdom of ancient Indian scriptures
- Built with modern web technologies
- Powered by AI for daily spiritual inspiration

---

**Made with ❤️ for spiritual seekers everywhere**