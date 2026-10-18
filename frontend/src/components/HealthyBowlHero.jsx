import { Dumbbell, GraduationCap, HeartPulse } from 'lucide-react'
import './HealthyBowlHero.css'

// Animación de la portada: un bowl saludable que se va llenando de ingredientes.
// Es solo CSS + SVG (no usa librerías de animación ni peticiones al backend).
// Las animaciones y los tiempos están en HealthyBowlHero.css.

const PUBLICOS = [
  { cls: 'hb-pa', Icon: HeartPulse, label: 'Hospitales' },
  { cls: 'hb-pb', Icon: Dumbbell, label: 'Gimnasios' },
  { cls: 'hb-pc', Icon: GraduationCap, label: 'Universidades' },
]

const FRASES = [
  { cls: 'hb-ca', titulo: 'Come bien, incluso en turnos largos.', texto: 'Platos frescos y balanceados, siempre a mano.' },
  { cls: 'hb-cb', titulo: 'Proteína fresca después de entrenar.', texto: 'Elige tu bowl y retíralo con tu código QR.' },
  { cls: 'hb-cc', titulo: 'Entre clases, sin filas ni esperas.', texto: 'Pide desde el celular y retira en segundos.' },
]

const NUTRIENTES = [
  { nombre: 'Proteína', cls: 'hb-bar-p' },
  { nombre: 'Fibra', cls: 'hb-bar-f' },
  { nombre: 'Energía', cls: 'hb-bar-e' },
]

// Forma de una hoja; cada hoja la coloca con transform
const LEAF_PATH = 'M0 0C10 -18 34 -22 52 -8C38 10 14 14 0 0Z'
const HOJAS = [
  { t: 'translate(168 156) rotate(-25)', fill: '#4f9a3c' },
  { t: 'translate(188 144) rotate(-60)', fill: '#6db94b' },
  { t: 'translate(214 154) rotate(-8)', fill: '#5aa842' },
  { t: 'translate(396 156) scale(-1 1) rotate(-25)', fill: '#4f9a3c' },
  { t: 'translate(374 142) scale(-1 1) rotate(-58)', fill: '#6db94b' },
  { t: 'translate(346 150) scale(-1 1) rotate(-8)', fill: '#5aa842' },
]

const GRANOS_OSCUROS = [[190, 160, 3], [216, 176, 2.5], [246, 164, 3], [262, 180, 2.5], [300, 170, 3], [326, 182, 2.5], [352, 164, 3], [376, 174, 2.5], [160, 170, 2.5]]
const GRANOS_CLAROS = [[204, 168, 2.5], [232, 154, 2.5], [280, 158, 3], [312, 156, 2.5], [340, 172, 3], [366, 158, 2.5], [176, 178, 2.5], [400, 170, 2.5]]

const STAR = 'M0 -10 L2.5 -2.5 L10 0 L2.5 2.5 L0 10 L-2.5 2.5 L-10 0 L-2.5 -2.5 Z'
const DESTELLOS = [
  { t: 'translate(150 118)', delay: '0s' },
  { t: 'translate(412 110)', delay: '.15s' },
  { t: 'translate(276 96)', delay: '.3s' },
]

function Hojita({ className, style, fill }) {
  return (
    <svg
      className={`hb-anim hb-fl ${className}`}
      aria-hidden="true"
      viewBox="0 0 24 24"
      style={{ position: 'absolute', ...style }}
    >
      <path d="M3 21C3 9 11 3 21 3c0 11-6 18-18 18Z" fill={fill} />
      <path d="M5 19 16 8" stroke="#2f6b35" strokeWidth="1.5" fill="none" />
    </svg>
  )
}

