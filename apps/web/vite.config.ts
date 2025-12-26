import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const config = defineConfig({
  plugins: [
    devtools(),
    nitro(),
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  ssr: {
    external: [
      '@sori/database',
      'pg',
      'better-auth',
      'resend',
    ],
    noExternal: [],
  },
  build: {
    rollupOptions: {
      external: [
        'pg',
        'pg-native',
        'resend',
      ],
    },
  },
})

export default config
