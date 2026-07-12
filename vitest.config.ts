import { defineProject } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

function legacyDecorators () {
  return {
    name: 'arquebus-legacy-decorators',
    enforce: 'pre' as const,
    transform (code: string, id: string) {
      if (!id.endsWith('.ts') || !code.includes('@')) return

      const result = ts.transpileModule(code, {
        fileName: id,
        compilerOptions: {
          experimentalDecorators: true,
          module: ts.ModuleKind.ESNext,
          sourceMap: true,
          target: ts.ScriptTarget.ESNext,
        },
      })

      return {
        code: result.outputText,
        map: result.sourceMapText,
      }
    },
  }
}

const basicAppSource = fileURLToPath(new URL('./src/', import.meta.url))

export default defineProject({
  plugins: [legacyDecorators()],
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