export default function HealthyBowlHero() {
  return (
    <div className="relative flex flex-col gap-5 overflow-hidden rounded-[28px] border border-white/15 bg-brand-900/50 p-5 shadow-pop sm:p-6">
      {/* Hojitas decorativas */}
      <Hojita className="hb-fl1" fill="#7cbf4e" style={{ left: 34, top: 330, width: 22, height: 22 }} />
      <Hojita className="hb-fl2" fill="#a8d66b" style={{ right: 36, top: 340, width: 16, height: 16 }} />
      <Hojita className="hb-fl3" fill="#5aa842" style={{ left: 90, top: 300, width: 18, height: 18 }} />

      {/* Públicos: la etiqueta activa cambia sola */}
      <div className="relative flex flex-wrap gap-2">
        {PUBLICOS.map(({ cls, Icon, label }) => (
          <div key={label} className={`hb-anim hb-pill ${cls}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </div>
        ))}
      </div>

      {/* Escena: el bowl se va armando */}
      <div className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute left-[14%] top-[6%] h-[90%] w-[72%] rounded-full"
          style={{ background: 'radial-gradient(closest-side, rgba(168,214,107,.2), rgba(168,214,107,0))' }}
        />

        <svg
          role="img"
          aria-label="Un bowl saludable que se va llenando con granos, hojas verdes, aguacate, huevo, tomate y zanahoria"
          viewBox="0 0 552 300"
          className="relative block h-auto w-full"
        >
          <defs>
            <clipPath id="hbBowlClip">
              <path d="M126 170 A150 34 0 0 0 426 170 C426 262 352 284 276 284 C200 284 126 262 126 170 Z" />
            </clipPath>
            <linearGradient id="hbBowlG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f6f9ea" />
              <stop offset="1" stopColor="#d6e2bf" />
            </linearGradient>
          </defs>

          <ellipse cx="276" cy="292" rx="172" ry="9" fill="#000" opacity=".28" />
          <ellipse cx="276" cy="286" rx="70" ry="8" fill="#b9c8a0" />

          {/* interior del bowl */}
          <ellipse cx="276" cy="170" rx="150" ry="34" fill="#a3b886" />

          {/* 1 · granos */}
          <g className="hb-anim hb-d1">
            <ellipse cx="276" cy="166" rx="136" ry="30" fill="#e6c987" />
            <g fill="#c9a85c">{GRANOS_OSCUROS.map(([x, y, r]) => <circle key={`o${x}`} cx={x} cy={y} r={r} />)}</g>
            <g fill="#f4e3ae">{GRANOS_CLAROS.map(([x, y, r]) => <circle key={`c${x}`} cx={x} cy={y} r={r} />)}</g>
          </g>

          {/* 2 · hojas verdes */}
          <g className="hb-anim hb-d2">
            {HOJAS.map(({ t, fill }) => (
              <g key={t} transform={t}>
                <path d={LEAF_PATH} fill={fill} />
                <path d="M3 0 42 -8" stroke="#2f6b35" strokeWidth="1.5" fill="none" />
              </g>
            ))}
          </g>

          {/* 3 · aguacate */}
          <g className="hb-anim hb-d3">
            <g transform="translate(205 166) rotate(-22)">
              <ellipse rx="30" ry="40" fill="#45742b" />
              <ellipse rx="25" ry="35" fill="#d8e88a" />
              <ellipse rx="19" ry="27" fill="#bcd45e" opacity=".6" />
              <circle cy="6" r="12" fill="#8b5a2b" />
              <circle cx="-3" cy="2" r="3" fill="#b07a45" />
            </g>
          </g>

          {/* 4 · tomate */}
          <g className="hb-anim hb-d4">
            <g transform="translate(335 164)">
              <circle r="23" fill="#d9442f" />
              <circle r="17" fill="#ee6a52" />
              <g fill="#f9d9a8">
                <ellipse cx="0" cy="-8" rx="3" ry="5" />
                <ellipse cx="8" cy="5" rx="3" ry="5" transform="rotate(-50 8 5)" />
                <ellipse cx="-8" cy="5" rx="3" ry="5" transform="rotate(50 -8 5)" />
              </g>
            </g>
            <g transform="translate(375 172)">
              <circle r="19" fill="#d9442f" />
              <circle r="14" fill="#ee6a52" />
              <g fill="#f9d9a8">
                <ellipse cx="0" cy="-6" rx="2.5" ry="4" />
                <ellipse cx="6" cy="4" rx="2.5" ry="4" transform="rotate(-50 6 4)" />
                <ellipse cx="-6" cy="4" rx="2.5" ry="4" transform="rotate(50 -6 4)" />
              </g>
            </g>
          </g>

          {/* 5 · huevo */}
          <g className="hb-anim hb-d5">
            <g transform="translate(268 150)">
              <ellipse rx="32" ry="22" fill="#fffdf2" stroke="#e8e0c4" strokeWidth="2" />
              <circle cx="2" cy="1" r="11" fill="#f5b52a" />
              <circle cx="-2" cy="-3" r="3.5" fill="#fbd47a" />
            </g>
          </g>

          {/* 6 · zanahoria */}
          <g className="hb-anim hb-d6">
            <g transform="translate(246 184)"><circle r="12" fill="#f08a24" /><circle r="6.5" fill="#f9a94f" /></g>
            <g transform="translate(286 188)"><circle r="12" fill="#f08a24" /><circle r="6.5" fill="#f9a94f" /></g>
            <g transform="translate(316 190)"><circle r="11" fill="#f08a24" /><circle r="6" fill="#f9a94f" /></g>
          </g>

          {/* cuerpo del bowl (tapa la parte baja de los ingredientes) */}
          <path d="M126 170 A150 34 0 0 0 426 170 C426 262 352 284 276 284 C200 284 126 262 126 170 Z" fill="url(#hbBowlG)" />
          <g clipPath="url(#hbBowlClip)">
            <path d="M120 224 Q276 282 432 224 L432 244 Q276 304 120 244 Z" fill="#3f7a4a" />
          </g>
          <path d="M126 170 A150 34 0 0 0 426 170" fill="none" stroke="#ffffff" strokeOpacity=".75" strokeWidth="3" />

          {/* destellos al terminar (el <g> los coloca; el <path> es el que se anima) */}
          {DESTELLOS.map(({ t, delay }) => (
            <g key={t} transform={t}>
              <path className="hb-anim hb-spark" d={STAR} fill="#f8f3c0" style={{ animationDelay: delay }} />
            </g>
          ))}
        </svg>

        {/* Insignia: listo para retirar con QR */}
        <div className="hb-anim hb-badge absolute right-1 top-2 flex items-center gap-2.5 rounded-2xl bg-[#f4f7e8] py-2.5 pl-2.5 pr-3.5 text-brand-900 shadow-[0_8px_24px_rgba(0,0,0,.28)]">
          <svg aria-hidden="true" viewBox="0 0 21 21" className="h-9 w-9">
            <g fill="none" stroke="#17301f" strokeWidth="2">
              <rect x="1" y="1" width="7" height="7" />
              <rect x="13" y="1" width="7" height="7" />
              <rect x="1" y="13" width="7" height="7" />
            </g>
            <g fill="#17301f">
              <rect x="3" y="3" width="3" height="3" />
              <rect x="15" y="3" width="3" height="3" />
              <rect x="3" y="15" width="3" height="3" />
              <rect x="11" y="11" width="2" height="2" />
              <rect x="15" y="12" width="2" height="2" />
              <rect x="18" y="11" width="2" height="2" />
              <rect x="12" y="15" width="2" height="2" />
              <rect x="16" y="16" width="2" height="2" />
              <rect x="11" y="18" width="2" height="2" />
              <rect x="19" y="18" width="1" height="2" />
            </g>
          </svg>
          <div>
            <p className="font-display text-lg font-bold leading-none">Caja 3</p>
            <p className="mt-1 text-xs font-semibold text-brand-600">Listo para retirar</p>
          </div>
        </div>
      </div>

      {/* Nutrientes (ilustrativo) */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <p className="text-[13px] font-bold text-white">Tu bowl, equilibrado</p>
          <p className="text-[11px] text-[#a9c29b]">Ilustrativo</p>
        </div>
        <div className="flex gap-5">
          {NUTRIENTES.map(({ nombre, cls }) => (
            <div key={nombre} className="min-w-0 flex-1">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#cfe0c0]">{nombre}</p>
              <div className="h-2 overflow-hidden rounded bg-white/15">
                <div className={`hb-anim hb-bar ${cls}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Frase según el público (las tres ocupan el mismo lugar y se turnan) */}
      <div className="grid">
        {FRASES.map(({ cls, titulo, texto }) => (
          <div key={titulo} className={`hb-anim hb-cap ${cls} col-start-1 row-start-1`}>
            <p className="font-display text-2xl font-semibold leading-tight text-white">{titulo}</p>
            <p className="mt-1.5 text-sm text-[#cfe0c0]">{texto}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
