import { describe, it, expect, vi } from "vitest";

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn(() => null),
}));

describe("Dashboard Router", () => {
  describe("getConfig", () => {
    it("should return default widgets when db is not available", async () => {
      const { dashboardRouter } = await import("./dashboard");
      const caller = dashboardRouter.createCaller({ user: null } as any);
      
      const result = await caller.getConfig();
      
      expect(result).toHaveProperty("widgets");
      expect(result).toHaveProperty("layout");
      expect(result.layout).toBe("grid");
      expect(Array.isArray(result.widgets)).toBe(true);
      expect(result.widgets.length).toBeGreaterThan(0);
    });

    it("should include default widget types", async () => {
      const { dashboardRouter } = await import("./dashboard");
      const caller = dashboardRouter.createCaller({ user: null } as any);
      
      const result = await caller.getConfig();
      
      const widgetTypes = result.widgets.map((w: any) => w.type);
      expect(widgetTypes).toContain("system_status");
      expect(widgetTypes).toContain("hardware_metrics");
      expect(widgetTypes).toContain("recent_tasks");
    });
  });

  describe("getWidgetTypes", () => {
    it("should return available widget types", async () => {
      const { dashboardRouter } = await import("./dashboard");
      const caller = dashboardRouter.createCaller({ user: null } as any);
      
      const result = await caller.getWidgetTypes();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("type");
      expect(result[0]).toHaveProperty("name");
      expect(result[0]).toHaveProperty("description");
      expect(result[0]).toHaveProperty("icon");
      expect(result[0]).toHaveProperty("defaultSize");
    });

    it("should include all expected widget types", async () => {
      const { dashboardRouter } = await import("./dashboard");
      const caller = dashboardRouter.createCaller({ user: null } as any);
      
      const result = await caller.getWidgetTypes();
      
      const types = result.map((w: any) => w.type);
      expect(types).toContain("system_status");
      expect(types).toContain("hardware_metrics");
      expect(types).toContain("clock");
      expect(types).toContain("notifications");
    });
  });

  describe("resetConfig", () => {
    it("should return default widgets when resetting", async () => {
      const { dashboardRouter } = await import("./dashboard");
      const caller = dashboardRouter.createCaller({ user: null } as any);
      
      const result = await caller.resetConfig();
      
      expect(result).toHaveProperty("widgets");
      expect(result).toHaveProperty("layout");
      expect(result.layout).toBe("grid");
    });
  });
});
