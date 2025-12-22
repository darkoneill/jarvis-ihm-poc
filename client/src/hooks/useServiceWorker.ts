import { useState, useEffect, useCallback } from "react";

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  updateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

interface UseServiceWorkerReturn extends ServiceWorkerState {
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  update: () => Promise<void>;
  clearCache: () => Promise<void>;
}

export function useServiceWorker(): UseServiceWorkerReturn {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: typeof navigator !== "undefined" && "serviceWorker" in navigator,
    isRegistered: false,
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    updateAvailable: false,
    registration: null,
  });

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Check for existing registration on mount
  useEffect(() => {
    if (!state.isSupported) return;

    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        setState(prev => ({
          ...prev,
          isRegistered: true,
          registration,
        }));

        // Listen for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                setState(prev => ({ ...prev, updateAvailable: true }));
              }
            });
          }
        });
      }
    });
  }, [state.isSupported]);

  const register = useCallback(async () => {
    if (!state.isSupported) {
      console.warn("Service Workers not supported");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

      console.log("[SW] Registered:", registration.scope);

      setState(prev => ({
        ...prev,
        isRegistered: true,
        registration,
      }));

      // Listen for updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              setState(prev => ({ ...prev, updateAvailable: true }));
            }
          });
        }
      });
    } catch (error) {
      console.error("[SW] Registration failed:", error);
    }
  }, [state.isSupported]);

  const unregister = useCallback(async () => {
    if (!state.registration) return;

    try {
      const success = await state.registration.unregister();
      if (success) {
        console.log("[SW] Unregistered");
        setState(prev => ({
          ...prev,
          isRegistered: false,
          registration: null,
          updateAvailable: false,
        }));
      }
    } catch (error) {
      console.error("[SW] Unregister failed:", error);
    }
  }, [state.registration]);

  const update = useCallback(async () => {
    if (!state.registration) return;

    try {
      await state.registration.update();
      
      // If there's a waiting worker, activate it
      if (state.registration.waiting) {
        state.registration.waiting.postMessage({ type: "SKIP_WAITING" });
        window.location.reload();
      }
    } catch (error) {
      console.error("[SW] Update failed:", error);
    }
  }, [state.registration]);

  const clearCache = useCallback(async () => {
    if (!navigator.serviceWorker.controller) return;

    return new Promise<void>((resolve, reject) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.success) {
          console.log("[SW] Cache cleared");
          resolve();
        } else {
          reject(new Error("Failed to clear cache"));
        }
      };

      navigator.serviceWorker.controller!.postMessage(
        { type: "CLEAR_CACHE" },
        [messageChannel.port2]
      );
    });
  }, []);

  return {
    ...state,
    register,
    unregister,
    update,
    clearCache,
  };
}
