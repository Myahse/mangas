const { defineConfig } = await import('vite');
const { default: react } = await import('@vitejs/plugin-react');

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5185,
    strictPort: true,
  },
  preview: {
    port: 5186,
    strictPort: true,
  },
});

