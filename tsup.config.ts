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
        cjsInterop: true,
        entry: ['src/index.js'],
        format: ['esm', 'cjs'],
        outDir: 'dist',
        dts: true,
        sourcemap: true,
        external,
        clean: true
    },
    {
        cjsInterop: true,
        entry: ['src/browser/index.js'],
        format: ['esm', 'cjs'],
        outDir: 'dist/browser',
        dts: true,
        sourcemap: true,
        external,
        clean: true
    }
]) 
