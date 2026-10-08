import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import WaRedirect from './features/marketing/WaRedirect'
import { MetaPixelProvider } from './features/marketing/MetaPixel'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {location.pathname.startsWith('/wa/')
      ? <WaRedirect />
      : <MetaPixelProvider><App /></MetaPixelProvider>}
  </StrictMode>,
)
