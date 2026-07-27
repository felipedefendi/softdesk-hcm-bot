import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    // O Express serve estatico de ../public sem mudanca nenhuma (server.ts) -
    // o build vira o proprio conteudo dessa pasta. emptyOutDir precisa ser
    // explicito porque o destino fica fora da raiz deste pacote (web/).
    outDir: "../public",
    emptyOutDir: true,
  },
});
