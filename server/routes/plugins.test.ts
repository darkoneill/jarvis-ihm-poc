import { describe, it, expect, vi } from "vitest";

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn(() => null),
}));

describe("Plugins Router", () => {
  describe("listInstalled", () => {
    it("should return mock plugins when db is not available", async () => {
      const { pluginsRouter } = await import("./plugins");
      const caller = pluginsRouter.createCaller({ user: null } as any);
      
      const result = await caller.listInstalled();
      
      expect(result).toHaveProperty("plugins");
      expect(result).toHaveProperty("isSimulation");
      expect(result.isSimulation).toBe(true);
      expect(Array.isArray(result.plugins)).toBe(true);
    });

    it("should include plugin properties", async () => {
      const { pluginsRouter } = await import("./plugins");
      const caller = pluginsRouter.createCaller({ user: null } as any);
      
      const result = await caller.listInstalled();
      
      if (result.plugins.length > 0) {
        const plugin = result.plugins[0];
        expect(plugin).toHaveProperty("id");
        expect(plugin).toHaveProperty("name");
        expect(plugin).toHaveProperty("displayName");
        expect(plugin).toHaveProperty("version");
        expect(plugin).toHaveProperty("enabled");
      }
    });
  });

  describe("listAvailable", () => {
    it("should return available plugins from catalog", async () => {
      const { pluginsRouter } = await import("./plugins");
      const caller = pluginsRouter.createCaller({ user: null } as any);
      
      const result = await caller.listAvailable();
      
      expect(result).toHaveProperty("plugins");
      expect(Array.isArray(result.plugins)).toBe(true);
      expect(result.plugins.length).toBeGreaterThan(0);
    });

    it("should include plugin catalog properties", async () => {
      const { pluginsRouter } = await import("./plugins");
      const caller = pluginsRouter.createCaller({ user: null } as any);
      
      const result = await caller.listAvailable();
      
      const plugin = result.plugins[0];
      expect(plugin).toHaveProperty("name");
      expect(plugin).toHaveProperty("displayName");
      expect(plugin).toHaveProperty("description");
      expect(plugin).toHaveProperty("version");
      expect(plugin).toHaveProperty("author");
      expect(plugin).toHaveProperty("category");
      expect(plugin).toHaveProperty("configSchema");
    });

    it("should include expected plugins", async () => {
      const { pluginsRouter } = await import("./plugins");
      const caller = pluginsRouter.createCaller({ user: null } as any);
      
      const result = await caller.listAvailable();
      
      const names = result.plugins.map((p: any) => p.name);
      expect(names).toContain("mqtt-connector");
      expect(names).toContain("home-assistant");
      expect(names).toContain("telegram-bot");
    });
  });

  describe("get", () => {
    it("should return plugin details", async () => {
      const { pluginsRouter } = await import("./plugins");
      const caller = pluginsRouter.createCaller({ user: null } as any);
      
      const result = await caller.get({ name: "mqtt-connector" });
      
      expect(result).toHaveProperty("installed");
      expect(result).toHaveProperty("catalog");
      expect(result.catalog).not.toBeNull();
      expect(result.catalog?.name).toBe("mqtt-connector");
    });

    it("should return null catalog for unknown plugin", async () => {
      const { pluginsRouter } = await import("./plugins");
      const caller = pluginsRouter.createCaller({ user: null } as any);
      
      const result = await caller.get({ name: "unknown-plugin" });
      
      expect(result.catalog).toBeUndefined();
    });
  });

  describe("install", () => {
    it("should install a plugin in simulation mode", async () => {
      const { pluginsRouter } = await import("./plugins");
      const caller = pluginsRouter.createCaller({ user: null } as any);
      
      const result = await caller.install({ name: "mqtt-connector" });
      
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
      expect(result).toHaveProperty("isSimulation");
      expect(result.isSimulation).toBe(true);
    });

    it("should throw error for unknown plugin", async () => {
      const { pluginsRouter } = await import("./plugins");
      const caller = pluginsRouter.createCaller({ user: null } as any);
      
      await expect(caller.install({ name: "unknown-plugin" })).rejects.toThrow(
        "Plugin not found in catalog"
      );
    });
  });

  describe("uninstall", () => {
    it("should uninstall a plugin in simulation mode", async () => {
      const { pluginsRouter } = await import("./plugins");
      const caller = pluginsRouter.createCaller({ user: null } as any);
      
      const result = await caller.uninstall({ name: "mqtt-connector" });
      
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
      expect(result).toHaveProperty("isSimulation");
      expect(result.isSimulation).toBe(true);
    });
  });

  describe("toggle", () => {
    it("should toggle plugin in simulation mode", async () => {
      const { pluginsRouter } = await import("./plugins");
      const caller = pluginsRouter.createCaller({ user: null } as any);
      
      const result = await caller.toggle({ name: "mqtt-connector" });
      
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
      expect(result).toHaveProperty("enabled");
      expect(result).toHaveProperty("isSimulation");
      expect(result.isSimulation).toBe(true);
    });
  });

  describe("getCategories", () => {
    it("should return plugin categories", async () => {
      const { pluginsRouter } = await import("./plugins");
      const caller = pluginsRouter.createCaller({ user: null } as any);
      
      const result = await caller.getCategories();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("name");
      expect(result[0]).toHaveProperty("description");
      expect(result[0]).toHaveProperty("icon");
    });

    it("should include expected categories", async () => {
      const { pluginsRouter } = await import("./plugins");
      const caller = pluginsRouter.createCaller({ user: null } as any);
      
      const result = await caller.getCategories();
      
      const ids = result.map((c: any) => c.id);
      expect(ids).toContain("iot");
      expect(ids).toContain("sensors");
      expect(ids).toContain("automation");
      expect(ids).toContain("integration");
    });
  });
});
