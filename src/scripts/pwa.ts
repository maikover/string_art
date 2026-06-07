import { Capacitor } from '@capacitor/core';

const swFilename = 'service-worker.js';

export async function initServiceWorker() {
  if (!navigator.serviceWorker) {
    return;
  }

  // En Android nativo no necesitamos Service Worker (los archivos son locales).
  // Desregistramos si existe alguno previo atrapado en caché.
  if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform?.()) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
      console.log('Service Workers unregistered for native app.');
    } catch (e) {
      console.error('Error unregistering service worker:', e);
    }
    return;
  }

  if (document.location.hostname === '127.0.0.1') {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register(swFilename);
    registration.onupdatefound = () => {
      const installingWorker = registration.installing;
      if (installingWorker == null) {
        return;
      }
      installingWorker.onstatechange = () => {
        if (installingWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            console.log(
              'New content is available and will be used when all ' +
                'tabs for this page are closed. See https://bit.ly/CRA-PWA.'
            );
          } else {
            console.log('Content is cached for offline use.');
          }
        }
      };
    };
  } catch (error) {
    console.error('Error during service worker registration:', error);
  }
}
