const { defineConfig } = await import('vite');
const { default: react } = await import('@vitejs/plugin-react');

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    strictPort: true,
  },
  preview: {
    port: 5176,
    strictPort: true,
  },
});
