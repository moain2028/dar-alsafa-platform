const { defineConfig } = require('vitest/config');
const swc = require('unplugin-swc').default;

module.exports = defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.spec.ts', 'src/**/*.spec.ts'],
    coverage: { reporter: ['text', 'html'] },
  },
});
