import os
import json
import urllib.parse

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq

# Load environment variables (Vercel injects these automatically from project settings)
app = FastAPI(title="Curiosity API")

# CORS — allow all origins for deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq client
api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GROQ_API_KEY") or ""
groq_client = Groq(api_key=api_key)

# Pexels API for topic-relevant images (free: https://www.pexels.com/api/)
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY", "")


async def search_image(query: str, width: int = 800, height: int = 500) -> str:
    """Search for a photo matching the query.
    Priority: Pexels API (needs key) → Wikimedia Commons (free) → Unsplash Source fallback."""

    # 1) Try Pexels API (if key is available)
    if PEXELS_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(
                    "https://api.pexels.com/v1/search",
                    params={"query": query, "per_page": 5, "orientation": "landscape"},
                    headers={"Authorization": PEXELS_API_KEY},
                )
                resp.raise_for_status()
                data = resp.json()
                photos = data.get("photos", [])
                if photos:
                    return photos[0]["src"]["large2x"]
        except Exception:
            pass

    # 2) Try Wikimedia Commons — free, no key, returns topic-relevant images
    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            resp = await client.get(
                "https://commons.wikimedia.org/w/api.php",
                params={
                    "action": "query",
                    "generator": "search",
                    "gsrsearch": f"filetype:bitmap {query}",
                    "gsrnamespace": "6",
                    "gsrlimit": "5",
                    "prop": "imageinfo",
                    "iiprop": "url|size|mime",
                    "iiurlwidth": str(width),
                    "format": "json",
                },
            )
            resp.raise_for_status()
            data = resp.json()
            pages = data.get("query", {}).get("pages", {})
            for _page_id, page in sorted(pages.items(), key=lambda x: x[0]):
                imageinfo = page.get("imageinfo", [])
                if imageinfo:
                    info = imageinfo[0]
                    mime = info.get("mime", "")
                    if mime.startswith("image/") and "svg" not in mime:
                        thumb_url = info.get("thumburl")
                        full_url = info.get("url")
                        if thumb_url:
                            return thumb_url
                        if full_url:
                            return full_url
    except Exception:
        pass

    # 3) Final fallback: Unsplash Source — free, no key, returns topic-relevant images
    encoded = urllib.parse.quote(query)
    return f"https://source.unsplash.com/{width}x{height}/?{encoded}"


async def resolve_article_images(article: dict) -> dict:
    """Resolve imageQuery fields to actual image URLs."""
    hero_query = article.get("heroImageQuery", "curiosity science")
    article["heroImageUrl"] = await search_image(hero_query, 1200, 800)

    for section in article.get("sections", []):
        query = section.get("imageQuery", "science")
        section["imageUrl"] = await search_image(query, 980, 550)

    for related in article.get("relatedTopics", []):
        query = related.get("imageQuery", "curiosity")
        related["imageUrl"] = await search_image(query, 600, 450)

    return article


ARTICLE_PROMPT = """You are a world-class science and culture writer known for creating addictive, curiosity-driven articles. Your writing style is vivid, accessible, and full of surprising connections. You write like a blend of Malcolm Gladwell, Tim Urban (Wait But Why), and National Geographic.

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
  "heroImageQuery": "A highly specific 3-5 word photo search query using concrete visual nouns that precisely match the article's main subject (e.g., 'bioluminescent jellyfish deep ocean' not 'ocean' or 'science'. Use real objects, animals, places, or phenomena that a photographer could capture.)",
  "sections": [
    {
      "heading": "Section title (numbered, e.g., '1) The Discovery That Changed Everything')",
      "paragraphs": [
        "First paragraph — start with a vivid scene, analogy, or surprising fact. 3-4 sentences. Make it impossible not to read the next paragraph.",
        "Second paragraph — go deeper. Connect the dots. Reveal the 'why'. 3-4 sentences.",
        "Optional third paragraph — the twist, the implication, or the connection to something the reader already knows. 2-3 sentences."
      ],
      "imageQuery": "A highly specific 3-5 word photo search query with concrete visual nouns matching this section's exact content (e.g., 'electron microscope cell membrane' not 'biology'. Describe what a real photograph of the subject would show.)",
      "imageCaption": "A short, intriguing caption for the image"
    }
  ],
  "relatedTopics": [
    {
      "title": "An intriguing article title suggestion",
      "topic": "Field name",
      "imageQuery": "A highly specific 3-5 word photo search query with concrete visual nouns matching this related topic"
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
- Return ONLY valid JSON, nothing else. Do not wrap in markdown ```json blocks. Just plain JSON.
- CRITICAL: Make ALL imageQuery fields extremely specific and descriptive (3-5 concrete visual words). These are used to search for real photographs. Use tangible nouns (objects, animals, places, instruments, natural phenomena) that a photographer could actually photograph. NEVER use abstract concepts like 'innovation', 'knowledge', 'curiosity', or field names like 'science', 'technology'. Instead describe the VISUAL subject: 'volcanic lava flow Hawaii', 'ancient Egyptian hieroglyphics temple wall', 'neural network brain scan MRI'."""


class TopicRequest(BaseModel):
    topic: str


@app.post("/api/generate-article")
async def generate_article(request: TopicRequest):
    topic = request.topic.strip()

    if not topic:
        raise HTTPException(status_code=400, detail="Topic is required")

    current_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GROQ_API_KEY")
    if not current_api_key or current_api_key == "your_gemini_api_key_here":
        raise HTTPException(
            status_code=500,
            detail="API Key is not configured. Please add your key to the .env file.",
        )

    prompt = ARTICLE_PROMPT.replace("{TOPIC}", topic)

    try:
        completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            response_format={"type": "json_object"},
        )

        text = completion.choices[0].message.content or ""

        # Clean the response — strip markdown code fences if present
        clean_text = text.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        elif clean_text.startswith("```"):
            clean_text = clean_text[3:]
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
        clean_text = clean_text.strip()

        article = json.loads(clean_text)

        # Validate structure
        if (
            not article.get("title")
            or not article.get("sections")
            or not isinstance(article.get("sections"), list)
        ):
            raise ValueError("Invalid article structure returned by AI")

        # Resolve image queries to actual photo URLs
        article = await resolve_article_images(article)

        return {"article": article}

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}"
        )
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate article: {str(e)}"
        )
