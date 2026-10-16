import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MessageCircle, QrCode, ShoppingBag, Smartphone } from 'lucide-react'
import { api } from '../api'
import { LockerBay, ProductImage } from '../components/ui'

const SAMPLE_BOXES = Array.from({ length: 6 }, (_, i) => ({
  id: `s${i}`,
  box_number: i + 1,
  status: 'libre',
}))

const STEPS = [
  [Smartphone, 'Elige y paga', 'Arma tu pedido y págalo desde el celular.'],
  [QrCode, 'Recibe tu QR', 'Se asigna una caja y aparece tu código de retiro.'],
  [ShoppingBag, 'Escanea y abre', 'Acerca el QR al lector del locker y recoge tu comida.'],
]

function Hero({ locker }) {
  const boxes = locker?.boxes?.length ? locker.boxes : SAMPLE_BOXES
  const libres = boxes.filter((b) => b.status === 'libre').length
  return (
    <section className="bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 text-white">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-24 pt-12 md:grid-cols-[1.1fr_0.9fr] md:pb-32 md:pt-20">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-300">Coffee break &amp; Catering</p>
          <h1 className="mt-3 font-sans text-4xl font-extrabold uppercase leading-[1.05] sm:text-5xl lg:text-6xl">
            Pide desde el celular.
            <br />
            Retira con un QR.
          </h1>
          <p className="mt-5 max-w-md text-lg text-brand-200">
            Elige tu comida, paga en línea y abre tu caja escaneando el código. Sin filas y sin esperar a que te atiendan.
          </p>
          <Link to="/menu" className="btn mt-7 bg-brand-100 !px-6 !py-3 text-base text-brand-900 hover:bg-white">
            Ver el menú
          </Link>
        </div>

        <div className="mx-auto w-full max-w-sm md:max-w-none">
          <LockerBay boxes={boxes} demo className="shadow-pop ring-1 ring-white/15" />
          <p className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-brand-200">
            <span className="font-semibold text-white">{locker ? locker.name : 'Locker de ejemplo'}</span>
            {locker?.address && <span>{locker.address}</span>}
            <span className="ml-auto font-medium text-white">
              {libres} de {boxes.length} cajas libres
            </span>
          </p>
        </div>
      </div>
    </section>
  )
}

function CategoriesSection({ tiles, onPick }) {
  if (tiles.length === 0) return null
  return (
    <section className="wood relative -mt-12 rounded-t-[50%_/_70px] pb-14 pt-16 md:-mt-16 md:rounded-t-[50%_/_110px] md:pt-24">
      <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-10 gap-y-10 px-4">
        {tiles.map(({ name, product }) => (
          <button
            key={name}
            type="button"
            onClick={() => onPick(name)}
            className="group flex w-36 flex-col items-center text-center md:w-44"
          >
            <span className="block h-32 w-32 overflow-hidden rounded-full border-4 border-brand-700 bg-ink-100 shadow-pop transition-transform duration-300 ease-out group-hover:scale-110 md:h-40 md:w-40">
              <ProductImage
                src={product?.image_url}
                alt={name}
                category={name}
                className="h-full w-full object-cover"
              />
            </span>
            <span className="mt-4 text-lg font-bold uppercase leading-tight text-ink-500 transition-colors group-hover:text-brand-600">
              {name}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-10 flex justify-center">
        <Link
          to="/menu"
          className="btn bg-brand-600 !px-8 !py-3.5 text-base text-white hover:bg-brand-700 !rounded-full"
        >
          Ver el menú completo
        </Link>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section className="bg-brand-100">
      <ol className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-3">
        {STEPS.map(([Icon, title, text]) => (
          <li key={title} className="flex flex-col items-center text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-extrabold uppercase tracking-wider text-brand-900">{title}</p>
            <p className="mt-1 max-w-[16rem] text-sm text-ink-600">{text}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

function CateringBand() {
  return (
    <section className="-mb-20 mt-16 bg-brand-600 text-white">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-12 md:flex-row md:items-center">
        <div>
          <h2 className="font-sans text-2xl font-extrabold uppercase sm:text-3xl">Catering a tu medida</h2>
          <p className="mt-2 max-w-xl text-brand-100">
            ¿Un evento, una reunión o un coffee break para tu equipo? Escríbenos y lo armamos contigo.
          </p>
        </div>
        <a
          href="https://wa.me/51906513373?text=Hola%2C%20quisiera%20cotizar%20un%20catering"
          target="_blank"
          rel="noopener noreferrer"
          className="btn shrink-0 bg-brand-100 !px-6 !py-3 text-base text-brand-900 hover:bg-white"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" /> Escríbenos por WhatsApp
        </a>
      </div>
    </section>
  )
}

export default function Home() {
  const [products, setProducts] = useState([])
  const [categoryList, setCategoryList] = useState(null)
  const [locker, setLocker] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.getProducts().then(setProducts).catch(() => {})
    api.getCategories().then((list) => setCategoryList(list.map((c) => c.name))).catch(() => {})
    api.getLockers().then((l) => setLocker(l[0] || null)).catch(() => {})
  }, [])

  const tiles = useMemo(() => {
    const names = categoryList ?? [...new Set(products.map((p) => p.category).filter(Boolean))].sort()
    return names.map((name) => {
      const inCat = products.filter((p) => p.category === name)
      return { name, product: inCat.find((p) => p.image_url) || inCat[0] }
    })
  }, [products, categoryList])

  return (
    <div>
      <Hero locker={locker} />
      <CategoriesSection tiles={tiles} onPick={(name) => navigate(`/menu?categoria=${encodeURIComponent(name)}`)} />
      <HowItWorks />
      <CateringBand />
    </div>
  )
}
