import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "../db";

describe("Knowledge Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("should return empty array when db is not available", async () => {
      vi.mocked(getDb).mockResolvedValue(null);
      
      const { knowledgeRouter } = await import("./knowledge");
      const caller = knowledgeRouter.createCaller({} as any);
      const result = await caller.list();
      
      expect(result).toEqual([]);
    });
  });

  describe("search", () => {
    it("should return empty array when db is not available", async () => {
      vi.mocked(getDb).mockResolvedValue(null);
      
      const { knowledgeRouter } = await import("./knowledge");
      const caller = knowledgeRouter.createCaller({} as any);
      const result = await caller.search({ query: "test" });
      
      expect(result).toEqual([]);
    });
  });

  describe("getById", () => {
    it("should return null when db is not available", async () => {
      vi.mocked(getDb).mockResolvedValue(null);
      
      const { knowledgeRouter } = await import("./knowledge");
      const caller = knowledgeRouter.createCaller({} as any);
      const result = await caller.getById({ id: 1 });
      
      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("should throw error when db is not available", async () => {
      vi.mocked(getDb).mockResolvedValue(null);
      
      const { knowledgeRouter } = await import("./knowledge");
      const caller = knowledgeRouter.createCaller({} as any);
      
      await expect(
        caller.create({
          title: "Test Document",
          content: "Test content",
        })
      ).rejects.toThrow("Database not available");
    });
  });

  describe("delete", () => {
    it("should throw error when db is not available", async () => {
      vi.mocked(getDb).mockResolvedValue(null);
      
      const { knowledgeRouter } = await import("./knowledge");
      const caller = knowledgeRouter.createCaller({} as any);
      
      await expect(caller.delete({ id: 1 })).rejects.toThrow("Database not available");
    });
  });
});
