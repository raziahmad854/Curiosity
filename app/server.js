import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';

dotenv.config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Initialize Groq instead of Gemini
const groq = new Groq({
  apiKey: process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || ''
});

const ARTICLE_PROMPT = `You are a world-class science and culture writer known for creating addictive, curiosity-driven articles. Your writing style is vivid, accessible, and full of surprising connections. You write like a blend of Malcolm Gladwell, Tim Urban (Wait But Why), and National Geographic.

The user wants to read about: "{TOPIC}"

Your job:
1. Pick the MOST fascinating, surprising, and curiosity-provoking specific subtopic within this field. Don't be generic — find the hidden gem, the thing people don't know about.
2. Write a complete article that makes the reader say "Wow, I had no idea!"

Return a JSON object with this EXACT structure (no markdown, no code fences, just pure JSON):
{
  "title": "A punchy, curiosity-provoking title (max 8 words, make it irresistible)",
  "subtitle": "A one-line hook that creates a knowledge gap the reader MUST fill",
  "topic": "The general field name (e.g., Science, Philosophy, Technology)",
  "readTime": "X MIN READ",
  "heroImageQuery": "A 2-3 word Unsplash search query for the hero image",
  "sections": [
    {
      "heading": "Section title (numbered, e.g., '1) The Discovery That Changed Everything')",
      "paragraphs": [
        "First paragraph — start with a vivid scene, analogy, or surprising fact. 3-4 sentences. Make it impossible not to read the next paragraph.",
        "Second paragraph — go deeper. Connect the dots. Reveal the 'why'. 3-4 sentences.",
        "Optional third paragraph — the twist, the implication, or the connection to something the reader already knows. 2-3 sentences."
      ],
      "imageQuery": "A 2-3 word Unsplash search query relevant to this section",
      "imageCaption": "A short, intriguing caption for the image"
    }
  ],
  "relatedTopics": [
    {
      "title": "An intriguing article title suggestion",
      "topic": "Field name",
      "imageQuery": "2-3 word Unsplash search query"
    }
  ]
}

RULES:
- Write EXACTLY 3 sections
- Each section should have 2-3 paragraphs
- Include EXACTLY 6 related topics from diverse fields
- The writing should be warm, vivid, and full of "aha moments"
- Use analogies and real-world connections
- Make every sentence count — no filler
- The article should feel like discovering a secret the rest of the world doesn't know yet
- Return ONLY valid JSON, nothing else. Do not wrap in markdown \`\`\`json blocks. Just plain JSON.`;

app.post('/api/generate-article', async (req, res) => {
  try {
    const { topic } = req.body;

    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return res.status(500).json({ error: 'API Key is not configured. Please add your key to the .env file.' });
    }

    const prompt = ARTICLE_PROMPT.replace('{TOPIC}', topic);

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const text = completion.choices[0]?.message?.content || '';

    // Clean the response — strip markdown code fences if present (just in case)
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.slice(7);
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.slice(3);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.slice(0, -3);
    }
    cleanText = cleanText.trim();

    const article = JSON.parse(cleanText);

    // Validate structure
    if (!article.title || !article.sections || !Array.isArray(article.sections)) {
      throw new Error('Invalid article structure returned by AI');
    }

    res.json({ article });
  } catch (error) {
    console.error('Article generation error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate article',
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Curiosity API server running at http://localhost:${PORT}\n`);
});
