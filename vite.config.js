import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import jsconfigPath from 'vite-jsconfig-paths';
import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl';
import mkcert from 'vite-plugin-mkcert'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    jsconfigPath(),
    VitePWA({
      registerType: 'autoUpdate', // Automatically update the service worker when a new version is available
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: 'My App',
        short_name: 'MyApp',
        description: 'My awesome app built with React and Vite',
        theme_color: '#ffffff',
        icons: [
          {
            src: '/icons/icon.png',  // Reference the icon in the public folder
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',  // Larger icon for better resolution
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   display: 'standalone',   // <--- this is critical
    //   manifest: {
    //     name: 'DAR Encoder',
    //     short_name: 'DAR',
    //     description: 'DAR Enhance Task Encoding',
    //     theme_color: '#00595c',
    //     icons: []
    //   }
    // })
  ],
  base: "/DAR",
  // build: {
  //   // This assumes your React project folder is a sibling to your .NET project's wwwroot.
  //   // Adjust the path resolution (e.g., '../../NetTemplate_React/wwwroot') as necessary 
  //   // based on where your React project sits relative to the wwwroot folder.
  //   outDir: path.resolve(__dirname, '..', 'NetTemplate_React', 'wwwroot'),
  //   emptyOutDir: true, // Clean the directory before building
  // },
})
