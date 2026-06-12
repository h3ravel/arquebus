import type { DepsConfig } from 'tsdown'
import { defineConfig, type UserConfig } from 'tsdown'

const deps: DepsConfig = {
  skipNodeModulesBundle: true,
  neverBundle: [
    'fs',
    'path',
    'os',
    'tty',
    'util',
    'timers',
    'assert',
    'dotenv',
    'crypto',
    'stream',
    'module',
    'fs-readdir-recursive',
    /.*\/promises$/gi,
    /^node:.*/gi,
    'mysql',
    'oracledb',
    'pg-native',
    'better-sqlite3',
    'pg-query-stream',
    'chalk',
    'collect',
    'commander',
    'dayjs',
    'escalade',
    'knex',
    'pluralize',
    'radashi',
    'resolve-from',
  ]
}

const base: UserConfig = {
  outExtensions: (e) => {
    return ({
      js: e.format === 'es' ? '.js' : '.cjs',
      dts: '.d.ts'
    })
  }
}

export default defineConfig([
  {
    ...base,
    treeshake: true,
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    outDir: 'dist',
    dts: true,
    deps,
    clean: true,
    copy: [
      { from: 'src/migrations/stubs', to: 'dist/migrations/stubs' },
      // { from: 'src/seeders', to: 'dist/seeders' },
      { from: 'src/stubs', to: 'dist/stubs' },
    ],
  },
  {
    ...base,
    treeshake: true,
    entry: ['src/browser/index.ts'],
    format: ['esm', 'cjs'],
    outDir: 'dist/browser',
    dts: true,
    deps,
    clean: true,
  },
  {
    ...base,
    treeshake: true,
    entry: ['src/migrations/index.ts'],
    format: ['esm', 'cjs'],
    outDir: 'dist/migrations',
    dts: true,
    deps,
    shims: true,
    clean: true,
  },
  {
    ...base,
    treeshake: true,
    entry: ['src/seeders/index.ts'],
    format: ['esm', 'cjs'],
    outDir: 'dist/seeders',
    dts: true,
    deps,
    shims: true,
    clean: true,
  },
  {
    ...base,
    treeshake: true,
    entry: ['src/inspector/index.ts'],
    format: ['esm', 'cjs'],
    outDir: 'dist/inspector',
    dts: true,
    deps,
    clean: true,
  },
  {
    ...base,
    treeshake: true,
    entry: ['src/concerns/index.ts'],
    format: ['esm', 'cjs'],
    outDir: 'dist/concerns',
    dts: true,
    deps,
  },
  {
    ...base,
    treeshake: true,
    entry: ['src/relations/index.ts'],
    format: ['esm', 'cjs'],
    outDir: 'dist/relations',
    dts: true,
    deps,
  },
  {
    ...base,
    treeshake: true,
    entry: ['src/cli/index.ts'],
    format: ['esm', 'cjs'],
    outDir: 'bin',
    dts: true,
    deps,
  },
])
