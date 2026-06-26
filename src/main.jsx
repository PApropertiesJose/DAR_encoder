import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import '@mantine/core/styles.css';
import '@mantine/charts/styles.css';
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import * as Sentry from "@sentry/react";
//
// Sentry.init({
//   dsn: "https://41b790f13f60c6125b299b3d84bb8a21@o4511330146516992.ingest.us.sentry.io/4511330147434496",
//   // Setting this option to true will send default PII data to Sentry.
//   // For example, automatic IP address collection on events
//   sendDefaultPii: true
// });

const client = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * (60 * 1000),
      gcTime: 24 * 60 * 60 * 1000, // keep cache for 24 hours so offline refresh works
      networkMode: 'offlineFirst',  // serve cached data immediately, refetch in background when online
    }
  }
})

const persister = createSyncStoragePersister({
  storage: window.localStorage,
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PersistQueryClientProvider client={client} persistOptions={{ persister }}>
      <App />
    </PersistQueryClientProvider>
  </StrictMode>,
)
