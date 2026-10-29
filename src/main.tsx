import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import WaRedirect from './features/marketing/WaRedirect'
import { MetaPixelProvider } from './features/marketing/MetaPixel'

// Load the Samples module only on its own route so it does not slow down the
// landing page or dashboard.
const DriveApp = lazy(() => import('./drive/App'))
const isDriveApp = location.pathname.startsWith('/samples')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {location.pathname.startsWith('/wa/')
      ? <WaRedirect />
      : isDriveApp
        ? <Suspense fallback={<p className="p-6">Memuat...</p>}><DriveApp /></Suspense>
        : <MetaPixelProvider><App /></MetaPixelProvider>}
  </StrictMode>,
)
