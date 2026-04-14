const { defineConfig } = await import('vite');
const { default: react } = await import('@vitejs/plugin-react');

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5999,
    strictPort: true,
  },
  preview: {
    port: 6000,
    strictPort: true,
  },
});

