import { defineConfig } from 'tsdown'

const external = [
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
export default defineConfig([
    {
        treeshake: true,
        entry: ['src/index.ts'],
        format: ['esm', 'cjs'],
        outDir: 'dist',
        dts: true,
        external,
        clean: true,
        copy: [{ from: 'src/migrations/stubs', to: 'dist/migrations/stubs' }, { from: 'src/stubs', to: 'dist/stubs' }],
    },
    {
        treeshake: true,
        entry: ['src/browser/index.ts'],
        format: ['esm', 'cjs'],
        outDir: 'dist/browser',
        dts: true,
        external,
        clean: true
    },
    {
        treeshake: true,
        entry: ['src/migrations/index.ts'],
        format: ['esm', 'cjs'],
        outDir: 'dist/migrations',
        dts: true,
        external,
        clean: true
    },
    {
        treeshake: true,
        entry: ['src/inspector/index.ts'],
        format: ['esm', 'cjs'],
        outDir: 'dist/inspector',
        dts: true,
        external,
        clean: true
    },
    {
        treeshake: true,
        entry: ['src/cli/index.ts'],
        format: ['esm', 'cjs'],
        outDir: 'bin',
        dts: true,
        external,
    }
]) 
