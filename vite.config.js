import { defineConfig } from 'vite'
import tailwindcss from "@tailwindcss/vite"
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), vue(), VitePWA({
      registerType: 'autoUpdate', // Updates werden sofort geladen
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Mein Vorrats-Manager',
        short_name: 'Vorräte',
        description: 'Verwaltung meiner Haushaltsvorräte',
        theme_color: '#ffffff', // Farbe der Statusleiste (oben am Handy)
        background_color: '#ffffff', // Hintergrundfarbe beim Starten
        display: 'standalone', // Versteckt die Browser-Adressleiste!
        icons: [
          {
            src: 'pwa-192x192.png', // Muss exakt so heißen wie im public Ordner
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          // Optional: Maskable Icon für Android (nutzt das gleiche Bild)
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })],
})
