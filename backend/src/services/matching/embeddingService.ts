import { cosineSimilarity, tokenize } from './rankingEngine';

export class EmbeddingService {
  private static cache = new Map<string, number[]>();

  /**
   * Generates embedding vector for a given text.
   * Attempts Google Generative AI (gemini-embedding-001 / gemini-embedding-2),
   * falling back to local bag-of-words / character n-gram pseudo-embedding if API is unavailable.
   */
  static async getEmbedding(text: string): Promise<number[]> {
    const cleanText = (text || '').trim();
    if (!cleanText) {
      return new Array(64).fill(0);
    }

    const cacheKey = cleanText.slice(0, 300);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const candidateModels = [
        'models/gemini-embedding-001',
        'models/gemini-embedding-2',
      ];

      for (const model of candidateModels) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/${model}:embedContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: {
                  parts: [{ text: cleanText.slice(0, 1000) }],
                },
              }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data?.embedding?.values && Array.isArray(data.embedding.values)) {
              const vector = data.embedding.values as number[];
              this.cache.set(cacheKey, vector);
              return vector;
            }
          } else {
            console.warn(`[EmbeddingService] Model ${model} returned HTTP ${response.status}. Trying next candidate...`);
          }
        } catch {
          console.warn(`[EmbeddingService] Model ${model} call failed (Network or request error; trying next candidate...)`);
        }
      }
      console.warn('[EmbeddingService] All Gemini models failed or unavailable; activated local deterministic vector fallback.');
    } else {
      console.warn('[EmbeddingService] GEMINI_API_KEY not configured; activated local deterministic vector fallback.');
    }

    // High-performance deterministic fallback embedding
    const fallbackVector = this.computeDeterministicFallbackVector(cleanText);
    this.cache.set(cacheKey, fallbackVector);
    return fallbackVector;
  }

  /**
   * Computes semantic similarity between two texts.
   * Returns a score between 0.0 and 1.0.
   */
  static async computeSimilarity(textA: string, textB: string): Promise<number> {
    try {
      const [vecA, vecB] = await Promise.all([
        this.getEmbedding(textA),
        this.getEmbedding(textB),
      ]);
      return cosineSimilarity(vecA, vecB);
    } catch {
      // Complete resilience fallback
      const tokensA = tokenize(textA);
      const tokensB = tokenize(textB);
      let match = 0;
      for (const t of tokensA) {
        if (tokensB.has(t)) match++;
      }
      return (match / Math.max(tokensA.size, tokensB.size, 1));
    }
  }

  /**
   * Generates a 128-dimensional hashed TF-IDF representation
   * for reliable local execution without external dependencies.
   */
  private static computeDeterministicFallbackVector(text: string, dimensions = 128): number[] {
    const vector = new Array(dimensions).fill(0);
    const tokens = Array.from(tokenize(text));

    for (const token of tokens) {
      let hash = 0;
      for (let i = 0; i < token.length; i++) {
        hash = (hash << 5) - hash + token.charCodeAt(i);
        hash |= 0;
      }
      const idx = Math.abs(hash) % dimensions;
      vector[idx] += 1;
    }

    // Normalize vector
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      for (let i = 0; i < dimensions; i++) {
        vector[i] /= norm;
      }
    }

    return vector;
  }
}
