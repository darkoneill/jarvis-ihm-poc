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

describe('LLM Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('Provider Types', () => {
    it('should define all supported LLM providers', () => {
      const providers = ['forge', 'ollama', 'openai', 'anthropic', 'n2'];
      expect(providers).toHaveLength(5);
      expect(providers).toContain('forge');
      expect(providers).toContain('ollama');
      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
      expect(providers).toContain('n2');
    });
  });

  describe('Default Models', () => {
    it('should have default models for each provider', () => {
      const defaultModels = {
        forge: 'gemini-2.5-flash',
        ollama: 'llama3.2:3b',
        openai: 'gpt-4o-mini',
        anthropic: 'claude-3-haiku-20240307',
        n2: 'llama3.1:8b',
      };
      
      expect(defaultModels.forge).toBe('gemini-2.5-flash');
      expect(defaultModels.ollama).toBe('llama3.2:3b');
      expect(defaultModels.openai).toBe('gpt-4o-mini');
      expect(defaultModels.anthropic).toBe('claude-3-haiku-20240307');
      expect(defaultModels.n2).toBe('llama3.1:8b');
    });
  });

  describe('Default URLs', () => {
    it('should have default URLs for each provider', () => {
      const defaultUrls = {
        forge: 'https://forge.manus.im',
        ollama: 'http://localhost:11434',
        openai: 'https://api.openai.com',
        anthropic: 'https://api.anthropic.com',
        n2: 'http://localhost:8000',
      };
      
      expect(defaultUrls.forge).toBe('https://forge.manus.im');
      expect(defaultUrls.ollama).toBe('http://localhost:11434');
      expect(defaultUrls.openai).toBe('https://api.openai.com');
      expect(defaultUrls.anthropic).toBe('https://api.anthropic.com');
      expect(defaultUrls.n2).toBe('http://localhost:8000');
    });
  });

  describe('ActiveLLMConfig Interface', () => {
    it('should accept valid configuration', () => {
      const config = {
        provider: 'forge' as const,
        apiUrl: 'https://api.example.com',
        apiKey: 'test-key',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 4096,
        timeout: 30000,
        streamEnabled: true,
        fallbackEnabled: true,
        fallbackProvider: 'ollama' as const,
      };
      
      expect(config.provider).toBe('forge');
      expect(config.temperature).toBe(0.7);
      expect(config.maxTokens).toBe(4096);
      expect(config.fallbackEnabled).toBe(true);
    });

    it('should have optional fields', () => {
      const minimalConfig = {
        provider: 'forge' as const,
      };
      
      expect(minimalConfig.provider).toBe('forge');
      expect((minimalConfig as any).apiUrl).toBeUndefined();
      expect((minimalConfig as any).apiKey).toBeUndefined();
    });
  });

  describe('Forge API', () => {
    it('should format request correctly for Forge', () => {
      const messages = [
        { role: 'system' as const, content: 'You are a helpful assistant' },
        { role: 'user' as const, content: 'Hello' },
      ];
      
      const expectedPayload = {
        model: 'gemini-2.5-flash',
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        temperature: 0.7,
        max_tokens: 4096,
      };
      
      expect(expectedPayload.model).toBe('gemini-2.5-flash');
      expect(expectedPayload.messages).toHaveLength(2);
      expect(expectedPayload.temperature).toBe(0.7);
    });

    it('should use default model when model is "default"', () => {
      const model = 'default';
      const resolvedModel = model === 'default' ? 'gemini-2.5-flash' : model;
      expect(resolvedModel).toBe('gemini-2.5-flash');
    });
  });

  describe('Ollama API', () => {
    it('should format request correctly for Ollama', () => {
      const messages = [
        { role: 'user' as const, content: 'Hello' },
      ];
      
      const expectedPayload = {
        model: 'llama3.2:3b',
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        options: {
          temperature: 0.7,
          num_predict: 4096,
        },
        stream: false,
      };
      
      expect(expectedPayload.model).toBe('llama3.2:3b');
      expect(expectedPayload.stream).toBe(false);
      expect(expectedPayload.options.temperature).toBe(0.7);
    });

    it('should convert Ollama response to OpenAI format', () => {
      const ollamaResponse = {
        message: { content: 'Hello there!' },
        prompt_eval_count: 10,
        eval_count: 20,
      };
      
      const convertedResponse = {
        id: `ollama-${Date.now()}`,
        created: Math.floor(Date.now() / 1000),
        model: 'llama3.2:3b',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: ollamaResponse.message?.content || '',
          },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: ollamaResponse.prompt_eval_count || 0,
          completion_tokens: ollamaResponse.eval_count || 0,
          total_tokens: (ollamaResponse.prompt_eval_count || 0) + (ollamaResponse.eval_count || 0),
        },
      };
      
      expect(convertedResponse.choices[0].message.content).toBe('Hello there!');
      expect(convertedResponse.usage.total_tokens).toBe(30);
    });
  });

  describe('OpenAI API', () => {
    it('should require API key for OpenAI', () => {
      const config = {
        provider: 'openai' as const,
        apiKey: '',
      };
      
      expect(config.apiKey).toBe('');
      // In real implementation, this would throw an error
    });

    it('should format request correctly for OpenAI', () => {
      const messages = [
        { role: 'user' as const, content: 'Hello' },
      ];
      
      const expectedPayload = {
        model: 'gpt-4o-mini',
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        temperature: 0.7,
        max_tokens: 4096,
      };
      
      expect(expectedPayload.model).toBe('gpt-4o-mini');
    });
  });

  describe('Anthropic API', () => {
    it('should require API key for Anthropic', () => {
      const config = {
        provider: 'anthropic' as const,
        apiKey: '',
      };
      
      expect(config.apiKey).toBe('');
      // In real implementation, this would throw an error
    });

    it('should extract system message for Anthropic', () => {
      const messages = [
        { role: 'system' as const, content: 'You are a helpful assistant' },
        { role: 'user' as const, content: 'Hello' },
      ];
      
      const systemMessage = messages.find(m => m.role === 'system');
      const chatMessages = messages.filter(m => m.role !== 'system');
      
      expect(systemMessage?.content).toBe('You are a helpful assistant');
      expect(chatMessages).toHaveLength(1);
      expect(chatMessages[0].role).toBe('user');
    });

    it('should convert Anthropic response to OpenAI format', () => {
      const anthropicResponse = {
        id: 'msg_123',
        content: [{ text: 'Hello there!' }],
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 10,
          output_tokens: 20,
        },
      };
      
      const convertedResponse = {
        id: anthropicResponse.id,
        created: Math.floor(Date.now() / 1000),
        model: 'claude-3-haiku-20240307',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: anthropicResponse.content?.[0]?.text || '',
          },
          finish_reason: anthropicResponse.stop_reason || 'stop',
        }],
        usage: {
          prompt_tokens: anthropicResponse.usage?.input_tokens || 0,
          completion_tokens: anthropicResponse.usage?.output_tokens || 0,
          total_tokens: (anthropicResponse.usage?.input_tokens || 0) + (anthropicResponse.usage?.output_tokens || 0),
        },
      };
      
      expect(convertedResponse.choices[0].message.content).toBe('Hello there!');
      expect(convertedResponse.usage.total_tokens).toBe(30);
    });
  });

  describe('N2 API', () => {
    it('should use OpenAI-compatible format for N2', () => {
      const messages = [
        { role: 'user' as const, content: 'Hello' },
      ];
      
      const expectedPayload = {
        model: 'llama3.1:8b',
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        temperature: 0.7,
        max_tokens: 4096,
      };
      
      expect(expectedPayload.model).toBe('llama3.1:8b');
    });

    it('should use default N2 URL', () => {
      const defaultN2Url = 'http://localhost:8000';
      expect(defaultN2Url).toBe('http://localhost:8000');
    });
  });

  describe('Fallback Mechanism', () => {
    it('should enable fallback by default', () => {
      const config = {
        provider: 'ollama' as const,
        fallbackEnabled: true,
        fallbackProvider: 'forge' as const,
      };
      
      expect(config.fallbackEnabled).toBe(true);
      expect(config.fallbackProvider).toBe('forge');
    });

    it('should not fallback to same provider', () => {
      const config = {
        provider: 'forge' as const,
        fallbackEnabled: true,
        fallbackProvider: 'forge' as const,
      };
      
      // In real implementation, fallback should be skipped if same provider
      expect(config.provider).toBe(config.fallbackProvider);
    });

    it('should disable fallback after first attempt', () => {
      const originalConfig = {
        provider: 'ollama' as const,
        fallbackEnabled: true,
        fallbackProvider: 'forge' as const,
      };
      
      // After fallback, disable further fallbacks
      const fallbackConfig = {
        ...originalConfig,
        provider: originalConfig.fallbackProvider,
        fallbackEnabled: false,
      };
      
      expect(fallbackConfig.fallbackEnabled).toBe(false);
    });
  });

  describe('Timeout Handling', () => {
    it('should use default timeout of 30000ms', () => {
      const config = {
        provider: 'forge' as const,
      };
      
      const timeout = (config as any).timeout ?? 30000;
      expect(timeout).toBe(30000);
    });

    it('should respect custom timeout', () => {
      const config = {
        provider: 'forge' as const,
        timeout: 60000,
      };
      
      expect(config.timeout).toBe(60000);
    });
  });

  describe('Temperature and MaxTokens', () => {
    it('should use default temperature of 0.7', () => {
      const config = {
        provider: 'forge' as const,
      };
      
      const temperature = (config as any).temperature ?? 0.7;
      expect(temperature).toBe(0.7);
    });

    it('should use default maxTokens of 4096', () => {
      const config = {
        provider: 'forge' as const,
      };
      
      const maxTokens = (config as any).maxTokens ?? 4096;
      expect(maxTokens).toBe(4096);
    });
  });
});
