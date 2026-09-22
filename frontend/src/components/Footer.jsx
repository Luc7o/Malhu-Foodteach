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
    <footer className="mt-20 border-t border-ink-200">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-8 sm:flex-row sm:items-center">
        <Logo />
        <p className="text-sm text-ink-500">
          Pide en línea, retira en el locker. © {new Date().getFullYear()} MALHÚ
        </p>
        <div className="flex items-center gap-2">
          {SOCIALS.map(({ label, href, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`MALHÚ en ${label}`}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-200 text-ink-500 transition-colors hover:border-brand-600 hover:text-brand-600"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
