import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "../db";

describe("Workflows Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("should return empty array when db is not available", async () => {
      vi.mocked(getDb).mockResolvedValue(null);
      
      const { workflowsRouter } = await import("./workflows");
      const caller = workflowsRouter.createCaller({} as any);
      const result = await caller.list();
      
      expect(result).toEqual([]);
    });
  });

  describe("getById", () => {
    it("should return null when db is not available", async () => {
      vi.mocked(getDb).mockResolvedValue(null);
      
      const { workflowsRouter } = await import("./workflows");
      const caller = workflowsRouter.createCaller({} as any);
      const result = await caller.getById({ id: 1 });
      
      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("should throw error when db is not available", async () => {
      vi.mocked(getDb).mockResolvedValue(null);
      
      const { workflowsRouter } = await import("./workflows");
      const caller = workflowsRouter.createCaller({} as any);
      
      await expect(
        caller.create({
          name: "Test Workflow",
          nodes: [],
          edges: [],
          enabled: false,
        })
      ).rejects.toThrow("Database not available");
    });
  });

  describe("toggleEnabled", () => {
    it("should throw error when db is not available", async () => {
      vi.mocked(getDb).mockResolvedValue(null);
      
      const { workflowsRouter } = await import("./workflows");
      const caller = workflowsRouter.createCaller({} as any);
      
      await expect(
        caller.toggleEnabled({ id: 1, enabled: true })
      ).rejects.toThrow("Database not available");
    });
  });

  describe("execute", () => {
    it("should throw error when db is not available", async () => {
      vi.mocked(getDb).mockResolvedValue(null);
      
      const { workflowsRouter } = await import("./workflows");
      const caller = workflowsRouter.createCaller({} as any);
      
      await expect(caller.execute({ id: 1 })).rejects.toThrow("Database not available");
    });
  });

  describe("delete", () => {
    it("should throw error when db is not available", async () => {
      vi.mocked(getDb).mockResolvedValue(null);
      
      const { workflowsRouter } = await import("./workflows");
      const caller = workflowsRouter.createCaller({} as any);
      
      await expect(caller.delete({ id: 1 })).rejects.toThrow("Database not available");
    });
  });
});
