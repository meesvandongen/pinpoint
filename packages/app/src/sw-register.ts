/** Registers the offline service worker. Only in production builds: the dev server and test builds use MSW's worker instead. */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline play is a bonus; the app works without it.
    })
  })
}
