import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import '@mantine/core/styles.css';
import '@mantine/charts/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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
