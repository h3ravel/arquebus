import { defineConfig } from 'tsup'

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
]
export default defineConfig([
    {
        entry: ['src/index.ts'],
        format: ['esm', 'cjs'],
        outDir: 'dist',
        dts: true,
        // sourcemap: true,
        external,
        clean: true
    },
    {
        entry: ['src/browser/index.ts'],
        format: ['esm', 'cjs'],
        outDir: 'dist/browser',
        dts: true,
        external,
        clean: true
    },
    {
        entry: ['src/cli/cli.ts'],
        format: ['esm', 'cjs'],
        outDir: 'bin',
        dts: true,
        external,
    }
]) 
