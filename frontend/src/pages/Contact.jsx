import { Facebook, Instagram, MessageCircle } from 'lucide-react'
import PageHeader from '../components/PageHeader'

const CHANNELS = [
  {
    label: 'WhatsApp',
    handle: '906 513 373',
    href: 'https://wa.me/51906513373?text=Hola%2C%20quisiera%20hacer%20una%20consulta',
    Icon: MessageCircle,
  },
  {
    label: 'Instagram',
    handle: '@malhuoficial',
    href: 'https://www.instagram.com/malhuoficial',
    Icon: Instagram,
  },
  {
    label: 'Facebook',
    handle: 'Malhú Coffee Break',
    href: 'https://www.facebook.com/people/Malh%C3%BA-Coffee-Break/61590606636356/',
    Icon: Facebook,
  },
]

export default function Contact() {
  return (
    <div>
      <PageHeader eyebrow="Hablemos" title="Contáctanos" subtitle="Escríbenos para consultas, pedidos especiales o cotizar un catering." />
      <section className="mx-auto grid max-w-5xl gap-4 px-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
        {CHANNELS.map(({ label, handle, href, Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="panel group flex items-center gap-4 p-6 transition-all duration-300 hover:scale-[1.03] hover:border-brand-500 hover:shadow-pop"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-sans text-sm font-extrabold uppercase tracking-wider text-brand-900">{label}</span>
              <span className="text-sm text-ink-600">{handle}</span>
            </span>
          </a>
        ))}
      </section>
    </div>
  )
}
