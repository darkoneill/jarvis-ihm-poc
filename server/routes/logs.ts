import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getRedisSubscriber, globalLogBuffer, JarvisLogSchema, REDIS_CHANNELS, type JarvisLog } from "../_core/redis";

// Initialiser le subscriber Redis et commencer à collecter les logs
let redisInitialized = false;

async function initRedisLogs() {
  if (redisInitialized) return;
  
  const redis = getRedisSubscriber();
  await redis.connect();
  
  // S'abonner à tous les canaux de logs
  const handleLog = (_channel: string, message: string) => {
    try {
      const log = JarvisLogSchema.parse(JSON.parse(message));
      globalLogBuffer.add(log);
    } catch (error) {
      console.error('[Logs] Erreur parsing log:', error);
    }
  };
  
  redis.subscribe(REDIS_CHANNELS.LOGS_N0, handleLog);
  redis.subscribe(REDIS_CHANNELS.LOGS_N1, handleLog);
  redis.subscribe(REDIS_CHANNELS.LOGS_N2, handleLog);
  redis.subscribe(REDIS_CHANNELS.LOGS_ALL, handleLog);
  
  redisInitialized = true;
  console.log('[Logs] Redis subscriber initialisé');
}

// Initialiser au démarrage
initRedisLogs().catch(console.error);

export const logsRouter = router({
  // Récupérer les logs récents
  getRecent: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(500).default(100),
      layer: z.enum(['N0', 'N1', 'N2', 'IHM', 'all']).default('all'),
      level: z.enum(['debug', 'info', 'warn', 'error', 'critical', 'all']).default('all'),
    }).optional())
    .query(async ({ input }) => {
      const { limit = 100, layer = 'all', level = 'all' } = input || {};
      
      let logs = globalLogBuffer.getAll();
      
      // Filtrer par couche
      if (layer !== 'all') {
        logs = logs.filter(log => log.layer === layer);
      }
      
      // Filtrer par niveau
      if (level !== 'all') {
        logs = logs.filter(log => log.level === level);
      }
      
      // Trier par timestamp décroissant et limiter
      logs = logs
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
      
      return {
        logs,
        total: globalLogBuffer.size(),
        redisConnected: getRedisSubscriber().isConnected(),
      };
    }),

  // Rechercher dans les logs
  search: publicProcedure
    .input(z.object({
      query: z.string().min(1),
      limit: z.number().min(1).max(500).default(100),
    }))
    .query(async ({ input }) => {
      const { query, limit } = input;
      
      const logs = globalLogBuffer.search(query)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
      
      return {
        logs,
        query,
        total: logs.length,
      };
    }),

  // Statistiques des logs
  getStats: publicProcedure.query(async () => {
    const logs = globalLogBuffer.getAll();
    
    const byLayer = {
      N0: logs.filter(l => l.layer === 'N0').length,
      N1: logs.filter(l => l.layer === 'N1').length,
      N2: logs.filter(l => l.layer === 'N2').length,
      IHM: logs.filter(l => l.layer === 'IHM').length,
    };
    
    const byLevel = {
      debug: logs.filter(l => l.level === 'debug').length,
      info: logs.filter(l => l.level === 'info').length,
      warn: logs.filter(l => l.level === 'warn').length,
      error: logs.filter(l => l.level === 'error').length,
      critical: logs.filter(l => l.level === 'critical').length,
    };
    
    // Logs par minute (dernières 10 minutes)
    const now = Date.now();
    const logsPerMinute: number[] = [];
    for (let i = 9; i >= 0; i--) {
      const start = now - (i + 1) * 60000;
      const end = now - i * 60000;
      const count = logs.filter(l => {
        const ts = new Date(l.timestamp).getTime();
        return ts >= start && ts < end;
      }).length;
      logsPerMinute.push(count);
    }
    
    return {
      total: logs.length,
      byLayer,
      byLevel,
      logsPerMinute,
      redisConnected: getRedisSubscriber().isConnected(),
      redisMode: process.env.REDIS_URL ? 'connected' : 'simulation',
    };
  }),

  // Vider le buffer de logs
  clear: publicProcedure.mutation(async () => {
    globalLogBuffer.clear();
    return { success: true, message: 'Buffer de logs vidé' };
  }),

  // Statut de la connexion Redis
  getRedisStatus: publicProcedure.query(async () => {
    const redis = getRedisSubscriber();
    return {
      connected: redis.isConnected(),
      mode: process.env.REDIS_URL ? 'redis' : 'simulation',
      url: process.env.REDIS_URL ? '***' : null,
      channels: [
        REDIS_CHANNELS.LOGS_N0,
        REDIS_CHANNELS.LOGS_N1,
        REDIS_CHANNELS.LOGS_N2,
      ],
    };
  }),

  // Ajouter un log manuellement (pour tests)
  addLog: publicProcedure
    .input(z.object({
      level: z.enum(['debug', 'info', 'warn', 'error', 'critical']),
      layer: z.enum(['N0', 'N1', 'N2', 'IHM']),
      source: z.string(),
      message: z.string(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input }) => {
      const log: JarvisLog = {
        timestamp: new Date().toISOString(),
        ...input,
      };
      
      globalLogBuffer.add(log);
      
      return { success: true, log };
    }),
});
