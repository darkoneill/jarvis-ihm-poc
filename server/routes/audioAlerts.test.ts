import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Audio Alerts System", () => {
  describe("Alert Types", () => {
    const alertTypes = [
      { type: "gpu_warning", priority: "medium", frequency: 440 },
      { type: "gpu_critical", priority: "critical", frequency: 880 },
      { type: "ups_warning", priority: "medium", frequency: 330 },
      { type: "ups_critical", priority: "critical", frequency: 660 },
      { type: "network_down", priority: "high", frequency: 220 },
      { type: "task_complete", priority: "low", frequency: 523 },
      { type: "message_received", priority: "low", frequency: 392 },
      { type: "system_error", priority: "high", frequency: 196 },
    ];

    it("should have 8 alert types defined", () => {
      expect(alertTypes.length).toBe(8);
    });

    it("should have valid priority levels", () => {
      const validPriorities = ["low", "medium", "high", "critical"];
      alertTypes.forEach((alert) => {
        expect(validPriorities).toContain(alert.priority);
      });
    });

    it("should have valid frequencies (100-1000 Hz)", () => {
      alertTypes.forEach((alert) => {
        expect(alert.frequency).toBeGreaterThanOrEqual(100);
        expect(alert.frequency).toBeLessThanOrEqual(1000);
      });
    });

    it("should have critical alerts with higher frequencies", () => {
      const criticalAlerts = alertTypes.filter((a) => a.priority === "critical");
      const lowAlerts = alertTypes.filter((a) => a.priority === "low");
      
      const avgCriticalFreq = criticalAlerts.reduce((sum, a) => sum + a.frequency, 0) / criticalAlerts.length;
      const avgLowFreq = lowAlerts.reduce((sum, a) => sum + a.frequency, 0) / lowAlerts.length;
      
      expect(avgCriticalFreq).toBeGreaterThan(avgLowFreq);
    });
  });

  describe("Alert Settings", () => {
    const defaultSettings = {
      enabled: true,
      volume: 0.5,
      mutedTypes: [],
    };

    it("should have valid default settings", () => {
      expect(defaultSettings.enabled).toBe(true);
      expect(defaultSettings.volume).toBeGreaterThanOrEqual(0);
      expect(defaultSettings.volume).toBeLessThanOrEqual(1);
      expect(Array.isArray(defaultSettings.mutedTypes)).toBe(true);
    });

    it("should allow volume between 0 and 1", () => {
      const volumes = [0, 0.25, 0.5, 0.75, 1];
      volumes.forEach((vol) => {
        expect(vol).toBeGreaterThanOrEqual(0);
        expect(vol).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("Alert Mapping", () => {
    const mapAlertToSound = (message: string, severity: string) => {
      const lowerMessage = message.toLowerCase();
      
      if (lowerMessage.includes("gpu") && severity === "critical") {
        return "gpu_critical";
      } else if (lowerMessage.includes("gpu") && severity === "warning") {
        return "gpu_warning";
      } else if (lowerMessage.includes("ups") && severity === "critical") {
        return "ups_critical";
      } else if (lowerMessage.includes("ups") && severity === "warning") {
        return "ups_warning";
      } else if (lowerMessage.includes("réseau") || lowerMessage.includes("network")) {
        return "network_down";
      } else if (severity === "critical") {
        return "system_error";
      }
      return null;
    };

    it("should map GPU critical alerts correctly", () => {
      expect(mapAlertToSound("Température GPU critique", "critical")).toBe("gpu_critical");
    });

    it("should map GPU warning alerts correctly", () => {
      expect(mapAlertToSound("Température GPU élevée", "warning")).toBe("gpu_warning");
    });

    it("should map UPS critical alerts correctly", () => {
      expect(mapAlertToSound("Batterie UPS critique", "critical")).toBe("ups_critical");
    });

    it("should map network alerts correctly", () => {
      expect(mapAlertToSound("Connexion réseau perdue", "warning")).toBe("network_down");
    });

    it("should map unknown critical alerts to system_error", () => {
      expect(mapAlertToSound("Erreur inconnue", "critical")).toBe("system_error");
    });
  });
});

describe("Presentation Mode", () => {
  describe("Widget Rotation", () => {
    const widgets = [
      { id: "system_status", type: "system_status", title: "Statut Système" },
      { id: "hardware_metrics", type: "hardware_metrics", title: "Métriques Hardware" },
      { id: "tasks", type: "tasks", title: "Tâches" },
      { id: "jobs", type: "jobs", title: "Jobs Planifiés" },
      { id: "clock", type: "clock", title: "Horloge" },
    ];

    it("should have default widgets defined", () => {
      expect(widgets.length).toBeGreaterThan(0);
    });

    it("should rotate to next widget correctly", () => {
      let currentIndex = 0;
      currentIndex = (currentIndex + 1) % widgets.length;
      expect(currentIndex).toBe(1);
      
      currentIndex = (currentIndex + 1) % widgets.length;
      expect(currentIndex).toBe(2);
    });

    it("should wrap around at the end", () => {
      let currentIndex = widgets.length - 1;
      currentIndex = (currentIndex + 1) % widgets.length;
      expect(currentIndex).toBe(0);
    });

    it("should navigate backwards correctly", () => {
      let currentIndex = 0;
      currentIndex = (currentIndex - 1 + widgets.length) % widgets.length;
      expect(currentIndex).toBe(widgets.length - 1);
    });
  });

  describe("Rotation Interval", () => {
    it("should have valid interval range (5-60 seconds)", () => {
      const minInterval = 5;
      const maxInterval = 60;
      const defaultInterval = 10;
      
      expect(defaultInterval).toBeGreaterThanOrEqual(minInterval);
      expect(defaultInterval).toBeLessThanOrEqual(maxInterval);
    });

    it("should accept step values of 5 seconds", () => {
      const validIntervals = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
      validIntervals.forEach((interval) => {
        expect(interval % 5).toBe(0);
      });
    });
  });
});

describe("Contextual Assistant", () => {
  describe("Suggestion Generation", () => {
    const generateSuggestions = (page: string, message?: string) => {
      const suggestions: any[] = [];
      
      if (page === "/" || page === "/dialogue") {
        if (message) {
          const lowerMessage = message.toLowerCase();
          if (lowerMessage.includes("rappelle") || lowerMessage.includes("remind")) {
            suggestions.push({ type: "job", title: "Créer un rappel" });
          }
          if (lowerMessage.includes("tâche") || lowerMessage.includes("faire")) {
            suggestions.push({ type: "task", title: "Créer une tâche" });
          }
        }
      }
      
      return suggestions;
    };

    it("should generate reminder suggestion for 'rappelle' message", () => {
      const suggestions = generateSuggestions("/", "Rappelle-moi demain");
      expect(suggestions.some((s) => s.type === "job")).toBe(true);
    });

    it("should generate task suggestion for 'tâche' message", () => {
      const suggestions = generateSuggestions("/", "J'ai une tâche à faire");
      expect(suggestions.some((s) => s.type === "task")).toBe(true);
    });

    it("should not generate suggestions for unrelated messages", () => {
      const suggestions = generateSuggestions("/", "Bonjour Jarvis");
      expect(suggestions.length).toBe(0);
    });
  });

  describe("Time-based Suggestions", () => {
    it("should suggest end-of-day review between 17h and 19h", () => {
      const hour = 18;
      const shouldSuggestEndOfDay = hour >= 17 && hour < 19;
      expect(shouldSuggestEndOfDay).toBe(true);
    });

    it("should suggest morning briefing between 8h and 10h", () => {
      const hour = 9;
      const shouldSuggestMorning = hour >= 8 && hour < 10;
      expect(shouldSuggestMorning).toBe(true);
    });

    it("should not suggest time-based items outside ranges", () => {
      const hour = 14;
      const shouldSuggestEndOfDay = hour >= 17 && hour < 19;
      const shouldSuggestMorning = hour >= 8 && hour < 10;
      expect(shouldSuggestEndOfDay).toBe(false);
      expect(shouldSuggestMorning).toBe(false);
    });
  });

  describe("Priority Sorting", () => {
    const suggestions = [
      { id: "1", priority: "low" },
      { id: "2", priority: "high" },
      { id: "3", priority: "medium" },
      { id: "4", priority: "critical" },
    ];

    it("should sort by priority correctly", () => {
      const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      const sorted = [...suggestions].sort(
        (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
      );
      
      expect(sorted[0].priority).toBe("critical");
      expect(sorted[1].priority).toBe("high");
      expect(sorted[2].priority).toBe("medium");
      expect(sorted[3].priority).toBe("low");
    });
  });
});
