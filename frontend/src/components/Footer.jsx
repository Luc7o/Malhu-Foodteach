import { Link } from 'react-router-dom'
import { Facebook, Instagram } from 'lucide-react'
import { Logo } from './ui'

const SOCIALS = [
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/people/Malh%C3%BA-Coffee-Break/61590606636356/',
    Icon: Facebook,
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/malhuoficial',
    Icon: Instagram,
  },
]

export default function Footer() {
  return (
    <footer className="mt-20 bg-brand-900 text-brand-200">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo tone="light" />
          <p className="mt-4 max-w-xs text-sm">Pide en línea, retira en el locker.</p>
        </div>

        <div>
          <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-white">Navegación</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/" className="hover:text-white">Inicio</Link></li>
            <li><Link to="/nosotros" className="hover:text-white">Nosotros</Link></li>
            <li><Link to="/menu" className="hover:text-white">Productos</Link></li>
            <li><Link to="/contacto" className="hover:text-white">Contáctanos</Link></li>
            <li><Link to="/faqs" className="hover:text-white">FAQs</Link></li>
            <li><Link to="/orders" className="hover:text-white">Mis pedidos</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-white">Síguenos</h2>
          <div className="mt-3 flex items-center gap-2">
            {SOCIALS.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`MALHÚ en ${label}`}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 transition-colors hover:border-brand-100 hover:text-white"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-brand-300">
        © {new Date().getFullYear()} MALHÚ · Coffee break &amp; Catering
      </div>
    </footer>
  )
}
