import { useState, useEffect } from 'react';

export function useGyroscope() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    // If it's a browser that needs permission (iOS 13+)
    const isIOS13 = typeof (DeviceOrientationEvent as any) !== 'undefined' && typeof (DeviceOrientationEvent as any).requestPermission === 'function';

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.beta !== null && event.gamma !== null) {
        let beta = event.beta ?? 45;
        let gamma = event.gamma ?? 0;

        const maxTilt = 30;
        beta = Math.max(-90, Math.min(90, beta));
        gamma = Math.max(-maxTilt, Math.min(maxTilt, gamma));

        let yOffset = (beta - 45) / maxTilt;
        let xOffset = gamma / maxTilt;

        yOffset = Math.max(-1, Math.min(1, yOffset));
        xOffset = Math.max(-1, Math.min(1, xOffset));

        setTilt({ x: xOffset, y: yOffset });
      }
    };

    const attachListener = () => {
      window.addEventListener('deviceorientation', handleOrientation);
    };

    if (isIOS13) {
      // Need user action, so we attach a click listener to text
      const requestPerms = async () => {
        try {
          const permissionState = await (DeviceOrientationEvent as any).requestPermission();
          if (permissionState === 'granted') {
            setPermissionGranted(true);
            attachListener();
          }
        } catch (e) {
          console.error('Error requesting orientation permission', e);
        }
        // Remove click listener once we tried
        document.removeEventListener('click', requestPerms);
        document.removeEventListener('touchstart', requestPerms);
      };
      
      document.addEventListener('click', requestPerms);
      document.addEventListener('touchstart', requestPerms);
      
      return () => {
        window.removeEventListener('deviceorientation', handleOrientation);
        document.removeEventListener('click', requestPerms);
        document.removeEventListener('touchstart', requestPerms);
      };
    } else {
      if (window.DeviceOrientationEvent) {
        attachListener();
      }
    }

    return () => {
      if (window.DeviceOrientationEvent) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, []);

  return tilt;
}
