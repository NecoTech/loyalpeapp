'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        // Check if the app is already installed
        const isAppInstalled = window.matchMedia('(display-mode: standalone)').matches;

        if (isAppInstalled) {
            // App is already installed, don't show the prompt
            return;
        }

        // Check if we've already shown the prompt recently
        const lastPromptTime = localStorage.getItem('installPromptLastShown');
        if (lastPromptTime) {
            const daysSinceLastPrompt = (Date.now() - parseInt(lastPromptTime)) / (1000 * 60 * 60 * 24);
            if (daysSinceLastPrompt < 7) {
                // Don't show the prompt if it was shown less than 7 days ago
                return;
            }
        }

        const handleBeforeInstallPrompt = (e: Event) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Store the event so it can be triggered later
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            // Show our custom install prompt
            setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the browser install prompt
        await deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;

        // We no longer need the prompt regardless of outcome
        setDeferredPrompt(null);
        setShowPrompt(false);

        // Store the time we showed the prompt
        localStorage.setItem('installPromptLastShown', Date.now().toString());

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        // Store the time we showed the prompt
        localStorage.setItem('installPromptLastShown', Date.now().toString());
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-zinc-800 shadow-lg z-50 border-t border-gray-200 dark:border-zinc-700">
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <h3 className="font-medium text-base">Install Oder App</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Add to home screen for a better experience!</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={handleDismiss} className="h-8 w-8 p-0">
                        <X className="h-5 w-5" />
                    </Button>
                    <Button
                        onClick={handleInstallClick}
                        className="bg-[#FF385C] hover:bg-[#E31C5F] text-white"
                    >
                        Install
                    </Button>
                </div>
            </div>
        </div>
    );
}