import { describe, it, expect } from "vitest";
import { hardwareRouter } from "./hardware";

describe("Hardware Router", () => {
  describe("getMetrics", () => {
    it("should return system metrics", async () => {
      const caller = hardwareRouter.createCaller({} as any);
      const result = await caller.getMetrics();
      
      expect(result).toHaveProperty("timestamp");
      expect(result).toHaveProperty("system");
      expect(result).toHaveProperty("cpu");
      expect(result).toHaveProperty("memory");
      expect(result).toHaveProperty("disk");
      expect(result).toHaveProperty("network");
      expect(result).toHaveProperty("gpu");
      
      expect(result.system).toHaveProperty("hostname");
      expect(result.system).toHaveProperty("cpuCount");
      expect(result.system).toHaveProperty("uptime");
      
      expect(result.cpu).toHaveProperty("usage");
      expect(result.cpu).toHaveProperty("loadAverage");
      
      expect(result.memory).toHaveProperty("total");
      expect(result.memory).toHaveProperty("used");
      expect(result.memory).toHaveProperty("free");
      expect(result.memory).toHaveProperty("usagePercent");
    });
  });

  describe("getDgxSparkMetrics", () => {
    it("should return simulated DGX Spark metrics", async () => {
      const caller = hardwareRouter.createCaller({} as any);
      const result = await caller.getDgxSparkMetrics();
      
      expect(result).toHaveProperty("node");
      expect(result.node).toContain("DGX Spark");
      expect(result).toHaveProperty("status", "simulated");
      expect(result).toHaveProperty("cpu");
      expect(result).toHaveProperty("memory");
      expect(result).toHaveProperty("gpu");
      expect(result).toHaveProperty("storage");
      
      expect(result.gpu.model).toContain("A100");
      expect(result.gpu.count).toBe(8);
    });
  });

  describe("getJetsonThorMetrics", () => {
    it("should return simulated Jetson Thor metrics", async () => {
      const caller = hardwareRouter.createCaller({} as any);
      const result = await caller.getJetsonThorMetrics();
      
      expect(result).toHaveProperty("node");
      expect(result.node).toContain("Jetson Thor");
      expect(result).toHaveProperty("status", "simulated");
      expect(result).toHaveProperty("soc");
      expect(result).toHaveProperty("memory");
      expect(result).toHaveProperty("gpu");
      expect(result).toHaveProperty("latency");
      expect(result).toHaveProperty("camera");
      
      expect(result.latency).toHaveProperty("reflexLoop");
      expect(result.camera.status).toBe("active");
    });
  });

  describe("getInfrastructureMetrics", () => {
    it("should return simulated infrastructure metrics", async () => {
      const caller = hardwareRouter.createCaller({} as any);
      const result = await caller.getInfrastructureMetrics();
      
      expect(result).toHaveProperty("ups");
      expect(result).toHaveProperty("network");
      expect(result).toHaveProperty("storage");
      
      expect(result.ups).toHaveProperty("status", "online");
      expect(result.ups).toHaveProperty("batteryPercent");
      expect(result.ups.batteryPercent).toBeGreaterThanOrEqual(90);
      
      expect(result.network.firewall).toHaveProperty("status", "active");
      expect(result.storage.nas).toHaveProperty("raidStatus");
    });
  });
});
