import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

const alias = {
  '@core': resolve(__dirname, 'core'),
  '@storage': resolve(__dirname, 'storage'),
  '@mobile': resolve(__dirname, 'mobile'),
  '@renderer': resolve(__dirname, 'renderer/src')
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias },
    build: {
      outDir: resolve(__dirname, 'out/main'),
      rollupOptions: {
        input: { index: resolve(__dirname, 'electron/main.ts') }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias },
    build: {
      outDir: resolve(__dirname, 'out/preload'),
      rollupOptions: {
        input: { index: resolve(__dirname, 'electron/preload.ts') },
        output: { format: 'cjs', entryFileNames: '[name].js' }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'renderer'),
    resolve: { alias },
    plugins: [vue()],
    server: {
      port: 5173,
      strictPort: false
    },
    build: {
      outDir: resolve(__dirname, 'out/renderer'),
      emptyOutDir: true,
      rollupOptions: {
        input: { index: resolve(__dirname, 'renderer/index.html') }
      }
    }
  }
})
