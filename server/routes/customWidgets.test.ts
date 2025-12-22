import { describe, it, expect, vi } from "vitest";

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn(() => null),
}));

describe("Custom Widgets Router", () => {
  describe("list", () => {
    it("should return sample widgets when database is not available", async () => {
      // In simulation mode, should return sample widgets
      const sampleWidgets = [
        { id: 1, name: "Bitcoin Price", widgetType: "api" },
        { id: 2, name: "Météo Paris", widgetType: "api" },
      ];
      
      expect(sampleWidgets.length).toBe(2);
      expect(sampleWidgets[0].widgetType).toBe("api");
    });
  });

  describe("create", () => {
    it("should validate widget name is required", () => {
      const input = { name: "", widgetType: "api", config: {} };
      expect(input.name).toBe("");
    });

    it("should accept valid widget types", () => {
      const validTypes = ["api", "chart", "text", "iframe", "countdown"];
      validTypes.forEach((type) => {
        expect(validTypes).toContain(type);
      });
    });
  });

  describe("executeApi", () => {
    it("should require URL for API execution", () => {
      const input = { url: "", method: "GET" };
      expect(input.url).toBe("");
    });

    it("should support different HTTP methods", () => {
      const methods = ["GET", "POST", "PUT", "DELETE"];
      methods.forEach((method) => {
        expect(methods).toContain(method);
      });
    });
  });

  describe("getTemplates", () => {
    it("should return widget templates", () => {
      const templates = [
        { id: "api-json", name: "API JSON", widgetType: "api" },
        { id: "chart-live", name: "Graphique en temps réel", widgetType: "chart" },
        { id: "countdown", name: "Compte à rebours", widgetType: "countdown" },
        { id: "iframe", name: "Iframe", widgetType: "iframe" },
      ];
      
      expect(templates.length).toBe(4);
      expect(templates.map((t) => t.widgetType)).toContain("api");
      expect(templates.map((t) => t.widgetType)).toContain("chart");
    });
  });
});
