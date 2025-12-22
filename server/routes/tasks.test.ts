import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "../db";

describe("Tasks Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("should return empty array when db is not available", async () => {
      vi.mocked(getDb).mockResolvedValue(null);
      
      // Import after mocking
      const { tasksRouter } = await import("./tasks");
      
      // Create a mock caller
      const caller = tasksRouter.createCaller({} as any);
      const result = await caller.list();
      
      expect(result).toEqual([]);
    });
  });

  describe("create", () => {
    it("should throw error when db is not available", async () => {
      vi.mocked(getDb).mockResolvedValue(null);
      
      const { tasksRouter } = await import("./tasks");
      const caller = tasksRouter.createCaller({} as any);
      
      await expect(
        caller.create({
          title: "Test Task",
          description: "Test description",
          status: "todo",
          priority: "medium",
        })
      ).rejects.toThrow("Database not available");
    });
  });

  describe("update", () => {
    it("should throw error when db is not available", async () => {
      vi.mocked(getDb).mockResolvedValue(null);
      
      const { tasksRouter } = await import("./tasks");
      const caller = tasksRouter.createCaller({} as any);
      
      await expect(
        caller.update({
          id: 1,
          data: { status: "done" },
        })
      ).rejects.toThrow("Database not available");
    });
  });

  describe("delete", () => {
    it("should throw error when db is not available", async () => {
      vi.mocked(getDb).mockResolvedValue(null);
      
      const { tasksRouter } = await import("./tasks");
      const caller = tasksRouter.createCaller({} as any);
      
      await expect(caller.delete({ id: 1 })).rejects.toThrow("Database not available");
    });
  });
});
