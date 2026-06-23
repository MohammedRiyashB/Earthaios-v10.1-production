import { useApp } from '../context/AppContext';

export function useHaptics() {
  const { settings } = useApp();
  
  return (pattern: number | number[] = 50) => {
    if (settings.haptics && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        let multiplier = 1;
        if (settings.hapticsIntensity === 'Light') multiplier = 0.5;
        if (settings.hapticsIntensity === 'Strong') multiplier = 1.5;

        let modifiedPattern = pattern;
        if (Array.isArray(pattern)) {
          // Multiply vibration durations (even indices), leave pause durations alone (odd indices)
          modifiedPattern = pattern.map((v, i) => i % 2 === 0 ? v * multiplier : v);
        } else {
          modifiedPattern = pattern * multiplier;
        }

        navigator.vibrate(modifiedPattern);
      } catch (e) {
        // ignore
      }
    }
  };
}
