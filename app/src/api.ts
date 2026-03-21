import type { Article } from './types';

export async function generateArticle(topic: string): Promise<Article> {
  const response = await fetch('/api/generate-article', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ topic }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to generate article (${response.status})`);
  }

  const data = await response.json();
  return data.article;
}
