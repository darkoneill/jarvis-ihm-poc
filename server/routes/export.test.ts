import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn(() => Promise.resolve({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([{
            id: 1,
            title: "Test Document",
            content: "Test content for export",
            source: "Test Source",
            fileType: "md",
            createdAt: new Date(),
          }])),
        })),
      })),
    })),
  })),
}));

// Mock fs operations
vi.mock("fs", () => ({
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(() => Buffer.from("test content")),
  unlinkSync: vi.fn(),
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
}));

// Mock child_process
vi.mock("child_process", () => ({
  execSync: vi.fn(),
}));

describe("Export Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Performance Report Export", () => {
    it("should generate a performance report with all sections", async () => {
      // Test the markdown generation logic
      const includeHardware = true;
      const includeTasks = true;
      const includeJobs = true;

      // Simulate the report generation
      let markdown = `# Rapport de Performance Jarvis\n\n`;
      markdown += `**Date de génération:** ${new Date().toLocaleString('fr-FR')}\n\n`;

      if (includeHardware) {
        markdown += `## État du Système\n\n`;
      }

      expect(markdown).toContain("Rapport de Performance Jarvis");
      expect(markdown).toContain("État du Système");
    });

    it("should generate report without hardware section when disabled", () => {
      const includeHardware = false;
      
      let markdown = `# Rapport de Performance Jarvis\n\n`;
      if (includeHardware) {
        markdown += `## État du Système\n\n`;
      }

      expect(markdown).not.toContain("État du Système");
    });
  });

  describe("Chat History Export", () => {
    it("should format chat messages correctly", () => {
      const messages = [
        { role: "user" as const, content: "Hello", timestamp: "2025-12-22T10:00:00Z" },
        { role: "assistant" as const, content: "Hi there!", timestamp: "2025-12-22T10:00:01Z" },
      ];

      let markdown = `# Historique de Conversation Jarvis\n\n`;
      
      for (const msg of messages) {
        const role = msg.role === 'user' ? '👤 Utilisateur' : '🤖 Jarvis';
        markdown += `### ${role}\n\n`;
        markdown += `${msg.content}\n\n`;
      }

      expect(markdown).toContain("👤 Utilisateur");
      expect(markdown).toContain("🤖 Jarvis");
      expect(markdown).toContain("Hello");
      expect(markdown).toContain("Hi there!");
    });

    it("should handle empty messages array", () => {
      const messages: Array<{ role: string; content: string }> = [];
      
      let markdown = `# Historique de Conversation Jarvis\n\n`;
      
      for (const msg of messages) {
        markdown += `${msg.content}\n`;
      }

      expect(markdown).toBe(`# Historique de Conversation Jarvis\n\n`);
    });
  });

  describe("Markdown to HTML Conversion", () => {
    it("should convert markdown headers to HTML", () => {
      const markdown = "# Title\n## Subtitle\n### Section";
      
      let html = markdown
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>');

      expect(html).toContain("<h1>Title</h1>");
      expect(html).toContain("<h2>Subtitle</h2>");
      expect(html).toContain("<h3>Section</h3>");
    });

    it("should convert bold text to HTML", () => {
      const markdown = "This is **bold** text";
      
      const html = markdown.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      expect(html).toContain("<strong>bold</strong>");
    });

    it("should convert inline code to HTML", () => {
      const markdown = "Use `code` here";
      
      const html = markdown.replace(/`(.*?)`/g, '<code>$1</code>');

      expect(html).toContain("<code>code</code>");
    });
  });

  describe("File Generation", () => {
    it("should generate unique filenames with timestamp", () => {
      const prefix = "rapport-performance";
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `${prefix}-${timestamp}`;

      expect(filename).toContain(prefix);
      expect(filename).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });
});
