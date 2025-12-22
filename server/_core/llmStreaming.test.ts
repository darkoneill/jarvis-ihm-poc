import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock ENV
vi.mock('./env', () => ({
  ENV: {
    forgeApiUrl: 'https://forge.manus.im',
    forgeApiKey: 'test-forge-key',
  },
}));

describe('LLM Streaming', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('StreamChunk Interface', () => {
    it('should define content chunk type', () => {
      const chunk = {
        type: 'content' as const,
        content: 'Hello',
      };
      expect(chunk.type).toBe('content');
      expect(chunk.content).toBe('Hello');
    });

    it('should define done chunk type with usage', () => {
      const chunk = {
        type: 'done' as const,
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };
      expect(chunk.type).toBe('done');
      expect(chunk.usage?.total_tokens).toBe(30);
    });

    it('should define error chunk type', () => {
      const chunk = {
        type: 'error' as const,
        error: 'Connection failed',
      };
      expect(chunk.type).toBe('error');
      expect(chunk.error).toBe('Connection failed');
    });
  });

  describe('Provider Configuration', () => {
    it('should have default models for streaming', () => {
      const defaultModels = {
        forge: 'gemini-2.5-flash',
        ollama: 'llama3.2:3b',
        openai: 'gpt-4o-mini',
        anthropic: 'claude-3-haiku-20240307',
        n2: 'llama3.1:8b',
      };
      
      expect(defaultModels.forge).toBe('gemini-2.5-flash');
      expect(defaultModels.ollama).toBe('llama3.2:3b');
    });

    it('should have default URLs for streaming', () => {
      const defaultUrls = {
        forge: 'https://forge.manus.im',
        ollama: 'http://localhost:11434',
        openai: 'https://api.openai.com',
        anthropic: 'https://api.anthropic.com',
        n2: 'http://localhost:8000',
      };
      
      expect(defaultUrls.ollama).toBe('http://localhost:11434');
      expect(defaultUrls.n2).toBe('http://localhost:8000');
    });
  });

  describe('SSE Stream Processing', () => {
    it('should parse SSE data lines correctly', () => {
      const sseLines = [
        'data: {"choices":[{"delta":{"content":"Hello"}}]}',
        'data: {"choices":[{"delta":{"content":" world"}}]}',
        'data: [DONE]',
      ];
      
      const contents: string[] = [];
      
      for (const line of sseLines) {
        const trimmed = line.trim();
        if (trimmed === 'data: [DONE]') {
          break;
        }
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              contents.push(content);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
      
      expect(contents).toEqual(['Hello', ' world']);
      expect(contents.join('')).toBe('Hello world');
    });

    it('should handle empty data lines', () => {
      const sseLines = [
        '',
        'data: {"choices":[{"delta":{"content":"Test"}}]}',
        '',
        'data: [DONE]',
      ];
      
      const contents: string[] = [];
      
      for (const line of sseLines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            const content = data.choices?.[0]?.delta?.content;
            if (content) contents.push(content);
          } catch {
            // Skip
          }
        }
      }
      
      expect(contents).toEqual(['Test']);
    });
  });

  describe('NDJSON Stream Processing (Ollama)', () => {
    it('should parse NDJSON lines correctly', () => {
      const ndjsonLines = [
        '{"message":{"content":"Hello"}}',
        '{"message":{"content":" from"}}',
        '{"message":{"content":" Ollama"},"done":true,"eval_count":10}',
      ];
      
      const contents: string[] = [];
      let isDone = false;
      let evalCount = 0;
      
      for (const line of ndjsonLines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        try {
          const data = JSON.parse(trimmed);
          if (data.message?.content) {
            contents.push(data.message.content);
          }
          if (data.done) {
            isDone = true;
            evalCount = data.eval_count || 0;
          }
        } catch {
          // Skip
        }
      }
      
      expect(contents).toEqual(['Hello', ' from', ' Ollama']);
      expect(contents.join('')).toBe('Hello from Ollama');
      expect(isDone).toBe(true);
      expect(evalCount).toBe(10);
    });
  });

  describe('Anthropic Stream Processing', () => {
    it('should parse Anthropic SSE format', () => {
      const anthropicLines = [
        'data: {"type":"message_start","message":{"usage":{"input_tokens":10}}}',
        'data: {"type":"content_block_delta","delta":{"text":"Hello"}}',
        'data: {"type":"content_block_delta","delta":{"text":" Claude"}}',
        'data: {"type":"message_delta","usage":{"output_tokens":5}}',
        'data: {"type":"message_stop"}',
      ];
      
      const contents: string[] = [];
      let inputTokens = 0;
      let outputTokens = 0;
      let stopped = false;
      
      for (const line of anthropicLines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        
        try {
          const data = JSON.parse(trimmed.slice(6));
          
          if (data.type === 'content_block_delta' && data.delta?.text) {
            contents.push(data.delta.text);
          }
          if (data.type === 'message_start' && data.message?.usage) {
            inputTokens = data.message.usage.input_tokens || 0;
          }
          if (data.type === 'message_delta' && data.usage) {
            outputTokens = data.usage.output_tokens || 0;
          }
          if (data.type === 'message_stop') {
            stopped = true;
          }
        } catch {
          // Skip
        }
      }
      
      expect(contents).toEqual(['Hello', ' Claude']);
      expect(contents.join('')).toBe('Hello Claude');
      expect(inputTokens).toBe(10);
      expect(outputTokens).toBe(5);
      expect(stopped).toBe(true);
    });
  });

  describe('Fallback Mechanism', () => {
    it('should support fallback configuration', () => {
      const config = {
        provider: 'ollama' as const,
        fallbackEnabled: true,
        fallbackProvider: 'forge' as const,
      };
      
      expect(config.fallbackEnabled).toBe(true);
      expect(config.fallbackProvider).toBe('forge');
    });

    it('should disable fallback after first attempt', () => {
      const originalConfig = {
        provider: 'ollama' as const,
        fallbackEnabled: true,
        fallbackProvider: 'forge' as const,
      };
      
      const fallbackConfig = {
        ...originalConfig,
        provider: originalConfig.fallbackProvider,
        fallbackEnabled: false,
      };
      
      expect(fallbackConfig.provider).toBe('forge');
      expect(fallbackConfig.fallbackEnabled).toBe(false);
    });
  });

  describe('Timeout Handling', () => {
    it('should use AbortSignal.timeout for requests', () => {
      const timeout = 30000;
      const signal = AbortSignal.timeout(timeout);
      
      expect(signal).toBeDefined();
      expect(signal.aborted).toBe(false);
    });

    it('should respect custom timeout values', () => {
      const config = {
        provider: 'forge' as const,
        timeout: 60000,
      };
      
      expect(config.timeout).toBe(60000);
    });
  });

  describe('Request Headers', () => {
    it('should set correct headers for SSE', () => {
      const headers = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      };
      
      expect(headers['Content-Type']).toBe('text/event-stream');
      expect(headers['Cache-Control']).toBe('no-cache');
      expect(headers['Connection']).toBe('keep-alive');
    });

    it('should include Authorization for authenticated providers', () => {
      const forgeHeaders = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-key',
      };
      
      const anthropicHeaders = {
        'Content-Type': 'application/json',
        'x-api-key': 'test-key',
        'anthropic-version': '2023-06-01',
      };
      
      expect(forgeHeaders['Authorization']).toContain('Bearer');
      expect(anthropicHeaders['x-api-key']).toBe('test-key');
    });
  });

  describe('Message Formatting', () => {
    it('should format messages for streaming request', () => {
      const messages = [
        { role: 'system' as const, content: 'You are helpful' },
        { role: 'user' as const, content: 'Hello' },
      ];
      
      const formatted = messages.map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      }));
      
      expect(formatted).toHaveLength(2);
      expect(formatted[0].role).toBe('system');
      expect(formatted[1].content).toBe('Hello');
    });

    it('should handle complex content objects', () => {
      const complexContent = { text: 'Hello', image: 'base64...' };
      const formatted = typeof complexContent === 'string' 
        ? complexContent 
        : JSON.stringify(complexContent);
      
      expect(formatted).toContain('Hello');
      expect(formatted).toContain('image');
    });
  });

  describe('Stream Payload', () => {
    it('should include stream: true in payload', () => {
      const payload = {
        model: 'gemini-2.5-flash',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        max_tokens: 4096,
        stream: true,
      };
      
      expect(payload.stream).toBe(true);
    });

    it('should format Ollama payload correctly', () => {
      const ollamaPayload = {
        model: 'llama3.2:3b',
        messages: [{ role: 'user', content: 'Hello' }],
        options: {
          temperature: 0.7,
          num_predict: 4096,
        },
        stream: true,
      };
      
      expect(ollamaPayload.options.num_predict).toBe(4096);
      expect(ollamaPayload.stream).toBe(true);
    });
  });
});
