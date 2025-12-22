import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the LLM
vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { invokeLLM } from "../_core/llm";

describe("Chat Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendMessage", () => {
    it("should return a response from the LLM", async () => {
      vi.mocked(invokeLLM).mockResolvedValue({
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
      const caller = chatRouter.createCaller({} as any);
      
      const result = await caller.sendMessage({
        message: "Bonjour",
        sessionId: "test-session",
      });
      
      expect(result.success).toBe(true);
      expect(result.response).toBe("Bonjour ! Je suis Jarvis.");
      expect(invokeLLM).toHaveBeenCalled();
    });

    it("should return error response when LLM fails", async () => {
      vi.mocked(invokeLLM).mockRejectedValue(new Error("LLM Error"));
      
      const { chatRouter } = await import("./chat");
      const caller = chatRouter.createCaller({} as any);
      
      const result = await caller.sendMessage({
        message: "Test",
        sessionId: "test-session-error",
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe("LLM Error");
    });
  });

  describe("clearHistory", () => {
    it("should clear conversation history", async () => {
      const { chatRouter } = await import("./chat");
      const caller = chatRouter.createCaller({} as any);
      
      const result = await caller.clearHistory({ sessionId: "test-session" });
      
      expect(result.success).toBe(true);
    });
  });

  describe("getHistory", () => {
    it("should return empty array for new session", async () => {
      const { chatRouter } = await import("./chat");
      const caller = chatRouter.createCaller({} as any);
      
      const result = await caller.getHistory({ sessionId: "new-session" });
      
      expect(result).toEqual([]);
    });
  });
});
