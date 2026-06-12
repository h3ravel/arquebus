import { defineProject } from 'vitest/config'
import { fileURLToPath } from 'node:url'

const basicAppSource = fileURLToPath(new URL('./src/', import.meta.url))

export default defineProject({
  resolve: {
    alias: [
      { find: /^src\/(.+)$/, replacement: `${basicAppSource}$1` },
      { find: /^src$/, replacement: basicAppSource + 'index.ts' },
    ],
  },
  test: {
    pool: 'threads',
    projects: [
      {
        // Generic test configuration
        extends: true,
        test: {
          name: 'generic',
          environment: 'node',
          root: './src',
          include: ['**/*.active.{test,spec}.?(c|m)[jt]s?(x)'],
        },
      },
      {
        // Node environment test configuration
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          root: './test',
          include: ['{index,node,seeders}.test.{ts,js}'],
        },
      },
      {
        // Browser environment test configuration
        extends: true,
        test: {
          name: 'browser',
          environment: 'jsdom',
          root: './test',
          include: ['browser.test.{ts,js}'],
        },
      },
    ],
  },
})
