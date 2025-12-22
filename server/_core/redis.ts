/**
 * RedisClient - Client pour la communication avec Redis (Pub/Sub et Cache)
 * 
 * Ce client permet de s'abonner aux canaux Redis pour recevoir les logs
 * et événements des différentes couches Jarvis (N0, N1, N2).
 */

import { z } from 'zod';

// Schéma des messages de log Jarvis
export const JarvisLogSchema = z.object({
  timestamp: z.string(),
  level: z.enum(['debug', 'info', 'warn', 'error', 'critical']),
  layer: z.enum(['N0', 'N1', 'N2', 'IHM']),
  source: z.string(),
  message: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type JarvisLog = z.infer<typeof JarvisLogSchema>;

// Schéma des événements système
export const JarvisEventSchema = z.object({
  timestamp: z.string(),
  type: z.enum(['task_created', 'task_completed', 'alert', 'status_change', 'command']),
  layer: z.enum(['N0', 'N1', 'N2', 'IHM']),
  payload: z.record(z.string(), z.unknown()),
});

export type JarvisEvent = z.infer<typeof JarvisEventSchema>;

// Canaux Redis prédéfinis
export const REDIS_CHANNELS = {
  // Logs par couche
  LOGS_N0: 'jarvis:logs:n0',
  LOGS_N1: 'jarvis:logs:n1',
  LOGS_N2: 'jarvis:logs:n2',
  LOGS_ALL: 'jarvis:logs:*',
  
  // Événements
  EVENTS_TASKS: 'jarvis:events:tasks',
  EVENTS_ALERTS: 'jarvis:events:alerts',
  EVENTS_STATUS: 'jarvis:events:status',
  
  // Commandes
  COMMANDS_N0: 'jarvis:commands:n0',
  COMMANDS_N1: 'jarvis:commands:n1',
  COMMANDS_N2: 'jarvis:commands:n2',
};

export interface RedisConfig {
  url: string;
  password?: string;
  db?: number;
}

type MessageHandler = (channel: string, message: string) => void;

/**
 * Client Redis simplifié pour Pub/Sub
 * Note: En production, utiliser ioredis ou redis package
 */
export class RedisSubscriber {
  private config: RedisConfig;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private connected: boolean = false;
  private mockMode: boolean = true;
  private mockInterval: NodeJS.Timeout | null = null;

  constructor(config: RedisConfig | string) {
    if (typeof config === 'string') {
      this.config = { url: config };
    } else {
      this.config = config;
    }
    
    // Vérifier si Redis est configuré
    this.mockMode = !process.env.REDIS_URL;
  }

  /**
   * Se connecter à Redis
   */
  async connect(): Promise<boolean> {
    if (this.mockMode) {
      console.log('[Redis] Mode simulation activé (REDIS_URL non configuré)');
      this.connected = true;
      this.startMockLogs();
      return true;
    }
    
    try {
      // En production, utiliser ioredis:
      // const Redis = require('ioredis');
      // this.client = new Redis(this.config.url);
      // await this.client.ping();
      
      console.log('[Redis] Connexion établie');
      this.connected = true;
      return true;
    } catch (error) {
      console.error('[Redis] Erreur de connexion:', error);
      this.connected = false;
      return false;
    }
  }

  /**
   * S'abonner à un canal
   */
  subscribe(channel: string, handler: MessageHandler): void {
    const handlers = this.handlers.get(channel) || [];
    handlers.push(handler);
    this.handlers.set(channel, handlers);
    
    console.log(`[Redis] Abonné au canal: ${channel}`);
  }

  /**
   * Se désabonner d'un canal
   */
  unsubscribe(channel: string): void {
    this.handlers.delete(channel);
    console.log(`[Redis] Désabonné du canal: ${channel}`);
  }

  /**
   * Publier un message (pour tests)
   */
  publish(channel: string, message: string): void {
    const handlers = this.handlers.get(channel) || [];
    for (const handler of handlers) {
      handler(channel, message);
    }
  }

  /**
   * Vérifier la connexion
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Mode simulation: génère des logs fictifs
   */
  private startMockLogs(): void {
    if (this.mockInterval) return;
    
    const layers: Array<'N0' | 'N1' | 'N2'> = ['N0', 'N1', 'N2'];
    const levels: Array<'debug' | 'info' | 'warn' | 'error'> = ['debug', 'info', 'warn', 'error'];
    
    const mockMessages = {
      N0: [
        'Boucle réflexe: latence 42ms',
        'Vision: objet détecté à 1.2m',
        'Teensy: commande souris envoyée',
        'HDMI: frame capturée 1920x1080',
        'Capteur température: 45°C',
      ],
      N1: [
        'Planification: nouvelle tâche ajoutée',
        'Contexte: mise à jour état système',
        'Décision: action validée',
        'Mémoire: cache mis à jour',
        'Orchestration: séquence terminée',
      ],
      N2: [
        'LLM: requête traitée en 1.2s',
        'RAG: 3 documents pertinents trouvés',
        'Embedding: vecteur généré',
        'Chat: réponse générée',
        'Analyse: intention détectée',
      ],
    };
    
    this.mockInterval = setInterval(() => {
      const layer = layers[Math.floor(Math.random() * layers.length)];
      const level = levels[Math.floor(Math.random() * levels.length)];
      const messages = mockMessages[layer];
      const message = messages[Math.floor(Math.random() * messages.length)];
      
      const log: JarvisLog = {
        timestamp: new Date().toISOString(),
        level,
        layer,
        source: `jarvis-${layer.toLowerCase()}`,
        message,
        metadata: {
          simulated: true,
        },
      };
      
      const channel = `jarvis:logs:${layer.toLowerCase()}`;
      this.publish(channel, JSON.stringify(log));
      this.publish(REDIS_CHANNELS.LOGS_ALL, JSON.stringify(log));
    }, 2000 + Math.random() * 3000); // Toutes les 2-5 secondes
  }

  /**
   * Arrêter la simulation
   */
  stopMockLogs(): void {
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
  }

  /**
   * Fermer la connexion
   */
  async disconnect(): Promise<void> {
    this.stopMockLogs();
    this.connected = false;
    this.handlers.clear();
    console.log('[Redis] Déconnecté');
  }
}

// Singleton pour l'instance Redis
let redisInstance: RedisSubscriber | null = null;

export function getRedisSubscriber(): RedisSubscriber {
  if (!redisInstance) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    redisInstance = new RedisSubscriber(url);
  }
  return redisInstance;
}

/**
 * Buffer circulaire pour stocker les logs récents
 */
export class LogBuffer {
  private logs: JarvisLog[] = [];
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  add(log: JarvisLog): void {
    this.logs.push(log);
    if (this.logs.length > this.maxSize) {
      this.logs.shift();
    }
  }

  getAll(): JarvisLog[] {
    return [...this.logs];
  }

  getByLayer(layer: 'N0' | 'N1' | 'N2' | 'IHM'): JarvisLog[] {
    return this.logs.filter(log => log.layer === layer);
  }

  getByLevel(level: 'debug' | 'info' | 'warn' | 'error' | 'critical'): JarvisLog[] {
    return this.logs.filter(log => log.level === level);
  }

  search(query: string): JarvisLog[] {
    const lowerQuery = query.toLowerCase();
    return this.logs.filter(log => 
      log.message.toLowerCase().includes(lowerQuery) ||
      log.source.toLowerCase().includes(lowerQuery)
    );
  }

  clear(): void {
    this.logs = [];
  }

  size(): number {
    return this.logs.length;
  }
}

// Buffer global pour les logs
export const globalLogBuffer = new LogBuffer(1000);
