export default function Footer() {
  return (
    <footer className="mt-16 border-t border-ink-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-ink-400">
        <p>
          🍱 <span className="font-semibold text-ink-600">Malhu Foodtech</span> — Pide y retira en
          lockers inteligentes.
        </p>
        <p className="mt-1">© {new Date().getFullYear()} Malhu. Proyecto académico.</p>
      </div>
    </footer>
  )
}
