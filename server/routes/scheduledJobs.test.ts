import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "../db";

describe("Scheduled Jobs Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("should return empty array when db is not available", async () => {
      vi.mocked(getDb).mockResolvedValue(null);
      
      const { scheduledJobsRouter } = await import("./scheduledJobs");
      const caller = scheduledJobsRouter.createCaller({} as any);
      const result = await caller.list();
      
      expect(result).toEqual([]);
    });
  });

  describe("create", () => {
    it("should throw error when db is not available", async () => {
      vi.mocked(getDb).mockResolvedValue(null);
      
      const { scheduledJobsRouter } = await import("./scheduledJobs");
      const caller = scheduledJobsRouter.createCaller({} as any);
      
      await expect(
        caller.create({
          name: "Test Job",
          cronExpression: "0 * * * *",
          enabled: true,
        })
      ).rejects.toThrow("Database not available");
    });
  });

  describe("toggleEnabled", () => {
    it("should throw error when db is not available", async () => {
      vi.mocked(getDb).mockResolvedValue(null);
      
      const { scheduledJobsRouter } = await import("./scheduledJobs");
      const caller = scheduledJobsRouter.createCaller({} as any);
      
      await expect(
        caller.toggleEnabled({ id: 1, enabled: false })
      ).rejects.toThrow("Database not available");
    });
  });

  describe("delete", () => {
    it("should throw error when db is not available", async () => {
      vi.mocked(getDb).mockResolvedValue(null);
      
      const { scheduledJobsRouter } = await import("./scheduledJobs");
      const caller = scheduledJobsRouter.createCaller({} as any);
      
      await expect(caller.delete({ id: 1 })).rejects.toThrow("Database not available");
    });
  });
});
