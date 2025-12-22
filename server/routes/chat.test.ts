import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the LLM router
vi.mock("../_core/llmRouter", () => ({
  routeLLMRequest: vi.fn(),
}));

// Mock the legacy LLM
vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

// Mock the N2 client
vi.mock("../_core/n2Client", () => ({
  chatWithN2: vi.fn(),
  getN2ClientStatus: vi.fn(() => ({ enabled: false, available: false })),
}));

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn(() => Promise.resolve(null)),
}));

import { routeLLMRequest } from "../_core/llmRouter";

describe("Chat Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendMessage", () => {
    it("should return a response from the LLM", async () => {
      vi.mocked(routeLLMRequest).mockResolvedValue({
        id: "test-id",
        created: Date.now(),
        model: "gemini-2.5-flash",
        choices: [{
          index: 0,
          message: {
            role: "assistant",
            content: "Bonjour ! Je suis Jarvis.",
          },
          finish_reason: "stop",
        }],
      });
      
      const { chatRouter } = await import("./chat");
      const caller = chatRouter.createCaller({ user: null } as any);
      
      const result = await caller.sendMessage({
        message: "Bonjour",
        sessionId: "test-session-llm",
      });
      
      expect(result.success).toBe(true);
      expect(result.response).toBe("Bonjour ! Je suis Jarvis.");
      expect(routeLLMRequest).toHaveBeenCalled();
    });

    it("should return error response when LLM fails", async () => {
      vi.mocked(routeLLMRequest).mockRejectedValue(new Error("LLM Error"));
      
      const { chatRouter } = await import("./chat");
      const caller = chatRouter.createCaller({ user: null } as any);
      
      const result = await caller.sendMessage({
        message: "Test",
        sessionId: "test-session-error-new",
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe("LLM Error");
    });
  });

  describe("clearHistory", () => {
    it("should clear conversation history", async () => {
      const { chatRouter } = await import("./chat");
      const caller = chatRouter.createCaller({ user: null } as any);
      
      const result = await caller.clearHistory({ sessionId: "test-session" });
      
      expect(result.success).toBe(true);
    });
  });

  describe("getHistory", () => {
    it("should return empty array for new session", async () => {
      const { chatRouter } = await import("./chat");
      const caller = chatRouter.createCaller({ user: null } as any);
      
      const result = await caller.getHistory({ sessionId: "new-session" });
      
      expect(result).toEqual([]);
    });
  });
});
