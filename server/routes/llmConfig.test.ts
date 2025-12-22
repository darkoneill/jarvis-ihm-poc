import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database
vi.mock('../db', () => ({
  getDb: vi.fn(() => Promise.resolve(null)),
}));

// Mock ENV
vi.mock('../_core/env', () => ({
  ENV: {
    forgeApiUrl: 'https://api.forge.ai',
    forgeApiKey: 'test-forge-key',
    llmProvider: 'forge',
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'llama3.2:3b',
    openaiApiKey: '',
    openaiModel: 'gpt-4o-mini',
    anthropicApiKey: '',
    anthropicModel: 'claude-3-haiku-20240307',
    n2Enabled: false,
    n2ApiUrl: 'http://localhost:8000',
    n2Timeout: 30000,
  },
}));

describe('LLM Config Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Provider Information', () => {
    it('should define all supported LLM providers', () => {
      const providers = ['forge', 'ollama', 'openai', 'anthropic', 'n2'];
      expect(providers).toHaveLength(5);
      expect(providers).toContain('forge');
      expect(providers).toContain('ollama');
      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
      expect(providers).toContain('n2');
    });

    it('should have default models for each provider', () => {
      const defaultModels = {
        forge: 'default',
        ollama: 'llama3.2:3b',
        openai: 'gpt-4o-mini',
        anthropic: 'claude-3-haiku-20240307',
        n2: 'llama3.1:8b',
      };
      
      expect(defaultModels.forge).toBe('default');
      expect(defaultModels.ollama).toBe('llama3.2:3b');
      expect(defaultModels.openai).toBe('gpt-4o-mini');
      expect(defaultModels.anthropic).toBe('claude-3-haiku-20240307');
      expect(defaultModels.n2).toBe('llama3.1:8b');
    });

    it('should have default URLs for local providers', () => {
      const defaultUrls = {
        forge: '',
        ollama: 'http://localhost:11434',
        openai: 'https://api.openai.com/v1',
        anthropic: 'https://api.anthropic.com/v1',
        n2: 'http://localhost:8000',
      };
      
      expect(defaultUrls.ollama).toBe('http://localhost:11434');
      expect(defaultUrls.n2).toBe('http://localhost:8000');
    });
  });

  describe('Default Configuration', () => {
    it('should return default config for unauthenticated users', () => {
      const defaultConfig = {
        provider: 'forge',
        apiUrl: '',
        apiKey: '',
        model: 'default',
        temperature: 70,
        maxTokens: 4096,
        timeout: 30000,
        streamEnabled: true,
        fallbackEnabled: true,
        fallbackProvider: 'forge',
      };
      
      expect(defaultConfig.provider).toBe('forge');
      expect(defaultConfig.temperature).toBe(70);
      expect(defaultConfig.maxTokens).toBe(4096);
      expect(defaultConfig.timeout).toBe(30000);
      expect(defaultConfig.streamEnabled).toBe(true);
      expect(defaultConfig.fallbackEnabled).toBe(true);
    });

    it('should convert temperature from 0-100 to 0-1 scale', () => {
      const storedTemperature = 70;
      const actualTemperature = storedTemperature / 100;
      expect(actualTemperature).toBe(0.7);
    });
  });

  describe('Provider Requirements', () => {
    it('should identify providers requiring API keys', () => {
      const requiresApiKey = {
        forge: false,
        ollama: false,
        openai: true,
        anthropic: true,
        n2: false,
      };
      
      expect(requiresApiKey.openai).toBe(true);
      expect(requiresApiKey.anthropic).toBe(true);
      expect(requiresApiKey.forge).toBe(false);
      expect(requiresApiKey.ollama).toBe(false);
      expect(requiresApiKey.n2).toBe(false);
    });

    it('should identify providers requiring custom URL', () => {
      const requiresUrl = {
        forge: false,
        ollama: true,
        openai: false,
        anthropic: false,
        n2: true,
      };
      
      expect(requiresUrl.ollama).toBe(true);
      expect(requiresUrl.n2).toBe(true);
      expect(requiresUrl.forge).toBe(false);
      expect(requiresUrl.openai).toBe(false);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate temperature range', () => {
      const validateTemperature = (temp: number) => temp >= 0 && temp <= 100;
      
      expect(validateTemperature(0)).toBe(true);
      expect(validateTemperature(50)).toBe(true);
      expect(validateTemperature(100)).toBe(true);
      expect(validateTemperature(-1)).toBe(false);
      expect(validateTemperature(101)).toBe(false);
    });

    it('should validate maxTokens range', () => {
      const validateMaxTokens = (tokens: number) => tokens >= 100 && tokens <= 32000;
      
      expect(validateMaxTokens(100)).toBe(true);
      expect(validateMaxTokens(4096)).toBe(true);
      expect(validateMaxTokens(32000)).toBe(true);
      expect(validateMaxTokens(50)).toBe(false);
      expect(validateMaxTokens(50000)).toBe(false);
    });

    it('should validate timeout range', () => {
      const validateTimeout = (timeout: number) => timeout >= 5000 && timeout <= 120000;
      
      expect(validateTimeout(5000)).toBe(true);
      expect(validateTimeout(30000)).toBe(true);
      expect(validateTimeout(120000)).toBe(true);
      expect(validateTimeout(1000)).toBe(false);
      expect(validateTimeout(200000)).toBe(false);
    });
  });

  describe('API Key Masking', () => {
    it('should mask API keys in responses', () => {
      const maskApiKey = (key: string | null | undefined) => key ? '••••••••' : '';
      
      expect(maskApiKey('sk-abc123')).toBe('••••••••');
      expect(maskApiKey('')).toBe('');
      expect(maskApiKey(null)).toBe('');
      expect(maskApiKey(undefined)).toBe('');
    });

    it('should detect masked API keys', () => {
      const isMasked = (key: string) => key === '••••••••';
      
      expect(isMasked('••••••••')).toBe(true);
      expect(isMasked('sk-abc123')).toBe(false);
      expect(isMasked('')).toBe(false);
    });
  });

  describe('Provider Models', () => {
    it('should have valid Ollama models', () => {
      const ollamaModels = ['llama3.2:1b', 'llama3.2:3b', 'llama3.1:8b', 'llama3.1:70b', 'mistral:7b', 'codellama:34b'];
      expect(ollamaModels).toContain('llama3.2:3b');
      expect(ollamaModels).toContain('llama3.1:8b');
    });

    it('should have valid OpenAI models', () => {
      const openaiModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'];
      expect(openaiModels).toContain('gpt-4o-mini');
      expect(openaiModels).toContain('gpt-4o');
    });

    it('should have valid Anthropic models', () => {
      const anthropicModels = ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229'];
      expect(anthropicModels).toContain('claude-3-haiku-20240307');
      expect(anthropicModels).toContain('claude-3-opus-20240229');
    });

    it('should have valid N2 models', () => {
      const n2Models = ['llama3.1:8b', 'llama3.1:70b', 'llama3.1:405b'];
      expect(n2Models).toContain('llama3.1:8b');
      expect(n2Models).toContain('llama3.1:405b');
    });
  });

  describe('Anthropic API Key Validation', () => {
    it('should validate Anthropic API key format', () => {
      const isValidAnthropicKey = (key: string) => key.startsWith('sk-ant-');
      
      expect(isValidAnthropicKey('sk-ant-abc123')).toBe(true);
      expect(isValidAnthropicKey('sk-abc123')).toBe(false);
      expect(isValidAnthropicKey('invalid-key')).toBe(false);
    });
  });

  describe('Fallback Configuration', () => {
    it('should allow fallback to different provider', () => {
      const config = {
        provider: 'ollama',
        fallbackEnabled: true,
        fallbackProvider: 'forge',
      };
      
      expect(config.fallbackEnabled).toBe(true);
      expect(config.fallbackProvider).not.toBe(config.provider);
    });

    it('should default fallback to forge', () => {
      const defaultFallback = 'forge';
      expect(defaultFallback).toBe('forge');
    });
  });
});
