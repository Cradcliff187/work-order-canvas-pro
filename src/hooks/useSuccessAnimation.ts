import { useCallback } from 'react';
import confetti from 'canvas-confetti';

export const useSuccessAnimation = () => {
  const showSuccess = useCallback(() => {
    // Create multiple confetti bursts for enhanced effect
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    
    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const runConfetti = () => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      // Left side burst
      confetti({
        particleCount,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors: ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))']
      });

      // Right side burst
      confetti({
        particleCount,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))']
      });

      // Center burst
      confetti({
        particleCount: particleCount / 2,
        angle: 90,
        spread: 45,
        origin: { x: 0.5, y: 0.6 },
        colors: ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))']
      });

      requestAnimationFrame(runConfetti);
    };

    runConfetti();

    // Auto-cleanup: Clear any remaining confetti after animation
    setTimeout(() => {
      confetti.reset();
    }, duration + 500);
  }, []);

  return { showSuccess };
};