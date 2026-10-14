/** Cabecera verde con curva inferior, compartida por las páginas internas. */
export default function PageHeader({ eyebrow, title, subtitle }) {
  return (
    <section className="bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 text-white">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-10 md:pt-14">
        {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-300">{eyebrow}</p>}
        <h1 className="mt-2 font-sans text-3xl font-extrabold uppercase sm:text-4xl md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-xl text-brand-200">{subtitle}</p>}
      </div>
      <div className="h-8 rounded-t-[50%_/_32px] bg-ink-50" aria-hidden="true" />
    </section>
  )
}
