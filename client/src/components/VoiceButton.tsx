import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useEffect, useCallback } from "react";
import { toast } from "sonner";

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  onListeningChange?: (isListening: boolean) => void;
  disabled?: boolean;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
}

export function VoiceButton({
  onTranscript,
  onListeningChange,
  disabled = false,
  className,
  size = "icon",
}: VoiceButtonProps) {
  const handleResult = useCallback((transcript: string, isFinal: boolean) => {
    if (isFinal && transcript.trim()) {
      onTranscript(transcript.trim());
    }
  }, [onTranscript]);

  const handleError = useCallback((error: string) => {
    toast.error("Erreur vocale", { description: error });
  }, []);

  const {
    isListening,
    isSupported,
    interimTranscript,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    language: "fr-FR",
    continuous: false,
    interimResults: true,
    onResult: handleResult,
    onError: handleError,
  });

  // Notify parent of listening state changes
  useEffect(() => {
    onListeningChange?.(isListening);
  }, [isListening, onListeningChange]);

  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isSupported) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={size}
            disabled
            className={cn("text-muted-foreground opacity-50", className)}
          >
            <MicOff className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Reconnaissance vocale non supportée par ce navigateur</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isListening ? "default" : "ghost"}
          size={size}
          onClick={handleClick}
          disabled={disabled}
          className={cn(
            "relative transition-all duration-200",
            isListening && "bg-red-500 hover:bg-red-600 text-white animate-pulse",
            className
          )}
        >
          {isListening ? (
            <>
              <Mic className="h-4 w-4" />
              {/* Pulsing ring animation */}
              <span className="absolute inset-0 rounded-md animate-ping bg-red-500/30" />
            </>
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isListening ? "Cliquez pour arrêter" : "Commande vocale"}</p>
        {interimTranscript && (
          <p className="text-xs text-muted-foreground mt-1 italic">
            "{interimTranscript}"
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

// Standalone voice input component with visual feedback
interface VoiceInputProps {
  onSubmit: (text: string) => void;
  placeholder?: string;
  className?: string;
}

export function VoiceInput({ onSubmit, placeholder = "Parlez maintenant...", className }: VoiceInputProps) {
  const handleResult = useCallback((transcript: string, isFinal: boolean) => {
    if (isFinal && transcript.trim()) {
      onSubmit(transcript.trim());
    }
  }, [onSubmit]);

  const handleError = useCallback((error: string) => {
    toast.error("Erreur vocale", { description: error });
  }, []);

  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    language: "fr-FR",
    continuous: true,
    interimResults: true,
    onResult: handleResult,
    onError: handleError,
  });

  const handleToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };

  if (!isSupported) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <MicOff className="h-4 w-4" />
        <span>Reconnaissance vocale non disponible</span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-3">
        <Button
          variant={isListening ? "destructive" : "default"}
          size="lg"
          onClick={handleToggle}
          className="gap-2"
        >
          {isListening ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Écoute en cours...
            </>
          ) : (
            <>
              <Mic className="h-5 w-5" />
              Commencer à parler
            </>
          )}
        </Button>
      </div>

      {/* Transcript display */}
      {(transcript || interimTranscript) && (
        <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
          <p className="text-sm">
            {transcript}
            {interimTranscript && (
              <span className="text-muted-foreground italic">{interimTranscript}</span>
            )}
          </p>
        </div>
      )}

      {/* Listening indicator */}
      {isListening && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          {placeholder}
        </div>
      )}
    </div>
  );
}
