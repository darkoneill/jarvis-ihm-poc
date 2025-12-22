import { useCallback, useEffect, useRef, useState } from "react";

export type AlertType = 
  | "gpu_warning"
  | "gpu_critical"
  | "ups_warning"
  | "ups_critical"
  | "network_down"
  | "task_complete"
  | "message_received"
  | "system_error";

interface AlertSound {
  type: AlertType;
  name: string;
  description: string;
  frequency: number;
  duration: number;
  pattern: number[];
  priority: "low" | "medium" | "high" | "critical";
}

const ALERT_SOUNDS: AlertSound[] = [
  {
    type: "gpu_warning",
    name: "Avertissement GPU",
    description: "Température GPU élevée (>75°C)",
    frequency: 440,
    duration: 200,
    pattern: [1, 0.5, 1],
    priority: "medium",
  },
  {
    type: "gpu_critical",
    name: "Alerte GPU Critique",
    description: "Température GPU critique (>85°C)",
    frequency: 880,
    duration: 150,
    pattern: [1, 0.2, 1, 0.2, 1, 0.2, 1],
    priority: "critical",
  },
  {
    type: "ups_warning",
    name: "Avertissement UPS",
    description: "Batterie UPS faible (<30%)",
    frequency: 330,
    duration: 300,
    pattern: [1, 1, 1],
    priority: "medium",
  },
  {
    type: "ups_critical",
    name: "Alerte UPS Critique",
    description: "Batterie UPS critique (<15%)",
    frequency: 660,
    duration: 100,
    pattern: [1, 0.1, 1, 0.1, 1, 0.1, 1, 0.1, 1],
    priority: "critical",
  },
  {
    type: "network_down",
    name: "Réseau Déconnecté",
    description: "Connexion réseau perdue",
    frequency: 220,
    duration: 500,
    pattern: [1, 1],
    priority: "high",
  },
  {
    type: "task_complete",
    name: "Tâche Terminée",
    description: "Une tâche a été complétée",
    frequency: 523,
    duration: 150,
    pattern: [1, 0.5, 1.5],
    priority: "low",
  },
  {
    type: "message_received",
    name: "Message Reçu",
    description: "Nouveau message de Jarvis",
    frequency: 392,
    duration: 100,
    pattern: [1],
    priority: "low",
  },
  {
    type: "system_error",
    name: "Erreur Système",
    description: "Une erreur système s'est produite",
    frequency: 196,
    duration: 400,
    pattern: [1, 0.3, 1],
    priority: "high",
  },
];

interface AudioAlertSettings {
  enabled: boolean;
  volume: number;
  mutedTypes: AlertType[];
}

const DEFAULT_SETTINGS: AudioAlertSettings = {
  enabled: true,
  volume: 0.5,
  mutedTypes: [],
};

export function useAudioAlerts() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [settings, setSettings] = useState<AudioAlertSettings>(() => {
    const saved = localStorage.getItem("jarvis_audio_settings");
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const playQueueRef = useRef<AlertType[]>([]);
  const isProcessingRef = useRef(false);

  // Initialize AudioContext on first user interaction
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem("jarvis_audio_settings", JSON.stringify(settings));
  }, [settings]);

  // Generate a beep sound
  const playBeep = useCallback(
    async (frequency: number, duration: number, volume: number) => {
      const ctx = initAudioContext();
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

      // Envelope for smoother sound
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(volume * 0.7, ctx.currentTime + duration / 2000);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration / 1000);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration / 1000);

      return new Promise<void>((resolve) => {
        setTimeout(resolve, duration);
      });
    },
    [initAudioContext]
  );

  // Play an alert pattern
  const playAlertPattern = useCallback(
    async (alertSound: AlertSound) => {
      const { frequency, duration, pattern } = alertSound;
      const volume = settings.volume;

      for (let i = 0; i < pattern.length; i++) {
        const multiplier = pattern[i];
        if (multiplier > 0) {
          await playBeep(frequency, duration * multiplier, volume);
        }
        // Small gap between beeps
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    },
    [playBeep, settings.volume]
  );

  // Process the play queue
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || playQueueRef.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    setIsPlaying(true);

    while (playQueueRef.current.length > 0) {
      const alertType = playQueueRef.current.shift();
      if (alertType) {
        const alertSound = ALERT_SOUNDS.find((s) => s.type === alertType);
        if (alertSound) {
          await playAlertPattern(alertSound);
          // Gap between different alerts
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }
    }

    setIsPlaying(false);
    isProcessingRef.current = false;
  }, [playAlertPattern]);

  // Play an alert
  const playAlert = useCallback(
    (type: AlertType) => {
      if (!settings.enabled) return;
      if (settings.mutedTypes.includes(type)) return;

      // Add to queue
      playQueueRef.current.push(type);
      processQueue();
    },
    [settings.enabled, settings.mutedTypes, processQueue]
  );

  // Play a test sound
  const playTest = useCallback(
    async (type: AlertType) => {
      const alertSound = ALERT_SOUNDS.find((s) => s.type === type);
      if (alertSound) {
        setIsPlaying(true);
        await playAlertPattern(alertSound);
        setIsPlaying(false);
      }
    },
    [playAlertPattern]
  );

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<AudioAlertSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  // Toggle mute for a specific alert type
  const toggleMute = useCallback((type: AlertType) => {
    setSettings((prev) => {
      const mutedTypes = prev.mutedTypes.includes(type)
        ? prev.mutedTypes.filter((t) => t !== type)
        : [...prev.mutedTypes, type];
      return { ...prev, mutedTypes };
    });
  }, []);

  // Get all available alert sounds
  const getAlertSounds = useCallback(() => ALERT_SOUNDS, []);

  return {
    playAlert,
    playTest,
    settings,
    updateSettings,
    toggleMute,
    isPlaying,
    getAlertSounds,
    initAudioContext,
  };
}

export { ALERT_SOUNDS };
export type { AlertSound, AudioAlertSettings };
