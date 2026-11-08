import { useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'

type Navigate = ReturnType<typeof useNavigate>

/**
 * Goes back to wherever the player came from, so Back from a quest returns to Home when they continued from
 * Home, and to the list of quests when they chose it there. When there is nothing to go back to (the page was
 * opened by a link, or reloaded), it goes to `fallback`.
 */
export function BackButton({ label, fallback }: { label: string; fallback: (navigate: Navigate) => void }) {
  const router = useRouter()
  const navigate = useNavigate()
  const canGoBack = useCanGoBack()
  return (
    <button type="button" className="back" onClick={() => (canGoBack ? router.history.back() : fallback(navigate))}>
      ‹ {label}
    </button>
  )
}
