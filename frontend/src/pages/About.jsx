import { Link } from 'react-router-dom'
import { QrCode, Smartphone, UtensilsCrossed } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { LockerBay } from '../components/ui'

const BOXES = [
  { id: 1, box_number: 1, status: 'libre' },
  { id: 2, box_number: 2, status: 'ocupado' },
  { id: 3, box_number: 3, status: 'libre' },
]

const VALUES = [
  [UtensilsCrossed, 'Coffee break & Catering', 'Bebidas, ensaladas, postres y sándwiches, y servicio de catering para tus reuniones y eventos.'],
  [Smartphone, 'Pide desde el celular', 'Eliges tu pedido y lo pagas en línea, sin filas y sin esperar a que te atiendan.'],
  [QrCode, 'Retiro con locker inteligente', 'Tu pedido queda guardado en una caja que solo se abre con tu código QR.'],
]

export default function About() {
  return (
    <div>
      <PageHeader eyebrow="MALHÚ" title="Nosotros" subtitle="Comida y bebidas para pedir en línea y retirar cuando tú quieras." />
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-6 md:grid-cols-2">
        <div className="space-y-4 text-ink-600">
          <p className="text-lg">
            MALHÚ es un servicio de coffee break y catering que une la comida de siempre con la comodidad de un
            locker inteligente.
          </p>
          <p>
            Haces tu pedido desde el celular, lo pagas y recibes un código QR. Al acercarlo al lector del locker, se
            abre solo tu caja: nadie más puede abrirla.
          </p>
          <Link to="/menu" className="btn-primary mt-2 !rounded-full !px-7 !py-3">Ver el menú</Link>
        </div>
        <LockerBay boxes={BOXES} className="mx-auto w-full max-w-sm" />
      </section>
      <section className="mx-auto mt-14 grid max-w-6xl gap-4 px-4 md:grid-cols-3">
        {VALUES.map(([Icon, title, text]) => (
          <div key={title} className="panel p-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-sans text-sm font-extrabold uppercase tracking-wider text-brand-900">{title}</h2>
            <p className="mt-2 text-sm text-ink-600">{text}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
