'use client';

import { useCallback, useRef, useState } from 'react';

export function useSound() {
    const [isMuted, setIsMuted] = useState(false);
    const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

    const play = useCallback((soundName: string) => {
        if (isMuted) return;

        try {
            // Create or reuse audio element
            if (!audioRefs.current[soundName]) {
                const audio = new Audio(`/sounds/${soundName}.mp3`);
                audio.volume = 0.5;
                audioRefs.current[soundName] = audio;
            }

            const audio = audioRefs.current[soundName];
            audio.currentTime = 0; // Reset to start
            audio.play().catch((error) => {
                console.warn(`Failed to play sound: ${soundName}`, error);
            });
        } catch (error) {
            console.warn(`Error playing sound: ${soundName}`, error);
        }
    }, [isMuted]);

    const toggleMute = useCallback(() => {
        setIsMuted((prev) => !prev);
    }, []);

    return { play, toggleMute, isMuted };
}
