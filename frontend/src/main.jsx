import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { CartProvider } from './context/CartContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import './index.css'

// La comparación se hace directo con import.meta.env para que Vite la resuelva al
// construir y descarte la rama que no se usa: el build de la tienda NO incluye el
// código del panel de administración (y el build del admin no incluye la tienda).
async function bootstrap() {
  const Root =
    import.meta.env.VITE_APP_MODE === 'admin'
      ? (await import('./AdminApp.jsx')).default
      : (await import('./App.jsx')).default

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <Root />
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </React.StrictMode>,
  )
}

bootstrap()
