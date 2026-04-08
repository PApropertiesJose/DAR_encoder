import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import '@mantine/core/styles.css';
import '@mantine/charts/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { registerSW } from 'virtual:pwa-register'

// Register the service worker
registerSW({ immediate: true })

const client = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * (60 * 1000),
    }
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={client} >
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
