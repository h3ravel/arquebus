import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        projects: [
            {
                // Generic test configuration
                extends: true,
                test: {
                    name: 'generic',
                    environment: 'node',
                    root: './src',
                    include: ['**/*.active.{test,spec}.?(c|m)[jt]s?(x)']
                },
            },
            {
                // Node environment test configuration
                extends: true,
                test: {
                    name: 'node',
                    environment: 'node',
                    root: './test',
                    include: ['{index,node}.test.{ts,js}']
                },
            },
            {
                // Browser environment test configuration
                extends: true,
                test: {
                    name: 'browser',
                    environment: 'jsdom',
                    root: './test',
                    include: ['browser.test.{ts,js}']
                }
            }
        ],
    },
})
