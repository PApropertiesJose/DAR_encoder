import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import Router from "./Router"
import '@mantine/notifications/styles.css';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import { Notifications } from '@mantine/notifications';
import { theme as lightTheme, darkTheme } from './theme.ts';
import { useState, useEffect } from "react";

const App = () => {
  // 1. Initialize state from localStorage or default to 'light'
  const [colorScheme, setColorScheme] = useState(
    localStorage.getItem('color-scheme') || 'light'
  );

  useEffect(() => {
    // Listen for messages from SW
    navigator.serviceWorker?.addEventListener('message', (event) => {
      console.log('Message from SW:', event.data);
    });

    // Send message to SW when controller is ready
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'PING',
        payload: 'Hello from React!',
      });
    }
  }, []);


  // 2. The "Manager" Effect: Listen for theme changes from your toggle button
  useEffect(() => {
    const handleThemeUpdate = () => {
      const newScheme = localStorage.getItem('color-scheme') || 'light';
      console.log(newScheme);
      setColorScheme(newScheme);
    };

    // Listen for the custom event dispatched by your toggle function
    window.addEventListener('theme-changed', handleThemeUpdate);

    // Clean up listener on unmount
    return () => window.removeEventListener('theme-changed', handleThemeUpdate);
  }, []);

  return (
    <>
      {/* Script to prevent flash of unstyled content (FOUC) */}
      <ColorSchemeScript defaultColorScheme={colorScheme} />

      <MantineProvider
        // 3. This forces the update: swapping the entire theme object
        theme={colorScheme === 'dark' ? darkTheme : lightTheme}
        forceColorScheme={colorScheme}
      >
        <Notifications />
        <Router />
      </MantineProvider>
    </>
  );
};

export default App;
