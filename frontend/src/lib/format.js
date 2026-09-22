import { useEffect, useState } from 'react'

export const money = (n) => `S/. ${Number(n || 0).toFixed(2)}`

export function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function shortId(id) {
  return (id || '').slice(0, 8).toUpperCase()
}

export function formatDuration(ms) {
  if (ms <= 0) return '0 min'
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h >= 1) return `${h} h ${String(m).padStart(2, '0')} min`
  const s = Math.floor((ms % 60000) / 1000)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Milisegundos que faltan hasta `iso`, actualizado cada segundo. */
export function useCountdown(iso) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!iso) return undefined
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [iso])
  return iso ? new Date(iso).getTime() - now : null
}
