import { ENV } from "./env";

/**
 * Generate embeddings using the Manus Forge API
 * Uses text-embedding-3-small model for efficient vector generation
 */

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

const resolveEmbeddingUrl = () =>
  ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/embeddings`
    : "https://forge.manus.im/v1/embeddings";

/**
 * Generate an embedding vector for the given text
 * @param text The text to embed
 * @returns The embedding vector (1536 dimensions for text-embedding-3-small)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!ENV.forgeApiKey) {
    throw new Error("FORGE_API_KEY is not configured");
  }

  // Clean and truncate text if needed (max ~8000 tokens)
  const cleanText = text.replace(/\s+/g, " ").trim().slice(0, 30000);

  const response = await fetch(resolveEmbeddingUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: cleanText,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Embedding generation failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  const result = await response.json();
  return result.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in batch
 * @param texts Array of texts to embed
 * @returns Array of embedding vectors
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!ENV.forgeApiKey) {
    throw new Error("FORGE_API_KEY is not configured");
  }

  // Clean texts
  const cleanTexts = texts.map(t => t.replace(/\s+/g, " ").trim().slice(0, 30000));

  const response = await fetch(resolveEmbeddingUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: cleanTexts,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Batch embedding generation failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  const result = await response.json();
  return result.data.map((d: { embedding: number[] }) => d.embedding);
}

/**
 * Calculate cosine similarity between two vectors
 * @param a First vector
 * @param b Second vector
 * @returns Similarity score between -1 and 1
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find the most similar documents based on cosine similarity
 * @param queryEmbedding The query embedding vector
 * @param documents Array of documents with embeddings
 * @param topK Number of results to return
 * @returns Sorted array of documents with similarity scores
 */
export function findSimilarDocuments<T extends { embedding: number[] | null }>(
  queryEmbedding: number[],
  documents: T[],
  topK: number = 5
): Array<T & { similarity: number }> {
  const results = documents
    .filter(doc => doc.embedding && doc.embedding.length > 0)
    .map(doc => ({
      ...doc,
      similarity: cosineSimilarity(queryEmbedding, doc.embedding!),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return results;
}
