// Gera um único arquivo HTML jogável (abre direto no navegador, sem servidor): npx vite build -c vite.single.config.ts
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: { outDir: 'dist-arquivo-unico', emptyOutDir: true }
});
