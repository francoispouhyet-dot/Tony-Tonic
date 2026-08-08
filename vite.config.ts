import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // GitHub Pages sert l'app sous /Tony-Tonic/ — la CI définit BASE_PATH.
  // En local (dev ou preview), la base reste "/".
  base: process.env.BASE_PATH || "/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-180.png"],
      manifest: {
        name: "Tony Tonic",
        short_name: "Tony Tonic",
        description: "Suivi fitness, nutrition et santé — 100 % local",
        lang: "fr",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0c0a09",
        theme_color: "#0c0a09",
        start_url: ".",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // L'app est 100 % locale : tout est précaché, aucune requête réseau
        // n'est nécessaire hors appels IA (jamais mis en cache).
        navigateFallback: "index.html",
      },
    }),
  ],
});
