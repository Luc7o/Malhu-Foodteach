import { ChevronDown } from 'lucide-react'
import PageHeader from '../components/PageHeader'

const FAQS = [
  ['¿Cómo hago un pedido?', 'Entra a Productos, agrega lo que quieras al carrito, inicia sesión y paga desde el celular.'],
  ['¿Cómo retiro mi pedido?', 'Al pagar se te asigna una caja del locker y aparece tu código QR. Acércalo al lector del locker y la caja se abre.'],
  ['¿Dónde veo mi código QR?', 'En Mis pedidos, dentro del detalle de tu pedido pagado.'],
  ['¿Qué pasa si la puerta no se abre?', 'Si el locker detecta que la puerta no se abrió, tu código vuelve a quedar activo y puedes intentarlo de nuevo. Si sigue sin abrir, escríbenos.'],
  ['¿Hacen catering para eventos?', 'Sí. Somos coffee break y catering: escríbenos desde Contáctanos y lo armamos contigo.'],
]

export default function Faqs() {
  return (
    <div>
      <PageHeader eyebrow="Ayuda" title="Preguntas frecuentes" />
      <section className="mx-auto max-w-3xl space-y-3 px-4 pt-6">
        {FAQS.map(([q, a]) => (
          <details key={q} className="panel group p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink-900">
              {q}
              <ChevronDown className="h-4 w-4 shrink-0 text-ink-400 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <p className="mt-3 text-sm text-ink-600">{a}</p>
          </details>
        ))}
      </section>
    </div>
  )
}
