import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

/** Barras verticales. Con muchas barras se ocultan los valores y se espacian las etiquetas. */
export function BarChart({ data, value, label, format = (v) => v, height = 176, emptyText = 'Aún no hay ventas en este periodo.' }) {
  const values = data.map(value)
  const max = Math.max(...values, 0)
  if (max <= 0) return <p className="flex items-center justify-center text-sm text-ink-400" style={{ height }}>{emptyText}</p>

  const many = data.length > 12
  const labelEvery = data.length > 24 ? 5 : data.length > 12 ? 2 : 1
  return (
    <div className="flex items-end gap-1 sm:gap-2" style={{ height }}>
      {data.map((d, i) => {
        const v = values[i]
        return (
          <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5" title={`${label(d, i, true)} · ${format(v)}`}>
            {!many && <span className="text-[11px] font-semibold text-ink-600">{v > 0 ? format(v) : ''}</span>}
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full min-h-[3px] rounded-t-md bg-brand-500 transition-all hover:bg-brand-700"
                style={{ height: `${Math.max(2, (v / max) * 100)}%` }}
              />
            </div>
            <span className="h-4 truncate text-[11px] leading-4 text-ink-400">{i % labelEvery === 0 ? label(d, i, false) : ''}</span>
          </div>
        )
      })}
    </div>
  )
}

/** Lista con barras horizontales (productos más vendidos, categorías...). */
export function HBarList({ items, name, value, extra, format = (v) => v, emptyText = 'Sin datos todavía.' }) {
  const max = Math.max(1, ...items.map(value))
  if (items.length === 0) return <p className="text-sm text-ink-400">{emptyText}</p>
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={name(item)}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="truncate font-medium text-ink-800">{name(item)}</span>
            <span className="shrink-0 text-ink-500">{format(value(item))}{extra ? <span className="text-ink-400"> · {extra(item)}</span> : null}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink-100">
            <div className="h-full rounded-full bg-ink-800" style={{ width: `${(value(item) / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** 24 columnas: pedidos por hora del día. Resalta la hora más movida. */
export function HourBars({ data }) {
  const max = Math.max(...data.map((d) => d.pedidos), 0)
  if (max <= 0) return <p className="flex h-28 items-center justify-center text-sm text-ink-400">Aún no hay ventas en este periodo.</p>
  return (
    <div>
      <div className="flex h-28 items-end gap-0.5">
        {data.map((d) => (
          <div key={d.hora} className="flex h-full flex-1 items-end" title={`${String(d.hora).padStart(2, '0')}:00 · ${d.pedidos} ${d.pedidos === 1 ? 'pedido' : 'pedidos'}`}>
            <div
              className={`w-full min-h-[2px] rounded-t-sm ${d.pedidos === max ? 'bg-brand-700' : 'bg-brand-300'}`}
              style={{ height: `${Math.max(2, (d.pedidos / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-ink-400">
        {[0, 6, 12, 18, 23].map((h) => <span key={h}>{String(h).padStart(2, '0')}h</span>)}
      </div>
    </div>
  )
}

/** Variación contra el periodo anterior: ▲ 12% / ▼ 5% / sin datos. */
export function Delta({ value }) {
  if (value === null || value === undefined) return <span className="text-xs text-ink-400">sin periodo anterior</span>
  if (value === 0) return <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-ink-500"><Minus className="h-3 w-3" /> igual</span>
  const up = value > 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-emerald-600' : 'text-red-600'}`}>
      {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      {Math.abs(value)}%
      <span className="ml-1 font-normal text-ink-400">vs. periodo anterior</span>
    </span>
  )
}
