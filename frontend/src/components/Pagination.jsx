import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, pages, total, perPage, onPage }) {
  if (!total) return null
  const from = (page - 1) * perPage + 1
  const to = Math.min(total, page * perPage)
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-500">
      <span>Mostrando {from}–{to} de {total}</span>
      <div className="flex items-center gap-1">
        <button className="btn-secondary !px-2.5 !py-1.5" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Página anterior">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="px-2 font-medium text-ink-700">Página {page} de {pages}</span>
        <button className="btn-secondary !px-2.5 !py-1.5" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Página siguiente">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
