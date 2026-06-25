const { defineConfig } = await import('vite');
const { default: react } = await import('@vitejs/plugin-react');
const { fileURLToPath } = await import('url');
const path = await import('path');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  envDir: __dirname,
  plugins: [react()],
  server: {
    port: 5195,
    strictPort: true,
  },
  preview: {
    port: 5196,
    strictPort: true,
  },
});
