/**
 * N2 Supervisor API Client
 * 
 * Connects to the local Jarvis N2 Supervisor for LLM inference
 * instead of using the external Forge API.
 * 
 * N2 API Endpoints:
 * - POST /api/chat - Chat completion
 * - POST /api/task - Create task
 * - GET /api/status - System status
 * - GET /api/health - Health check
 */

// N2 Configuration
const N2_API_URL = process.env.N2_API_URL || 'http://localhost:8000';
const N2_API_KEY = process.env.N2_API_KEY || '';
const N2_ENABLED = process.env.N2_ENABLED === 'true';
const N2_TIMEOUT = parseInt(process.env.N2_TIMEOUT || '30000', 10);

// Response types
interface N2ChatResponse {
  success: boolean;
  message: string;
  trace_id: string;
  model: string;
  tokens_used: number;
  latency_ms: number;
  actions?: N2Action[];
}

interface N2Action {
  type: 'create_task' | 'schedule_job' | 'search_knowledge' | 'execute_command';
  payload: Record<string, unknown>;
  status: 'pending' | 'completed' | 'failed';
}

interface N2StatusResponse {
  status: 'online' | 'offline' | 'degraded';
  version: string;
  uptime_seconds: number;
  active_tasks: number;
  gpu_available: boolean;
  model_loaded: string;
}

interface N2HealthResponse {
  healthy: boolean;
  checks: {
    database: boolean;
    redis: boolean;
    llm: boolean;
    gpu: boolean;
  };
}

// Connection state
let isN2Available = false;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

/**
 * Check if N2 API is available
 */
export async function checkN2Health(): Promise<boolean> {
  if (!N2_ENABLED) {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${N2_API_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${N2_API_KEY}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data: N2HealthResponse = await response.json();
      isN2Available = data.healthy;
      lastHealthCheck = Date.now();
      return data.healthy;
    }

    isN2Available = false;
    return false;
  } catch (error) {
    console.error('[N2Client] Health check failed:', error);
    isN2Available = false;
    return false;
  }
}

/**
 * Get N2 system status
 */
export async function getN2Status(): Promise<N2StatusResponse | null> {
  if (!N2_ENABLED) {
    return null;
  }

  try {
    const response = await fetch(`${N2_API_URL}/api/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${N2_API_KEY}`,
      },
    });

    if (response.ok) {
      return await response.json();
    }

    return null;
  } catch (error) {
    console.error('[N2Client] Status check failed:', error);
    return null;
  }
}

/**
 * Send chat message to N2 Supervisor
 */
export async function chatWithN2(
  message: string,
  context?: {
    conversation_id?: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    system_prompt?: string;
  }
): Promise<N2ChatResponse | null> {
  // Check health if needed
  if (Date.now() - lastHealthCheck > HEALTH_CHECK_INTERVAL) {
    await checkN2Health();
  }

  if (!N2_ENABLED || !isN2Available) {
    console.log('[N2Client] N2 not available, falling back to Forge');
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), N2_TIMEOUT);

    const response = await fetch(`${N2_API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${N2_API_KEY}`,
      },
      body: JSON.stringify({
        message,
        conversation_id: context?.conversation_id,
        history: context?.history,
        system_prompt: context?.system_prompt || getJarvisSystemPrompt(),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data: N2ChatResponse = await response.json();
      console.log(`[N2Client] Response received (${data.latency_ms}ms, ${data.tokens_used} tokens)`);
      return data;
    }

    console.error('[N2Client] Chat request failed:', response.status);
    return null;
  } catch (error) {
    console.error('[N2Client] Chat error:', error);
    return null;
  }
}

/**
 * Stream chat response from N2 (Server-Sent Events)
 */
export async function* streamChatWithN2(
  message: string,
  context?: {
    conversation_id?: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    system_prompt?: string;
  }
): AsyncGenerator<string, void, unknown> {
  // Check health if needed
  if (Date.now() - lastHealthCheck > HEALTH_CHECK_INTERVAL) {
    await checkN2Health();
  }

  if (!N2_ENABLED || !isN2Available) {
    console.log('[N2Client] N2 not available for streaming');
    return;
  }

  try {
    const response = await fetch(`${N2_API_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${N2_API_KEY}`,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        message,
        conversation_id: context?.conversation_id,
        history: context?.history,
        system_prompt: context?.system_prompt || getJarvisSystemPrompt(),
      }),
    });

    if (!response.ok || !response.body) {
      console.error('[N2Client] Stream request failed:', response.status);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              yield parsed.content;
            }
          } catch {
            // Not JSON, yield raw content
            yield data;
          }
        }
      }
    }
  } catch (error) {
    console.error('[N2Client] Stream error:', error);
  }
}

/**
 * Get Jarvis system prompt
 */
function getJarvisSystemPrompt(): string {
  return `Tu es Jarvis, un assistant IA avancé qui pilote un PC physique.

CAPACITÉS:
- Vision: Acquisition HDMI (tu "vois" l'écran) + Caméra C2I
- Contrôle: Teensy pour clavier/souris
- Tu utilises les IHM/UI comme un humain le ferait

COMPORTEMENT:
- Réponds en français de manière concise et professionnelle
- Tu peux créer des tâches quand l'utilisateur dit "rappelle-moi de..." ou "ajoute une tâche..."
- Tu peux planifier des jobs quand l'utilisateur dit "planifie..." ou "programme..."
- Sois proactif et suggère des actions pertinentes

CONTEXTE SYSTÈME:
- Version: Jarvis v5.9
- Mode: Supervisor N2
- Statut: Opérationnel`;
}

/**
 * Get N2 client status
 */
export function getN2ClientStatus(): {
  enabled: boolean;
  available: boolean;
  url: string;
  lastHealthCheck: number;
} {
  return {
    enabled: N2_ENABLED,
    available: isN2Available,
    url: N2_API_URL,
    lastHealthCheck,
  };
}

/**
 * Initialize N2 client (check health on startup)
 */
export async function initN2Client(): Promise<void> {
  if (!N2_ENABLED) {
    console.log('[N2Client] Disabled - set N2_ENABLED=true to enable');
    return;
  }

  console.log(`[N2Client] Initializing connection to ${N2_API_URL}`);
  const healthy = await checkN2Health();
  
  if (healthy) {
    const status = await getN2Status();
    console.log(`[N2Client] Connected - Model: ${status?.model_loaded}, GPU: ${status?.gpu_available}`);
  } else {
    console.log('[N2Client] N2 not available, will use Forge fallback');
  }
}
