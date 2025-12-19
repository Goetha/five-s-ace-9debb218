import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function UpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const checkForUpdates = useCallback(async () => {
    if (!registration) return;
    try {
      await registration.update();
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  }, [registration]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleControllerChange = () => {
      // New service worker has taken control, reload to get new content
      window.location.reload();
    };

    const handleStateChange = (event: Event) => {
      const sw = event.target as ServiceWorker;
      if (sw.state === 'installed' && navigator.serviceWorker.controller) {
        // New content available, show update prompt
        setShowPrompt(true);
      }
    };

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        setRegistration(reg);

        // Check for updates immediately
        reg.update();

        // Check for updates periodically (every 60 seconds)
        const interval = setInterval(() => {
          reg.update();
        }, 60 * 1000);

        // Listen for new service worker installations
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', handleStateChange);
          }
        });

        // Listen for controller changes
        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

        return () => {
          clearInterval(interval);
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        };
      } catch (error) {
        console.error('SW registration error:', error);
      }
    };

    registerSW();
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      // Tell waiting service worker to skip waiting and become active
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    // Reload to activate new service worker
    window.location.reload();
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[100] animate-in slide-in-from-top-4 duration-300">
      <div className="bg-primary text-primary-foreground rounded-xl shadow-lg p-4">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-primary-foreground/20 transition-colors"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-primary-foreground/20 rounded-lg flex items-center justify-center">
            <RefreshCw className="h-5 w-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">
              Nova versão disponível!
            </h3>
            <p className="text-xs opacity-90 mt-0.5">
              Atualize para obter as últimas melhorias
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 mt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDismiss}
            className="flex-1 bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0"
          >
            Depois
          </Button>
          <Button
            size="sm"
            onClick={handleUpdate}
            className="flex-1 gap-1.5 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </div>
    </div>
  );
}
