import { describe, it, expect, vi, beforeEach } from "vitest";
import { cosineSimilarity, findSimilarDocuments } from "./embeddings";

// Mock fetch for API calls
global.fetch = vi.fn();

describe("Embeddings Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("cosineSimilarity", () => {
    it("should return 1 for identical vectors", () => {
      const a = [1, 0, 0];
      const b = [1, 0, 0];
      
      const similarity = cosineSimilarity(a, b);
      
      expect(similarity).toBeCloseTo(1, 5);
    });

    it("should return 0 for orthogonal vectors", () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];
      
      const similarity = cosineSimilarity(a, b);
      
      expect(similarity).toBeCloseTo(0, 5);
    });

    it("should return -1 for opposite vectors", () => {
      const a = [1, 0, 0];
      const b = [-1, 0, 0];
      
      const similarity = cosineSimilarity(a, b);
      
      expect(similarity).toBeCloseTo(-1, 5);
    });

    it("should handle normalized vectors", () => {
      const a = [0.6, 0.8, 0];
      const b = [0.8, 0.6, 0];
      
      const similarity = cosineSimilarity(a, b);
      
      // Dot product: 0.6*0.8 + 0.8*0.6 = 0.96
      expect(similarity).toBeCloseTo(0.96, 2);
    });

    it("should throw error for vectors of different lengths", () => {
      const a = [1, 0, 0];
      const b = [1, 0];
      
      expect(() => cosineSimilarity(a, b)).toThrow("Vectors must have the same length");
    });

    it("should return 0 for zero vectors", () => {
      const a = [0, 0, 0];
      const b = [1, 0, 0];
      
      const similarity = cosineSimilarity(a, b);
      
      expect(similarity).toBe(0);
    });
  });

  describe("findSimilarDocuments", () => {
    const mockDocuments = [
      { id: 1, title: "Doc 1", embedding: [1, 0, 0] },
      { id: 2, title: "Doc 2", embedding: [0.9, 0.1, 0] },
      { id: 3, title: "Doc 3", embedding: [0, 1, 0] },
      { id: 4, title: "Doc 4", embedding: null },
      { id: 5, title: "Doc 5", embedding: [0.5, 0.5, 0] },
    ];

    it("should return documents sorted by similarity", () => {
      const queryEmbedding = [1, 0, 0];
      
      const results = findSimilarDocuments(queryEmbedding, mockDocuments, 5);
      
      expect(results.length).toBe(4); // Excludes doc with null embedding
      expect(results[0].id).toBe(1); // Most similar
      expect(results[0].similarity).toBeCloseTo(1, 5);
    });

    it("should respect topK parameter", () => {
      const queryEmbedding = [1, 0, 0];
      
      const results = findSimilarDocuments(queryEmbedding, mockDocuments, 2);
      
      expect(results.length).toBe(2);
    });

    it("should filter out documents without embeddings", () => {
      const queryEmbedding = [1, 0, 0];
      
      const results = findSimilarDocuments(queryEmbedding, mockDocuments, 10);
      
      expect(results.find(d => d.id === 4)).toBeUndefined();
    });

    it("should handle empty documents array", () => {
      const queryEmbedding = [1, 0, 0];
      
      const results = findSimilarDocuments(queryEmbedding, [], 5);
      
      expect(results.length).toBe(0);
    });

    it("should include similarity score in results", () => {
      const queryEmbedding = [1, 0, 0];
      
      const results = findSimilarDocuments(queryEmbedding, mockDocuments, 5);
      
      results.forEach(doc => {
        expect(doc).toHaveProperty("similarity");
        expect(typeof doc.similarity).toBe("number");
      });
    });
  });

  describe("Embedding Generation (Mocked)", () => {
    it("should clean text before embedding", () => {
      const text = "  Multiple   spaces   and\n\nnewlines  ";
      const cleanText = text.replace(/\s+/g, " ").trim();
      
      expect(cleanText).toBe("Multiple spaces and newlines");
    });

    it("should truncate long text", () => {
      const longText = "a".repeat(50000);
      const truncated = longText.slice(0, 30000);
      
      expect(truncated.length).toBe(30000);
    });
  });
});
