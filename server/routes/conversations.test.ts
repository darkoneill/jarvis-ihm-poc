import { describe, it, expect, vi } from "vitest";

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn(() => null),
}));

describe("Conversations Router", () => {
  describe("list", () => {
    it("should return mock conversations when db is not available", async () => {
      const { conversationsRouter } = await import("./conversations");
      const caller = conversationsRouter.createCaller({ user: null } as any);
      
      const result = await caller.list();
      
      expect(result).toHaveProperty("conversations");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("isSimulation");
      expect(result.isSimulation).toBe(true);
      expect(Array.isArray(result.conversations)).toBe(true);
    });

    it("should include conversation properties", async () => {
      const { conversationsRouter } = await import("./conversations");
      const caller = conversationsRouter.createCaller({ user: null } as any);
      
      const result = await caller.list();
      
      if (result.conversations.length > 0) {
        const conv = result.conversations[0];
        expect(conv).toHaveProperty("id");
        expect(conv).toHaveProperty("title");
        expect(conv).toHaveProperty("messageCount");
        expect(conv).toHaveProperty("archived");
      }
    });
  });

  describe("get", () => {
    it("should return a single conversation with messages", async () => {
      const { conversationsRouter } = await import("./conversations");
      const caller = conversationsRouter.createCaller({ user: null } as any);
      
      const result = await caller.get({ id: 1 });
      
      expect(result).toHaveProperty("conversation");
      expect(result).toHaveProperty("messages");
      expect(result).toHaveProperty("isSimulation");
      expect(result.isSimulation).toBe(true);
    });

    it("should include message properties", async () => {
      const { conversationsRouter } = await import("./conversations");
      const caller = conversationsRouter.createCaller({ user: null } as any);
      
      const result = await caller.get({ id: 1 });
      
      if (result.messages.length > 0) {
        const msg = result.messages[0];
        expect(msg).toHaveProperty("id");
        expect(msg).toHaveProperty("role");
        expect(msg).toHaveProperty("content");
        expect(msg).toHaveProperty("createdAt");
      }
    });
  });

  describe("create", () => {
    it("should create a new conversation in simulation mode", async () => {
      const { conversationsRouter } = await import("./conversations");
      const caller = conversationsRouter.createCaller({ user: null } as any);
      
      const result = await caller.create({ title: "Test Conversation" });
      
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("title");
      expect(result.title).toBe("Test Conversation");
      expect(result).toHaveProperty("isSimulation");
      expect(result.isSimulation).toBe(true);
    });
  });

  describe("addMessage", () => {
    it("should add a message in simulation mode", async () => {
      const { conversationsRouter } = await import("./conversations");
      const caller = conversationsRouter.createCaller({ user: null } as any);
      
      const result = await caller.addMessage({
        conversationId: 1,
        role: "user",
        content: "Hello Jarvis!",
      });
      
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("conversationId");
      expect(result).toHaveProperty("role");
      expect(result.role).toBe("user");
      expect(result).toHaveProperty("content");
      expect(result.content).toBe("Hello Jarvis!");
      expect(result).toHaveProperty("isSimulation");
      expect(result.isSimulation).toBe(true);
    });
  });

  describe("update", () => {
    it("should update a conversation in simulation mode", async () => {
      const { conversationsRouter } = await import("./conversations");
      const caller = conversationsRouter.createCaller({ user: null } as any);
      
      const result = await caller.update({ id: 1, title: "Updated Title" });
      
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
      expect(result).toHaveProperty("isSimulation");
      expect(result.isSimulation).toBe(true);
    });
  });

  describe("delete", () => {
    it("should delete a conversation in simulation mode", async () => {
      const { conversationsRouter } = await import("./conversations");
      const caller = conversationsRouter.createCaller({ user: null } as any);
      
      const result = await caller.delete({ id: 1 });
      
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
      expect(result).toHaveProperty("isSimulation");
      expect(result.isSimulation).toBe(true);
    });
  });

  describe("search", () => {
    it("should search conversations in simulation mode", async () => {
      const { conversationsRouter } = await import("./conversations");
      const caller = conversationsRouter.createCaller({ user: null } as any);
      
      const result = await caller.search({ query: "test" });
      
      expect(result).toHaveProperty("results");
      expect(result).toHaveProperty("isSimulation");
      expect(result.isSimulation).toBe(true);
    });
  });

  describe("generateSummary", () => {
    it("should generate a summary in simulation mode", async () => {
      const { conversationsRouter } = await import("./conversations");
      const caller = conversationsRouter.createCaller({ user: null } as any);
      
      const result = await caller.generateSummary({ conversationId: 1 });
      
      expect(result).toHaveProperty("summary");
      expect(result).toHaveProperty("isSimulation");
      expect(result.isSimulation).toBe(true);
    });
  });

  describe("addTag", () => {
    it("should add a tag in simulation mode", async () => {
      const { conversationsRouter } = await import("./conversations");
      const caller = conversationsRouter.createCaller({ user: null } as any);
      
      const result = await caller.addTag({ conversationId: 1, tag: "backup" });
      
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
      expect(result).toHaveProperty("tags");
      expect(result.tags).toContain("backup");
      expect(result).toHaveProperty("isSimulation");
      expect(result.isSimulation).toBe(true);
    });
  });

  describe("removeTag", () => {
    it("should remove a tag in simulation mode", async () => {
      const { conversationsRouter } = await import("./conversations");
      const caller = conversationsRouter.createCaller({ user: null } as any);
      
      const result = await caller.removeTag({ conversationId: 1, tag: "backup" });
      
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
      expect(result).toHaveProperty("tags");
      expect(result).toHaveProperty("isSimulation");
      expect(result.isSimulation).toBe(true);
    });
  });

  describe("getAllTags", () => {
    it("should return all tags in simulation mode", async () => {
      const { conversationsRouter } = await import("./conversations");
      const caller = conversationsRouter.createCaller({ user: null } as any);
      
      const result = await caller.getAllTags();
      
      expect(result).toHaveProperty("tags");
      expect(Array.isArray(result.tags)).toBe(true);
      expect(result).toHaveProperty("isSimulation");
      expect(result.isSimulation).toBe(true);
    });
  });

  describe("importConversation", () => {
    it("should import a conversation in simulation mode", async () => {
      const { conversationsRouter } = await import("./conversations");
      const caller = conversationsRouter.createCaller({ user: null } as any);
      
      const result = await caller.importConversation({
        conversation: {
          title: "Imported Conversation",
          summary: "Test summary",
          tags: ["imported", "test"],
        },
        messages: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi there!" },
        ],
      });
      
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("title");
      expect(result.title).toBe("Imported Conversation");
      expect(result).toHaveProperty("messageCount");
      expect(result.messageCount).toBe(2);
      expect(result).toHaveProperty("isSimulation");
      expect(result.isSimulation).toBe(true);
    });
  });

  describe("generateTitle", () => {
    it("should generate a title from message content", async () => {
      const { conversationsRouter } = await import("./conversations");
      const caller = conversationsRouter.createCaller({ user: null } as any);
      
      const result = await caller.generateTitle({ content: "Comment configurer le système de backup ?" });
      
      expect(result).toHaveProperty("title");
      expect(result.title).toBe("Comment configurer le système de backup ?");
    });

    it("should remove greetings from the title", async () => {
      const { conversationsRouter } = await import("./conversations");
      const caller = conversationsRouter.createCaller({ user: null } as any);
      
      const result = await caller.generateTitle({ content: "Bonjour, je voudrais configurer le système" });
      
      expect(result).toHaveProperty("title");
      expect(result.title).toBe("Je voudrais configurer le système");
    });

    it("should truncate long titles", async () => {
      const { conversationsRouter } = await import("./conversations");
      const caller = conversationsRouter.createCaller({ user: null } as any);
      
      const longContent = "Ceci est un message très long qui dépasse largement les cinquante caractères autorisés pour un titre";
      const result = await caller.generateTitle({ content: longContent });
      
      expect(result).toHaveProperty("title");
      expect(result.title.length).toBeLessThanOrEqual(50);
      expect(result.title.endsWith("...")).toBe(true);
    });

    it("should capitalize first letter", async () => {
      const { conversationsRouter } = await import("./conversations");
      const caller = conversationsRouter.createCaller({ user: null } as any);
      
      const result = await caller.generateTitle({ content: "hello, comment ça va ?" });
      
      expect(result).toHaveProperty("title");
      expect(result.title.charAt(0)).toBe(result.title.charAt(0).toUpperCase());
    });
  });
});
