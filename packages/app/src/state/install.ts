import { createStore, useStore } from '../lib/store.ts'

type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

export const installStore = createStore<{ prompt?: InstallPrompt; installed: boolean }>({ installed: false })
export const useInstall = () => useStore(installStore)

/** Chrome and Edge offer an install button once the app qualifies; the event is kept until the player taps it. */
export function listenForInstall() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    installStore.set((s) => ({ ...s, prompt: event as InstallPrompt }))
  })
  window.addEventListener('appinstalled', () => installStore.set({ installed: true }))
}

export async function install() {
  const { prompt } = installStore.get()
  if (!prompt) return
  await prompt.prompt()
  installStore.set((s) => ({ ...s, prompt: undefined }))
}

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

/** iPhones have no install event: the player has to use the share sheet. */
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
